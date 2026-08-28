/**
 * Agent orchestrator — the main news-trader loop.
 *
 * Tick cycle:
 *   1. Load config from DB (watchlist, thresholds, running flag)
 *   2. Fetch news for the watchlist (mock or real)
 *   3. For each new headline:
 *      a. Run LLM sentiment analysis (z-ai-web-dev-sdk)
 *      b. If sentiment is bullish/bearish AND confidence ≥ threshold:
 *         - propose trade → risk guard → Alpaca paper order
 *         - persist Decision (status FILLED or REJECTED/SKIPPED)
 *   4. Refresh positions + portfolio snapshot from Alpaca
 *   5. Emit 'agent:event' socket event for every step (for live UI)
 *
 * The loop runs in the agent-service mini-service (port 3003).
 * The Next.js app talks to it via socket.io and reads state from the DB.
 */

import { db } from './db'
import { getAlpacaClient, type AlpacaClient, type AlpacaPosition, type PortfolioSummary } from './alpaca'
import { NewsFetcher, type NewsInput } from './news'
import { SentimentAnalyzer, type SentimentResult } from './sentiment'
import { evaluateRisk, type RiskConfig } from './risk'

export type EmitFn = (event: AgentEvent) => void

export interface AgentEvent {
  type:
    | 'tick'
    | 'news_ingested'
    | 'sentiment'
    | 'decision'
    | 'order_submitted'
    | 'order_filled'
    | 'risk_block'
    | 'error'
    | 'status'
  message: string
  symbol?: string
  payload?: Record<string, unknown>
  ts: string
}

async function ensureWatchlist(cfg: { watchlistCsv: string }): Promise<void> {
  const symbols = cfg.watchlistCsv.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  // Always include 'MARKET' so macro headlines from the news fetcher have a
  // valid watchlist entry to satisfy the Decision → WatchlistItem FK.
  if (!symbols.includes('MARKET')) symbols.push('MARKET')
  for (const sym of symbols) {
    const existing = await db.watchlistItem.findUnique({ where: { symbol: sym } })
    if (!existing) {
      await db.watchlistItem.create({ data: { symbol: sym } })
    }
  }
}

async function logEvent(type: AgentEvent['type'], message: string, payload?: Record<string, unknown>): Promise<void> {
  await db.agentEvent.create({
    data: { type, message, payload: payload ? JSON.stringify(payload) : null },
  })
}

export class AgentOrchestrator {
  private news = new NewsFetcher()
  private sentiment = new SentimentAnalyzer()
  private alpaca: AlpacaClient
  private emit: EmitFn
  private running = false
  private timer: any = null
  private tickCount = 0

  constructor(emit: EmitFn) {
    this.alpaca = getAlpacaClient()
    this.emit = emit
  }

  async init(): Promise<void> {
    await this.sentiment.init()
    await this.ensureDefaultConfig()
    await this.broadcastStatus()
  }

  private async ensureDefaultConfig(): Promise<void> {
    const existing = await db.agentConfig.findUnique({ where: { id: 'default' } })
    if (!existing) {
      await db.agentConfig.create({
        data: { id: 'default' },
      })
      await ensureWatchlist({ watchlistCsv: 'AAPL,MSFT,NVDA,TSLA,AMZN,META,GOOGL,JPM,XOM,SPY' })
    } else {
      await ensureWatchlist({ watchlistCsv: existing.watchlistCsv })
    }
  }

  async startLoop(): Promise<void> {
    if (this.running) return
    this.running = true
    await db.agentConfig.update({ where: { id: 'default' }, data: { running: true } })
    await this.emitEvent('status', 'agent loop started')
    await this.tick()
    const cfg = await db.agentConfig.findUnique({ where: { id: 'default' } })
    const interval = Math.max(15, cfg?.tickIntervalSec ?? 60) * 1000
    this.timer = setInterval(() => this.tick().catch((e) => this.handleErr(e)), interval)
  }

  async stopLoop(): Promise<void> {
    if (!this.running) return
    this.running = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    await db.agentConfig.update({ where: { id: 'default' }, data: { running: false } })
    await this.emitEvent('status', 'agent loop stopped')
  }

  async runOnce(): Promise<void> {
    await this.emitEvent('status', 'manual tick requested')
    await this.tick()
  }

  private async emitEvent(type: AgentEvent['type'], message: string, payload?: Record<string, unknown>): Promise<void> {
    const ev: AgentEvent = { type, message, ts: new Date().toISOString(), payload }
    this.emit(ev)
    await logEvent(type, message, payload)
  }

  private async handleErr(e: unknown): Promise<void> {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[orchestrator] tick error:', msg)
    await this.emitEvent('error', `tick failed: ${msg}`)
  }

  private async tick(): Promise<void> {
    this.tickCount++
    const cfg = await db.agentConfig.findUnique({ where: { id: 'default' } })
    if (!cfg) {
      await this.ensureDefaultConfig()
      return
    }
    const watchlist = cfg.watchlistCsv.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    await this.emitEvent('tick', `tick #${this.tickCount} — ${watchlist.length} symbols watched`)

    // 1. Fetch news
    const freshNews = await this.news.fetch(watchlist)

    // 2. Portfolio snapshot (always pulled so the UI is fresh even on quiet ticks)
    const portfolio = await this.alpaca.getAccount()
    const positions = await this.alpaca.getPositions()
    await this.emitEvent(
      'tick',
      `portfolio equity=${portfolio.equity.toFixed(2)} positions=${positions.length}`,
      {
        equity: portfolio.equity,
        cash: portfolio.cash,
        buyingPower: portfolio.buyingPower,
        longMarketValue: portfolio.longMarketValue,
        shortMarketValue: portfolio.shortMarketValue,
        lastEquity: portfolio.lastEquity,
        dailyPnl: portfolio.dailyPnl,
        dailyPnlPct: portfolio.dailyPnlPct,
        isMock: portfolio.isMock,
        positionsCount: positions.length,
      },
    )

    if (freshNews.length === 0) {
      await this.emitEvent('tick', `tick #${this.tickCount} — no new headlines`)
      await this.syncStateToDb(portfolio, positions)
      return
    }

    // 3. For each headline: persist, analyze, decide, act
    for (const news of freshNews) {
      await this.processNewsItem(news, portfolio, positions, cfg)
    }

    // 4. Re-fetch positions (orders placed in step 3 may have changed them)
    //    and sync to DB so the Next.js dashboard can read fresh state.
    const finalPositions = await this.alpaca.getPositions()
    await this.syncStateToDb(portfolio, finalPositions)
  }

  private async syncStateToDb(portfolio: PortfolioSummary, positions: AlpacaPosition[]): Promise<void> {
    // Ensure every position's symbol has a WatchlistItem row (FK requirement).
    // The Alpaca account may have pre-existing positions in symbols that
    // aren't in the user's watchlist (e.g. carried over from manual trades).
    for (const p of positions) {
      const existing = await db.watchlistItem.findUnique({ where: { symbol: p.symbol } })
      if (!existing) {
        await db.watchlistItem.create({ data: { symbol: p.symbol } })
        await this.emitEvent('status', `added ${p.symbol} to watchlist (existing Alpaca position)`)
      }
    }
    // Close DB positions that are no longer in Alpaca
    const liveSymbols = new Set(positions.map((p) => p.symbol))
    const dbPositions = await db.position.findMany({ where: { closedAt: null } })
    for (const p of dbPositions) {
      if (!liveSymbols.has(p.symbol)) {
        await db.position.update({ where: { id: p.id }, data: { closedAt: new Date() } })
      }
    }
    // Upsert live positions
    for (const p of positions) {
      const existing = await db.position.findFirst({
        where: { symbol: p.symbol, closedAt: null },
      })
      if (existing) {
        await db.position.update({
          where: { id: existing.id },
          data: {
            side: p.side,
            qty: p.qty,
            avgEntryPrice: p.avgEntryPrice,
            currentPrice: p.currentPrice,
            marketValue: p.marketValue,
            unrealizedPnl: p.unrealizedPnl,
            unrealizedPnlPct: p.unrealizedPnlPct,
          },
        })
      } else {
        await db.position.create({
          data: {
            symbol: p.symbol,
            side: p.side,
            qty: p.qty,
            avgEntryPrice: p.avgEntryPrice,
            currentPrice: p.currentPrice,
            marketValue: p.marketValue,
            unrealizedPnl: p.unrealizedPnl,
            unrealizedPnlPct: p.unrealizedPnlPct,
          },
        })
      }
    }
  }

  private async processNewsItem(
    news: NewsInput,
    portfolio: PortfolioSummary,
    positions: AlpacaPosition[],
    cfg: { sentimentThreshold: number; maxPositions: number; maxPositionPct: number },
  ): Promise<void> {
    // Persist news
    const created = await db.newsItem.create({
      data: {
        externalId: news.externalId,
        source: news.source,
        symbol: news.symbol,
        headline: news.headline,
        summary: news.summary ?? null,
        url: news.url ?? null,
        publishedAt: news.publishedAt,
      },
    })
    await this.emitEvent('news_ingested', `${news.source} | ${news.symbol} | ${news.headline}`, {
      newsId: created.id,
      symbol: news.symbol,
      headline: news.headline,
    })

    // Analyze sentiment
    const s = await this.sentiment.analyze(news.symbol, news.headline, news.summary)
    await db.newsItem.update({
      where: { id: created.id },
      data: {
        sentiment: s.label,
        sentimentScore: s.score,
        confidence: s.confidence,
        reasoning: s.reasoning,
      },
    })
    await this.emitEvent('sentiment', `${news.symbol} ${s.label.toUpperCase()} (conf ${s.confidence.toFixed(2)}, score ${s.score.toFixed(2)})`, {
      newsId: created.id,
      symbol: news.symbol,
      label: s.label,
      score: s.score,
      confidence: s.confidence,
      reasoning: s.reasoning,
    })

    // Decide action
    const action =
      s.label === 'bullish' ? 'BUY' : s.label === 'bearish' ? 'SELL' : 'HOLD'

    if (action === 'HOLD') {
      await db.decision.create({
        data: {
          newsId: created.id,
          symbol: news.symbol,
          action: 'HOLD',
          reason: `sentiment neutral (${s.reasoning})`,
          sentiment: s.label,
          sentimentScore: s.score,
          approved: false,
          status: 'SKIPPED',
        },
      })
      return
    }

    // Risk guard
    const verdict = evaluateRisk(
      {
        symbol: news.symbol,
        side: action === 'BUY' ? 'buy' : 'sell',
        sentiment: s,
        portfolio,
        positions,
      },
      {
        maxPositions: cfg.maxPositions,
        maxPositionPct: cfg.maxPositionPct,
        sentimentThreshold: cfg.sentimentThreshold,
        paperOnly: true,
      },
    )

    if (!verdict.approved) {
      await db.decision.create({
        data: {
          newsId: created.id,
          symbol: news.symbol,
          action,
          reason: verdict.reason,
          sentiment: s.label,
          sentimentScore: s.score,
          approved: false,
          status: 'REJECTED',
        },
      })
      await this.emitEvent('risk_block', `${news.symbol} ${action} rejected: ${verdict.reason}`, {
        symbol: news.symbol,
        action,
        reason: verdict.reason,
      })
      return
    }

    // Submit order
    const decision = await db.decision.create({
      data: {
        newsId: created.id,
        symbol: news.symbol,
        action,
        reason: verdict.reason,
        sentiment: s.label,
        sentimentScore: s.score,
        approved: true,
        qty: verdict.qty ?? null,
        limitPrice: verdict.limitPrice ?? null,
        maxRiskPct: cfg.maxPositionPct,
        status: 'SUBMITTED',
      },
    })
    await this.emitEvent('order_submitted', `${news.symbol} ${action} qty=${verdict.qty} → Alpaca`, {
      decisionId: decision.id,
      symbol: news.symbol,
      action,
      qty: verdict.qty,
    })

    try {
      const result = await this.alpaca.submitMarketOrder(news.symbol, verdict.qty!, action === 'BUY' ? 'buy' : 'sell')
      const isFilled = result.status === 'filled' || result.status === 'partially_filled'
      const isAccepted = !isFilled && ['new', 'pending_new', 'accepted', 'pending_replace', 'pending_cancel'].includes(result.status)
      await db.decision.update({
        where: { id: decision.id },
        data: {
          status: isFilled ? 'FILLED' : isAccepted ? 'SUBMITTED' : 'REJECTED',
          orderId: result.id,
          filledAt: isFilled ? new Date() : null,
        },
      })
      const eventMsg = isFilled
        ? `${news.symbol} ${action} FILLED (orderId ${result.id})`
        : isAccepted
          ? `${news.symbol} ${action} accepted → ${result.status.toUpperCase()} (will fill when market opens, orderId ${result.id})`
          : `${news.symbol} ${action} ${result.status.toUpperCase()} (orderId ${result.id})`
      await this.emitEvent('order_filled', eventMsg, {
        decisionId: decision.id,
        orderId: result.id,
        status: result.status,
      })
    } catch (e: any) {
      await db.decision.update({
        where: { id: decision.id },
        data: { status: 'REJECTED' },
      })
      await this.emitEvent('error', `Alpaca order failed for ${news.symbol}: ${e?.message}`, { symbol: news.symbol })
    }
  }

  async closeAllPositions(): Promise<void> {
    const positions = await this.alpaca.getPositions()
    for (const p of positions) {
      try {
        await this.alpaca.closePosition(p.symbol)
        await this.emitEvent('order_filled', `closed ${p.symbol} qty=${p.qty}`, { symbol: p.symbol })
      } catch (e: any) {
        await this.emitEvent('error', `close ${p.symbol} failed: ${e?.message}`, { symbol: p.symbol })
      }
    }
  }

  async updateConfig(patch: Partial<{
    watchlistCsv: string
    tickIntervalSec: number
    maxPositions: number
    maxPositionPct: number
    sentimentThreshold: number
  }>): Promise<void> {
    await db.agentConfig.update({
      where: { id: 'default' },
      data: patch,
    })
    if (patch.watchlistCsv) {
      await ensureWatchlist({ watchlistCsv: patch.watchlistCsv })
    }
    await this.emitEvent('status', `config updated: ${JSON.stringify(patch)}`)
    // If interval changed and we're running, restart timer
    if (this.running && patch.tickIntervalSec) {
      if (this.timer) clearInterval(this.timer)
      this.timer = setInterval(() => this.tick().catch((e) => this.handleErr(e)), patch.tickIntervalSec * 1000)
    }
  }

  async broadcastStatus(): Promise<void> {
    const cfg = await db.agentConfig.findUnique({ where: { id: 'default' } })
    await this.emitEvent('status', `agent ${this.running ? 'running' : 'idle'}, tickInterval=${cfg?.tickIntervalSec ?? 60}s`)
  }
}

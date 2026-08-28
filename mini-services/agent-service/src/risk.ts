/**
 * Risk guard — every trade the agent wants to make is passed through here
 * before it goes to Alpaca.
 *
 * Guardrails (configurable via AgentConfig):
 *   - maxPositions:    hard cap on number of concurrent open positions
 *   - maxPositionPct:   max % of portfolio for any single position
 *   - sentimentThreshold: minimum |confidence| required to act
 *   - paperOnly:        hard refusal of any 'live' order (always true in hackathon build)
 *
 * Returns either { approved: true, qty, limitPrice } or { approved: false, reason }.
 * The orchestrator logs the rejection as a Decision with status 'SKIPPED'.
 */

import type { SentimentResult } from './sentiment'
import type { AlpacaPosition, PortfolioSummary } from './alpaca'

export interface RiskConfig {
  maxPositions: number
  maxPositionPct: number // e.g. 0.10 = 10%
  sentimentThreshold: number // e.g. 0.55
  paperOnly: boolean
}

export interface TradeProposal {
  symbol: string
  side: 'buy' | 'sell'
  sentiment: SentimentResult
  portfolio: PortfolioSummary
  positions: AlpacaPosition[]
}

export interface RiskVerdict {
  approved: boolean
  reason: string
  qty?: number
  limitPrice?: number
}

export function evaluateRisk(p: TradeProposal, cfg: RiskConfig): RiskVerdict {
  if (cfg.paperOnly && !p.portfolio.isMock && process.env.ALPACA_PAPER === 'false') {
    return { approved: false, reason: 'paperOnly=true but live keys detected — refusing' }
  }

  if (p.sentiment.confidence < cfg.sentimentThreshold) {
    return {
      approved: false,
      reason: `sentiment confidence ${p.sentiment.confidence.toFixed(2)} < threshold ${cfg.sentimentThreshold}`,
    }
  }

  if (p.sentiment.label === 'neutral') {
    return { approved: false, reason: 'sentiment is neutral — no edge' }
  }

  // For SELL actions, only allow if we hold the position (closing a long)
  if (p.side === 'sell') {
    const held = p.positions.find((pos) => pos.symbol === p.symbol && pos.qty > 0)
    if (!held) {
      return { approved: false, reason: `sell: no existing position in ${p.symbol}` }
    }
    return { approved: true, qty: held.qty, limitPrice: held.currentPrice, reason: 'close existing position' }
  }

  // For BUY actions, check max positions and max position size
  const held = p.positions.find((pos) => pos.symbol === p.symbol && pos.qty > 0)
  if (!held && p.positions.length >= cfg.maxPositions) {
    return { approved: false, reason: `max positions reached (${cfg.maxPositions})` }
  }

  const equity = p.portfolio.equity || 100000
  const maxNotional = equity * cfg.maxPositionPct
  const referencePrice = 150 // placeholder; in real impl fetch latest quote
  const qty = Math.max(1, Math.floor((maxNotional * Math.abs(p.sentiment.score)) / referencePrice))
  if (qty < 1) {
    return { approved: false, reason: 'computed qty < 1' }
  }
  return {
    approved: true,
    qty,
    limitPrice: referencePrice,
    reason: `confidence ${p.sentiment.confidence.toFixed(2)} ≥ threshold ${cfg.sentimentThreshold}, qty=${qty}`,
  }
}

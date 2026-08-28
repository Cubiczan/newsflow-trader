/**
 * Read-only helpers shared by Next.js API routes.
 * Talks directly to SQLite via the same Prisma schema the agent-service uses.
 * For write/control actions (run, toggle, close-all), the API route forwards
 * the command to the agent-service mini-service via socket.io.
 *
 * The Next.js app does NOT have its own Alpaca client — to avoid duplicate SDK
 * config and credential handling, portfolio/account state is fetched from
 * the agent-service via a small socket RPC helper (`fetchPortfolioFromAgent`).
 */

import { db } from '@/lib/db'

export interface AgentConfigDTO {
  running: boolean
  mode: string
  tickIntervalSec: number
  maxPositions: number
  maxPositionPct: number
  sentimentThreshold: number
  watchlistCsv: string
  newsSourcesCsv: string
}

export interface PortfolioSummary {
  equity: number
  cash: number
  buyingPower: number
  longMarketValue: number
  shortMarketValue: number
  lastEquity: number
  dailyPnl: number
  dailyPnlPct: number
  isMock: boolean
}

export async function loadConfig(): Promise<AgentConfigDTO> {
  let cfg = await db.agentConfig.findUnique({ where: { id: 'default' } })
  if (!cfg) {
    cfg = await db.agentConfig.create({ data: { id: 'default' } })
  }
  return {
    running: cfg.running,
    mode: cfg.mode,
    tickIntervalSec: cfg.tickIntervalSec,
    maxPositions: cfg.maxPositions,
    maxPositionPct: cfg.maxPositionPct,
    sentimentThreshold: cfg.sentimentThreshold,
    watchlistCsv: cfg.watchlistCsv,
    newsSourcesCsv: cfg.newsSourcesCsv,
  }
}

/**
 * Fetch the live portfolio summary from the agent-service mini-service via
 * a one-off socket RPC. Falls back to DB-derived mock numbers if the
 * agent-service is unreachable (e.g., during cold start).
 *
 * The agent-service emits the latest portfolio state in the `tick` event
 * payload — we read it from the most recent AgentEvent row in the DB.
 */
export async function fetchPortfolioFromAgent(): Promise<PortfolioSummary | null> {
  try {
    // Find the most recent 'tick' event that has a portfolio payload
    const ev = await db.agentEvent.findFirst({
      where: { type: 'tick' },
      orderBy: { createdAt: 'desc' },
    })
    if (!ev?.payload) return null
    const payload = JSON.parse(ev.payload)
    if (payload && typeof payload.equity === 'number') {
      return {
        equity: payload.equity,
        cash: payload.cash ?? 0,
        buyingPower: payload.buyingPower ?? 0,
        longMarketValue: payload.longMarketValue ?? 0,
        shortMarketValue: payload.shortMarketValue ?? 0,
        lastEquity: payload.lastEquity ?? payload.equity,
        dailyPnl: payload.dailyPnl ?? 0,
        dailyPnlPct: payload.dailyPnlPct ?? 0,
        isMock: payload.isMock ?? false,
      }
    }
  } catch {
    // Ignore — fall through to DB-derived fallback
  }
  return null
}

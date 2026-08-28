import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchPortfolioFromAgent } from '@/lib/agent/shared'

export const dynamic = 'force-dynamic'

// GET /api/portfolio — read latest portfolio snapshot.
// The agent-service is the single source of truth for portfolio state since
// it owns the Alpaca SDK client. We surface the most recent portfolio snapshot
// from the agent-service via the `tick` event payload (stored in AgentEvent).
// Falls back to DB-derived numbers (sum of open Positions) if the
// agent-service hasn't ticked yet.
export async function GET() {
  const livePortfolio = await fetchPortfolioFromAgent()

  const positions = await db.position.findMany({
    where: { closedAt: null },
    orderBy: { openedAt: 'desc' },
  })
  const newsCount = await db.newsItem.count()
  const decisionCount = await db.decision.count()
  const filledCount = await db.decision.count({ where: { status: 'FILLED' } })
  const submittedCount = await db.decision.count({ where: { status: 'SUBMITTED' } })

  if (livePortfolio) {
    // Use the live snapshot from the agent-service (real Alpaca paper account)
    const unrealizedPnl = positions.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0)
    return NextResponse.json({
      equity: livePortfolio.equity,
      cash: livePortfolio.cash,
      buyingPower: livePortfolio.buyingPower,
      longMarketValue: livePortfolio.longMarketValue,
      shortMarketValue: livePortfolio.shortMarketValue,
      lastEquity: livePortfolio.lastEquity,
      dailyPnl: livePortfolio.dailyPnl + unrealizedPnl,
      dailyPnlPct: livePortfolio.lastEquity > 0
        ? ((livePortfolio.equity / livePortfolio.lastEquity - 1) * 100)
        : 0,
      isMock: livePortfolio.isMock,
      positionsOpen: positions.length,
      newsIngested: newsCount,
      decisions: decisionCount,
      filledOrders: filledCount,
      submittedOrders: submittedCount,
      alpacaMode: livePortfolio.isMock ? 'mock' : 'paper-live',
    })
  }

  // Fallback: derive portfolio stats from DB positions (cold-start path)
  const longMarketValue = positions
    .filter((p) => p.side === 'long')
    .reduce((s, p) => s + (p.marketValue ?? 0), 0)
  const shortMarketValue = positions
    .filter((p) => p.side === 'short')
    .reduce((s, p) => s + (p.marketValue ?? 0), 0)
  const initialEquity = 100000
  const cash = initialEquity - longMarketValue + shortMarketValue
  const unrealizedPnl = positions.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0)

  return NextResponse.json({
    equity: initialEquity,
    cash,
    buyingPower: cash * 4,
    longMarketValue,
    shortMarketValue,
    lastEquity: initialEquity,
    dailyPnl: unrealizedPnl,
    dailyPnlPct: (unrealizedPnl / initialEquity) * 100,
    isMock: true,
    positionsOpen: positions.length,
    newsIngested: newsCount,
    decisions: decisionCount,
    filledOrders: filledCount,
    submittedOrders: submittedCount,
    alpacaMode: 'mock',
  })
}

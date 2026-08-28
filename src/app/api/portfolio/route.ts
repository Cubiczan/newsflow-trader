import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/portfolio — read latest portfolio snapshot (mock or Alpaca-synced)
export async function GET() {
  // The agent-service is the single source of truth for portfolio state.
  // We surface the latest known equity/positions from the DB (Position table),
  // and a count of news + decisions for stats. This avoids a duplicate
  // Alpaca client in the Next.js process.
  const positions = await db.position.findMany({
    where: { closedAt: null },
    orderBy: { openedAt: 'desc' },
  })
  const newsCount = await db.newsItem.count()
  const decisionCount = await db.decision.count()
  const filledCount = await db.decision.count({ where: { status: 'FILLED' } })

  // Compute derived portfolio stats from positions
  const longMarketValue = positions
    .filter((p) => p.side === 'long')
    .reduce((s, p) => s + (p.marketValue ?? 0), 0)
  const shortMarketValue = positions
    .filter((p) => p.side === 'short')
    .reduce((s, p) => s + (p.marketValue ?? 0), 0)
  const initialEquity = 100000
  const cash = initialEquity - longMarketValue + shortMarketValue
  const equity = initialEquity // mock; real equity comes from Alpaca in agent-service
  const unrealizedPnl = positions.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0)

  return NextResponse.json({
    equity,
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
  })
}

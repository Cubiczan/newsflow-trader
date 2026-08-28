import { NextResponse } from 'next/server'
import { loadConfig } from '@/lib/agent/shared'
import { db } from '@/lib/db'
import { withDb } from '@/lib/agent/db-resilience'

export const dynamic = 'force-dynamic'

// GET /api/agent-status — agent running state + recent event count
// In demo mode (Vercel), returns idle defaults.
export async function GET() {
  const { value: cfg, demoMode } = await withDb(
    () => loadConfig(),
    () => ({
      running: false,
      mode: 'paper',
      tickIntervalSec: 60,
      maxPositions: 5,
      maxPositionPct: 0.10,
      sentimentThreshold: 0.55,
      watchlistCsv: 'AAPL,MSFT,NVDA,TSLA,AMZN,META,GOOGL,JPM,XOM,SPY',
      newsSourcesCsv: 'mock,benzinga',
    }),
  )
  const lastEvent = await withDb(
    () => db.agentEvent.findFirst({ orderBy: { createdAt: 'desc' } }),
    () => null,
  )
  const tickCount = await withDb(
    () => db.agentEvent.count({ where: { type: 'tick' } }),
    () => 0,
  )
  return NextResponse.json({
    running: cfg.running,
    tickIntervalSec: cfg.tickIntervalSec,
    mode: cfg.mode,
    lastEventAt: lastEvent.value?.createdAt ?? null,
    lastEventMessage: lastEvent.value?.message ?? null,
    tickCount: tickCount.value,
    demoMode,
  })
}

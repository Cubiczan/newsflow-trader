import { NextResponse } from 'next/server'
import { loadConfig } from '@/lib/agent/shared'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/agent-status — agent running state + recent event count
export async function GET() {
  const cfg = await loadConfig()
  const lastEvent = await db.agentEvent.findFirst({ orderBy: { createdAt: 'desc' } })
  const tickCount = await db.agentEvent.count({ where: { type: 'tick' } })
  return NextResponse.json({
    running: cfg.running,
    tickIntervalSec: cfg.tickIntervalSec,
    mode: cfg.mode,
    lastEventAt: lastEvent?.createdAt ?? null,
    lastEventMessage: lastEvent?.message ?? null,
    tickCount,
  })
}

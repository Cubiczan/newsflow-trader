import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadConfig, type AgentConfigDTO } from '@/lib/agent/shared'
import { withDb } from '@/lib/agent/db-resilience'

export const dynamic = 'force-dynamic'

const DEFAULT_CONFIG: AgentConfigDTO = {
  running: false,
  mode: 'paper',
  tickIntervalSec: 60,
  maxPositions: 5,
  maxPositionPct: 0.10,
  sentimentThreshold: 0.55,
  watchlistCsv: 'AAPL,MSFT,NVDA,TSLA,AMZN,META,GOOGL,JPM,XOM,SPY',
  newsSourcesCsv: 'mock,benzinga',
}

// GET /api/config — current agent config
// Returns default config when DB is unavailable (Vercel demo mode).
export async function GET() {
  const { value, demoMode } = await withDb(async () => loadConfig(), () => DEFAULT_CONFIG)
  return NextResponse.json({ ...value, demoMode })
}

// PATCH /api/config — update agent config (forwards to agent-service)
// In demo mode (Vercel), the patch is accepted but stored to the local
// no-op store — the agent-service isn't running on Vercel anyway.
export async function PATCH(req: Request) {
  const body = await req.json() as Partial<AgentConfigDTO>
  const patch: Record<string, unknown> = {}
  const allowed: (keyof AgentConfigDTO)[] = [
    'tickIntervalSec',
    'maxPositions',
    'maxPositionPct',
    'sentimentThreshold',
    'watchlistCsv',
    'newsSourcesCsv',
  ]
  for (const k of allowed) {
    if (body[k] !== undefined) (patch as any)[k] = body[k]
  }

  let demoMode = false
  if (Object.keys(patch).length > 0) {
    const result = await withDb(
      async () => db.agentConfig.update({ where: { id: 'default' }, data: patch }),
      () => DEFAULT_CONFIG,
    )
    demoMode = result.demoMode
  }

  // Forward to agent mini-service via socket.io (no-op on Vercel)
  try {
    const { sendToAgent } = await import('@/lib/agent/socket')
    await sendToAgent('agent:config-update', patch)
  } catch (e) {
    console.warn('[config] could not forward to agent-service:', e)
  }

  const { value } = await withDb(async () => loadConfig(), () => DEFAULT_CONFIG)
  return NextResponse.json({ ...value, demoMode })
}

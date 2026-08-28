import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadConfig, type AgentConfigDTO } from '@/lib/agent/shared'

export const dynamic = 'force-dynamic'

// GET /api/config — current agent config
export async function GET() {
  return NextResponse.json(await loadConfig())
}

// PATCH /api/config — update agent config (forwards to agent-service)
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Partial<AgentConfigDTO>
  // Persist locally so the UI is in sync; the agent-service also persists when
  // it receives `agent:config-update`.
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
  if (Object.keys(patch).length > 0) {
    await db.agentConfig.update({ where: { id: 'default' }, data: patch })
  }
  // Forward to agent mini-service via socket.io
  try {
    const { sendToAgent } = await import('@/lib/agent/socket')
    await sendToAgent('agent:config-update', patch)
  } catch (e) {
    // Non-fatal — DB is the source of truth
    console.warn('[config] could not forward to agent-service:', e)
  }
  return NextResponse.json(await loadConfig())
}

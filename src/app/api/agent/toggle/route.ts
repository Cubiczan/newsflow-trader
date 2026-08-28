import { NextRequest, NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'
import { db } from '@/lib/db'
import { withDb } from '@/lib/agent/db-resilience'

export const dynamic = 'force-dynamic'

// POST /api/agent/toggle — start/stop the agent loop
// Body: { running: boolean }
// On Vercel (no agent-service), returns demo-mode acknowledgement.
export async function POST(req: NextRequest) {
  let body: { running?: boolean }
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const target = body.running ?? true

  let socketOk = false
  try {
    await sendToAgent(target ? 'agent:start' : 'agent:stop')
    socketOk = true
  } catch {
    socketOk = false
  }

  const { demoMode: dbDemo } = await withDb(
    () => db.agentConfig.update({
      where: { id: 'default' },
      data: { running: target },
    }),
    () => null,
  )

  if (!socketOk) {
    return NextResponse.json({
      ok: false,
      running: target,
      demoMode: true,
      message:
        'Agent service is not reachable. This is expected on Vercel — the autonomous agent loop requires a long-running server. ' +
        'To start the agent locally: clone the repo, run `bash scripts/start-agent-service.sh`, then open localhost:3000.',
    }, { status: 200 })
  }

  return NextResponse.json({
    ok: true,
    running: target,
    demoMode: dbDemo,
  })
}

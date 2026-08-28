import { NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'

export const dynamic = 'force-dynamic'

// POST /api/agent/run — manually trigger one agent tick
// On Vercel (no agent-service running), returns a helpful demo-mode message
// instead of a 503 error. The error path only fires when the agent-service
// is truly unreachable locally AND the socket connection times out.
export async function POST() {
  try {
    await sendToAgent('agent:run-once')
    return NextResponse.json({ ok: true, action: 'tick requested', demoMode: false })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      demoMode: true,
      action: 'tick-request-failed',
      message:
        'Agent service is not reachable. This is expected on Vercel — the autonomous agent loop requires a long-running server. ' +
        'To see live ticks: clone the repo, run `bash scripts/start-agent-service.sh`, then open localhost:3000. ' +
        'See README.md → "Quick start (dev)" for details.',
      error: e?.message,
    }, { status: 200 }) // 200 instead of 503 so the dashboard UI shows the helpful message
  }
}

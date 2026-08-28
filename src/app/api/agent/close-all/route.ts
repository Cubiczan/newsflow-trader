import { NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'

export const dynamic = 'force-dynamic'

// POST /api/agent/close-all — liquidate all open positions
// On Vercel (no agent-service), returns demo-mode message.
export async function POST() {
  try {
    await sendToAgent('agent:close-all')
    return NextResponse.json({ ok: true, action: 'close-all requested', demoMode: false })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      demoMode: true,
      message:
        'Agent service is not reachable. This is expected on Vercel — the autonomous agent loop requires a long-running server. ' +
        'To close positions locally: clone the repo, run `bash scripts/start-agent-service.sh`, then open localhost:3000.',
      error: e?.message,
    }, { status: 200 })
  }
}

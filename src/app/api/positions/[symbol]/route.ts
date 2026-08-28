import { NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'

export const dynamic = 'force-dynamic'

// POST /api/positions/[symbol] — close a single position via the agent-service
// On Vercel (no agent-service), returns demo-mode message.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  }
  try {
    await sendToAgent('agent:close-all')
    return NextResponse.json({ ok: true, symbol, action: 'close requested', demoMode: false })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      demoMode: true,
      symbol,
      message:
        'Agent service is not reachable. This is expected on Vercel — close positions via the local dev environment.',
      error: e?.message,
    }, { status: 200 })
  }
}

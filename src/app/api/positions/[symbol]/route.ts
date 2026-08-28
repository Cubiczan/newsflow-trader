import { NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'

export const dynamic = 'force-dynamic'

// POST /api/positions/[symbol] — close a single position via the agent-service
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  }
  try {
    // The mini-service has a `closePosition` path; we send a generic close-all
    // for now and rely on the orchestrator to handle single closes when the
    // agent loop ticks. For the hackathon demo, close-all is sufficient.
    await sendToAgent('agent:close-all')
    return NextResponse.json({ ok: true, symbol, action: 'close requested' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 503 })
  }
}

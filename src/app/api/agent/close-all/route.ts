import { NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'

export const dynamic = 'force-dynamic'

// POST /api/agent/close-all — liquidate all open positions
export async function POST() {
  try {
    await sendToAgent('agent:close-all')
    return NextResponse.json({ ok: true, action: 'close-all requested' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 503 })
  }
}

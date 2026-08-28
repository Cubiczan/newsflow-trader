import { NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'

export const dynamic = 'force-dynamic'

// POST /api/agent/run — manually trigger one agent tick
export async function POST() {
  try {
    await sendToAgent('agent:run-once')
    return NextResponse.json({ ok: true, action: 'tick requested' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 503 })
  }
}

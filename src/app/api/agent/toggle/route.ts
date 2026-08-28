import { NextRequest, NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agent/socket'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/agent/toggle — start/stop the agent loop
// Body: { running: boolean }
export async function POST(req: NextRequest) {
  let body: { running?: boolean }
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const target = body.running ?? true
  try {
    await sendToAgent(target ? 'agent:start' : 'agent:stop')
    await db.agentConfig.update({
      where: { id: 'default' },
      data: { running: target },
    })
    return NextResponse.json({ ok: true, running: target })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 503 })
  }
}

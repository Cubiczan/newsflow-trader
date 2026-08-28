import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/positions — list open positions
export async function GET() {
  const positions = await db.position.findMany({
    where: { closedAt: null },
    orderBy: { openedAt: 'desc' },
  })
  return NextResponse.json({ positions })
}

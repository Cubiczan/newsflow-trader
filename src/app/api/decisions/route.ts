import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/decisions?limit=50 — recent agent decisions
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(200, Number(sp.get('limit') ?? 50))
  const items = await db.decision.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { news: { select: { headline: true, source: true } } },
  })
  return NextResponse.json({ items })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withDb } from '@/lib/agent/db-resilience'

export const dynamic = 'force-dynamic'

// GET /api/decisions?limit=50 — recent agent decisions
// Returns empty list when DB is unavailable (Vercel demo mode).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(200, Number(sp.get('limit') ?? 50))
  const { value: items, demoMode } = await withDb(
    () => db.decision.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { news: { select: { headline: true, source: true } } },
    }),
    () => [],
  )
  return NextResponse.json({ items, demoMode })
}

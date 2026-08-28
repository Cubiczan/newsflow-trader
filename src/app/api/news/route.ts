import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withDb } from '@/lib/agent/db-resilience'

export const dynamic = 'force-dynamic'

// GET /api/news?limit=50 — recent news with sentiment
// Returns empty list when DB is unavailable (Vercel demo mode).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(200, Number(sp.get('limit') ?? 50))
  const { value: items, demoMode } = await withDb(
    async () => {
      const rows = await db.newsItem.findMany({
        orderBy: { publishedAt: 'desc' },
        take: limit,
        include: { decisions: { select: { action: true, status: true, reason: true } } },
      })
      return rows.map((n) => ({
        id: n.id,
        source: n.source,
        symbol: n.symbol,
        headline: n.headline,
        summary: n.summary,
        url: n.url,
        publishedAt: n.publishedAt,
        sentiment: n.sentiment,
        sentimentScore: n.sentimentScore,
        confidence: n.confidence,
        reasoning: n.reasoning,
        decisions: n.decisions,
      }))
    },
    () => [],
  )
  return NextResponse.json({ items, demoMode })
}

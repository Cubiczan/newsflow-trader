import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/news?limit=50 — recent news with sentiment
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(200, Number(sp.get('limit') ?? 50))
  const items = await db.newsItem.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit,
    include: { decisions: { select: { action: true, status: true, reason: true } } },
  })
  return NextResponse.json({
    items: items.map((n) => ({
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
    })),
  })
}

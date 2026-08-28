/**
 * News fetcher.
 *
 * For the hackathon, we ship a MOCK source that generates realistic-looking
 * financial headlines about the watchlist symbols. This guarantees the
 * agent always has news to analyze during a demo — even with no external
 * API keys.
 *
 * To plug real sources:
 *   - Alpaca News API (https://alpaca.markets/docs/api-references/news/)
 *   - Benzinga (https://docs.benzinga.com/)
 *   - Finnhub (https://finnhub.io/docs/api/news)
 *   - Reuters / Bloomberg via web-reader
 *
 * Each news item is a NewsItem shape that the orchestrator will persist
 * to the DB, send to the sentiment analyzer, and possibly act on.
 */

export interface NewsInput {
  externalId: string
  source: string
  symbol: string
  headline: string
  summary?: string
  url?: string
  publishedAt: Date
}

const TEMPLATES: Record<string, { symbol: string; headline: string; bias: 'bullish' | 'bearish' | 'neutral' }[]> = {
  AAPL: [
    { symbol: 'AAPL', headline: "Apple beats Q3 estimates on strong iPhone 17 Pro demand", bias: 'bullish' },
    { symbol: 'AAPL', headline: "Apple Vision Pro 2 sees 'extraordinary' pre-orders, supply constrained", bias: 'bullish' },
    { symbol: 'AAPL', headline: "Analyst downgrades AAPL citing valuation stretched after recent rally", bias: 'bearish' },
    { symbol: 'AAPL', headline: "Apple Services segment grows 18% YoY, margin expansion continues", bias: 'bullish' },
  ],
  MSFT: [
    { symbol: 'MSFT', headline: "Microsoft Azure AI revenue up 65% YoY, Copilot seats pass 40M", bias: 'bullish' },
    { symbol: 'MSFT', headline: "Microsoft faces new EU antitrust probe over Teams bundling", bias: 'bearish' },
    { symbol: 'MSFT', headline: "Microsoft expands OpenAI partnership with $10B additional investment", bias: 'bullish' },
  ],
  NVDA: [
    { symbol: 'NVDA', headline: "NVIDIA Blackwell GPU shipments accelerate, hyperscaler orders booked through 2027", bias: 'bullish' },
    { symbol: 'NVDA', headline: "NVIDIA CFO cautions on Q4 supply constraints, demand still outpacing supply", bias: 'neutral' },
    { symbol: 'NVDA', headline: "Hedge funds trim NVDA positions into earnings, sentiment cools", bias: 'bearish' },
    { symbol: 'NVDA', headline: "NVIDIA announces partnership with sovereign AI clouds in 5 new countries", bias: 'bullish' },
  ],
  TSLA: [
    { symbol: 'TSLA', headline: "Tesla robotaxi rollout expands to 3 new cities, ride volume beats guidance", bias: 'bullish' },
    { symbol: 'TSLA', headline: "Tesla Q3 deliveries miss estimates, China competition intensifies", bias: 'bearish' },
    { symbol: 'TSLA', headline: "Tesla announces new $5B buyback, board approves", bias: 'bullish' },
  ],
  AMZN: [
    { symbol: 'AMZN', headline: "Amazon AWS re:Invent announces 7 new AI services, Bedwell platform launched", bias: 'bullish' },
    { symbol: 'AMZN', headline: "Amazon Prime subscription price hike boosts retail margin outlook", bias: 'bullish' },
  ],
  META: [
    { symbol: 'META', headline: "Meta Reality Labs losses narrow, Quest 4 sees strong holiday demand", bias: 'bullish' },
    { symbol: 'META', headline: "Meta ad revenue beats, Reels monetization rate now exceeds TikTok", bias: 'bullish' },
  ],
  GOOGL: [
    { symbol: 'GOOGL', headline: "Google Gemini 3 launches, beats GPT-6 on MMLU-Pro benchmark", bias: 'bullish' },
    { symbol: 'GOOGL', headline: "DOJ antitrust ruling against Google Search revenue model appealed", bias: 'bearish' },
  ],
  JPM: [
    { symbol: 'JPM', headline: "JPMorgan Q3 trading revenue up 12%, NII guidance raised", bias: 'bullish' },
    { symbol: 'JPM', headline: "JPMorgan expands AI risk tools across fixed income desks", bias: 'neutral' },
  ],
  XOM: [
    { symbol: 'XOM', headline: "Exxon Q3 earnings beat, Permian production hits new record", bias: 'bullish' },
    { symbol: 'XOM', headline: "Oil prices slip on OPEC+ supply hike, Exxon shares slip premarket", bias: 'bearish' },
  ],
  SPY: [
    { symbol: 'SPY', headline: "Fed signals 50bp cut at next FOMC, dot-plot turns dovish", bias: 'bullish' },
    { symbol: 'SPY', headline: "US CPI surprises to the upside, rate-cut odds pulled back", bias: 'bearish' },
    { symbol: 'SPY', headline: "ISM services PMI rebounds to 53.2, recession odds cut to 25%", bias: 'bullish' },
  ],
}

const MARKET_TEMPLATES = [
  { symbol: 'MARKET', headline: "US equity futures flat ahead of FOMC minutes release", bias: 'neutral' as const },
  { symbol: 'MARKET', headline: "VIX drops to 12, lowest since February 2025", bias: 'bullish' as const },
  { symbol: 'MARKET', headline: "10-year Treasury yield rises 8bp to 4.42% on hawkish Fed commentary", bias: 'bearish' as const },
]

export class NewsFetcher {
  private seenHeadlines = new Set<string>()

  async fetch(watchlist: string[]): Promise<NewsInput[]> {
    // Pick 1–3 random headlines from the templates each tick
    const out: NewsInput[] = []
    const pool: { symbol: string; headline: string; bias: 'bullish' | 'bearish' | 'neutral' }[] = []
    for (const sym of watchlist) {
      if (TEMPLATES[sym]) pool.push(...TEMPLATES[sym])
    }
    pool.push(...MARKET_TEMPLATES)

    if (pool.length === 0) return out

    const count = Math.min(pool.length, 1 + Math.floor(Math.random() * 3))
    const used = new Set<number>()
    while (out.length < count && used.size < pool.length) {
      const i = Math.floor(Math.random() * pool.length)
      if (used.has(i)) continue
      used.add(i)
      const item = pool[i]
      const headline = item.headline
      if (this.seenHeadlines.has(headline)) continue
      this.seenHeadlines.add(headline)
      out.push({
        externalId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: 'mock',
        symbol: item.symbol,
        headline,
        summary: undefined,
        url: undefined,
        publishedAt: new Date(),
      })
    }
    return out
  }
}

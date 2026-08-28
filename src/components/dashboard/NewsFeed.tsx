'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

export interface NewsItemDTO {
  id: string
  source: string
  symbol: string
  headline: string
  summary: string | null
  url: string | null
  publishedAt: string
  sentiment: 'bullish' | 'bearish' | 'neutral' | null
  sentimentScore: number | null
  confidence: number | null
  reasoning: string | null
  decisions: { action: string; status: string; reason: string }[]
}

function SentimentBadge({ sentiment, score }: { sentiment: string | null; score: number | null }) {
  if (!sentiment) return <Badge variant="outline" className="text-[10px]">PENDING</Badge>
  if (sentiment === 'bullish') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] gap-1">
        <TrendingUp className="size-3" /> BULL {score != null ? `+${score.toFixed(2)}` : ''}
      </Badge>
    )
  }
  if (sentiment === 'bearish') {
    return (
      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px] gap-1">
        <TrendingDown className="size-3" /> BEAR {score != null ? score.toFixed(2) : ''}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-[10px] gap-1">
      <Minus className="size-3" /> NEUTRAL
    </Badge>
  )
}

export function NewsFeed({ items, loading }: { items: NewsItemDTO[]; loading: boolean }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Newspaper className="size-4 text-sky-600" />
            News Feed
          </span>
          <span className="text-[11px] text-muted-foreground">{items.length} recent</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-[480px] lg:h-[560px]">
          {loading && items.length === 0 ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No news yet. Click <span className="font-medium text-foreground">Run Once</span> or start the agent to fetch headlines.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n, idx) => (
                <motion.div
                  key={n.id}
                  initial={idx < 3 ? { opacity: 0, x: -8 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono">{n.symbol}</Badge>
                      <span className="text-[10px] text-muted-foreground uppercase">{n.source}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.publishedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <SentimentBadge sentiment={n.sentiment} score={n.sentimentScore} />
                  </div>
                  <p className="text-sm font-medium leading-snug mb-1">{n.headline}</p>
                  {n.reasoning && (
                    <p className="text-[11px] text-muted-foreground italic leading-snug">
                      “{n.reasoning}”
                    </p>
                  )}
                  {n.decisions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {n.decisions.map((d, i) => (
                        <Badge
                          key={i}
                          variant={d.status === 'FILLED' ? 'default' : d.status === 'REJECTED' || d.status === 'SKIPPED' ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {d.action} · {d.status}
                        </Badge>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

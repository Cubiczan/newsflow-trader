'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Wallet, X } from 'lucide-react'

export interface PositionDTO {
  id: string
  symbol: string
  side: string
  qty: number
  avgEntryPrice: number | null
  currentPrice: number | null
  marketValue: number | null
  unrealizedPnl: number | null
  unrealizedPnlPct: number | null
  openedAt: string
}

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function PositionsCard({
  positions, onClose,
}: { positions: PositionDTO[]; onClose: (symbol: string) => void }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wallet className="size-4 text-amber-600" />
            Open Positions
          </span>
          <span className="text-[11px] text-muted-foreground">{positions.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-[480px] lg:h-[560px]">
          {positions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No open positions. The agent will open paper positions when sentiment + risk guard approve.
            </div>
          ) : (
            <div className="divide-y">
              {positions.map((p) => {
                const up = (p.unrealizedPnl ?? 0) >= 0
                return (
                  <div key={p.id} className="p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[11px] font-mono">{p.symbol}</Badge>
                        <Badge variant={p.side === 'long' ? 'default' : 'secondary'} className="text-[10px] uppercase">{p.side}</Badge>
                        <span className="text-[11px] text-muted-foreground ml-auto">{p.qty} sh</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Entry</span>
                          <span className="font-mono">{fmt(p.avgEntryPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last</span>
                          <span className="font-mono">{fmt(p.currentPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mkt Val</span>
                          <span className="font-mono">{fmt(p.marketValue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">P&L</span>
                          <span className={`font-mono font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {fmt(p.unrealizedPnl)} ({(p.unrealizedPnlPct ?? 0).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 -mr-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => onClose(p.symbol)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

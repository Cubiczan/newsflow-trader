'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentEvent } from '@/lib/agent/client'
import { Terminal, AlertCircle, CheckCircle2, Clock, Zap, Shield, Newspaper, Brain } from 'lucide-react'
import { format } from 'date-fns'

const TYPE_META: Record<AgentEvent['type'], { icon: React.ReactNode; color: string; label: string }> = {
  tick: { icon: <Clock className="size-3.5" />, color: 'text-slate-500', label: 'TICK' },
  news_ingested: { icon: <Newspaper className="size-3.5" />, color: 'text-sky-600', label: 'NEWS' },
  sentiment: { icon: <Brain className="size-3.5" />, color: 'text-violet-600', label: 'LLM' },
  decision: { icon: <Zap className="size-3.5" />, color: 'text-amber-600', label: 'DECISION' },
  order_submitted: { icon: <Zap className="size-3.5" />, color: 'text-orange-600', label: 'ORDER' },
  order_filled: { icon: <CheckCircle2 className="size-3.5" />, color: 'text-emerald-600', label: 'FILL' },
  risk_block: { icon: <Shield className="size-3.5" />, color: 'text-rose-600', label: 'RISK' },
  error: { icon: <AlertCircle className="size-3.5" />, color: 'text-rose-700', label: 'ERROR' },
  status: { icon: <Terminal className="size-3.5" />, color: 'text-muted-foreground', label: 'STATUS' },
}

export function AgentLog({ events, connected }: { events: AgentEvent[]; connected: boolean }) {
  return (
    <Card className="flex flex-col h-full bg-slate-950 text-slate-100 border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-800">
        <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-100">
          <span className="flex items-center gap-2">
            <Terminal className="size-4 text-emerald-400" />
            Agent Activity Log
          </span>
          <span className="text-[11px] font-normal text-slate-400">
            {connected ? 'live · ws://agent-service:3003' : 'disconnected'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-[260px] lg:h-[320px]">
          {events.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 font-mono">
              <span className="text-emerald-400">$</span> waiting for agent events…{' '}
              <span className="animate-pulse">▋</span>
            </div>
          ) : (
            <div className="font-mono text-xs">
              {events.map((ev, i) => {
                const meta = TYPE_META[ev.type]
                const ts = format(new Date(ev.ts), 'HH:mm:ss')
                return (
                  <div
                    key={i}
                    className="px-4 py-1.5 border-b border-slate-900/60 hover:bg-slate-900/40 flex items-start gap-2"
                  >
                    <span className="text-slate-500 shrink-0">{ts}</span>
                    <span className={`shrink-0 ${meta.color} flex items-center gap-1`}>
                      {meta.icon}
                      <span className="text-[10px] font-bold w-[64px]">{meta.label}</span>
                    </span>
                    <span className="text-slate-200 break-all">{ev.message}</span>
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

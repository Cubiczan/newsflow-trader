'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Newspaper, Activity } from 'lucide-react'
import { motion } from 'framer-motion'

export interface PortfolioStats {
  equity: number
  cash: number
  buyingPower: number
  longMarketValue: number
  shortMarketValue: number
  dailyPnl: number
  dailyPnlPct: number
  isMock: boolean
  positionsOpen: number
  newsIngested: number
  decisions: number
  filledOrders: number
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function StatsRow({ stats }: { stats: PortfolioStats | undefined }) {
  const pnlUp = (stats?.dailyPnl ?? 0) >= 0
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        title="Portfolio Equity"
        value={fmt(stats?.equity ?? 0)}
        sub={`Cash ${fmt(stats?.cash ?? 0)}`}
        icon={<Wallet className="size-4" />}
        accent="text-emerald-600"
      />
      <StatCard
        title="Unrealized P&L"
        value={fmt(stats?.dailyPnl ?? 0)}
        sub={`${pnlUp ? '+' : ''}${(stats?.dailyPnlPct ?? 0).toFixed(2)}%`}
        icon={pnlUp ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
        accent={pnlUp ? 'text-emerald-600' : 'text-rose-600'}
      />
      <StatCard
        title="Open Positions"
        value={String(stats?.positionsOpen ?? 0)}
        sub={`${stats?.filledOrders ?? 0} orders filled`}
        icon={<TrendingUp className="size-4" />}
        accent="text-amber-600"
      />
      <StatCard
        title="News Ingested"
        value={String(stats?.newsIngested ?? 0)}
        sub={`${stats?.decisions ?? 0} decisions`}
        icon={<Newspaper className="size-4" />}
        accent="text-sky-600"
      />
    </div>
  )
}

function StatCard({
  title, value, sub, icon, accent,
}: { title: string; value: string; sub: string; icon: React.ReactNode; accent: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </CardTitle>
            <span className={accent}>{icon}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function AgentHeader({
  running, connected, mode,
}: { running: boolean; connected: boolean; mode: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center text-white shadow-lg">
          <Activity className="size-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            NewsFlow Trader
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Autonomous LLM news-driven trading agent · Alpaca AI Trading Agents Hackathon
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={running ? 'default' : 'secondary'} className="gap-1.5">
          <span className={`size-2 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
          {running ? 'AGENT RUNNING' : 'AGENT IDLE'}
        </Badge>
        <Badge variant={connected ? 'outline' : 'secondary'} className="gap-1.5">
          <span className={`size-2 rounded-full ${connected ? 'bg-sky-500' : 'bg-muted-foreground/40'}`} />
          {connected ? 'LIVE FEED' : 'OFFLINE'}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          {mode === 'paper' ? 'PAPER' : 'LIVE'} · ALPACA
        </Badge>
      </div>
    </div>
  )
}

export function AgentControlCard({
  running, onToggle, onRunOnce, onCloseAll, busy,
}: {
  running: boolean
  busy: boolean
  onToggle: () => void
  onRunOnce: () => void
  onCloseAll: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="size-4 text-emerald-600" />
          Agent Control
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          onClick={onToggle}
          disabled={busy}
          className={`w-full ${running ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {busy ? 'Working…' : running ? 'Pause Agent' : 'Start Agent'}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onRunOnce} disabled={busy} variant="outline">
            Run Once
          </Button>
          <Button onClick={onCloseAll} disabled={busy} variant="outline">
            Close All
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed pt-2">
          The agent reads news headlines, runs LLM sentiment analysis (z-ai-web-dev-sdk, GLM-4.6),
          passes every proposed trade through a risk guard, then submits approved orders to
          Alpaca&apos;s paper trading API.
        </p>
      </CardContent>
    </Card>
  )
}

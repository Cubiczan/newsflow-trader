'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { StatsRow, AgentHeader, AgentControlCard, type PortfolioStats } from '@/components/dashboard/StatsRow'
import { NewsFeed, type NewsItemDTO } from '@/components/dashboard/NewsFeed'
import { PositionsCard, type PositionDTO } from '@/components/dashboard/PositionsCard'
import { AgentLog } from '@/components/dashboard/AgentLog'
import { ConfigCard, type ConfigDTO } from '@/components/dashboard/ConfigCard'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { Footer } from '@/components/dashboard/Footer'

import { useAgentEvents, getAgentSocket } from '@/lib/agent/client'

export default function HomePage() {
  const { events, connected } = useAgentEvents(200)
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('paper')
  const qc = useQueryClient()

  // Refetch whenever a new agent event arrives (cheap way to keep UI live)
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['portfolio'] })
    qc.invalidateQueries({ queryKey: ['positions'] })
    qc.invalidateQueries({ queryKey: ['news'] })
  }, [events.length, qc])

  const portfolio = useQuery<PortfolioStats>({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const r = await fetch('/api/portfolio')
      if (!r.ok) throw new Error('portfolio fetch failed')
      return r.json()
    },
    refetchInterval: 5000,
  })

  const positions = useQuery<PositionDTO[]>({
    queryKey: ['positions'],
    queryFn: async () => {
      const r = await fetch('/api/positions')
      if (!r.ok) throw new Error('positions fetch failed')
      const j = await r.json()
      return j.positions
    },
    refetchInterval: 5000,
  })

  const news = useQuery<NewsItemDTO[]>({
    queryKey: ['news'],
    queryFn: async () => {
      const r = await fetch('/api/news?limit=50')
      if (!r.ok) throw new Error('news fetch failed')
      const j = await r.json()
      return j.items
    },
    refetchInterval: 8000,
  })

  const config = useQuery<ConfigDTO>({
    queryKey: ['config'],
    queryFn: async () => {
      const r = await fetch('/api/config')
      if (!r.ok) throw new Error('config fetch failed')
      return r.json()
    },
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (config.data) {
      setRunning(config.data.running)
      setMode(config.data.mode)
    }
  }, [config.data])

  // Listen for status events that say "agent loop started/stopped" so UI tracks even on hard refresh
  useEffect(() => {
    const last = events[0]
    if (!last) return
    if (last.type === 'status') {
      if (last.message.includes('started')) setRunning(true)
      if (last.message.includes('stopped')) setRunning(false)
    }
  }, [events])

  const toggleAgent = useCallback(async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/agent/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ running: !running }),
      })
      if (!r.ok) throw new Error('toggle failed')
      const j = await r.json()
      setRunning(j.running ?? !running)
      toast.success(j.running ? 'Agent started' : 'Agent paused')
    } catch (e: any) {
      toast.error('Could not reach agent-service: ' + (e?.message ?? 'unknown'))
    } finally {
      setBusy(false)
    }
  }, [running])

  const runOnce = useCallback(async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/agent/run', { method: 'POST' })
      if (!r.ok) throw new Error('run failed')
      toast.success('Tick requested — watch the log')
    } catch (e: any) {
      toast.error('Could not reach agent-service: ' + (e?.message ?? 'unknown'))
    } finally {
      setBusy(false)
    }
  }, [])

  const closeAll = useCallback(async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/agent/close-all', { method: 'POST' })
      if (!r.ok) throw new Error('close-all failed')
      toast.success('Close-all requested')
    } catch (e: any) {
      toast.error('Could not reach agent-service: ' + (e?.message ?? 'unknown'))
    } finally {
      setBusy(false)
    }
  }, [])

  const closePosition = useCallback(async (symbol: string) => {
    try {
      const r = await fetch(`/api/positions/${encodeURIComponent(symbol)}`, { method: 'POST' })
      if (!r.ok) throw new Error('close failed')
      toast.success(`Close requested for ${symbol}`)
      qc.invalidateQueries({ queryKey: ['positions'] })
    } catch (e: any) {
      toast.error('Close failed: ' + (e?.message ?? 'unknown'))
    }
  }, [qc])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col gap-4 sm:gap-6">
        <AgentHeader running={running} connected={connected} mode={mode} />

        <DemoModeBanner demoMode={portfolio.data?.demoMode} />

        <StatsRow stats={portfolio.data} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            <AgentControlCard
              running={running}
              busy={busy}
              onToggle={toggleAgent}
              onRunOnce={runOnce}
              onCloseAll={closeAll}
            />
            <ConfigCard
              config={config.data}
              onSaved={() => qc.invalidateQueries({ queryKey: ['config'] })}
            />
          </div>

          <div className="lg:col-span-5">
            <NewsFeed items={news.data ?? []} loading={news.isLoading} />
          </div>

          <div className="lg:col-span-4">
            <PositionsCard
              positions={positions.data ?? []}
              onClose={closePosition}
            />
          </div>
        </div>

        <div className="lg:col-span-12">
          <AgentLog events={events} connected={connected} />
        </div>
      </div>
      <Footer />
    </div>
  )
}

// Ensure socket disconnects cleanly on unmount (no-op for SPA)
export function _cleanup() {
  getAgentSocket().disconnect()
}

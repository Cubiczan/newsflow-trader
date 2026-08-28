'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Settings2, Save, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface ConfigDTO {
  running: boolean
  mode: string
  tickIntervalSec: number
  maxPositions: number
  maxPositionPct: number
  sentimentThreshold: number
  watchlistCsv: string
  newsSourcesCsv: string
}

export function ConfigCard({ config, onSaved }: { config: ConfigDTO | undefined; onSaved: () => void }) {
  const [form, setForm] = useState<ConfigDTO | null>(config ?? null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config && !form) setForm(config)
  }, [config, form])

  if (!form) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Loading config…</CardContent>
      </Card>
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickIntervalSec: form.tickIntervalSec,
          maxPositions: form.maxPositions,
          maxPositionPct: form.maxPositionPct,
          sentimentThreshold: form.sentimentThreshold,
          watchlistCsv: form.watchlistCsv,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success('Config saved — agent will pick it up on next tick')
      onSaved()
    } catch (e: any) {
      toast.error('Save failed: ' + (e?.message ?? 'unknown'))
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (config) setForm({ ...config })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="size-4 text-violet-600" />
          Agent Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="watchlist" className="text-xs">Watchlist (comma-separated)</Label>
          <Input
            id="watchlist"
            value={form.watchlistCsv}
            onChange={(e) => setForm({ ...form, watchlistCsv: e.target.value })}
            className="text-xs font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tick interval</Label>
            <span className="text-xs font-mono text-muted-foreground">{form.tickIntervalSec}s</span>
          </div>
          <Slider
            value={[form.tickIntervalSec]}
            onValueChange={(v) => setForm({ ...form, tickIntervalSec: v[0] })}
            min={15}
            max={300}
            step={15}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Max positions</Label>
              <span className="text-xs font-mono text-muted-foreground">{form.maxPositions}</span>
            </div>
            <Slider
              value={[form.maxPositions]}
              onValueChange={(v) => setForm({ ...form, maxPositions: v[0] })}
              min={1}
              max={20}
              step={1}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Max position %</Label>
              <span className="text-xs font-mono text-muted-foreground">{(form.maxPositionPct * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[Math.round(form.maxPositionPct * 100)]}
              onValueChange={(v) => setForm({ ...form, maxPositionPct: v[0] / 100 })}
              min={1}
              max={25}
              step={1}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Sentiment confidence threshold</Label>
            <span className="text-xs font-mono text-muted-foreground">{form.sentimentThreshold.toFixed(2)}</span>
          </div>
          <Slider
            value={[Math.round(form.sentimentThreshold * 100)]}
            onValueChange={(v) => setForm({ ...form, sentimentThreshold: v[0] / 100 })}
            min={30}
            max={95}
            step={5}
          />
          <p className="text-[10px] text-muted-foreground">
            Only act when LLM sentiment confidence ≥ this value. Higher = fewer but safer trades.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving} size="sm" className="flex-1">
            <Save className="size-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button onClick={reset} disabled={saving} size="sm" variant="outline">
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Read-only helpers shared by Next.js API routes.
 * Talks directly to SQLite via the same Prisma schema the agent-service uses.
 * For write/control actions (run, toggle, close-all), the API route forwards
 * the command to the agent-service mini-service via socket.io.
 */

import { db } from '@/lib/db'

export interface AgentConfigDTO {
  running: boolean
  mode: string
  tickIntervalSec: number
  maxPositions: number
  maxPositionPct: number
  sentimentThreshold: number
  watchlistCsv: string
  newsSourcesCsv: string
}

export async function loadConfig(): Promise<AgentConfigDTO> {
  let cfg = await db.agentConfig.findUnique({ where: { id: 'default' } })
  if (!cfg) {
    cfg = await db.agentConfig.create({ data: { id: 'default' } })
  }
  return {
    running: cfg.running,
    mode: cfg.mode,
    tickIntervalSec: cfg.tickIntervalSec,
    maxPositions: cfg.maxPositions,
    maxPositionPct: cfg.maxPositionPct,
    sentimentThreshold: cfg.sentimentThreshold,
    watchlistCsv: cfg.watchlistCsv,
    newsSourcesCsv: cfg.newsSourcesCsv,
  }
}

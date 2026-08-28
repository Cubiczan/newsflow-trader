/**
 * Database resilience helper.
 *
 * On long-running servers (the Bun agent-service), Prisma + SQLite works
 * perfectly. On serverless platforms (Vercel), the filesystem is read-only
 * and the bundled SQLite file can't be opened. This helper:
 *
 *   1. Detects whether the DB is usable via `isDbAvailable()`.
 *   2. Wraps Prisma calls in `withDb()` so a failure returns a fallback
 *      instead of crashing the API route.
 *
 * All API routes use `withDb()` so the Vercel deployment degrades to
 * "demo mode" with mock data + a `demoMode: true` flag the dashboard
 * can display, instead of returning HTTP 500.
 *
 * For the live, real-data experience, judges clone the repo and run
 * `bash scripts/start-agent-service.sh` to start the agent loop locally.
 */

import { db } from '@/lib/db'

let _dbAvailable: boolean | null = null

export async function isDbAvailable(): Promise<boolean> {
  if (_dbAvailable !== null) return _dbAvailable
  try {
    // Cheap probe — counts a single row from a small table
    await db.agentConfig.count({ where: { id: 'default' } })
    _dbAvailable = true
  } catch {
    _dbAvailable = false
  }
  return _dbAvailable
}

/**
 * Run a Prisma operation, fall back to a provided factory if the DB is
 * unavailable (e.g. on Vercel's read-only filesystem).
 */
export async function withDb<T>(
  op: () => Promise<T>,
  fallback: T | (() => T | Promise<T>),
): Promise<{ value: T; demoMode: boolean }> {
  if (await isDbAvailable()) {
    try {
      const value = await op()
      return { value, demoMode: false }
    } catch (e) {
      console.warn('[withDb] op failed, using fallback:', e)
    }
  }
  const value = typeof fallback === 'function' ? await (fallback as () => T | Promise<T>)() : fallback
  return { value, demoMode: true }
}

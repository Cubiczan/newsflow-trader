import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Prisma client with a writable SQLite path that works on Vercel.
 *
 * Background: Vercel's serverless functions have a READ-ONLY filesystem.
 * Only `/tmp` is writable. The bundled SQLite DB at `db/custom.db` lives in
 * the read-only part of the deployment, so Prisma can't open it. The fix:
 * on each cold start, copy the bundled DB to `/tmp` and point DATABASE_URL
 * at the writable copy.
 *
 * This works for the hackathon demo:
 *   - The DB schema and any seeded data are preserved across the copy.
 *   - Within a warm function instance, writes persist.
 *   - Across cold starts, the DB is re-seeded from the bundled file.
 *
 * For a real production deployment with persistent writes, swap this for
 * Vercel Postgres / Neon / Turso (libSQL) by setting DATABASE_URL to a
 * `postgresql://` or `libsql://` URL. The schema in prisma/schema.prisma
 * already uses `datasource db { provider = "sqlite" ... }` — for Postgres,
 * change `provider = "postgresql"` and run `prisma migrate`.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __dbInitialized?: boolean
}

/**
 * If we're on a read-only filesystem (Vercel serverless), copy the bundled
 * SQLite file to /tmp (the only writable dir) and return the new file: URL.
 * Otherwise return the original DATABASE_URL unchanged.
 */
function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? 'file:/home/z/my-project/db/custom.db'
  if (!raw.startsWith('file:')) return raw

  // Resolve the actual path of the bundled DB. On Vercel, the standalone
  // build places it at `.next/standalone/db/custom.db` but at runtime the
  // process working dir is `.next/standalone/`, so relative paths work.
  const candidates = [
    raw.replace(/^file:/, ''),
    path.join(process.cwd(), 'db/custom.db'),
    path.join(process.cwd(), '.next/standalone/db/custom.db'),
    '/opt/.next/standalone/db/custom.db', // Vercel sometimes uses this
  ].filter(Boolean)

  // Find the first candidate that exists
  let srcPath = candidates.find((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  })

  // If none exist, fall back to the original (will fail gracefully)
  if (!srcPath) srcPath = raw.replace(/^file:/, '')

  // Detect read-only filesystem
  let readOnly = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV
  if (!readOnly) {
    try {
      fs.accessSync(path.dirname(srcPath), fs.constants.W_OK)
    } catch {
      readOnly = true
    }
  }
  if (!readOnly) return `file:${srcPath}`

  // Read-only: copy to /tmp (once per cold start)
  const tmpPath = '/tmp/newsflow-trader.db'
  if (!globalForPrisma.__dbInitialized) {
    try {
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, tmpPath)
        console.log(`[db] copied ${srcPath} → ${tmpPath}`)
      } else if (!fs.existsSync(tmpPath)) {
        // Source missing — create empty file so Prisma can open it.
        fs.writeFileSync(tmpPath, Buffer.alloc(0))
        console.log(`[db] source missing, created empty ${tmpPath}`)
      }
    } catch (e: any) {
      console.warn(`[db] copy failed: ${e?.message}`)
    }
    globalForPrisma.__dbInitialized = true
  }
  return `file:${tmpPath}`
}

const finalUrl = getDatabaseUrl()
if (finalUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = finalUrl
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

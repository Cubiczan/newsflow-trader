import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withDb } from '@/lib/agent/db-resilience'

export const dynamic = 'force-dynamic'

// GET /api/positions — list open positions
// Returns empty list when DB is unavailable (Vercel demo mode).
export async function GET() {
  const { value, demoMode } = await withDb(
    () => db.position.findMany({ where: { closedAt: null }, orderBy: { openedAt: 'desc' } }),
    () => [],
  )
  return NextResponse.json({ positions: value, demoMode })
}

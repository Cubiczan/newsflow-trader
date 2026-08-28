'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'
import { useState } from 'react'

/**
 * Demo-mode banner — shows when the API returns demoMode: true.
 * This happens on Vercel serverless (read-only filesystem, no agent-service)
 * or any other environment where the local SQLite DB isn't available.
 *
 * Tells judges: dashboard UI works, but the live agent loop needs a
 * long-running server (the Bun mini-service). Clone the repo and run
 * `bash scripts/start-agent-service.sh` for the full live experience.
 */
export function DemoModeBanner({ demoMode }: { demoMode?: boolean }) {
  const [dismissed, setDismissed] = useState(false)
  return (
    <AnimatePresence>
      {demoMode && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 mb-4 flex items-start gap-3"
        >
          <Info className="size-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-amber-900 dark:text-amber-100">
            <strong className="font-semibold">Demo mode.</strong> The dashboard
            UI is live, but the agent-service (Bun mini-service on port 3003)
            isn&apos;t running here — Vercel serverless can&apos;t host a
            long-running socket.io process or open the bundled SQLite database.
            <div className="mt-1.5 text-xs">
              <span className="font-medium">For the full live experience:</span>{' '}
              clone the repo, run{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">
                bash scripts/start-agent-service.sh
              </code>
              , then open{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">
                localhost:3000
              </code>
              . See <code>README.md</code> for details.
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 shrink-0 -mr-1"
            aria-label="Dismiss demo-mode banner"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

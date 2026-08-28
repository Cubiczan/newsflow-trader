'use client'

import { Heart, Github, Trophy } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 mt-auto">
      <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
          <span className="flex items-center gap-1.5">
            <Trophy className="size-3.5 text-amber-500" />
            Alpaca AI Trading Agents Hackathon · Aug 28 – Sep 4, 2026
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1">
            Built with <Heart className="size-3 text-rose-500" /> Next.js 16 · z-ai-web-dev-sdk · Alpaca Trading API · Prisma
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://lablab.ai/ai-hackathons/alpaca-ai-trading-agents-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            hackathon page
          </a>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <a
            href="https://alpaca.markets/docs/api-references/alpaca-trading-api/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Alpaca docs
          </a>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="flex items-center gap-1">
            <Github className="size-3" /> submission repo
          </span>
        </div>
      </div>
    </footer>
  )
}

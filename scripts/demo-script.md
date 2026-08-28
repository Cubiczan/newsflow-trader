# Demo Script — NewsFlow Trader · Alpaca AI Trading Agents Hackathon

> 3–5 minute walk-through for judges. Total runtime: ~4 minutes.

---

## 0. Before recording

- [ ] Dashboard open at the public preview URL
- [ ] Agent IDLE · LIVE FEED · PAPER · ALPACA badges visible in the header
- [ ] Stats row showing: Portfolio Equity $100,000 / Unrealized P&L $0 / Open Positions 0 / News Ingested 0
- [ ] Agent Activity Log at the bottom, dark terminal style, showing "waiting for agent events…"
- [ ] Optionally: real Alpaca paper keys in `.env` (not required — mock works perfectly)

**Voice intro (10 sec):**

> "Meet NewsFlow Trader — an autonomous LLM-driven trading agent that reads financial news, scores it for sentiment with GLM-4.6, applies a configurable risk guard, and submits paper orders to Alpaca's Trading API. Every decision is observable in real-time."

---

## 1. Show the dashboard layout (30 sec)

- Point at the **header badges** — explain "AGENT IDLE", "LIVE FEED" (socket connected), "PAPER · ALPACA" (paper trading mode).
- Point at the **stats row** — Portfolio Equity, Unrealized P&L, Open Positions, News Ingested.
- Mention the **three columns**: Agent Control + Config (left), News Feed (middle), Open Positions (right).
- Mention the **dark Activity Log** at the bottom — "this streams every agent decision live via WebSocket."

**Voice (15 sec):**

> "The dashboard has four KPI cards up top, a three-column working area with the agent's controls and configuration on the left, news in the middle, positions on the right, and a live activity log at the bottom."

---

## 2. Trigger a single tick (45 sec)

- Click **"Run Once"** button.
- Watch the Activity Log fill in real-time:
  - `TICK` — agent wakes up, watches 10 symbols
  - `TICK` — portfolio equity $100k, 0 positions
  - `NEWS` — e.g., *"NVIDIA Blackwell GPU shipments accelerate, hyperscaler orders booked through 2027"*
  - `LLM` — `NVDA BULLISH (conf 0.80, score 0.70)` — sentiment analysis with the LLM
  - `ORDER` — `NVDA BUY qty=46 → Alpaca`
  - `FILL` — `NVDA BUY filled (orderId mock-…)`
- Point at the **News Feed** card — see the new headline appear at the top with a `BULL +0.70` badge and the LLM's one-line reasoning underneath: *"Strong AI demand signals positive growth trajectory for NVIDIA."* Plus a `BUY · FILLED` chip.
- Point at the **Open Positions** card — NVDA appears with entry, last, market value, and P&L.

**Voice (30 sec):**

> "I click 'Run Once' — the agent wakes up, fetches a news headline, sends it to GLM-4.6 for sentiment analysis, and the model returns structured JSON: label, score, confidence, reasoning. The risk guard sees confidence above the threshold, the orchestrator submits a market order to Alpaca's paper API, and the fill appears in the live log and the Open Positions card simultaneously."

---

## 3. Start the autonomous loop (60 sec)

- Click **"Start Agent"**. The badge flips from "AGENT IDLE" to "AGENT RUNNING" (with a pulsing green dot).
- Let it run for ~30 seconds — multiple ticks fire automatically (60s default).
- Watch the News Feed fill up with 5–10 headlines, each tagged with sentiment + LLM reasoning + decision chip.
- Watch the Open Positions card grow to 3–5 positions with live P&L.
- Watch the Activity Log stream continuously — point out the `RISK` events: *"AAPL SELL rejected: sell: no existing position in AAPL"* — the risk guard preventing the agent from doing something stupid.

**Voice (40 sec):**

> "Now I start the autonomous loop — every 60 seconds the agent wakes up, fetches fresh headlines, scores them, and trades. Notice these 'RISK' events in the log — the agent wanted to short AAPL on a downgrade, but the risk guard blocked it because we don't hold AAPL. That's the configurable risk layer in action: max positions, max position size, sentiment confidence threshold, paper-only enforcement."

---

## 4. Show the configuration (45 sec)

- Scroll down to the **Agent Configuration** card.
- Point at the **Watchlist** input — currently `AAPL,MSFT,NVDA,TSLA,AMZN,META,GOOGL,JPM,XOM,SPY`.
- Show the three sliders:
  - **Tick interval** — 15 to 300 seconds
  - **Max positions** — 1 to 20
  - **Max position %** — 1% to 25%
  - **Sentiment confidence threshold** — 0.30 to 0.95
- Drag the **Sentiment threshold** slider up to 0.85 — explain that higher = fewer but safer trades.
- Click **Save**. Note the toast: "Config saved — agent will pick it up on next tick."

**Voice (30 sec):**

> "Every parameter is tunable from the UI — tick interval, max positions, max position size as % of portfolio, and the sentiment confidence threshold. I bump the threshold to 0.85 — now the agent will only act on headlines the LLM is highly confident about. Save, and the agent picks up the new config on the next tick."

---

## 5. Close all positions (30 sec)

- Click **"Close All"** button.
- Watch the Open Positions card empty out.
- The Activity Log shows `closed ${symbol} qty=...` events.

**Voice (15 sec):**

> "Finally, the 'Close All' button liquidates every open paper position — useful if the agent has gone rogue or you want a clean slate for the next demo."

---

## 6. Closing pitch (15 sec)

> "NewsFlow Trader is the full stack — Alpaca Trading API for execution, GLM-4.6 for sentiment, a configurable risk guard, a Prisma-backed persistence layer, and a live Next.js dashboard with WebSocket streaming. Every decision is auditable, every trade is paper, every parameter is tunable. Built for the Alpaca AI Trading Agents Hackathon in a single Next.js monorepo. Thank you."

---

## Backup slides if asked

**"How does the LLM return structured JSON?"**
- The system prompt mandates `{label, score, confidence, reasoning}` JSON output only.
- We use `response_format: { type: 'json_object' }` on the z-ai SDK call.
- If parsing fails or the SDK is unavailable, a keyword-based fallback keeps the agent running.

**"What about real news?"**
- The mock source is for the demo. Real sources plug into `NewsFetcher` as new adapters: Alpaca News API, Benzinga, Finnhub, or any RSS feed via `page_reader`.

**"What about the MCP server?"**
- This build uses the REST SDK for determinism. The same operations can be invoked via Alpaca's MCP server (Claude/Cursor) for a natural-language interface — left as a TODO.

**"Can it go live?"**
- The risk guard refuses live orders in this build. Flip `ALPACA_PAPER=false` + add real keys + remove the paperOnly check in `risk.ts` to go live. **Never do this in a hackathon.**

---

Total: ~4 minutes. Practice the timing — the live agent runs for ~30 sec during step 3, which is your longest "waiting" gap. Use it to explain the architecture diagram if you have one on screen.

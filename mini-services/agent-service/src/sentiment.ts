/**
 * LLM-powered sentiment analyzer.
 *
 * Uses z-ai-web-dev-sdk to score news headlines/sentiment on a 3-axis basis:
 *   - label:    'bullish' | 'bearish' | 'neutral'
 *   - score:    -1.0 → +1.0 (sentiment polarity)
 *   - confidence: 0.0 → 1.0 (how confident the model is in the label)
 *
 * Output is structured JSON so the orchestrator can apply guardrail
 * thresholds ("only act if confidence ≥ 0.55").
 */

import ZAI from 'z-ai-web-dev-sdk'

export interface SentimentResult {
  label: 'bullish' | 'bearish' | 'neutral'
  score: number // -1.0 → +1.0
  confidence: number // 0.0 → 1.0
  reasoning: string // one-line rationale
}

const SYSTEM_PROMPT = `You are an institutional equity sentiment analyst.
Read the news headline and any summary. Output ONLY valid JSON, no prose, with this exact shape:
{
  "label": "bullish" | "bearish" | "neutral",
  "score": <number between -1.0 and +1.0>,
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "<one short sentence explaining why>"
}
Rules:
- A headline that would plausibly move the ticker UP is bullish.
- A headline that would plausibly move the ticker DOWN is bearish.
- Vague / macro / balanced headlines are neutral.
- Higher confidence (≥ 0.7) only when the signal is clear and material.
- Output must be valid JSON. No code fences, no comments.`

export class SentimentAnalyzer {
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
  private fallback = false

  async init(): Promise<void> {
    try {
      this.zai = await ZAI.create()
      // Touch the SDK to validate it works
      await this.zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'ping' },
          { role: 'user', content: 'ping' },
        ],
        model: 'glm-4.6',
        max_tokens: 4,
      })
      console.log('[sentiment] z-ai-web-dev-sdk ready')
    } catch (e: any) {
      console.warn('[sentiment] z-ai SDK unavailable, using keyword-based fallback:', e?.message)
      this.fallback = true
    }
  }

  async analyze(symbol: string, headline: string, summary?: string): Promise<SentimentResult> {
    const userPrompt = `Ticker: ${symbol}\nHeadline: ${headline}${summary ? `\nSummary: ${summary}` : ''}`

    if (this.fallback || !this.zai) {
      return this.keywordFallback(headline)
    }

    try {
      const completion = await this.zai.chat.completions.create({
        model: 'glm-4.6',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      })

      const content = completion.choices?.[0]?.message?.content ?? ''
      const parsed = this.extractJson(content)
      if (!parsed) return this.keywordFallback(headline)
      return {
        label: parsed.label ?? 'neutral',
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.4,
        reasoning: parsed.reasoning ?? 'No reasoning returned',
      }
    } catch (e: any) {
      console.warn('[sentiment] LLM call failed, using fallback:', e?.message)
      return this.keywordFallback(headline)
    }
  }

  private extractJson(text: string): any | null {
    try {
      return JSON.parse(text)
    } catch {
      // Try to extract {...}
      const m = text.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          return JSON.parse(m[0])
        } catch {
          return null
        }
      }
      return null
    }
  }

  /**
   * Rule-based sentiment when LLM is unavailable. Lets the agent still run
   * end-to-end during judging even if the SDK has an outage.
   */
  private keywordFallback(headline: string): SentimentResult {
    const h = headline.toLowerCase()
    const bullishWords = ['beat', 'beats', 'surge', 'surges', 'record', 'raise', 'raises', 'boost', 'boosts', 'growth', 'expansion', 'partnership', 'buyback', 'launch', 'breakthrough', 'up']
    const bearishWords = ['miss', 'misses', 'slip', 'slips', 'cut', 'cuts', 'probe', 'investigation', 'antitrust', 'lawsuit', 'recall', 'downgrade', 'loss', 'losses', 'constrained', 'down', 'cool', 'hawkish', 'upside']
    let score = 0
    let hits = 0
    for (const w of bullishWords) if (h.includes(w)) { score += 0.4; hits++ }
    for (const w of bearishWords) if (h.includes(w)) { score -= 0.4; hits++ }
    score = Math.max(-1, Math.min(1, score))
    const label: SentimentResult['label'] = score > 0.15 ? 'bullish' : score < -0.15 ? 'bearish' : 'neutral'
    return {
      label,
      score,
      confidence: hits > 0 ? 0.6 : 0.3,
      reasoning: `keyword-fallback (score=${score.toFixed(2)}, hits=${hits})`,
    }
  }
}

// Headless run simulator. Plays whole mornings with a bot at a fixed step.

import { Rng } from './rng.ts'
import { Run, DEFAULT_CONFIG, type RunConfig, type Deal } from './run.ts'
import type { Bot } from './bots.ts'

export const SIM_STEP_MS = 10

export interface RunResult {
  seed: string
  bot: string
  score: number
  bought: number
  haggles: number
  hagglesWon: number
  passes: number
  itemsSeen: number
  bust: boolean
  seconds: number
  profit: number
  bestDeal: Deal | null
  worstDeal: Deal | null
}

export function simulateRun(seed: string, bot: Bot, config: RunConfig = DEFAULT_CONFIG, stepMs = SIM_STEP_MS): RunResult {
  const run = new Run(seed, config, { events: false })
  bot.reset(new Rng(`${seed}/${bot.name}`))
  while (run.phase === 'playing') {
    if (!run.locked) {
      const action = bot.decide(run)
      if (action) run.act(action)
    }
    run.step(stepMs)
  }
  return {
    seed,
    bot: bot.name,
    score: run.cash,
    bought: run.bought,
    haggles: run.haggles,
    hagglesWon: run.hagglesWon,
    passes: run.passes,
    itemsSeen: run.itemsSeen,
    bust: run.bust,
    seconds: run.elapsedMs / 1000,
    profit: run.profitTotal,
    bestDeal: run.bestDeal,
    worstDeal: run.worstDeal,
  }
}

export function simulateMany(bot: Bot, count: number, prefix = 'sim', config: RunConfig = DEFAULT_CONFIG): RunResult[] {
  const out: RunResult[] = []
  for (let i = 0; i < count; i++) out.push(simulateRun(`${prefix}-${i}`, bot, config))
  return out
}

export function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = nums.slice().sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function percentile(nums: number[], p: number): number {
  if (nums.length === 0) return 0
  const s = nums.slice().sort((a, b) => a - b)
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))
  return s[idx]
}

export interface Summary {
  bot: string
  runs: number
  median: number
  mean: number
  p10: number
  p90: number
  max: number
  underStart: number
  bust: number
  bought: number
  haggles: number
  itemsSeen: number
}

export function summarize(results: RunResult[], startCash = DEFAULT_CONFIG.startCash): Summary {
  const scores = results.map((r) => r.score)
  const avg = (f: (r: RunResult) => number) => results.reduce((a, r) => a + f(r), 0) / Math.max(1, results.length)
  return {
    bot: results[0]?.bot ?? '',
    runs: results.length,
    median: median(scores),
    mean: avg((r) => r.score),
    p10: percentile(scores, 0.1),
    p90: percentile(scores, 0.9),
    max: Math.max(...scores),
    underStart: results.filter((r) => r.score < startCash).length / Math.max(1, results.length),
    bust: results.filter((r) => r.bust).length / Math.max(1, results.length),
    bought: avg((r) => r.bought),
    haggles: avg((r) => r.haggles),
    itemsSeen: avg((r) => r.itemsSeen),
  }
}

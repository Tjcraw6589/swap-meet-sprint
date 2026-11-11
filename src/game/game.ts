// The game: screens, the current run, and everything the renderer needs to
// draw. Pure state, no DOM. Driven by the fixed step loop and by input.

import { Run, DEFAULT_CONFIG, type Action, type ActionResult, type RunEvent, type Deal } from '../core/run.ts'
import type { Platform } from '../platform/types.ts'
import { track } from './events.ts'

export type Screen = 'play' | 'result'
export type Mode = 'free' | 'daily'

export interface Stamp {
  text: string
  kind: 'deal' | 'nodeal'
  until: number
}

export interface SalePop {
  slot: number
  profit: number
  until: number
}

export interface GameOptions {
  seed?: string
  mode?: Mode
}

export interface ResultSummary {
  score: number
  start: number
  bestDeal: Deal | null
  worstDeal: Deal | null
  bought: number
  haggles: number
  bust: boolean
  seed: string
  mode: Mode
}

const STAMP_MS = 600
const SALE_POP_MS = 900

export function freePlaySeed(): string {
  const r = Math.floor(Math.random() * 0xffffffff).toString(36)
  return `free-${Date.now().toString(36)}-${r}`
}

export class Game {
  readonly platform: Platform
  screen: Screen = 'play'
  run!: Run
  seed = ''
  mode: Mode = 'free'
  /** Game time in ms. Advances by the fixed step. */
  clock = 0
  stamp: Stamp | null = null
  salePops: SalePop[] = []
  result: ResultSummary | null = null
  resultAt = 0
  runsFinished = 0

  constructor(platform: Platform, opts: GameOptions = {}) {
    this.platform = platform
    this.startRun(opts.seed, opts.mode ?? 'free')
  }

  startRun(seed?: string, mode: Mode = 'free'): void {
    this.mode = mode
    this.seed = seed ?? freePlaySeed()
    this.run = new Run(this.seed, DEFAULT_CONFIG)
    this.screen = 'play'
    this.stamp = null
    this.salePops = []
    this.result = null
    track('run_start', { mode: this.mode, seed: this.seed })
    this.platform.lifecycle.gameplayStart()
  }

  playAgain(): void {
    this.startRun(undefined, 'free')
  }

  update(stepMs: number): void {
    this.clock += stepMs
    if (this.screen === 'play') {
      this.run.step(stepMs)
      this.drainEvents()
      if (this.run.phase === 'ended') this.endRun()
    }
    if (this.stamp && this.clock >= this.stamp.until) this.stamp = null
    this.salePops = this.salePops.filter((p) => this.clock < p.until)
  }

  /** A player action from any input device. Returns null when it did nothing. */
  action(a: Action): ActionResult | null {
    if (this.screen !== 'play') return null
    const run = this.run
    if (run.locked) return null
    const item = run.current!.item
    const seconds = run.secondsOnItem
    const result = run.act(a)
    if (result === 'blocked') return null
    track('item_decision', { action: a, tier: item.tier, seconds: Math.round(seconds * 100) / 100, result })
    if (result === 'deal') this.stamp = { text: 'DEAL', kind: 'deal', until: this.clock + STAMP_MS }
    if (result === 'nodeal') this.stamp = { text: 'NO DEAL', kind: 'nodeal', until: this.clock + DEFAULT_CONFIG.haggleFailLockMs }
    this.drainEvents()
    return result
  }

  private drainEvents(): void {
    const events: RunEvent[] = this.run.events
    for (const ev of events) {
      if (ev.type === 'sale') {
        this.salePops.push({ slot: ev.slot, profit: ev.deal.profit, until: this.clock + SALE_POP_MS })
        this.platform.haptics.tap('sale')
      } else if (ev.type === 'buy') {
        this.platform.haptics.tap('buy')
      }
    }
    events.length = 0
  }

  private endRun(): void {
    const run = this.run
    this.runsFinished++
    this.result = {
      score: run.cash,
      start: run.config.startCash,
      bestDeal: run.bestDeal,
      worstDeal: run.worstDeal,
      bought: run.bought,
      haggles: run.haggles,
      bust: run.bust,
      seed: this.seed,
      mode: this.mode,
    }
    this.screen = 'result'
    this.resultAt = this.clock
    track('run_end', {
      score: run.cash,
      bought: run.bought,
      haggles: run.haggles,
      bust: run.bust,
      seconds: Math.round(run.elapsedMs / 100) / 10,
    })
    this.platform.lifecycle.gameplayStop()
  }

  shareText(): string {
    const r = this.result
    if (!r) return ''
    return `Swap Meet Sprint: $${r.start} into $${r.score.toLocaleString('en-US')} in one morning.`
  }

  async share(): Promise<boolean> {
    track('share_tapped', { score: this.result?.score ?? 0 })
    return this.platform.share.share(this.shareText())
  }
}

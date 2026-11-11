// The run state machine: one morning of 60 seconds, advanced by fixed steps.
// It knows nothing about rendering, input devices or sound. The game and the
// headless simulator both drive this class.

import { generateItem, priceItem, dollars, HAGGLE_ROLLS, SELLER_TABLE, type PricedItem, type Clue, type Tier } from './items.ts'

export interface RunConfig {
  durationMs: number
  startCash: number
  stallSlots: number
  holdMs: number
  haggleCut: number
  haggleFailLockMs: number
  clueTimesMs: readonly number[]
  minNetWorth: number
  /** Time for a new item to slide in before it accepts input. tune */
  slideInMs: number
  /** Time the DEAL stamp holds input after a won haggle. tune */
  haggleWinLockMs: number
}

export const DEFAULT_CONFIG: RunConfig = {
  durationMs: 60_000,
  startCash: 50,
  stallSlots: 4,
  holdMs: 4000,
  haggleCut: 0.25,
  haggleFailLockMs: 1200,
  clueTimesMs: [0, 700, 1400],
  minNetWorth: 50,
  slideInMs: 350,
  haggleWinLockMs: 450,
}

export type Action = 'buy' | 'haggle' | 'pass'
export type ActionResult = 'ok' | 'deal' | 'nodeal' | 'blocked'

export interface StallEntry {
  item: PricedItem
  paid: number
  sellAtMs: number
  slot: number
}

export interface Deal {
  item: PricedItem
  paid: number
  sold: number
  profit: number
}

export interface Decision {
  index: number
  action: Action
  result: ActionResult
  tier: Tier
  secondsOnItem: number
}

export interface CurrentItem {
  item: PricedItem
  readyAtMs: number
  haggles: number
  ask: number
}

export type RunEvent =
  | { type: 'item'; item: PricedItem }
  | { type: 'buy'; item: PricedItem; paid: number; slot: number }
  | { type: 'deal'; item: PricedItem; ask: number }
  | { type: 'nodeal'; item: PricedItem }
  | { type: 'pass'; item: PricedItem }
  | { type: 'sale'; deal: Deal; slot: number }
  | { type: 'end'; bust: boolean; cash: number }

export class Run {
  readonly seed: string
  readonly config: RunConfig
  elapsedMs = 0
  cash: number
  stall: StallEntry[] = []
  current: CurrentItem | null = null
  nextIndex = 0
  lockUntilMs = 0
  phase: 'playing' | 'ended' = 'playing'
  bust = false
  itemsSeen = 0
  bought = 0
  haggles = 0
  hagglesWon = 0
  passes = 0
  profitTotal = 0
  bestDeal: Deal | null = null
  worstDeal: Deal | null = null
  decisions: Decision[] = []
  events: RunEvent[] = []
  private collectEvents: boolean

  constructor(seed: string, config: RunConfig = DEFAULT_CONFIG, opts: { events?: boolean } = {}) {
    this.seed = seed
    this.config = config
    this.cash = config.startCash
    this.collectEvents = opts.events ?? true
    this.spawn(this.config.slideInMs)
  }

  get timeLeftMs(): number {
    return Math.max(0, this.config.durationMs - this.elapsedMs)
  }

  get netWorth(): number {
    let n = this.cash
    for (const e of this.stall) n += e.paid
    return Math.max(this.config.minNetWorth, n)
  }

  get stallFull(): boolean {
    return this.stall.length >= this.config.stallSlots
  }

  /** Milliseconds until the next stall item sells, or Infinity when the stall is empty. */
  get nextSaleInMs(): number {
    let best = Infinity
    for (const e of this.stall) best = Math.min(best, e.sellAtMs - this.elapsedMs)
    return best
  }

  get locked(): boolean {
    return this.phase !== 'playing' || this.current === null || this.elapsedMs < this.lockUntilMs
  }

  /** Seconds the current item has been ready for a decision. Negative while it slides in. */
  get secondsOnItem(): number {
    if (!this.current) return 0
    return (this.elapsedMs - this.current.readyAtMs) / 1000
  }

  /** Clues revealed so far on the current item, in reveal order. */
  get cluesShown(): Clue[] {
    const c = this.current
    if (!c) return []
    const since = this.elapsedMs - c.readyAtMs
    let n = 0
    for (let i = 0; i < c.item.clues.length && i < this.config.clueTimesMs.length; i++) {
      if (since >= this.config.clueTimesMs[i]) n = i + 1
    }
    return c.item.clues.slice(0, n)
  }

  get canBuy(): boolean {
    return !this.locked && !this.stallFull && this.current !== null && this.cash >= this.current.ask
  }

  get canHaggle(): boolean {
    return !this.locked && this.current !== null && this.current.haggles < HAGGLE_ROLLS
  }

  get canPass(): boolean {
    return !this.locked
  }

  /** Chance the next haggle on the current item succeeds. */
  get haggleChance(): number {
    const c = this.current
    if (!c) return 0
    return SELLER_TABLE[c.item.sellerType].haggle * Math.pow(0.5, c.haggles)
  }

  act(action: Action): ActionResult {
    if (action === 'buy') return this.buy()
    if (action === 'haggle') return this.haggle()
    return this.pass()
  }

  buy(): ActionResult {
    if (!this.canBuy) return 'blocked'
    const c = this.current!
    const paid = c.ask
    this.cash -= paid
    const slot = this.freeSlot()
    this.stall.push({ item: c.item, paid, sellAtMs: this.elapsedMs + this.config.holdMs, slot })
    this.bought++
    this.record(c, 'buy', 'ok')
    this.emit({ type: 'buy', item: c.item, paid, slot })
    this.spawn(this.elapsedMs + this.config.slideInMs)
    return 'ok'
  }

  haggle(): ActionResult {
    if (!this.canHaggle) return 'blocked'
    const c = this.current!
    const chance = this.haggleChance
    const roll = c.item.haggleRolls[c.haggles]
    this.haggles++
    if (roll < chance) {
      c.ask = dollars(c.ask * (1 - this.config.haggleCut))
      c.haggles++
      this.hagglesWon++
      this.lockUntilMs = this.elapsedMs + this.config.haggleWinLockMs
      this.record(c, 'haggle', 'deal')
      this.emit({ type: 'deal', item: c.item, ask: c.ask })
      return 'deal'
    }
    this.record(c, 'haggle', 'nodeal')
    this.emit({ type: 'nodeal', item: c.item })
    this.spawn(this.elapsedMs + this.config.haggleFailLockMs)
    return 'nodeal'
  }

  pass(): ActionResult {
    if (!this.canPass) return 'blocked'
    const c = this.current!
    this.passes++
    this.record(c, 'pass', 'ok')
    this.emit({ type: 'pass', item: c.item })
    this.spawn(this.elapsedMs + this.config.slideInMs)
    return 'ok'
  }

  /** Advance the morning by a fixed step. */
  step(dtMs: number): void {
    if (this.phase !== 'playing') return
    this.elapsedMs += dtMs
    for (let i = this.stall.length - 1; i >= 0; i--) {
      const e = this.stall[i]
      if (e.sellAtMs <= this.elapsedMs) {
        this.stall.splice(i, 1)
        this.sell(e)
      }
    }
    if (this.elapsedMs >= this.config.durationMs) {
      this.elapsedMs = this.config.durationMs
      const left = this.stall
      this.stall = []
      for (const e of left) this.sell(e)
      this.end(false)
      return
    }
    if (this.cash < 1 && this.stall.length === 0) {
      this.end(true)
    }
  }

  private freeSlot(): number {
    const used = new Set(this.stall.map((e) => e.slot))
    for (let s = 0; s < this.config.stallSlots; s++) if (!used.has(s)) return s
    return 0
  }

  private sell(e: StallEntry): void {
    const sold = e.item.trueValue
    this.cash += sold
    const deal: Deal = { item: e.item, paid: e.paid, sold, profit: sold - e.paid }
    this.profitTotal += deal.profit
    if (!this.bestDeal || deal.profit > this.bestDeal.profit) this.bestDeal = deal
    if (!this.worstDeal || deal.profit < this.worstDeal.profit) this.worstDeal = deal
    this.emit({ type: 'sale', deal, slot: e.slot })
  }

  private spawn(readyAtMs: number): void {
    const template = generateItem(this.seed, this.nextIndex++)
    const item = priceItem(template, this.netWorth)
    this.current = { item, readyAtMs, haggles: 0, ask: item.ask }
    this.lockUntilMs = readyAtMs
    this.itemsSeen++
    this.emit({ type: 'item', item })
  }

  private end(bust: boolean): void {
    this.phase = 'ended'
    this.bust = bust
    this.current = null
    this.emit({ type: 'end', bust, cash: this.cash })
  }

  private record(c: CurrentItem, action: Action, result: ActionResult): void {
    this.decisions.push({ index: c.item.index, action, result, tier: c.item.tier, secondsOnItem: this.secondsOnItem })
  }

  private emit(ev: RunEvent): void {
    if (this.collectEvents) this.events.push(ev)
  }
}

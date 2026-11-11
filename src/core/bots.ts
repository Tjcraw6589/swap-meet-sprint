// Headless players. Bots only see what a real player sees: the guide price,
// the ask, the seller's face and the clues revealed so far. Hidden traits and
// the true value stay hidden.

import type { Rng } from './rng.ts'
import type { Run, Action } from './run.ts'
import {
  CONDITION_TABLE,
  CONDITIONS,
  FAKE_TABLE,
  BOXED_TABLE,
  SELLER_TABLE,
  dollars,
  isGoodOrBetter,
  tierFromShare,
  type Condition,
  type Clue,
} from './items.ts'

export interface Bot {
  readonly name: string
  reset(rng: Rng): void
  /** Called every step while the current item accepts input. Return null to wait. */
  decide(run: Run): Action | null
}

/** Picks a random moment and a random action for every item. */
export class RandomBot implements Bot {
  readonly name = 'random'
  private rng!: Rng
  private planKey = ''
  private actAt = 0
  private action: Action = 'pass'

  reset(rng: Rng): void {
    this.rng = rng
    this.planKey = ''
  }

  decide(run: Run): Action | null {
    const c = run.current!
    const key = `${c.item.index}:${c.haggles}`
    if (key !== this.planKey) {
      this.planKey = key
      this.actAt = run.secondsOnItem + this.rng.float(0.2, 2.0)
      this.action = this.rng.pick(['buy', 'haggle', 'pass'] as const)
    }
    if (run.secondsOnItem < this.actAt) return null
    if (this.action === 'buy' && !run.canBuy) return 'pass'
    if (this.action === 'haggle' && !run.canHaggle) return 'pass'
    return this.action
  }
}

/** Buys everything it can afford as soon as it can. */
export class AlwaysBuyBot implements Bot {
  readonly name = 'alwaysbuy'
  reactionS = 0.3

  reset(): void {}

  decide(run: Run): Action | null {
    if (run.secondsOnItem < this.reactionS) return null
    if (run.canBuy) return 'buy'
    if (run.stallFull) return null
    // Cannot afford it. Wait if money is on its way back, else move on.
    if (run.stall.length > 0) return null
    return 'pass'
  }
}

export interface ClueReaderParams {
  /** Seconds after a clue appears before the bot can act on it. */
  reactionS: number
  /** Value of one second of the morning as a share of net worth. */
  timeValue: number
  /** Extra cost of tying cash up on the stall, as a share of the ask. */
  holdCost: number
  /** How much of the perfect information value a wait is expected to deliver. */
  infoQuality: number
  /** Longest wait for a stall slot or for cash before giving up on an item, in seconds. */
  maxSlotWaitS: number
}

export const CLUE_READER_DEFAULTS: ClueReaderParams = {
  reactionS: 0.2,
  timeValue: 0.03,
  holdCost: 0.15,
  infoQuality: 0.8,
  maxSlotWaitS: 1.5,
}

interface Belief {
  cond: number[] // probability per condition in CONDITIONS order
  pFake: number
  pBoxed: number
}

function believe(run: Run): Belief {
  const c = run.current!
  const tier = tierFromShare(c.item.guide / c.item.pricedAt)
  const belief: Belief = {
    cond: CONDITIONS.map((k) => CONDITION_TABLE[k].share),
    pFake: isGoodOrBetter(tier) ? FAKE_TABLE.share : 0,
    pBoxed: BOXED_TABLE.share,
  }
  const shown: Clue[] = run.cluesShown
  // Speech bubbles first, chips last, because chips are always true.
  const ordered = shown.filter((k) => k.kind === 'bubble').concat(shown.filter((k) => k.kind === 'chip'))
  for (const clue of ordered) {
    if (clue.kind === 'chip') {
      if (clue.trait === 'condition') belief.cond = CONDITIONS.map((k) => (k === clue.claim ? 1 : 0))
      else if (clue.trait === 'authenticity') belief.pFake = clue.claim === 'fake' ? 1 : 0
      else belief.pBoxed = clue.claim === 'boxed' ? 1 : 0
    } else {
      const t = 0.7
      if (clue.trait === 'condition') {
        const other = (1 - t) / (CONDITIONS.length - 1)
        const post = belief.cond.map((p, i) => p * (CONDITIONS[i] === clue.claim ? t : other))
        const sum = post.reduce((a, b) => a + b, 0)
        belief.cond = post.map((p) => p / sum)
      } else if (clue.trait === 'authenticity') {
        if (belief.pFake > 0 && belief.pFake < 1) {
          const likeFake = clue.claim === 'fake' ? t : 1 - t
          const likeReal = clue.claim === 'real' ? t : 1 - t
          const pf = belief.pFake * likeFake
          const pr = (1 - belief.pFake) * likeReal
          belief.pFake = pf / (pf + pr)
        }
      } else if (belief.pBoxed > 0 && belief.pBoxed < 1) {
        const likeBoxed = clue.claim === 'boxed' ? t : 1 - t
        const likeLoose = clue.claim === 'unboxed' ? t : 1 - t
        const pb = belief.pBoxed * likeBoxed
        const pl = (1 - belief.pBoxed) * likeLoose
        belief.pBoxed = pb / (pb + pl)
      }
    }
  }
  return belief
}

/** Reads the clues, weighs every outcome and picks the action with the best expected profit. */
export class ClueReaderBot implements Bot {
  readonly name = 'cluereader'
  params: ClueReaderParams

  constructor(params: Partial<ClueReaderParams> = {}) {
    this.params = { ...CLUE_READER_DEFAULTS, ...params }
  }

  reset(): void {}

  decide(run: Run): Action | null {
    const p = this.params
    const c = run.current!
    const shown = run.cluesShown.length
    const total = Math.min(c.item.clues.length, run.config.clueTimesMs.length)
    const t = run.secondsOnItem
    const lastClueAt = shown > 0 ? run.config.clueTimesMs[shown - 1] / 1000 : 0
    if (t < lastClueAt + p.reactionS) return null

    const belief = believe(run)
    const guide = c.item.guide
    const ask = c.ask
    const n = run.netWorth
    const holdMult = 1 + p.holdCost
    const chance = run.haggleChance
    const haggledAsk = dollars(ask * (1 - run.config.haggleCut))
    const failCost = ((run.config.haggleFailLockMs - run.config.slideInMs) / 1000) * p.timeValue * n
    const canHaggleToBuy = run.canHaggle && haggledAsk <= run.cash

    // Enumerate every hidden outcome with its probability.
    let evValue = 0
    let evKnown = 0
    for (let ci = 0; ci < CONDITIONS.length; ci++) {
      const pc = belief.cond[ci]
      if (pc === 0) continue
      const cm = CONDITION_TABLE[CONDITIONS[ci] as Condition].mult
      for (const fake of [false, true]) {
        const pf = fake ? belief.pFake : 1 - belief.pFake
        if (pf === 0) continue
        for (const boxed of [false, true]) {
          const pb = boxed ? belief.pBoxed : 1 - belief.pBoxed
          if (pb === 0) continue
          const prob = pc * pf * pb
          const value = dollars(guide * cm * (fake ? FAKE_TABLE.mult : 1) * (boxed ? BOXED_TABLE.mult : 1))
          evValue += prob * value
          const buyNow = value - ask * holdMult
          const haggleThen = canHaggleToBuy ? chance * Math.max(0, value - haggledAsk * holdMult) - (1 - chance) * failCost : -Infinity
          evKnown += prob * Math.max(0, buyNow, haggleThen)
        }
      }
    }

    const buyScore = evValue - ask * holdMult
    const haggleScore = canHaggleToBuy ? chance * Math.max(0, evValue - haggledAsk * holdMult) - (1 - chance) * failCost : -Infinity
    let waitScore = -Infinity
    if (shown < total) {
      const nextAt = run.config.clueTimesMs[shown] / 1000 + p.reactionS
      const waitS = Math.max(0, nextAt - t)
      waitScore = evKnown * p.infoQuality - waitS * p.timeValue * n
    }

    const best = Math.max(0, buyScore, haggleScore, waitScore)
    if (best === waitScore && waitScore > 0) return null
    if (best === buyScore && buyScore > 0) {
      if (run.canBuy) return 'buy'
      // A good deal we cannot take right now. Wait a little for a slot or for cash.
      if (run.nextSaleInMs <= p.maxSlotWaitS * 1000) return null
      if (haggleScore > 0 && run.canHaggle) return 'haggle'
      return 'pass'
    }
    if (best === haggleScore && haggleScore > 0) return 'haggle'
    return 'pass'
  }
}

export function makeBot(name: string): Bot {
  if (name === 'random') return new RandomBot()
  if (name === 'alwaysbuy') return new AlwaysBuyBot()
  if (name === 'cluereader') return new ClueReaderBot()
  throw new Error(`unknown bot ${name}`)
}

export { SELLER_TABLE }

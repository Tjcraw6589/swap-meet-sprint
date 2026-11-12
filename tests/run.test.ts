import { describe, it, expect } from 'vitest'
import { Run, DEFAULT_CONFIG } from '../src/core/run.ts'
import { generateItem, SELLER_TABLE, dollars, HAGGLE_ROLLS } from '../src/core/items.ts'
import { simulateRun } from '../src/core/sim.ts'
import { ClueReaderBot, AlwaysBuyBot, RandomBot } from '../src/core/bots.ts'

const STEP = 10

function advance(run: Run, ms: number): void {
  for (let t = 0; t < ms; t += STEP) run.step(STEP)
}

/** Find a seed whose first item matches a predicate. */
function seedWhere(pred: (it: ReturnType<typeof generateItem>) => boolean): string {
  for (let i = 0; i < 5000; i++) {
    const seed = `rule-${i}`
    if (pred(generateItem(seed, 0))) return seed
  }
  throw new Error('no seed found')
}

describe('run rules', () => {
  it('starts with $50, 60 seconds and a sliding item', () => {
    const run = new Run('start')
    expect(run.cash).toBe(50)
    expect(run.timeLeftMs).toBe(60_000)
    expect(run.current).not.toBeNull()
    expect(run.locked).toBe(true)
    advance(run, DEFAULT_CONFIG.slideInMs)
    expect(run.locked).toBe(false)
    expect(run.cluesShown.length).toBe(1)
    advance(run, 700)
    expect(run.cluesShown.length).toBe(2)
    advance(run, 700)
    expect(run.cluesShown.length).toBe(3)
  })

  it('a won haggle cuts the ask by 25% and halves the next chance', () => {
    const seed = seedWhere((it) => it.sellerType === 'clueless' && it.haggleRolls[0] < 0.8 * 0.99)
    const run = new Run(seed)
    advance(run, DEFAULT_CONFIG.slideInMs)
    const before = run.current!.ask
    const index = run.current!.item.index
    expect(run.haggleChance).toBeCloseTo(SELLER_TABLE.clueless.haggle)
    expect(run.haggle()).toBe('deal')
    expect(run.current!.item.index).toBe(index)
    expect(run.current!.ask).toBe(dollars(before * 0.75))
    expect(run.haggleChance).toBeCloseTo(SELLER_TABLE.clueless.haggle / 2)
    expect(run.locked).toBe(true)
    advance(run, DEFAULT_CONFIG.haggleWinLockMs)
    expect(run.locked).toBe(false)
    expect(run.hagglesWon).toBe(1)
  })

  it('a failed haggle removes the item and locks input for 1.2 seconds', () => {
    const seed = seedWhere((it) => it.sellerType === 'greedy' && it.haggleRolls[0] >= 0.3)
    const run = new Run(seed)
    advance(run, DEFAULT_CONFIG.slideInMs)
    const index = run.current!.item.index
    expect(run.haggle()).toBe('nodeal')
    expect(run.current!.item.index).toBe(index + 1)
    expect(run.locked).toBe(true)
    advance(run, 1190)
    expect(run.locked).toBe(true)
    advance(run, 10)
    expect(run.locked).toBe(false)
    expect(run.haggles).toBe(1)
    expect(run.hagglesWon).toBe(0)
  })

  it('caps haggles per item', () => {
    const run = new Run('cap')
    run.current!.item.haggleRolls = run.current!.item.haggleRolls.map(() => 0)
    for (let i = 0; i < HAGGLE_ROLLS; i++) {
      advance(run, 1000)
      expect(run.haggle()).toBe('deal')
    }
    advance(run, 1000)
    expect(run.canHaggle).toBe(false)
    expect(run.haggle()).toBe('blocked')
  })

  it('buying pays the ask, fills a slot and sells after 4 seconds for the true value', () => {
    const seed = seedWhere((it) => it.askMult < 0.6)
    const run = new Run(seed)
    advance(run, DEFAULT_CONFIG.slideInMs)
    const item = run.current!.item
    expect(run.buy()).toBe('ok')
    expect(run.cash).toBe(50 - item.ask)
    expect(run.stall.length).toBe(1)
    expect(run.netWorth).toBe(50)
    advance(run, 3990)
    expect(run.stall.length).toBe(1)
    advance(run, 10)
    expect(run.stall.length).toBe(0)
    expect(run.cash).toBe(50 - item.ask + item.trueValue)
    expect(run.bestDeal?.profit).toBe(item.trueValue - item.ask)
  })

  it('the stall holds four items and BUY is off while it is full', () => {
    const run = new Run('stall-full')
    let bought = 0
    while (bought < 4) {
      advance(run, DEFAULT_CONFIG.slideInMs)
      if (run.current!.ask <= run.cash) {
        expect(run.buy()).toBe('ok')
        bought++
      } else {
        run.pass()
      }
    }
    advance(run, DEFAULT_CONFIG.slideInMs)
    expect(run.stallFull).toBe(true)
    expect(run.canBuy).toBe(false)
    expect(run.buy()).toBe('blocked')
    expect(run.canPass).toBe(true)
  })

  it('net worth counts cash plus what was paid, never below 50', () => {
    const run = new Run('worth')
    run.cash = 3
    expect(run.netWorth).toBe(50)
    run.cash = 80
    expect(run.netWorth).toBe(80)
  })

  it('everything left on the stall sells at 0 seconds', () => {
    const seed = seedWhere((it) => it.askMult < 0.6)
    const run = new Run(seed)
    advance(run, 58_000)
    expect(run.buy()).toBe('ok')
    const paid = run.stall[0].paid
    const value = run.stall[0].item.trueValue
    const cashBefore = run.cash
    advance(run, 2_000)
    expect(run.phase).toBe('ended')
    expect(run.stall.length).toBe(0)
    expect(run.cash).toBe(cashBefore + value)
    expect(run.bust).toBe(false)
    expect(paid).toBeGreaterThan(0)
    expect(run.timeLeftMs).toBe(0)
  })

  it('ends early on a bust', () => {
    const run = new Run('bust')
    run.cash = 0
    run.step(STEP)
    expect(run.phase).toBe('ended')
    expect(run.bust).toBe(true)
  })

  it('actions are blocked while locked and after the end', () => {
    const run = new Run('locked')
    expect(run.buy()).toBe('blocked')
    expect(run.haggle()).toBe('blocked')
    expect(run.pass()).toBe('blocked')
    advance(run, 61_000)
    expect(run.phase).toBe('ended')
    expect(run.pass()).toBe('blocked')
  })

  it('records a decision per action for local events', () => {
    const run = new Run('decisions')
    advance(run, 1000)
    run.pass()
    advance(run, 1000)
    expect(run.decisions.length).toBe(1)
    expect(run.decisions[0].action).toBe('pass')
    expect(run.decisions[0].secondsOnItem).toBeCloseTo(0.65, 1)
  })
})

describe('simulator', () => {
  it('replays the same morning for the same seed', () => {
    for (const bot of [new ClueReaderBot(), new AlwaysBuyBot(), new RandomBot()]) {
      const a = simulateRun('replay-1', bot)
      const b = simulateRun('replay-1', bot)
      expect(a.score).toBe(b.score)
      expect(a.bought).toBe(b.bought)
      expect(a.haggles).toBe(b.haggles)
    }
  })

  it('different seeds give different mornings', () => {
    const bot = new ClueReaderBot()
    const scores = new Set([1, 2, 3, 4, 5, 6].map((i) => simulateRun(`vary-${i}`, bot).score))
    expect(scores.size).toBeGreaterThan(3)
  })
})

describe('extra time', () => {
  it('reopens an ended morning for more seconds', () => {
    const run = new Run('extend')
    advance(run, 60_000)
    expect(run.phase).toBe('ended')
    expect(run.extend(15_000)).toBe(true)
    expect(run.phase).toBe('playing')
    expect(run.timeLeftMs).toBe(15_000)
    expect(run.current).not.toBeNull()
    advance(run, 15_000)
    expect(run.phase).toBe('ended')
    expect(run.extend(15_000)).toBe(true)
    expect(run.extended).toBe(30_000)
  })

  it('cannot extend a morning that is still running', () => {
    const run = new Run('extend-2')
    expect(run.extend(15_000)).toBe(false)
  })
})

describe('grails', () => {
  it('every grail tier item is one of the 40 fixed grails', () => {
    let seen = 0
    const ids = new Set<number>()
    for (let i = 0; i < 4000; i++) {
      const it = generateItem('grail-check', i)
      if (it.tier === 'grail') {
        seen++
        expect(it.grailId).not.toBeNull()
        ids.add(it.grailId!)
      } else expect(it.grailId).toBeNull()
    }
    expect(seen).toBeGreaterThan(60)
    expect(ids.size).toBeGreaterThan(20)
  })
})

describe('guided items', () => {
  it('uses scripted items and holds the clock still below the pause index', async () => {
    const { guidedItems, GUIDED_COUNT } = await import('../src/game/guided.ts')
    const items = guidedItems()
    const run = new Run('guided', DEFAULT_CONFIG, { scripted: items, pauseTimerBelowIndex: GUIDED_COUNT })
    expect(run.current!.item.name).toBe(items[0].name)
    expect(run.timerPaused).toBe(true)
    advance(run, 5_000)
    expect(run.timeLeftMs).toBe(60_000)
    expect(run.buy()).toBe('ok')
    advance(run, 1_000)
    expect(run.current!.item.name).toBe(items[1].name)
    expect(run.haggle()).toBe('deal')
    advance(run, 1_000)
    run.pass()
    advance(run, 1_000)
    expect(run.current!.item.name).toBe(items[2].name)
    run.pass()
    expect(run.timerPaused).toBe(false)
    advance(run, 1_000)
    expect(run.timeLeftMs).toBe(59_000)
    expect(run.cash).toBe(50 - items[0].ask + items[0].trueValue)
  })
})

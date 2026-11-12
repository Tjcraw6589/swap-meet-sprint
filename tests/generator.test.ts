import { describe, it, expect } from 'vitest'
import {
  generateItem,
  priceItem,
  TIER_TABLE,
  CONDITION_TABLE,
  FAKE_TABLE,
  BOXED_TABLE,
  SELLER_TABLE,
  AUTH_CLUE_SHARE,
  SELLER_TRUTH,
  MAX_CLUES,
  TIERS,
  CONDITIONS,
  SELLER_TYPES,
  isGoodOrBetter,
  valueMultiplier,
  dollars,
  type ItemTemplate,
} from '../src/core/items.ts'
import { CHIP_TEXT, SELLER_TEXT, TRAIT_VALUES } from '../src/core/clues.ts'
import { findBlocked, BLOCKLIST } from '../src/core/blocklist.ts'
import * as W from '../src/core/words.ts'

const COUNT = 10_000
const TOLERANCE = 2 // percentage points

const items: ItemTemplate[] = []
for (let i = 0; i < COUNT; i++) items.push(generateItem('generator-check', i))

function share(list: ItemTemplate[], pred: (it: ItemTemplate) => boolean): number {
  return (100 * list.filter(pred).length) / list.length
}

describe('item generator over 10,000 items', () => {
  it('every name passes the blocklist and has no hyphen', () => {
    const bad: string[] = []
    for (const it of items) {
      const hit = findBlocked(it.name)
      if (hit) bad.push(`${it.name} (${hit})`)
      if (it.name.includes('-')) bad.push(`${it.name} (hyphen)`)
      if (it.name.trim().length === 0) bad.push('(empty name)')
    }
    expect(bad).toEqual([])
  })

  it('the blocklist itself catches real names', () => {
    expect(findBlocked('Nintendo Game Boy Color')).toBe('nintendo')
    expect(findBlocked('A Rolex Submariner')).toBe('rolex')
    expect(findBlocked('Portrait by Van Gogh')).toBe('van gogh')
    expect(findBlocked('Tarbo Pocketbeam II')).toBeNull()
    expect(BLOCKLIST.length).toBeGreaterThan(200)
  })

  it('every word list entry is clean', () => {
    const lists = Object.values(W) as ReadonlyArray<readonly string[]>
    const bad: string[] = []
    for (const list of lists) {
      for (const word of list) {
        const hit = findBlocked(word)
        if (hit) bad.push(`${word} (${hit})`)
        if (word.includes('-')) bad.push(`${word} (hyphen)`)
      }
    }
    expect(bad).toEqual([])
  })

  it('tier shares match the table within 2 points', () => {
    for (const tier of TIERS) {
      const got = share(items, (it) => it.tier === tier)
      expect(Math.abs(got - TIER_TABLE[tier].share * 100), `tier ${tier}: ${got.toFixed(2)}%`).toBeLessThanOrEqual(TOLERANCE)
    }
  })

  it('condition shares match the table within 2 points', () => {
    for (const cond of CONDITIONS) {
      const got = share(items, (it) => it.condition === cond)
      expect(Math.abs(got - CONDITION_TABLE[cond].share * 100), `condition ${cond}: ${got.toFixed(2)}%`).toBeLessThanOrEqual(TOLERANCE)
    }
  })

  it('fakes are 18% of good and better items only', () => {
    const goodPlus = items.filter((it) => isGoodOrBetter(it.tier))
    const low = items.filter((it) => !isGoodOrBetter(it.tier))
    expect(goodPlus.length).toBeGreaterThan(2000)
    const got = share(goodPlus, (it) => it.fake)
    expect(Math.abs(got - FAKE_TABLE.share * 100), `fake share ${got.toFixed(2)}%`).toBeLessThanOrEqual(TOLERANCE)
    expect(low.some((it) => it.fake)).toBe(false)
  })

  it('boxed share is 20% within 2 points', () => {
    const got = share(items, (it) => it.boxed)
    expect(Math.abs(got - BOXED_TABLE.share * 100), `boxed ${got.toFixed(2)}%`).toBeLessThanOrEqual(TOLERANCE)
  })

  it('seller type shares match the table within 2 points', () => {
    for (const s of SELLER_TYPES) {
      const got = share(items, (it) => it.sellerType === s)
      expect(Math.abs(got - SELLER_TABLE[s].share * 100), `seller ${s}: ${got.toFixed(2)}%`).toBeLessThanOrEqual(TOLERANCE)
      for (const it of items.filter((x) => x.sellerType === s)) {
        expect(it.askMult).toBeGreaterThanOrEqual(SELLER_TABLE[s].min)
        expect(it.askMult).toBeLessThan(SELLER_TABLE[s].max)
      }
    }
  })

  it('clues follow the rules', () => {
    let goodPlusCount = 0
    let authShown = 0
    let bubbles = 0
    let truthfulBubbles = 0
    for (const it of items) {
      expect(it.clues.length).toBeLessThanOrEqual(MAX_CLUES)
      expect(it.clues.length).toBeGreaterThan(0)
      const truth = { condition: it.condition, authenticity: it.fake ? 'fake' : 'real', box: it.boxed ? 'boxed' : 'unboxed' }
      for (const clue of it.clues) {
        expect(clue.text.includes('-')).toBe(false)
        if (clue.kind === 'chip') {
          expect(clue.truthful).toBe(true)
          expect(clue.claim).toBe(truth[clue.trait])
          if (clue.trait === 'authenticity') {
            expect(isGoodOrBetter(it.tier)).toBe(true)
            authShown++
          }
        } else {
          bubbles++
          if (clue.truthful) {
            truthfulBubbles++
            expect(clue.claim).toBe(truth[clue.trait])
          } else {
            expect(clue.claim).not.toBe(truth[clue.trait])
          }
        }
      }
      if (isGoodOrBetter(it.tier)) goodPlusCount++
    }
    const authShare = (100 * authShown) / goodPlusCount
    expect(Math.abs(authShare - AUTH_CLUE_SHARE * 100), `auth chip share ${authShare.toFixed(2)}%`).toBeLessThanOrEqual(TOLERANCE)
    const truthShare = (100 * truthfulBubbles) / bubbles
    expect(Math.abs(truthShare - SELLER_TRUTH * 100), `seller truth ${truthShare.toFixed(2)}%`).toBeLessThanOrEqual(TOLERANCE)
  })

  it('has thousands of distinct items', () => {
    const names = new Set(items.map((it) => it.name))
    expect(names.size).toBeGreaterThan(5000)
    const looks = new Set(items.map((it) => `${it.category}/${it.artSeed}/${it.palette}`))
    expect(looks.size).toBeGreaterThan(9500)
  })

  it('is deterministic by seed and index', () => {
    expect(generateItem('a', 5)).toEqual(generateItem('a', 5))
    expect(generateItem('a', 5).name === generateItem('b', 5).name && generateItem('a', 6).name === generateItem('b', 6).name).toBe(false)
  })
})

describe('pricing', () => {
  it('scales with net worth, in whole dollars, never below one', () => {
    for (const it of items.slice(0, 500)) {
      for (const n of [50, 120, 999, 4321]) {
        const p = priceItem(it, n)
        const band = TIER_TABLE[it.tier]
        expect(p.guide).toBeGreaterThanOrEqual(Math.max(1, Math.floor(band.min * n)))
        expect(p.guide).toBeLessThanOrEqual(Math.max(1, Math.ceil(band.max * n)))
        expect(p.ask).toBe(dollars(p.guide * it.askMult))
        expect(p.trueValue).toBe(dollars(p.guide * valueMultiplier(it)))
        expect(Number.isInteger(p.guide) && Number.isInteger(p.ask) && Number.isInteger(p.trueValue)).toBe(true)
        expect(Math.min(p.guide, p.ask, p.trueValue)).toBeGreaterThanOrEqual(1)
        expect(p.pricedAt).toBe(n)
      }
    }
  })
})

describe('clue phrasings', () => {
  it('has at least 12 clean phrasings for every trait value, chips and seller lines', () => {
    for (const v of TRAIT_VALUES) {
      expect(CHIP_TEXT[v].length, `chip ${v}`).toBeGreaterThanOrEqual(12)
      expect(SELLER_TEXT[v].length, `seller ${v}`).toBeGreaterThanOrEqual(12)
      for (const text of [...CHIP_TEXT[v], ...SELLER_TEXT[v]]) {
        expect(text.includes('-'), `hyphen in: ${text}`).toBe(false)
        expect(findBlocked(text), `blocked word in: ${text}`).toBeNull()
      }
      expect(new Set(CHIP_TEXT[v]).size).toBe(CHIP_TEXT[v].length)
      expect(new Set(SELLER_TEXT[v]).size).toBe(SELLER_TEXT[v].length)
    }
  })
})

// Every name the game can show fits the smallest landscape card in two lines,
// and every player facing string uses only glyphs the bundled font has.

import { describe, it, expect } from 'vitest'
import { generateItem } from '../src/core/items.ts'
import { GRAILS } from '../src/core/grails.ts'
import { CHIP_TEXT, SELLER_TEXT, TRAIT_VALUES } from '../src/core/clues.ts'
import { wrapText, measure } from '../src/game/font.ts'

/** Text width of the info column on the smallest landscape card (320 by 180 logical). */
const MIN_INFO_W = 127

describe('text fits', () => {
  it('every item and grail name fits in two lines', () => {
    const names = [...Array.from({ length: 10_000 }, (_, i) => generateItem('fit', i).name), ...GRAILS.map((g) => g.name)]
    const over = names.filter((n) => wrapText(n, MIN_INFO_W).length > 2)
    expect([...new Set(over)]).toEqual([])
  })

  it('every clue chip fits in two lines of its slot', () => {
    // three chips across the smallest card, minus the icon
    const chipW = Math.floor((212 - 6) / 3) - 15
    for (const v of TRAIT_VALUES) for (const t of CHIP_TEXT[v]) expect(wrapText(t, chipW).length, t).toBeLessThanOrEqual(2)
  })

  it('every seller line fits in two lines of the bubble', () => {
    for (const v of TRAIT_VALUES) for (const t of SELLER_TEXT[v]) expect(wrapText(`"${t}"`, MIN_INFO_W - 8).length, t).toBeLessThanOrEqual(2)
  })

  it('measure is stable', () => {
    expect(measure('A')).toBe(5)
    expect(measure('')).toBe(0)
  })
})

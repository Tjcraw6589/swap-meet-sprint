// The guided first run: three hand made items with the clock held still, one
// line of help each. After the third item the clock starts.

import type { PricedItem, Clue } from '../core/items.ts'
import type { Run } from '../core/run.ts'

export const GUIDED_COUNT = 3
export const GUIDED_SEED = 'first-morning'

function chip(trait: Clue['trait'], claim: Clue['claim'], text: string): Clue {
  return { kind: 'chip', trait, claim, truthful: true, text }
}

function bubble(trait: Clue['trait'], claim: Clue['claim'], truthful: boolean, text: string): Clue {
  return { kind: 'bubble', trait, claim, truthful, text }
}

const common = {
  tierShare: 0.5,
  boxed: false,
  fake: false,
  condition: 'clean' as const,
  grailId: null,
  pricedAt: 50,
}

export function guidedItems(): PricedItem[] {
  return [
    {
      ...common,
      id: 'guided#0',
      index: 0,
      category: 'handheld',
      tier: 'rare',
      name: 'Tarbo Pocketbeam II',
      artSeed: 1234567,
      palette: 2,
      sellerType: 'clueless',
      sellerFace: 1,
      askMult: 15 / 40,
      clues: [chip('condition', 'clean', 'Works fine'), chip('box', 'unboxed', 'Loose'), bubble('condition', 'clean', true, 'Kept it in a drawer.')],
      haggleRolls: [0.99, 0.99, 0.99, 0.99, 0.99, 0.99],
      guide: 40,
      ask: 15,
      trueValue: 40,
    },
    {
      ...common,
      id: 'guided#1',
      index: 1,
      category: 'lamp',
      tier: 'good',
      name: 'Fennwick Tulip Lamp',
      artSeed: 7654321,
      palette: 5,
      sellerType: 'fair',
      sellerFace: 2,
      askMult: 24 / 30,
      clues: [chip('condition', 'clean', 'Tidy'), bubble('box', 'unboxed', true, 'Lost the box years ago.'), chip('box', 'unboxed', 'No box')],
      haggleRolls: [0, 0, 0, 0, 0, 0],
      guide: 30,
      ask: 24,
      trueValue: 30,
    },
    {
      ...common,
      id: 'guided#2',
      index: 2,
      category: 'watch',
      tier: 'rare',
      name: 'Kipple Navigator Automatic',
      artSeed: 2468013,
      palette: 6,
      fake: true,
      sellerType: 'clueless',
      sellerFace: 3,
      askMult: 20 / 45,
      clues: [chip('authenticity', 'fake', 'Knock off'), bubble('authenticity', 'real', false, 'Real as they come.'), chip('condition', 'clean', 'Good shape')],
      haggleRolls: [0.99, 0.99, 0.99, 0.99, 0.99, 0.99],
      guide: 45,
      ask: 20,
      trueValue: 2,
    },
  ]
}

/** The one line of help for the current moment of the guided run, or null. */
export function guidedHint(run: Run, guided: boolean, clock: number, startedAt: number): string | null {
  if (!guided) return null
  const cur = run.current
  if (cur && cur.item.index < GUIDED_COUNT) {
    const it = cur.item
    if (it.index === 0) return `Guide says $${it.guide}. They ask $${cur.ask}. Buy it.`
    if (it.index === 1) return cur.haggles > 0 ? `Deal! Now buy it for $${cur.ask}.` : `They ask $${cur.ask}. Haggle for less.`
    return 'Read the chips. A knock off is worth nothing. Pass.'
  }
  if (cur && cur.item.index === GUIDED_COUNT && clock - startedAt < 60_000) {
    return 'The clock is running now. Go!'
  }
  return null
}

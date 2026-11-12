// Item generator. Every item is fully determined by (seed, index) so a whole
// morning can be replayed from its seed. Prices are applied later, scaled by the
// player's net worth at the moment the item arrives.

import { Rng } from './rng.ts'
import * as W from './words.ts'
import { CHIP_TEXT, SELLER_TEXT, type TraitValue } from './clues.ts'
import { GRAILS } from './grails.ts'

export type Category = 'handheld' | 'cartridge' | 'robot' | 'lamp' | 'record' | 'camera' | 'watch' | 'painting'
export type Tier = 'junk' | 'common' | 'good' | 'rare' | 'grail'
export type Condition = 'broken' | 'worn' | 'clean' | 'mint'
export type SellerType = 'clueless' | 'fair' | 'greedy'
export type Trait = 'condition' | 'authenticity' | 'box'

export const CATEGORIES: readonly Category[] = ['handheld', 'cartridge', 'robot', 'lamp', 'record', 'camera', 'watch', 'painting']
export const TIERS: readonly Tier[] = ['junk', 'common', 'good', 'rare', 'grail']
export const CONDITIONS: readonly Condition[] = ['broken', 'worn', 'clean', 'mint']
export const SELLER_TYPES: readonly SellerType[] = ['clueless', 'fair', 'greedy']

// Guide price as a share of net worth, by tier.
export const TIER_TABLE: Record<Tier, { share: number; min: number; max: number }> = {
  junk: { share: 0.25, min: 0.05, max: 0.15 },
  common: { share: 0.4, min: 0.15, max: 0.4 },
  good: { share: 0.22, min: 0.4, max: 0.8 },
  rare: { share: 0.1, min: 0.8, max: 1.5 },
  grail: { share: 0.03, min: 1.5, max: 3.0 },
}

// Hidden traits multiply the guide price into the true value.
export const CONDITION_TABLE: Record<Condition, { share: number; mult: number }> = {
  broken: { share: 0.15, mult: 0.3 },
  worn: { share: 0.3, mult: 0.7 },
  clean: { share: 0.4, mult: 1.0 },
  mint: { share: 0.15, mult: 1.4 },
}
export const FAKE_TABLE = { share: 0.18, mult: 0.05 } // good, rare and grail only
export const BOXED_TABLE = { share: 0.2, mult: 1.5 }

// Seller sets the ask from the guide price. Haggle is the chance a first haggle succeeds.
export const SELLER_TABLE: Record<SellerType, { share: number; min: number; max: number; haggle: number }> = {
  clueless: { share: 0.25, min: 0.3, max: 0.6, haggle: 0.8 },
  fair: { share: 0.5, min: 0.7, max: 1.0, haggle: 0.55 },
  greedy: { share: 0.25, min: 1.2, max: 1.8, haggle: 0.3 },
}

export const AUTH_CLUE_SHARE = 0.6 // share of good and better items that show an authenticity chip
export const SELLER_TRUTH = 0.7 // chance a seller speech bubble is true
export const MAX_CLUES = 3
export const HAGGLE_ROLLS = 6 // haggles per item are capped here; the chance halves each time
export const FACES_PER_SELLER = 4
export const PALETTES = 8

export interface Clue {
  kind: 'chip' | 'bubble'
  trait: Trait
  claim: TraitValue
  truthful: boolean
  text: string
}

export interface ItemTemplate {
  id: string
  index: number
  category: Category
  tier: Tier
  tierShare: number
  name: string
  artSeed: number
  palette: number
  condition: Condition
  fake: boolean
  boxed: boolean
  sellerType: SellerType
  sellerFace: number
  askMult: number
  clues: Clue[]
  haggleRolls: number[]
  /** Set on grail tier items: which of the 40 fixed grails this is. */
  grailId: number | null
}

export interface PricedItem extends ItemTemplate {
  guide: number
  ask: number
  trueValue: number
  /** The net worth the guide price was scaled against. */
  pricedAt: number
}

/** Whole dollars, never below one. */
export function dollars(x: number): number {
  return Math.max(1, Math.round(x))
}

export function isGoodOrBetter(tier: Tier): boolean {
  return tier === 'good' || tier === 'rare' || tier === 'grail'
}

/** The tier a guide price belongs to, given the net worth it was priced against. */
export function tierFromShare(share: number): Tier {
  if (share < TIER_TABLE.common.min) return 'junk'
  if (share < TIER_TABLE.good.min) return 'common'
  if (share < TIER_TABLE.rare.min) return 'good'
  if (share < TIER_TABLE.grail.min) return 'rare'
  return 'grail'
}

export function valueMultiplier(item: Pick<ItemTemplate, 'condition' | 'fake' | 'boxed'>): number {
  let m = CONDITION_TABLE[item.condition].mult
  if (item.fake) m *= FAKE_TABLE.mult
  if (item.boxed) m *= BOXED_TABLE.mult
  return m
}

export function priceItem(item: ItemTemplate, netWorth: number): PricedItem {
  const band = TIER_TABLE[item.tier]
  const guide = dollars((band.min + (band.max - band.min) * item.tierShare) * netWorth)
  const ask = dollars(guide * item.askMult)
  const trueValue = dollars(guide * valueMultiplier(item))
  return { ...item, guide, ask, trueValue, pricedAt: netWorth }
}

function pickWeighted<K extends string>(rng: Rng, table: Record<K, { share: number }>, keys: readonly K[]): K {
  return rng.weighted(keys.map((k) => [k, table[k].share] as const))
}

function makeName(rng: Rng, category: Category): string {
  switch (category) {
    case 'handheld': {
      const v = rng.pick(W.HANDHELD_VARIANTS)
      return `${rng.pick(W.MAKERS)} ${rng.pick(W.HANDHELD_MODELS)}${v ? ' ' + v : ''}`
    }
    case 'cartridge':
      return `${rng.pick(W.CARTRIDGE_HEROES)}${rng.pick(W.CARTRIDGE_SUFFIXES)}`
    case 'robot':
      return `${rng.pick(W.MAKERS)} ${rng.pick(W.ROBOT_MODELS)}`
    case 'lamp':
      return `${rng.pick(W.MAKERS)} ${rng.pick(W.LAMP_STYLES)} Lamp`
    case 'record':
      return `${rng.pick(W.ALBUMS)} by ${rng.pick(W.BANDS)}`
    case 'camera': {
      const n = rng.pick(W.CAMERA_NUMBERS)
      return `${rng.pick(W.MAKERS)} ${rng.pick(W.CAMERA_MODELS)}${n ? ' ' + n : ''}`
    }
    case 'watch': {
      const s = rng.pick(W.WATCH_SUFFIXES)
      return `${rng.pick(W.MAKERS)} ${rng.pick(W.WATCH_MODELS)}${s ? ' ' + s : ''}`
    }
    case 'painting':
      return `${rng.pick(W.PAINTING_TITLES)} by ${rng.pick(W.ARTISTS)}`
  }
}

function conditionValue(c: Condition): TraitValue {
  return c
}

function otherValue(rng: Rng, trait: Trait, truth: TraitValue): TraitValue {
  const values: TraitValue[] =
    trait === 'condition' ? ['broken', 'worn', 'clean', 'mint'] : trait === 'authenticity' ? ['real', 'fake'] : ['boxed', 'unboxed']
  return rng.pick(values.filter((v) => v !== truth))
}

function makeClues(rng: Rng, item: Pick<ItemTemplate, 'tier' | 'condition' | 'fake' | 'boxed'>): Clue[] {
  const goodPlus = isGoodOrBetter(item.tier)
  const truth: Record<Trait, TraitValue> = {
    condition: conditionValue(item.condition),
    authenticity: item.fake ? 'fake' : 'real',
    box: item.boxed ? 'boxed' : 'unboxed',
  }

  const chip = (trait: Trait): Clue => ({
    kind: 'chip',
    trait,
    claim: truth[trait],
    truthful: true,
    text: rng.pick(CHIP_TEXT[truth[trait]]),
  })

  // Seller speech bubble: about one trait, true 70% of the time.
  const bubbleTrait: Trait = goodPlus
    ? rng.weighted([['condition', 0.5], ['authenticity', 0.25], ['box', 0.25]] as const)
    : rng.weighted([['condition', 0.65], ['box', 0.35]] as const)
  const truthful = rng.chance(SELLER_TRUTH)
  const claim = truthful ? truth[bubbleTrait] : otherValue(rng, bubbleTrait, truth[bubbleTrait])
  const bubble: Clue = { kind: 'bubble', trait: bubbleTrait, claim, truthful, text: rng.pick(SELLER_TEXT[claim]) }

  let pool: Clue[] = [chip('condition'), chip('box'), bubble]
  const showAuth = goodPlus && rng.chance(AUTH_CLUE_SHARE)
  if (showAuth) {
    // The authenticity chip always takes a slot; one of the others is dropped.
    const drop = rng.int(0, pool.length - 1)
    pool = pool.filter((_, i) => i !== drop)
    pool.push(chip('authenticity'))
  }
  return rng.shuffle(pool).slice(0, MAX_CLUES)
}

export function generateItem(seed: string, index: number): ItemTemplate {
  const rng = new Rng(`${seed}#${index}`)
  let category = rng.pick(CATEGORIES)
  const tier = pickWeighted(rng, TIER_TABLE, TIERS)
  const tierShare = rng.next()
  const condition = pickWeighted(rng, CONDITION_TABLE, CONDITIONS)
  const fake = isGoodOrBetter(tier) && rng.chance(FAKE_TABLE.share)
  const boxed = rng.chance(BOXED_TABLE.share)
  const sellerType = pickWeighted(rng, SELLER_TABLE, SELLER_TYPES)
  const sellerFace = rng.int(0, FACES_PER_SELLER - 1)
  const seller = SELLER_TABLE[sellerType]
  const askMult = rng.float(seller.min, seller.max)
  let name = makeName(rng, category)
  let artSeed = rng.int(0, 0x7fffffff)
  let palette = rng.int(0, PALETTES - 1)
  let grailId: number | null = null
  if (tier === 'grail') {
    const grail = GRAILS[rng.int(0, GRAILS.length - 1)]
    grailId = grail.id
    name = grail.name
    category = grail.category
    artSeed = grail.artSeed
    palette = grail.palette
  }
  const clues = makeClues(rng, { tier, condition, fake, boxed })
  const haggleRolls: number[] = []
  for (let i = 0; i < HAGGLE_ROLLS; i++) haggleRolls.push(rng.next())
  return {
    id: `${seed}#${index}`,
    index,
    category,
    tier,
    tierShare,
    name,
    artSeed,
    palette,
    condition,
    fake,
    boxed,
    sellerType,
    sellerFace,
    askMult,
    clues,
    haggleRolls,
    grailId,
  }
}

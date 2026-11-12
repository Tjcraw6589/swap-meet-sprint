// Keepers: what survives between visits. Stored as one JSON value through the
// platform storage part.

import type { PlatformStorage } from '../platform/types.ts'
import type { Category } from '../core/items.ts'

export const SAVE_KEY = 'sms.keepers.v1'

export interface Keepers {
  v: 1
  best: number
  lifetimeProfit: number
  runs: number
  streak: number
  /** UTC date (yyyy mm dd joined by dashes, internal only) of the last scored Daily attempt. */
  dailyDate: string | null
  dailyScore: number | null
  dailyBestName: string | null
  dailyBestProfit: number | null
  /** The look of the best deal, so the share card can draw it. */
  dailyBestArt: { category: Category; artSeed: number; palette: number } | null
  finds: number[]
  guided: boolean
  muted: boolean
}

export function freshKeepers(): Keepers {
  return {
    v: 1,
    best: 0,
    lifetimeProfit: 0,
    runs: 0,
    streak: 0,
    dailyDate: null,
    dailyScore: null,
    dailyBestName: null,
    dailyBestProfit: null,
    dailyBestArt: null,
    finds: [],
    guided: false,
    muted: false,
  }
}

export function loadKeepers(storage: PlatformStorage): Keepers {
  const raw = storage.get(SAVE_KEY)
  if (!raw) return freshKeepers()
  try {
    const parsed = JSON.parse(raw) as Partial<Keepers>
    const k = { ...freshKeepers(), ...parsed, v: 1 as const }
    if (!Array.isArray(k.finds)) k.finds = []
    k.finds = k.finds.filter((n) => Number.isInteger(n) && n >= 0 && n < 40)
    return k
  } catch {
    return freshKeepers()
  }
}

export function saveKeepers(storage: PlatformStorage, k: Keepers): void {
  storage.set(SAVE_KEY, JSON.stringify(k))
}

/** Today's UTC date as yyyy mm dd joined by dashes. Internal only, never shown. */
export function utcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A date for people: "12 Nov 2026". */
export function prettyDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS[(m || 1) - 1]} ${y}`
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** The scored Daily attempt for today starts. Updates the streak. */
export function startDaily(k: Keepers, today: string): void {
  if (k.dailyDate === today) return
  if (k.dailyDate && dayNumber(today) - dayNumber(k.dailyDate) === 1) k.streak += 1
  else k.streak = 1
  k.dailyDate = today
  k.dailyScore = null
  k.dailyBestName = null
  k.dailyBestProfit = null
  k.dailyBestArt = null
}

/** The streak as it stands today: it lapses when yesterday was missed. */
export function liveStreak(k: Keepers, today: string): number {
  if (!k.dailyDate) return 0
  return dayNumber(today) - dayNumber(k.dailyDate) <= 1 ? k.streak : 0
}

export function hasScoredDaily(k: Keepers, today: string): boolean {
  return k.dailyDate === today
}

/** Returns true when this grail is new to the shelf. */
export function addFind(k: Keepers, grailId: number): boolean {
  if (k.finds.includes(grailId)) return false
  k.finds.push(grailId)
  k.finds.sort((a, b) => a - b)
  return true
}

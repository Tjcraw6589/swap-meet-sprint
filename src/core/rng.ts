// Seeded random numbers. A string seed is hashed (xmur3) and feeds sfc32.
// The same seed always gives the same sequence on every platform.

export function hashString(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

export class Rng {
  private a = 0
  private b = 0
  private c = 0
  private d = 0
  readonly seed: string

  constructor(seed: string | number) {
    this.seed = String(seed)
    const h = hashString(this.seed)
    this.a = h()
    this.b = h()
    this.c = h()
    this.d = h()
    for (let i = 0; i < 12; i++) this.next()
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.a |= 0
    this.b |= 0
    this.c |= 0
    this.d |= 0
    const t = (((this.a + this.b) | 0) + this.d) | 0
    this.d = (this.d + 1) | 0
    this.a = this.b ^ (this.b >>> 9)
    this.b = (this.c + (this.c << 3)) | 0
    this.c = (this.c << 21) | (this.c >>> 11)
    this.c = (this.c + t) | 0
    return (t >>> 0) / 4294967296
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  /** Uniform integer in [min, max], both ends included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  /** Pick by weight. Entries are [value, weight]. */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    let total = 0
    for (const e of entries) total += e[1]
    let r = this.next() * total
    for (const e of entries) {
      r -= e[1]
      if (r < 0) return e[0]
    }
    return entries[entries.length - 1][0]
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      const tmp = out[i]
      out[i] = out[j]
      out[j] = tmp
    }
    return out
  }

  /** A fresh, independent stream named by a label. */
  fork(label: string): Rng {
    return new Rng(`${this.seed}/${label}`)
  }
}

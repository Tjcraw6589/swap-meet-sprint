// Every frame size a portal or phone uses gets a whole number scale of at
// least 2 (so 7 pixel text is 14 device pixels) and a sane layout.

import { describe, it, expect } from 'vitest'
import { computeLayout, type Rect } from '../src/game/layout.ts'

// CrazyGames' list of the iframe sizes that matter most (read 12 Nov 2026), plus the brief's sizes.
const SIZES: Array<[number, number]> = [
  [907, 510], [1216, 684], [1077, 606], [821, 462], [1366, 768], [1920, 1080], [1536, 864], [1280, 720], [800, 450], [1080, 607],
  [360, 640], [390, 844], [430, 932], [768, 1024],
]

const noInsets = { top: 0, right: 0, bottom: 0, left: 0 }

function inside(r: Rect, outer: Rect): boolean {
  return r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h && r.w > 0 && r.h > 0
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

describe('layout at every size', () => {
  for (const [w, h] of SIZES) {
    it(`${w} by ${h}`, () => {
      const L = computeLayout(w, h, 1, noInsets)
      expect(L.scale).toBeGreaterThanOrEqual(2)
      const regions = [L.top, L.card, L.clues, L.stall, L.buttons.pass, L.buttons.haggle, L.buttons.buy]
      for (const r of regions) expect(inside(r, L.area), JSON.stringify(r)).toBe(true)
      const body = [L.card, L.clues, L.stall, L.buttons.pass, L.buttons.haggle, L.buttons.buy]
      for (let i = 0; i < body.length; i++) for (let j = i + 1; j < body.length; j++) expect(overlap(body[i], body[j]), `${i} and ${j}`).toBe(false)
      // big enough to hit with a thumb: at least 44 CSS pixels tall
      expect(L.buttons.buy.h * L.scale).toBeGreaterThanOrEqual(44)
    })
  }

  it('keeps out of the notch and the home bar', () => {
    const L = computeLayout(390, 844, 3, { top: 47, right: 0, bottom: 34, left: 0 })
    expect(L.area.y * L.scale).toBeGreaterThanOrEqual(47 * 3)
    expect((L.buttons.buy.y + L.buttons.buy.h) * L.scale).toBeLessThanOrEqual((844 - 34) * 3)
  })
})

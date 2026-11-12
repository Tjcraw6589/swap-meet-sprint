// Pixel art drawn in code. Items are 32 by 32, faces 16 by 16, icons from
// small bitmaps. Every sprite gets a one pixel dark outline. Built once and
// cached, then drawn by whole number scales.

import { Rng } from '../core/rng.ts'
import type { Category, SellerType } from '../core/items.ts'

export const ITEM_PX = 32
export const FACE_PX = 16
const OUTLINE = '#1c1226'

interface Palette {
  a: string
  aL: string
  aD: string
  b: string
  bD: string
}

export const ITEM_PALETTES: readonly Palette[] = [
  { a: '#d9534f', aL: '#f08a7e', aD: '#9e2f2c', b: '#ffd866', bD: '#c99a2e' },
  { a: '#3f8fa8', aL: '#6fc0d6', aD: '#265c6e', b: '#f28c6b', bD: '#b85c3f' },
  { a: '#c9c2b0', aL: '#e8e2d0', aD: '#8f8775', b: '#8a5cc4', bD: '#5a3a85' },
  { a: '#6f9d4a', aL: '#9cc76f', aD: '#46682c', b: '#f6eee0', bD: '#b8a98f' },
  { a: '#8a5cc4', aL: '#b38ae6', aD: '#5a3a85', b: '#7ad17a', bD: '#3f8f3f' },
  { a: '#f28c3b', aL: '#ffb36b', aD: '#b05a1c', b: '#3f8fa8', bD: '#265c6e' },
  { a: '#3b4f8a', aL: '#6278b8', aD: '#24305a', b: '#ffd866', bD: '#c99a2e' },
  { a: '#e07aa8', aL: '#f5a8c9', aD: '#a8487a', b: '#6fc0d6', bD: '#3f8fa8' },
]

const METAL = { m: '#b8b8c8', mL: '#e6e6f0', mD: '#7a7a8c' }
const DARK = '#2e2a36'
const DARKER = '#1f1a26'
const PAPER = '#f6eee0'
const PAPER_D = '#d9cdb8'
const GOLD = '#ffd866'
const GOLD_D = '#c99a2e'
const LCD = '#8fcfa8'
const LCD_D = '#2f5a46'
const GLASS = '#3f6fa8'
const GLASS_L = '#9fd0f0'

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

class Painter {
  readonly g: CanvasRenderingContext2D
  readonly canvas: HTMLCanvasElement
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.g = canvas.getContext('2d', { willReadFrequently: true })!
  }
  rect(x: number, y: number, w: number, h: number, c: string): void {
    this.g.fillStyle = c
    this.g.fillRect(x, y, w, h)
  }
  px(x: number, y: number, c: string): void {
    this.g.fillStyle = c
    this.g.fillRect(x, y, 1, 1)
  }
  clear(x: number, y: number, w = 1, h = 1): void {
    this.g.clearRect(x, y, w, h)
  }
  disc(cx: number, cy: number, r: number, c: string): void {
    this.g.fillStyle = c
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(r * r - y * y) + 0.35)
      this.g.fillRect(cx - span, cy + y, span * 2 + 1, 1)
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void {
    this.g.fillStyle = c
    for (let y = -ry; y <= ry; y++) {
      const span = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)) + 0.35)
      this.g.fillRect(cx - span, cy + y, span * 2 + 1, 1)
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string): void {
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    let x = x0
    let y = y0
    for (;;) {
      this.px(x, y, c)
      if (x === x1 && y === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x += sx
      }
      if (e2 <= dx) {
        err += dx
        y += sy
      }
    }
  }
  /** A box with a light top left edge and a dark bottom right edge. */
  bevel(x: number, y: number, w: number, h: number, c: string, light: string, dark: string): void {
    this.rect(x, y, w, h, c)
    this.rect(x, y, w, 1, light)
    this.rect(x, y, 1, h, light)
    this.rect(x, y + h - 1, w, 1, dark)
    this.rect(x + w - 1, y, 1, h, dark)
  }
  roundCorners(x: number, y: number, w: number, h: number): void {
    this.clear(x, y)
    this.clear(x + w - 1, y)
    this.clear(x, y + h - 1)
    this.clear(x + w - 1, y + h - 1)
  }
  /** Add a one pixel outline around every opaque pixel. */
  outline(color = OUTLINE): void {
    const { width: w, height: h } = this.canvas
    const img = this.g.getImageData(0, 0, w, h)
    const d = img.data
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0
    const marks: number[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (solid(x, y)) continue
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) marks.push(x, y)
      }
    }
    this.g.fillStyle = color
    for (let i = 0; i < marks.length; i += 2) this.g.fillRect(marks[i], marks[i + 1], 1, 1)
  }
}

// ---------------------------------------------------------------- items

function handheld(p: Painter, r: Rng, c: Palette): void {
  const wide = r.chance(0.3)
  if (!wide) {
    const x = 7
    const y = 3
    const w = 18
    const h = 26
    p.bevel(x, y, w, h, c.a, c.aL, c.aD)
    p.roundCorners(x, y, w, h)
    p.clear(x + w - 2, y + h - 1)
    p.clear(x + w - 1, y + h - 2)
    p.rect(x + 2, y + 2, w - 4, 11, DARK)
    p.rect(x + 4, y + 4, w - 8, 7, LCD)
    for (let i = 0; i < 6; i++) p.px(x + 4 + r.int(0, w - 9), y + 4 + r.int(1, 6), LCD_D)
    p.rect(x + 4, y + 9, w - 8, 1, LCD_D)
    p.px(x + 3, y + 4, r.chance(0.5) ? '#ff6b6b' : DARKER)
    // d pad
    p.rect(x + 3, y + 17, 5, 1, DARKER)
    p.rect(x + 5, y + 15, 1, 5, DARKER)
    // buttons
    p.disc(x + 12, y + 18, 1, c.b)
    p.disc(x + 15, y + 16, 1, c.b)
    p.px(x + 12, y + 19, c.bD)
    p.px(x + 15, y + 17, c.bD)
    // start and select
    p.rect(x + 6, y + 22, 2, 1, c.aD)
    p.rect(x + 9, y + 22, 2, 1, c.aD)
    // speaker
    for (let i = 0; i < 3; i++) p.line(x + 12 + i * 2, y + 24, x + 13 + i * 2, y + 22, c.aD)
  } else {
    const x = 2
    const y = 9
    const w = 28
    const h = 15
    p.bevel(x, y, w, h, c.a, c.aL, c.aD)
    p.roundCorners(x, y, w, h)
    p.rect(x + 8, y + 2, 12, 11, DARK)
    p.rect(x + 10, y + 4, 8, 7, LCD)
    for (let i = 0; i < 5; i++) p.px(x + 10 + r.int(0, 7), y + 4 + r.int(1, 6), LCD_D)
    p.rect(x + 2, y + 7, 5, 1, DARKER)
    p.rect(x + 4, y + 5, 1, 5, DARKER)
    p.disc(x + 23, y + 6, 1, c.b)
    p.disc(x + 25, y + 9, 1, c.b)
    p.rect(x + 1, y - 1, 4, 1, c.aD)
    p.rect(x + w - 5, y - 1, 4, 1, c.aD)
  }
}

function cartridge(p: Painter, r: Rng, c: Palette): void {
  const x = 7
  const y = 4
  const w = 18
  const h = 25
  const shell = r.chance(0.5) ? { m: METAL.m, l: METAL.mL, d: METAL.mD } : { m: c.a, l: c.aL, d: c.aD }
  p.bevel(x, y, w, h, shell.m, shell.l, shell.d)
  p.clear(x, y, 2, 2)
  p.px(x + 2, y, shell.d)
  p.rect(x + 3, y + 1, w - 5, 1, shell.d)
  // label
  const lx = x + 2
  const ly = y + 4
  const lw = w - 4
  const lh = 13
  p.rect(lx, ly, lw, lh, c.b)
  const style = r.int(0, 3)
  if (style === 0) {
    for (let i = 0; i < lh; i += 3) p.rect(lx, ly + i, lw, 1, c.bD)
    p.disc(lx + lw / 2, ly + 6, 3, c.a)
    p.px(lx + lw / 2 - 1, ly + 5, PAPER)
    p.px(lx + lw / 2 + 1, ly + 5, PAPER)
  } else if (style === 1) {
    p.rect(lx, ly + 8, lw, 5, c.aD)
    for (let i = 0; i < 4; i++) p.line(lx + i * 4, ly + 8, lx + i * 4 + 2, ly + 5, c.a)
    p.disc(lx + 10, ly + 3, 2, PAPER)
  } else if (style === 2) {
    for (let i = 0; i < 6; i++) {
      const sx = lx + r.int(1, lw - 2)
      const sy = ly + r.int(1, lh - 2)
      p.px(sx, sy, PAPER)
      p.px(sx - 1, sy, c.bD)
      p.px(sx + 1, sy, c.bD)
    }
    p.rect(lx + 3, ly + 5, lw - 6, 3, c.a)
  } else {
    p.rect(lx + 2, ly + 2, 4, 9, c.a)
    p.rect(lx + 8, ly + 4, 4, 7, c.aD)
    p.px(lx + 3, ly + 3, PAPER)
  }
  p.rect(lx, ly + lh, lw, 2, DARK)
  p.rect(lx + 1, ly + lh, lw - 6, 1, PAPER_D)
  // grip
  for (let i = 0; i < 3; i++) p.rect(x + 4, y + h - 5 + i * 2, w - 8, 1, shell.d)
}

function robot(p: Painter, r: Rng, c: Palette): void {
  const metalHead = r.chance(0.5)
  const head = metalHead ? METAL : { m: c.a, mL: c.aL, mD: c.aD }
  const hx = 10
  const hy = 5 + r.int(0, 1)
  const hw = 12
  const hh = 9
  // antenna
  const ant = r.int(0, 2)
  if (ant === 0) {
    p.rect(15, hy - 3, 1, 3, METAL.mD)
    p.disc(15, hy - 4, 1, c.b)
  } else if (ant === 1) {
    p.line(13, hy - 1, 11, hy - 4, METAL.mD)
    p.line(18, hy - 1, 20, hy - 4, METAL.mD)
    p.px(11, hy - 4, c.b)
    p.px(20, hy - 4, c.b)
  } else {
    p.rect(13, hy - 2, 6, 2, c.b)
    p.rect(14, hy - 3, 4, 1, c.bD)
  }
  p.bevel(hx, hy, hw, hh, head.m, head.mL, head.mD)
  if (r.chance(0.5)) p.roundCorners(hx, hy, hw, hh)
  // eyes
  const eye = r.chance(0.5) ? c.b : '#ff6b6b'
  p.rect(hx + 2, hy + 3, 3, 2, DARKER)
  p.rect(hx + hw - 5, hy + 3, 3, 2, DARKER)
  p.rect(hx + 3, hy + 3, 1, 1, eye)
  p.rect(hx + hw - 4, hy + 3, 1, 1, eye)
  for (let i = 0; i < 4; i++) p.px(hx + 4 + i * 1 + (i > 1 ? 1 : 0), hy + 7, DARKER)
  // ears
  p.rect(hx - 1, hy + 3, 1, 3, METAL.mD)
  p.rect(hx + hw, hy + 3, 1, 3, METAL.mD)
  // neck and body
  p.rect(14, hy + hh, 4, 1, METAL.mD)
  const by = hy + hh + 1
  p.bevel(9, by, 14, 9, c.a, c.aL, c.aD)
  p.rect(12, by + 2, 8, 4, DARK)
  p.px(13, by + 3, c.b)
  p.px(15, by + 4, '#7ad17a')
  p.px(17, by + 3, '#ff6b6b')
  p.px(18, by + 4, c.b)
  // arms
  p.rect(6, by + 1, 3, 6, METAL.m)
  p.rect(23, by + 1, 3, 6, METAL.m)
  p.rect(6, by + 7, 1, 2, METAL.mD)
  p.rect(8, by + 7, 1, 2, METAL.mD)
  p.rect(23, by + 7, 1, 2, METAL.mD)
  p.rect(25, by + 7, 1, 2, METAL.mD)
  // legs
  const ly = by + 9
  if (r.chance(0.5)) {
    p.rect(11, ly, 3, 4, METAL.mD)
    p.rect(18, ly, 3, 4, METAL.mD)
    p.rect(10, ly + 4, 5, 2, DARK)
    p.rect(17, ly + 4, 5, 2, DARK)
  } else {
    p.rect(10, ly, 12, 2, METAL.mD)
    p.disc(12, ly + 3, 2, DARK)
    p.disc(20, ly + 3, 2, DARK)
    p.px(12, ly + 3, METAL.m)
    p.px(20, ly + 3, METAL.m)
  }
}

function lamp(p: Painter, r: Rng, c: Palette): void {
  const glow = r.chance(0.5) ? '#fff2b0' : '#ffe0a0'
  // base
  const base = r.chance(0.5) ? { m: c.aD, l: c.a } : { m: METAL.mD, l: METAL.m }
  p.rect(10, 27, 12, 2, base.m)
  p.rect(11, 26, 10, 1, base.l)
  const kind = r.int(0, 3)
  const stemTop = kind === 2 ? 17 : 14
  p.rect(15, stemTop, 2, 26 - stemTop, METAL.mD)
  p.px(15, stemTop + 2, METAL.mL)
  if (kind === 0) {
    // dome
    for (let y = 0; y < 9; y++) {
      const span = Math.floor(Math.sqrt(81 - (8 - y) * (8 - y)) * 1.15)
      p.rect(16 - span, 5 + y, span * 2, 1, y % 3 === 2 && r.chance(0.6) ? c.b : c.a)
    }
    p.rect(6, 14, 20, 1, c.aD)
    p.rect(13, 15, 6, 1, glow)
  } else if (kind === 1) {
    // cone
    for (let y = 0; y < 10; y++) {
      const half = 4 + y
      p.rect(16 - half, 4 + y, half * 2, 1, c.a)
      p.px(16 - half, 4 + y, c.aL)
    }
    p.rect(4, 14, 24, 1, c.aD)
    p.rect(10, 15, 12, 1, glow)
    if (r.chance(0.5)) p.rect(8, 9, 16, 1, c.b)
  } else if (kind === 2) {
    // globe
    p.disc(16, 10, 7, glow)
    p.disc(16, 10, 5, c.b)
    p.disc(14, 8, 2, '#fffbe8')
    p.rect(13, 16, 6, 1, c.aD)
  } else {
    // tulip
    p.ellipse(16, 10, 7, 5, c.a)
    for (let i = 0; i < 3; i++) p.line(11 + i * 5, 4, 12 + i * 4, 9, c.aL)
    p.rect(10, 4, 3, 2, c.a)
    p.rect(19, 4, 3, 2, c.a)
    p.rect(15, 3, 2, 2, c.a)
    p.rect(13, 14, 6, 1, glow)
  }
}

function record(p: Painter, r: Rng, c: Palette): void {
  // disc behind the sleeve
  p.disc(22, 16, 9, DARKER)
  p.disc(22, 16, 7, '#3a3046')
  p.disc(22, 16, 6, DARKER)
  p.disc(22, 16, 3, c.b)
  p.px(22, 16, DARKER)
  // sleeve
  const x = 2
  const y = 5
  const s = 22
  p.rect(x, y, s, s, c.a)
  const style = r.int(0, 3)
  if (style === 0) {
    p.disc(x + 11, y + 11, 5, c.b)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      p.line(x + 11 + Math.round(Math.cos(a) * 7), y + 11 + Math.round(Math.sin(a) * 7), x + 11 + Math.round(Math.cos(a) * 9), y + 11 + Math.round(Math.sin(a) * 9), c.bD)
    }
  } else if (style === 1) {
    for (let i = -s; i < s; i += 4) p.line(x + Math.max(0, i), y + Math.max(0, -i), x + Math.min(s - 1, i + s - 1), y + Math.min(s - 1, s - 1 - i), c.aD)
    p.rect(x + 3, y + 15, 16, 4, PAPER)
    p.rect(x + 4, y + 16, 9, 1, c.aD)
    p.rect(x + 4, y + 17, 6, 1, c.aD)
  } else if (style === 2) {
    for (let i = 0; i < 4; i++) p.rect(x + 2 + i * 2, y + 2 + i * 2, s - 4 - i * 4, s - 4 - i * 4, i % 2 ? c.a : c.b)
  } else {
    p.rect(x, y + 14, s, 8, c.aD)
    p.ellipse(x + 7, y + 14, 6, 3, c.aL)
    p.disc(x + 16, y + 6, 3, c.b)
    p.rect(x + 2, y + 2, 7, 2, PAPER)
  }
  p.rect(x, y, s, 1, c.aL)
  p.rect(x + s - 1, y, 1, s, c.aD)
}

function camera(p: Painter, r: Rng, c: Palette): void {
  const twin = r.chance(0.25)
  const leather = r.chance(0.5) ? DARK : c.aD
  if (twin) {
    p.bevel(9, 3, 14, 26, leather, '#4a4456', DARKER)
    p.rect(9, 3, 14, 3, METAL.m)
    p.rect(9, 26, 14, 3, METAL.m)
    for (const cy of [11, 21]) {
      p.disc(16, cy, 4, METAL.mD)
      p.disc(16, cy, 3, DARKER)
      p.disc(16, cy, 2, GLASS)
      p.px(15, cy - 1, GLASS_L)
    }
    p.rect(10, 15, 2, 1, c.b)
    return
  }
  const slr = r.chance(0.5)
  p.rect(4, 9, 24, 2, METAL.m)
  p.rect(4, 9, 24, 1, METAL.mL)
  if (slr) {
    p.rect(12, 5, 8, 4, METAL.m)
    p.rect(13, 4, 6, 1, METAL.mL)
    p.rect(14, 6, 4, 2, DARKER)
  } else {
    p.rect(20, 6, 5, 3, METAL.m)
    p.rect(21, 7, 3, 1, GLASS)
  }
  p.rect(23, 7, 2, 2, c.b)
  p.bevel(4, 11, 24, 13, leather, '#4a4456', DARKER)
  for (let y = 13; y < 23; y += 2) for (let x = 5; x < 27; x += 2) if ((x + y) % 4 === 0) p.px(x, y, DARKER)
  p.rect(4, 11, 24, 1, c.a)
  p.disc(16, 17, 6, METAL.mD)
  p.disc(16, 17, 5, METAL.m)
  p.disc(16, 17, 4, DARKER)
  p.disc(16, 17, 3, GLASS)
  p.px(15, 15, GLASS_L)
  p.px(14, 16, GLASS_L)
  p.rect(2, 13, 2, 3, METAL.mD)
  p.rect(28, 13, 2, 3, METAL.mD)
  if (r.chance(0.5)) p.rect(6, 13, 3, 2, '#fff2b0')
}

function watch(p: Painter, r: Rng, c: Palette): void {
  const links = r.chance(0.4)
  const strap = links ? METAL.m : c.aD
  for (const [y0, y1] of [
    [1, 9],
    [23, 31],
  ]) {
    p.rect(12, y0, 8, y1 - y0, strap)
    for (let y = y0; y < y1; y += 2) p.rect(12, y, 8, 1, links ? METAL.mD : c.a)
  }
  const gold = r.chance(0.35)
  const caseC = gold ? { m: GOLD, l: '#fff2b0', d: GOLD_D } : { m: METAL.m, l: METAL.mL, d: METAL.mD }
  const square = r.chance(0.3)
  const dials = ['#f6eee0', '#24305a', DARK, c.a]
  const dial = dials[r.int(0, dials.length - 1)]
  const ink = dial === '#f6eee0' ? DARK : PAPER
  if (square) {
    p.bevel(8, 9, 16, 15, caseC.m, caseC.l, caseC.d)
    p.rect(10, 11, 12, 11, dial)
  } else {
    p.disc(16, 16, 8, caseC.d)
    p.disc(16, 16, 7, caseC.m)
    p.disc(16, 16, 5, dial)
    p.px(13, 12, caseC.l)
  }
  for (const [dx, dy] of [
    [0, -4],
    [4, 0],
    [0, 4],
    [-4, 0],
  ])
    p.px(16 + dx, 16 + dy, gold ? GOLD_D : ink)
  p.line(16, 16, 16, 13, ink)
  p.line(16, 16, 18 + r.int(0, 1), 17, ink)
  p.px(16, 16, '#ff6b6b')
  p.rect(25, 15, 2, 2, caseC.d)
  if (r.chance(0.4)) p.rect(15, 18, 3, 1, gold ? GOLD_D : c.b)
}

function painting(p: Painter, r: Rng, c: Palette): void {
  const frames = [
    { m: GOLD, l: '#fff2b0', d: GOLD_D },
    { m: '#a86a3c', l: '#c98a55', d: '#7a4a28' },
    { m: METAL.m, l: METAL.mL, d: METAL.mD },
    { m: DARK, l: '#4a4456', d: DARKER },
  ]
  const f = frames[r.int(0, frames.length - 1)]
  p.bevel(1, 4, 30, 24, f.m, f.l, f.d)
  p.rect(3, 6, 26, 20, f.d)
  const x = 4
  const y = 7
  const w = 24
  const h = 18
  const scene = r.int(0, 3)
  if (scene === 0) {
    // hills at dusk
    p.rect(x, y, w, h, c.aL)
    p.rect(x, y + 6, w, 4, c.b)
    p.disc(x + r.int(5, 18), y + 7, 3, PAPER)
    p.ellipse(x + 6, y + 14, 10, 5, c.aD)
    p.ellipse(x + 19, y + 15, 9, 4, c.a)
    p.rect(x, y + 15, w, 3, c.aD)
  } else if (scene === 1) {
    // still life
    p.rect(x, y, w, h, c.aD)
    p.rect(x, y + 12, w, 6, '#a86a3c')
    p.rect(x, y + 12, w, 1, '#c98a55')
    p.disc(x + 7, y + 9, 3, c.b)
    p.disc(x + 14, y + 8, 4, c.a)
    p.px(x + 13, y + 6, c.aL)
    p.disc(x + 19, y + 10, 2, '#7ad17a')
  } else if (scene === 2) {
    // portrait
    p.rect(x, y, w, h, c.b)
    p.ellipse(x + 12, y + 7, 4, 5, '#f2c9a0')
    p.rect(x + 8, y + 2, 8, 2, c.aD)
    p.ellipse(x + 12, y + 17, 8, 4, c.a)
    p.px(x + 10, y + 7, DARK)
    p.px(x + 14, y + 7, DARK)
  } else {
    // boat at sea
    p.rect(x, y, w, 9, c.aL)
    p.rect(x, y + 9, w, 9, c.a)
    for (let i = 0; i < 4; i++) p.rect(x + r.int(0, 18), y + 11 + i * 2, 5, 1, c.aD)
    p.rect(x + 8, y + 9, 9, 2, '#7a4a28')
    p.line(x + 12, y + 2, x + 12, y + 8, DARK)
    for (let i = 0; i < 5; i++) p.rect(x + 13, y + 3 + i, 5 - i, 1, PAPER)
    p.disc(x + 20, y + 3, 2, c.b)
  }
}

const DRAWERS: Record<Category, (p: Painter, r: Rng, c: Palette) => void> = {
  handheld,
  cartridge,
  robot,
  lamp,
  record,
  camera,
  watch,
  painting,
}

const itemCache = new Map<string, HTMLCanvasElement>()

export function itemSprite(category: Category, artSeed: number, palette: number): HTMLCanvasElement {
  const key = `${category}|${artSeed}|${palette}`
  let c = itemCache.get(key)
  if (c) return c
  c = makeCanvas(ITEM_PX, ITEM_PX)
  const p = new Painter(c)
  DRAWERS[category](p, new Rng(artSeed), ITEM_PALETTES[palette % ITEM_PALETTES.length])
  p.outline()
  if (itemCache.size > 400) itemCache.clear()
  itemCache.set(key, c)
  return c
}

/** A dark silhouette of an item, for unfound shelf slots. */
export function itemSilhouette(category: Category, artSeed: number, palette: number, color: string): HTMLCanvasElement {
  const key = `sil|${category}|${artSeed}|${palette}|${color}`
  let c = itemCache.get(key)
  if (c) return c
  const src = itemSprite(category, artSeed, palette)
  c = makeCanvas(ITEM_PX, ITEM_PX)
  const g = c.getContext('2d')!
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = color
  g.fillRect(0, 0, ITEM_PX, ITEM_PX)
  itemCache.set(key, c)
  return c
}

// ---------------------------------------------------------------- faces

const SKIN = [
  { s: '#f2c9a0', d: '#d9a57a' },
  { s: '#d9a066', d: '#b07a45' },
  { s: '#a8693f', d: '#7f4a28' },
  { s: '#6b4128', d: '#4f2e1a' },
]
const HAIR = ['#3a2a1a', '#c98f2b', '#9e2f2c', '#d9d2c4']
const faceCache = new Map<string, HTMLCanvasElement>()

export function faceSprite(type: SellerType, face: number): HTMLCanvasElement {
  const key = `${type}|${face}`
  let c = faceCache.get(key)
  if (c) return c
  c = makeCanvas(FACE_PX, FACE_PX)
  const p = new Painter(c)
  const skin = SKIN[face % SKIN.length]
  const hair = HAIR[(face + (type === 'greedy' ? 1 : 0)) % HAIR.length]
  const shirt = type === 'clueless' ? '#3f8f3f' : type === 'fair' ? '#c99a2e' : '#a83232'
  // shoulders
  p.rect(2, 13, 12, 3, shirt)
  p.rect(6, 13, 4, 1, skin.d)
  // head
  p.ellipse(8, 8, 5, 5, skin.s)
  p.rect(12, 8, 1, 3, skin.d)
  p.px(2, 8, skin.d)
  p.px(13, 8, skin.d)
  // hair by face
  const style = face % 4
  if (style === 0) {
    p.rect(3, 2, 10, 3, hair)
    p.rect(2, 4, 13, 1, hair)
    p.rect(3, 4, 2, 1, '#4a4456')
  } else if (style === 1) {
    p.rect(4, 3, 8, 1, hair)
    p.px(3, 5, hair)
    p.px(12, 5, hair)
    p.px(3, 6, hair)
    p.px(12, 6, hair)
  } else if (style === 2) {
    p.rect(4, 2, 8, 3, hair)
    p.rect(3, 4, 1, 4, hair)
    p.rect(12, 4, 1, 4, hair)
    p.disc(8, 1, 1, hair)
  } else {
    for (let i = 0; i < 5; i++) p.rect(4 + i * 2, 2 + (i % 2), 1, 3, hair)
    p.rect(4, 4, 8, 1, hair)
  }
  // face by seller type
  if (type === 'clueless') {
    p.rect(5, 7, 2, 2, '#ffffff')
    p.rect(9, 7, 2, 2, '#ffffff')
    p.px(5, 7, OUTLINE)
    p.px(9, 7, OUTLINE)
    p.px(5, 6, skin.d)
    p.px(10, 5, skin.d)
    p.rect(7, 10, 2, 2, '#7f2f3a')
    p.px(4, 10, '#f08a7e')
    p.px(11, 10, '#f08a7e')
  } else if (type === 'fair') {
    p.rect(5, 7, 1, 2, OUTLINE)
    p.rect(10, 7, 1, 2, OUTLINE)
    p.rect(5, 6, 2, 1, skin.d)
    p.rect(9, 6, 2, 1, skin.d)
    p.rect(6, 11, 4, 1, '#7f2f3a')
    p.px(5, 10, '#7f2f3a')
    p.px(10, 10, '#7f2f3a')
  } else {
    p.rect(5, 8, 2, 1, OUTLINE)
    p.rect(9, 8, 2, 1, OUTLINE)
    p.line(4, 6, 6, 7, OUTLINE)
    p.line(11, 6, 9, 7, OUTLINE)
    p.rect(5, 10, 6, 1, OUTLINE)
    p.rect(7, 11, 4, 1, '#7f2f3a')
    p.px(9, 11, GOLD)
    p.rect(6, 9, 4, 1, hair)
  }
  p.outline()
  faceCache.set(key, c)
  return c
}

// ---------------------------------------------------------------- icons

const ICON_COLORS: Record<string, string> = {
  k: OUTLINE,
  w: '#f6eee0',
  y: GOLD,
  o: GOLD_D,
  r: '#ff6b6b',
  g: '#7ad17a',
  b: '#6fc0d6',
  d: '#9a86b4',
  n: '#a86a3c',
}

const ICONS: Record<string, string[]> = {
  speaker: ['....w...', '...ww.w.', '.www.w.w', '.www.w.w', '.www.w.w', '...ww.w.', '....w...', '........'],
  muted: ['....w...', '...ww...', '.wwwr.r.', '.www.r..', '.wwwr.r.', '...ww...', '....w...', '........'],
  home: ['...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', '.ww..ww.', '.ww..ww.', '.ww..ww.', '........'],
  left: ['...w....', '..ww....', '.wwwwww.', 'wwwwwww.', '.wwwwww.', '..ww....', '...w....', '........'],
  right: ['....w...', '....ww..', '.wwwwww.', '.wwwwwww', '.wwwwww.', '....ww..', '....w...', '........'],
  up: ['...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', '..wwww..', '..wwww..', '..wwww..', '........'],
  coin: ['..kkkk..', '.kyyyyk.', 'kyywyyok', 'kywyyyok', 'kyyyyyok', 'kyyyyook', '.kooook.', '..kkkk..'],
  star: ['...y....', '...y....', 'yyyyyyy.', '.yyyyy..', '..yyy...', '.yy.yy..', '.y...y..', '........'],
  wrench: ['.....dd.', '....d..d', '....d.dd', '...ddd..', '..ddd...', '.ddd....', 'ddd.....', 'dd......'],
  box: ['........', '.nnnnnn.', 'nwnnnnwn', 'nnnnnnnn', 'nnnwwnnn', 'nnnnnnnn', 'nnnnnnnn', '........'],
  glass: ['.dddd...', 'd....d..', 'd.ww.d..', 'd.w..d..', 'd....d..', '.dddd...', '.....dd.', '......dd'],
  shelf: ['wwwwwwww', 'w.y..b.w', 'w.y.bb.w', 'wwwwwwww', 'w.r..g.w', 'w.rr.g.w', 'wwwwwwww', '........'],
  share: ['....ww..', '...wwww.', '....ww..', '.w..ww..', '.w..ww..', '.w....w.', '.wwwwww.', '........'],
  video: ['........', 'wwwwww..', 'w....ww.', 'w....www', 'w....www', 'w....ww.', 'wwwwww..', '........'],
  clock: ['..wwww..', '.w....w.', 'w...w..w', 'w...w..w', 'w...www.', 'w......w', '.w....w.', '..wwww..'],
}

const iconCache = new Map<string, HTMLCanvasElement>()

/** An 8 by 8 icon. White pixels can be tinted. */
export function icon(name: keyof typeof ICONS | string, tint?: string): HTMLCanvasElement {
  const key = `${name}|${tint ?? ''}`
  let c = iconCache.get(key)
  if (c) return c
  const rows = ICONS[name] ?? ICONS.star
  c = makeCanvas(8, 8)
  const g = c.getContext('2d')!
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x]
      if (ch === '.') continue
      g.fillStyle = ch === 'w' && tint ? tint : ICON_COLORS[ch] ?? '#ffffff'
      g.fillRect(x, y, 1, 1)
    }
  }
  iconCache.set(key, c)
  return c
}

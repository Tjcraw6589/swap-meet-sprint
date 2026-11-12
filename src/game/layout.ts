// Responsive layout in logical pixels. The canvas is scaled by a whole number
// so pixel art stays crisp. The logical size grows to fill the window at that
// scale, and the layout places regions by orientation.

import { S } from './theme.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Layout {
  /** Whole number scale from logical pixels to device pixels. */
  scale: number
  /** Logical size. */
  w: number
  h: number
  /** Device pixel size of the canvas. */
  deviceW: number
  deviceH: number
  /** CSS size of the window. */
  cssW: number
  cssH: number
  portrait: boolean
  safe: Insets
  /** The playable area inside the safe insets. */
  area: Rect
  top: Rect
  mute: Rect
  card: Rect
  clues: Rect
  stall: Rect
  buttons: { pass: Rect; haggle: Rect; buy: Rect }
}

export const MIN_LANDSCAPE = { w: 320, h: 180 }
export const MIN_PORTRAIT = { w: 180, h: 300 }

export function inset(r: Rect, by: number): Rect {
  return { x: r.x + by, y: r.y + by, w: Math.max(0, r.w - by * 2), h: Math.max(0, r.h - by * 2) }
}

export function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
}

export function computeLayout(cssW: number, cssH: number, dpr: number, safeCss: Insets): Layout {
  const deviceW = Math.max(1, Math.floor(cssW * dpr))
  const deviceH = Math.max(1, Math.floor(cssH * dpr))
  const portrait = cssH > cssW
  const min = portrait ? MIN_PORTRAIT : MIN_LANDSCAPE
  const scale = Math.max(1, Math.floor(Math.min(deviceW / min.w, deviceH / min.h)))
  const w = Math.floor(deviceW / scale)
  const h = Math.floor(deviceH / scale)
  const safe: Insets = {
    top: Math.ceil((safeCss.top * dpr) / scale),
    right: Math.ceil((safeCss.right * dpr) / scale),
    bottom: Math.ceil((safeCss.bottom * dpr) / scale),
    left: Math.ceil((safeCss.left * dpr) / scale),
  }
  const area: Rect = {
    x: safe.left,
    y: safe.top,
    w: Math.max(1, w - safe.left - safe.right),
    h: Math.max(1, h - safe.top - safe.bottom),
  }
  const base = { scale, w, h, deviceW, deviceH, cssW, cssH, portrait, safe, area }
  return portrait ? portraitLayout(base) : landscapeLayout(base)
}

type Base = Omit<Layout, 'top' | 'mute' | 'card' | 'clues' | 'stall' | 'buttons'>

function topBar(a: Rect): { top: Rect; mute: Rect } {
  const top: Rect = { x: a.x, y: a.y, w: a.w, h: S.topBar }
  const mute: Rect = { x: a.x + a.w - S.topBar - 2, y: a.y + 1, w: S.topBar, h: S.topBar - 2 }
  return { top, mute }
}

function buttonRow(a: Rect, y: number, h: number, gap: number): Layout['buttons'] {
  const bw = Math.floor((a.w - gap * 4) / 3)
  return {
    pass: { x: a.x + gap, y, w: bw, h },
    haggle: { x: a.x + gap * 2 + bw, y, w: bw, h },
    buy: { x: a.x + gap * 3 + bw * 2, y, w: bw, h },
  }
}

function landscapeLayout(b: Base): Layout {
  const a = b.area
  const gap = S.gap
  const { top, mute } = topBar(a)
  const buttonH = Math.max(29, Math.round(a.h * 0.16))
  const buttonsY = a.y + a.h - buttonH - gap
  const bodyY = top.y + top.h + gap
  const stallW = Math.min(Math.round(a.w * 0.3), 128)
  const stall: Rect = { x: a.x + a.w - stallW - gap, y: bodyY, w: stallW, h: buttonsY - bodyY - gap }
  const cardX = a.x + gap
  const cardW = stall.x - cardX - gap
  const cluesH = 20
  const clues: Rect = { x: cardX, y: buttonsY - gap - cluesH, w: cardW, h: cluesH }
  const card: Rect = { x: cardX, y: bodyY, w: cardW, h: clues.y - gap - bodyY }
  return { ...b, top, mute, card, clues, stall, buttons: buttonRow(a, buttonsY, buttonH, gap) }
}

function portraitLayout(b: Base): Layout {
  const a = b.area
  const gap = S.gap
  const { top, mute } = topBar(a)
  const buttonH = Math.max(36, Math.round(a.h * 0.11))
  const buttonsY = a.y + a.h - buttonH - gap
  const stallH = Math.max(58, Math.round(a.h * 0.14))
  const stall: Rect = { x: a.x + gap, y: buttonsY - gap - stallH, w: a.w - gap * 2, h: stallH }
  // three chips, two lines each when the screen is tall enough
  const cluesH = a.h >= 380 ? 3 * 22 + 6 : 3 * 13 + 6
  const clues: Rect = { x: a.x + gap, y: stall.y - gap - cluesH, w: a.w - gap * 2, h: cluesH }
  const bodyY = top.y + top.h + gap
  const card: Rect = { x: a.x + gap, y: bodyY, w: a.w - gap * 2, h: clues.y - gap - bodyY }
  return { ...b, top, mute, card, clues, stall, buttons: buttonRow(a, buttonsY, buttonH, gap) }
}

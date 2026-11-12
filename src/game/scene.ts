// The swap meet at sunrise: sky, sun, hills, tents and bunting. Static layers
// are drawn once per size; the sky and sun change with the morning.

import { C } from './theme.ts'
import { Rng } from '../core/rng.ts'

let cacheKey = ''
let cache: HTMLCanvasElement | null = null

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  const k = Math.max(0, Math.min(1, t))
  const ch = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * k)
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`
}

/** The horizon line for a given height. */
export function horizon(h: number): number {
  return Math.round(h * 0.62)
}

function buildStatic(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const hz = horizon(h)
  const r = new Rng(`scene-${w}x${h}`)
  // far hills
  g.fillStyle = C.hillsFar
  for (let x = 0; x < w; x++) {
    const y = hz - 10 - Math.round(6 * Math.sin(x / 23) + 4 * Math.sin(x / 9 + 1))
    g.fillRect(x, y, 1, hz - y)
  }
  // near hills
  g.fillStyle = C.hillsNear
  for (let x = 0; x < w; x++) {
    const y = hz - 4 - Math.round(4 * Math.sin(x / 15 + 2) + 2 * Math.sin(x / 6))
    g.fillRect(x, y, 1, hz - y)
  }
  // tents along the horizon
  const tentColors = [C.tentA, C.tentC, C.grass, C.haggle]
  let x = -r.int(0, 20)
  while (x < w) {
    const tw = r.int(22, 34)
    const th = r.int(12, 18)
    const col = tentColors[r.int(0, tentColors.length - 1)]
    const ty = hz - th
    for (let i = 0; i < th; i++) {
      const inset = Math.max(0, Math.round((th - i) * 0.35) - 2)
      for (let sx = inset; sx < tw - inset; sx++) {
        const stripe = Math.floor((sx - inset) / 4) % 2 === 0
        g.fillStyle = i < 5 ? (stripe ? col : C.tentB) : mix(col, '#000000', 0.25)
        g.fillRect(x + sx, ty + i, 1, 1)
      }
    }
    g.fillStyle = C.groundDark
    g.fillRect(x + 4, ty + 8, tw - 8, th - 8)
    g.fillStyle = C.paperShade
    g.fillRect(x + Math.floor(tw / 2), ty - 3, 1, 3)
    x += tw + r.int(4, 14)
  }
  // ground
  g.fillStyle = C.ground
  g.fillRect(0, hz, w, h - hz)
  g.fillStyle = C.grass
  g.fillRect(0, hz, w, 2)
  g.fillStyle = C.groundDark
  for (let i = 0; i < w * 0.6; i++) g.fillRect(r.int(0, w), r.int(hz + 3, h), r.int(1, 3), 1)
  // bunting across the top
  const by = 3
  for (let bx = 0; bx < w; bx++) {
    const sag = Math.round(3 * Math.sin((bx / w) * Math.PI))
    g.fillStyle = C.paperShade
    g.fillRect(bx, by + sag, 1, 1)
  }
  for (let bx = 4, i = 0; bx < w - 4; bx += 9, i++) {
    const sag = Math.round(3 * Math.sin((bx / w) * Math.PI))
    g.fillStyle = C.bunting[i % C.bunting.length]
    for (let k = 0; k < 4; k++) g.fillRect(bx + k, by + sag + 1 + k, 6 - k * 2, 1)
  }
  return c
}

/** Draw the scene. t is 0 at the start of the morning and 1 at the end. */
export function drawScene(g: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const hz = horizon(h)
  // sky bands, dithered between steps
  const top = t < 0.5 ? mix(C.skyNight, C.skyDawn, t * 2) : mix(C.skyDawn, C.skyMorning, (t - 0.5) * 2)
  const bottom = t < 0.5 ? mix(C.skyDawn, C.skyMorning, t * 2) : mix(C.skyMorning, C.skyBright, (t - 0.5) * 2)
  const bands = 8
  for (let i = 0; i < bands; i++) {
    const y0 = Math.floor((hz * i) / bands)
    const y1 = Math.floor((hz * (i + 1)) / bands)
    g.fillStyle = mix(rgbToHex(top), rgbToHex(bottom), i / (bands - 1))
    g.fillRect(0, y0, w, y1 - y0)
    if (i > 0) {
      g.fillStyle = mix(rgbToHex(top), rgbToHex(bottom), (i - 1) / (bands - 1))
      for (let x = (i % 2) * 2; x < w; x += 4) g.fillRect(x, y0, 2, 1)
    }
  }
  // sun rises
  const sx = Math.round(w * 0.78)
  const sy = Math.round(hz + 6 - t * hz * 0.75)
  const r = Math.max(6, Math.round(Math.min(w, h) * 0.06))
  g.fillStyle = C.sunGlow
  disc(g, sx, sy, r + 2)
  g.fillStyle = C.sun
  disc(g, sx, sy, r)
  g.fillStyle = C.goldLight
  disc(g, sx - Math.round(r / 3), sy - Math.round(r / 3), Math.max(1, Math.round(r / 3)))
  const key = `${w}x${h}`
  if (key !== cacheKey || !cache) {
    cache = buildStatic(w, h)
    cacheKey = key
  }
  g.drawImage(cache, 0, 0)
}

function disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    const span = Math.floor(Math.sqrt(r * r - y * y) + 0.35)
    g.fillRect(cx - span, cy + y, span * 2 + 1, 1)
  }
}

function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb
  const m = rgb.match(/\d+/g)!.map(Number)
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

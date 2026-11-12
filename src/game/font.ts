// Bal Tak Pixel: a 5 by 7 bitmap font drawn in code. Open licence (MIT, with
// the rest of this repository). Glyphs cover printable ASCII. Proportional
// spacing: empty columns are trimmed, one pixel between glyphs.

const RAW: Record<string, string> = {
  ' ': '...../...../...../...../...../...../.....',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '"': '.#.#./.#.#./.#.#./...../...../...../.....',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
  $: '..#../.####/#.#../.###./..#.#/####./..#..',
  '%': '##.../##..#/...#./..#../.#.../#..##/...##',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  "'": '..#../..#../.#.../...../...../...../.....',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '*': '...../..#../#.#.#/.###./#.#.#/..#../.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  ',': '...../...../...../...../.##../..#../.#...',
  '-': '...../...../...../#####/...../...../.....',
  '.': '...../...../...../...../...../.##../.##..',
  '/': '...../....#/...#./..#../.#.../#..../.....',
  '0': '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '#####/...#./..#../...#./....#/#...#/.###.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
  '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '..##./.#.../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/...#./.##..',
  ':': '...../.##../.##../...../.##../.##../.....',
  ';': '...../.##../.##../...../.##../..#../.#...',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '=': '...../...../#####/...../#####/...../.....',
  '>': '.#.../..#../...#./....#/...#./..#../.#...',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '@': '.###./#...#/....#/.##.#/#.#.#/#.#.#/.###.',
  A: '.###./#...#/#...#/#...#/#####/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '###../#..#./#...#/#...#/#...#/#..#./###..',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.####',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/#...#/.#.#./..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  '[': '.###./.#.../.#.../.#.../.#.../.#.../.###.',
  '\\': '...../#..../.#.../..#../...#./....#/.....',
  ']': '.###./...#./...#./...#./...#./...#./.###.',
  '^': '..#../.#.#./#...#/...../...../...../.....',
  _: '...../...../...../...../...../...../#####',
  '`': '.#.../..#../...#./...../...../...../.....',
  a: '...../...../.###./....#/.####/#...#/.####',
  b: '#..../#..../#.##./##..#/#...#/#...#/####.',
  c: '...../...../.###./#..../#..../#...#/.###.',
  d: '....#/....#/.##.#/#..##/#...#/#...#/.####',
  e: '...../...../.###./#...#/#####/#..../.###.',
  f: '..##./.#..#/.#.../###../.#.../.#.../.#...',
  g: '...../...../.####/#...#/.####/....#/.###.',
  h: '#..../#..../#.##./##..#/#...#/#...#/#...#',
  i: '..#../...../.##../..#../..#../..#../.###.',
  j: '...#./...../..##./...#./...#./#..#./.##..',
  k: '#..../#..../#..#./#.#../##.../#.#../#..#.',
  l: '.##../..#../..#../..#../..#../..#../.###.',
  m: '...../...../##.#./#.#.#/#.#.#/#...#/#...#',
  n: '...../...../#.##./##..#/#...#/#...#/#...#',
  o: '...../...../.###./#...#/#...#/#...#/.###.',
  p: '...../...../####./#...#/####./#..../#....',
  q: '...../...../.####/#...#/.####/....#/....#',
  r: '...../...../#.##./##..#/#..../#..../#....',
  s: '...../...../.###./#..../.###./....#/###..',
  t: '.#.../.#.../###../.#.../.#.../.#..#/..##.',
  u: '...../...../#...#/#...#/#...#/#..##/.##.#',
  v: '...../...../#...#/#...#/#...#/.#.#./..#..',
  w: '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.',
  x: '...../...../#...#/.#.#./..#../.#.#./#...#',
  y: '...../...../#...#/#...#/.####/....#/.###.',
  z: '...../...../#####/...#./..#../.#.../#####',
  '{': '...#./..#../..#../.#.../..#../..#../...#.',
  '|': '..#../..#../..#../..#../..#../..#../..#..',
  '}': '.#.../..#../..#../...#./..#../..#../.#...',
  '~': '...../.#.../#.#.#/...#./...../...../.....',
}

export const GLYPH_H = 7
const SPACE_W = 3
const GAP = 1

interface Glyph {
  rows: string[]
  x0: number
  w: number
}

const glyphs = new Map<string, Glyph>()
for (const [ch, raw] of Object.entries(RAW)) {
  const rows = raw.split('/')
  let x0 = 5
  let x1 = -1
  for (const r of rows) {
    for (let x = 0; x < 5; x++) {
      if (r[x] === '#') {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
      }
    }
  }
  if (x1 < 0) glyphs.set(ch, { rows, x0: 0, w: SPACE_W })
  else glyphs.set(ch, { rows, x0, w: x1 - x0 + 1 })
}
const FALLBACK = glyphs.get('?')!

function glyph(ch: string): Glyph {
  return glyphs.get(ch) ?? FALLBACK
}

/** Width in logical pixels at scale 1. */
export function measure(text: string, scale = 1): number {
  let w = 0
  for (let i = 0; i < text.length; i++) {
    w += glyph(text[i]).w + GAP
  }
  return Math.max(0, w - GAP) * scale
}

// One atlas per colour: every glyph side by side at scale 1.
interface Atlas {
  canvas: HTMLCanvasElement
  x: Map<string, number>
}
const atlases = new Map<string, Atlas>()
const ORDER = Object.keys(RAW)

function atlas(color: string): Atlas {
  let a = atlases.get(color)
  if (a) return a
  let total = 0
  for (const ch of ORDER) total += glyph(ch).w + 1
  const canvas = document.createElement('canvas')
  canvas.width = total
  canvas.height = GLYPH_H
  const g = canvas.getContext('2d')!
  g.fillStyle = color
  const x = new Map<string, number>()
  let cx = 0
  for (const ch of ORDER) {
    const gl = glyph(ch)
    x.set(ch, cx)
    for (let r = 0; r < GLYPH_H; r++) {
      const row = gl.rows[r]
      for (let c = 0; c < gl.w; c++) {
        if (row[gl.x0 + c] === '#') g.fillRect(cx + c, r, 1, 1)
      }
    }
    cx += gl.w + 1
  }
  a = { canvas, x }
  atlases.set(color, a)
  return a
}

export type Align = 'left' | 'center' | 'right'

/** Draw text with its top left at (x, y). Returns the width drawn. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1, align: Align = 'left'): number {
  const w = measure(text, scale)
  let cx = Math.round(align === 'left' ? x : align === 'center' ? x - w / 2 : x - w)
  const cy = Math.round(y)
  const a = atlas(color)
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const gl = glyph(ch)
    const src = a.x.get(glyphs.has(ch) ? ch : '?') ?? 0
    if (ch !== ' ') ctx.drawImage(a.canvas, src, 0, gl.w, GLYPH_H, cx, cy, gl.w * scale, GLYPH_H * scale)
    cx += (gl.w + GAP) * scale
  }
  return w
}

/** Draw text with a small shadow below right. */
export function drawTextShadow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, shadow: string, scale = 1, align: Align = 'left'): number {
  const off = Math.max(1, Math.floor(scale / 2))
  drawText(ctx, text, x + off, y + off, shadow, scale, align)
  return drawText(ctx, text, x, y, color, scale, align)
}

/** Break text into lines that fit a width. */
export function wrapText(text: string, maxW: number, scale = 1): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (measure(test, scale) > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** Shorten text with a trailing dot so it fits. */
export function fitText(text: string, maxW: number, scale = 1): string {
  if (measure(text, scale) <= maxW) return text
  let s = text
  while (s.length > 1 && measure(`${s}.`, scale) > maxW) s = s.slice(0, -1)
  return `${s.trimEnd()}.`
}

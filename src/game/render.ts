// Grey box renderer for Milestone 1: plain shapes and system text, drawn at
// logical resolution and scaled by a whole number. Milestone 2 replaces the
// drawing with pixel art but keeps this structure.

import type { Game } from './game.ts'
import type { Layout, Rect } from './layout.ts'
import { inset } from './layout.ts'
import type { SellerType } from '../core/items.ts'

export const COLORS = {
  sky: '#2b1d3a',
  skyLight: '#f2b56b',
  panel: '#3d2b50',
  panelLight: '#55406c',
  line: '#9a86b4',
  text: '#f6eee0',
  dim: '#b8a9cc',
  cash: '#ffd866',
  good: '#7ad17a',
  bad: '#ff6b6b',
  buy: '#2e8b57',
  haggle: '#c98f2b',
  pass: '#6c5b7b',
  disabled: '#4a3f58',
  clueless: '#7ad17a',
  fair: '#ffd866',
  greedy: '#ff6b6b',
}

const SELLER_LABEL: Record<SellerType, string> = { clueless: 'C', fair: 'F', greedy: 'G' }

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export function clock(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `0:${s.toString().padStart(2, '0')}`
}

export class Renderer {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private buffer: HTMLCanvasElement
  private bctx: CanvasRenderingContext2D
  layout!: Layout

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })!
    this.buffer = document.createElement('canvas')
    this.bctx = this.buffer.getContext('2d', { alpha: false })!
  }

  setLayout(layout: Layout): void {
    this.layout = layout
    this.canvas.width = layout.deviceW
    this.canvas.height = layout.deviceH
    this.canvas.style.width = `${layout.cssW}px`
    this.canvas.style.height = `${layout.cssH}px`
    this.buffer.width = layout.w
    this.buffer.height = layout.h
  }

  draw(game: Game): void {
    const g = this.bctx
    const L = this.layout
    g.imageSmoothingEnabled = false
    g.textBaseline = 'middle'
    this.drawBackground(g, game)
    if (game.screen === 'play') this.drawPlay(g, game)
    else this.drawResult(g, game)
    const ctx = this.ctx
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = COLORS.sky
    ctx.fillRect(0, 0, L.deviceW, L.deviceH)
    ctx.drawImage(this.buffer, 0, 0, L.w, L.h, 0, 0, L.w * L.scale, L.h * L.scale)
  }

  private drawBackground(g: CanvasRenderingContext2D, game: Game): void {
    const L = this.layout
    // The sky brightens over the morning.
    const t = game.screen === 'play' ? 1 - game.run.timeLeftMs / game.run.config.durationMs : 1
    g.fillStyle = mix(COLORS.sky, COLORS.skyLight, t * 0.45)
    g.fillRect(0, 0, L.w, L.h)
  }

  private drawPlay(g: CanvasRenderingContext2D, game: Game): void {
    const L = this.layout
    const run = game.run
    // Top bar
    this.text(g, clock(run.timeLeftMs), L.top.x + 4, L.top.y + L.top.h / 2, 10, run.timeLeftMs <= 10_000 ? COLORS.bad : COLORS.text, 'left')
    this.text(g, money(run.cash), L.top.x + L.top.w / 2, L.top.y + L.top.h / 2, 12, COLORS.cash, 'center')
    this.text(g, game.mode === 'daily' ? 'Daily' : 'Free Play', L.top.x + L.top.w - 4, L.top.y + L.top.h / 2, 8, COLORS.dim, 'right')

    this.drawCard(g, game)
    this.drawClues(g, game)
    this.drawStall(g, game)
    this.drawButtons(g, game)

    if (game.stamp) {
      const c = L.card
      this.text(g, game.stamp.text, c.x + c.w / 2, c.y + c.h / 2, 16, game.stamp.kind === 'deal' ? COLORS.good : COLORS.bad, 'center')
    }
  }

  private drawCard(g: CanvasRenderingContext2D, game: Game): void {
    const L = this.layout
    const run = game.run
    const c = L.card
    const cur = run.current
    if (!cur) return
    // Slide in from the right while the item is not ready.
    const slide = Math.max(0, Math.min(1, (cur.readyAtMs - run.elapsedMs) / run.config.slideInMs))
    const offset = Math.round(slide * (L.w - c.x))
    const x = c.x + offset
    g.fillStyle = COLORS.panel
    g.fillRect(x, c.y, c.w, c.h)
    g.strokeStyle = COLORS.line
    g.lineWidth = 1
    g.strokeRect(x + 0.5, c.y + 0.5, c.w - 1, c.h - 1)

    const item = cur.item
    const pad = 6
    // Picture placeholder: a box with the category initial.
    const pic = Math.min(Math.round(c.h * 0.5), Math.round(c.w * 0.3))
    g.fillStyle = COLORS.panelLight
    g.fillRect(x + pad, c.y + pad, pic, pic)
    this.text(g, item.category.toUpperCase(), x + pad + pic / 2, c.y + pad + pic / 2, 7, COLORS.dim, 'center')

    // Seller face: colour by seller type.
    const faceR = Math.max(6, Math.round(pic * 0.22))
    g.fillStyle = COLORS[item.sellerType]
    g.beginPath()
    g.arc(x + c.w - pad - faceR, c.y + pad + faceR, faceR, 0, Math.PI * 2)
    g.fill()
    this.text(g, SELLER_LABEL[item.sellerType], x + c.w - pad - faceR, c.y + pad + faceR, 8, COLORS.sky, 'center')

    // Name, guide, ask.
    const tx = x + pad * 2 + pic
    const tw = c.w - pad * 3 - pic - faceR * 2 - 2
    const lines = wrap(g, item.name, tw, 8)
    let ty = c.y + pad + 5
    for (const line of lines.slice(0, 2)) {
      this.text(g, line, tx, ty, 8, COLORS.text, 'left')
      ty += 10
    }
    ty += 4
    this.text(g, `Guide ${money(item.guide)}`, tx, ty, 10, COLORS.dim, 'left')
    ty += 13
    const askColor = cur.ask < item.ask ? COLORS.good : COLORS.cash
    this.text(g, `Ask ${money(cur.ask)}`, tx, ty, 12, askColor, 'left')
    if (cur.ask < item.ask) {
      this.text(g, `was ${money(item.ask)}`, tx + 70, ty, 8, COLORS.dim, 'left')
    }
  }

  private drawClues(g: CanvasRenderingContext2D, game: Game): void {
    const L = this.layout
    const run = game.run
    const r = L.clues
    const shown = run.cluesShown
    const total = run.current ? Math.min(run.current.item.clues.length, run.config.clueTimesMs.length) : 0
    const rows = L.portrait ? 3 : 1
    const cols = L.portrait ? 1 : 3
    const gap = 2
    const cw = Math.floor((r.w - gap * (cols - 1)) / cols)
    const ch = Math.floor((r.h - gap * (rows - 1)) / rows)
    for (let i = 0; i < 3; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = r.x + col * (cw + gap)
      const y = r.y + row * (ch + gap)
      const clue = shown[i]
      g.fillStyle = clue ? (clue.kind === 'bubble' ? COLORS.panelLight : COLORS.panel) : COLORS.sky
      g.fillRect(x, y, cw, ch)
      g.strokeStyle = i < total ? COLORS.line : COLORS.disabled
      g.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1)
      if (clue) {
        const label = clue.kind === 'bubble' ? `"${clue.text}"` : clue.text
        this.text(g, fit(g, label, cw - 6, 7), x + 3, y + ch / 2, 7, clue.kind === 'bubble' ? COLORS.cash : COLORS.text, 'left')
      }
    }
  }

  private drawStall(g: CanvasRenderingContext2D, game: Game): void {
    const L = this.layout
    const run = game.run
    const r = L.stall
    const slots = run.config.stallSlots
    const vertical = !L.portrait
    const gap = 2
    const sw = vertical ? r.w : Math.floor((r.w - gap * (slots - 1)) / slots)
    const sh = vertical ? Math.floor((r.h - gap * (slots - 1)) / slots) : r.h
    for (let s = 0; s < slots; s++) {
      const x = vertical ? r.x : r.x + s * (sw + gap)
      const y = vertical ? r.y + s * (sh + gap) : r.y
      const entry = run.stall.find((e) => e.slot === s)
      g.fillStyle = entry ? COLORS.panelLight : COLORS.panel
      g.fillRect(x, y, sw, sh)
      g.strokeStyle = COLORS.line
      g.strokeRect(x + 0.5, y + 0.5, sw - 1, sh - 1)
      if (entry) {
        const left = Math.max(0, entry.sellAtMs - run.elapsedMs) / run.config.holdMs
        g.fillStyle = COLORS.cash
        g.fillRect(x + 2, y + sh - 4, Math.round((sw - 4) * (1 - left)), 2)
        this.text(g, fit(g, entry.item.name, sw - 6, 7), x + 3, y + 6, 7, COLORS.text, 'left')
        this.text(g, money(entry.paid), x + 3, y + 16, 7, COLORS.dim, 'left')
      }
      const pop = game.salePops.find((p) => p.slot === s)
      if (pop) {
        const t = 1 - (pop.until - game.clock) / 900
        const py = y + sh / 2 - Math.round(t * 10)
        const sign = pop.profit >= 0 ? '+' : ''
        this.text(g, `${sign}${money(pop.profit)}`, x + sw / 2, py, 9, pop.profit >= 0 ? COLORS.good : COLORS.bad, 'center')
      }
    }
  }

  private drawButtons(g: CanvasRenderingContext2D, game: Game): void {
    const L = this.layout
    const run = game.run
    const b = L.buttons
    this.button(g, b.pass, 'PASS', COLORS.pass, run.canPass, L.portrait ? '' : 'Left or A')
    this.button(g, b.haggle, 'HAGGLE', COLORS.haggle, run.canHaggle, L.portrait ? '' : 'Up, W or Space')
    this.button(g, b.buy, 'BUY', COLORS.buy, run.canBuy, L.portrait ? '' : 'Right or D')
  }

  private button(g: CanvasRenderingContext2D, r: Rect, label: string, color: string, enabled: boolean, hint: string): void {
    g.fillStyle = enabled ? color : COLORS.disabled
    g.fillRect(r.x, r.y, r.w, r.h)
    g.strokeStyle = enabled ? COLORS.text : COLORS.line
    g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)
    this.text(g, label, r.x + r.w / 2, r.y + r.h / 2 - (hint ? 3 : 0), 11, enabled ? COLORS.text : COLORS.dim, 'center')
    if (hint) this.text(g, hint, r.x + r.w / 2, r.y + r.h / 2 + 8, 6, enabled ? COLORS.text : COLORS.dim, 'center')
  }

  private drawResult(g: CanvasRenderingContext2D, game: Game): void {
    const L = this.layout
    const r = game.result
    if (!r) return
    const a = inset(L.area, 8)
    const cx = a.x + a.w / 2
    let y = a.y + 14
    this.text(g, r.bust ? 'Bust!' : 'Morning over', cx, y, 14, COLORS.text, 'center')
    y += 22
    this.text(g, money(r.score), cx, y, 22, COLORS.cash, 'center')
    y += 20
    this.text(g, `${money(r.start)} into ${money(r.score)}`, cx, y, 9, COLORS.dim, 'center')
    y += 18
    if (r.bestDeal) {
      this.text(g, fit(g, `Best deal: ${r.bestDeal.item.name} +${money(r.bestDeal.profit)}`, a.w, 8), cx, y, 8, COLORS.good, 'center')
      y += 12
    }
    if (r.worstDeal) {
      const p = r.worstDeal.profit
      const label = p < 0 ? `lost ${money(-p)}` : `+${money(p)}`
      this.text(g, fit(g, `Worst deal: ${r.worstDeal.item.name} ${label}`, a.w, 8), cx, y, 8, p < 0 ? COLORS.bad : COLORS.good, 'center')
      y += 12
    }
    if (!r.bestDeal) {
      this.text(g, 'You bought nothing. Brave.', cx, y, 8, COLORS.dim, 'center')
      y += 12
    }
    const btns = resultButtons(L)
    this.button(g, btns.share, 'SHARE', COLORS.pass, true, '')
    this.button(g, btns.again, 'PLAY AGAIN', COLORS.buy, true, L.portrait ? '' : 'Space or Enter')
  }

  text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign): void {
    g.font = `bold ${size}px monospace`
    g.fillStyle = color
    g.textAlign = align
    g.fillText(s, Math.round(x), Math.round(y))
  }
}

export function resultButtons(L: Layout): { share: Rect; again: Rect } {
  const a = inset(L.area, 8)
  const h = L.portrait ? 36 : Math.max(28, Math.round(a.h * 0.17))
  const gap = 4
  const w = Math.floor((a.w - gap) / 2)
  const y = a.y + a.h - h
  return {
    share: { x: a.x, y, w, h },
    again: { x: a.x + w + gap, y, w, h },
  }
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, size: number): string[] {
  g.font = `bold ${size}px monospace`
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function fit(g: CanvasRenderingContext2D, text: string, maxW: number, size: number): string {
  g.font = `bold ${size}px monospace`
  if (g.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 1 && g.measureText(`${s}…`).width > maxW) s = s.slice(0, -1)
  return `${s}…`
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255
    const vb = (pb >> shift) & 255
    return Math.round(va + (vb - va) * t)
  }
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

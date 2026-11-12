// The renderer: every screen drawn at logical resolution into a small buffer,
// then scaled to the canvas by a whole number. Hit regions for input are
// recorded while drawing, so what you see is what you tap.

import type { Game, Cmd, Anchor } from './game.ts'
import type { Layout, Rect } from './layout.ts'
import { inset, contains } from './layout.ts'
import { C, T, inkAlpha } from './theme.ts'
import { drawText, drawTextShadow, measure, wrapText, fitText, GLYPH_H } from './font.ts'
import { itemSprite, itemSilhouette, faceSprite, icon, ITEM_PX, FACE_PX } from './art.ts'
import { drawScene } from './scene.ts'
import type { PricedItem, Clue, SellerType } from '../core/items.ts'
import { GRAILS, GRAIL_COUNT } from '../core/grails.ts'

const SELLER_NAME: Record<SellerType, string> = { clueless: 'CLUELESS', fair: 'FAIR', greedy: 'GREEDY' }
const LINE = GLYPH_H + 2

export function money(n: number): string {
  const s = `$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
  return n < 0 ? `minus ${s}` : s
}

export function signed(n: number): string {
  return n >= 0 ? `+$${Math.round(n).toLocaleString('en-US')}` : `$${Math.round(-n).toLocaleString('en-US')} lost`
}

export function clockText(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

interface Region {
  r: Rect
  cmd: Cmd
}

const ease = (t: number) => 1 - (1 - t) * (1 - t)

export class Renderer {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private buffer: HTMLCanvasElement
  private g: CanvasRenderingContext2D
  layout!: Layout
  private regions: Region[] = []
  private anchors = new Map<Anchor, { x: number; y: number }>()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })!
    this.buffer = document.createElement('canvas')
    this.g = this.buffer.getContext('2d', { alpha: false })!
  }

  setLayout(layout: Layout): void {
    this.layout = layout
    this.canvas.width = layout.deviceW
    this.canvas.height = layout.deviceH
    this.buffer.width = layout.w
    this.buffer.height = layout.h
  }

  /** The command under a logical point, from the last frame drawn. */
  hit(x: number, y: number): Cmd | null {
    for (let i = this.regions.length - 1; i >= 0; i--) if (contains(this.regions[i].r, x, y)) return this.regions[i].cmd
    return null
  }

  private region(r: Rect, cmd: Cmd): void {
    this.regions.push({ r, cmd })
  }

  draw(game: Game): void {
    const g = this.g
    const L = this.layout
    this.regions = []
    g.imageSmoothingEnabled = false
    drawScene(g, L.w, L.h, this.morning(game))
    switch (game.screen) {
      case 'title':
        this.drawTitle(game)
        break
      case 'play':
        this.drawPlay(game)
        break
      case 'offer':
        this.drawPlay(game)
        this.drawOffer(game)
        break
      case 'result':
        this.drawResult(game)
        break
      case 'finds':
        this.drawFinds(game)
        break
    }
    this.drawMute(game)
    this.drawParticles(game)
    if (game.toast) this.drawToast(game.toast.text)
    if (game.clock < game.flashUntil) {
      const k = (game.flashUntil - game.clock) / T.flashMs
      g.globalAlpha = Math.min(0.6, k * 0.6)
      g.fillStyle = game.flashColor
      g.fillRect(0, 0, L.w, L.h)
      g.globalAlpha = 1
    }
    let ox = 0
    let oy = 0
    if (game.clock < game.shakeUntil) {
      const m = game.shakeMag
      ox = ((Math.floor(game.clock / 30) % 2) * 2 - 1) * m
      oy = ((Math.floor(game.clock / 40) % 2) * 2 - 1) * Math.max(0, m - 1)
    }
    const ctx = this.ctx
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = C.skyNight
    ctx.fillRect(0, 0, L.deviceW, L.deviceH)
    ctx.drawImage(this.buffer, 0, 0, L.w, L.h, ox * L.scale, oy * L.scale, L.w * L.scale, L.h * L.scale)
  }

  private morning(game: Game): number {
    if (game.screen === 'play' || game.screen === 'offer') {
      const run = game.run
      const t = 1 - run.timeLeftMs / run.config.durationMs
      const last = run.timeLeftMs < T.lastSecondsMs ? (T.lastSecondsMs - run.timeLeftMs) / T.lastSecondsMs : 0
      return Math.min(1, t * 0.75 + last * 0.25)
    }
    if (game.screen === 'result') return 0.95
    return 0.35 + 0.04 * Math.sin(game.clock / 3000)
  }

  // ------------------------------------------------------------ pieces

  private text(s: string, x: number, y: number, color: string, scale = 1, align: 'left' | 'center' | 'right' = 'left'): number {
    return drawText(this.g, s, x, y, color, scale, align)
  }

  private shadowText(s: string, x: number, y: number, color: string, scale = 1, align: 'left' | 'center' | 'right' = 'left'): number {
    return drawTextShadow(this.g, s, x, y, color, C.ink, scale, align)
  }

  private panel(r: Rect, fill: string, edge: string = C.ink, light?: string, shadow = true): void {
    const g = this.g
    if (shadow) {
      g.fillStyle = C.shadow
      g.fillRect(r.x + 2, r.y + 2, r.w, r.h)
    }
    g.fillStyle = edge
    g.fillRect(r.x, r.y, r.w, r.h)
    g.fillStyle = fill
    g.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2)
    if (light) {
      g.fillStyle = light
      g.fillRect(r.x + 1, r.y + 1, r.w - 2, 1)
    }
    // round the corners by one pixel
    g.clearRect(r.x, r.y, 1, 1)
    g.fillStyle = edge
    g.fillRect(r.x + 1, r.y + 1, 1, 1)
    g.fillRect(r.x + r.w - 2, r.y + 1, 1, 1)
    g.fillRect(r.x + 1, r.y + r.h - 2, 1, 1)
    g.fillRect(r.x + r.w - 2, r.y + r.h - 2, 1, 1)
  }

  private sprite(img: HTMLCanvasElement, x: number, y: number, scale: number): void {
    this.g.drawImage(img, 0, 0, img.width, img.height, Math.round(x), Math.round(y), img.width * scale, img.height * scale)
  }

  private iconAt(name: string, x: number, y: number, scale = 1, tint?: string): void {
    this.sprite(icon(name, tint), x, y, scale)
  }

  private button(r: Rect, label: string, cmd: Cmd, game: Game, opts: { enabled?: boolean; color?: 'buy' | 'haggle' | 'pass'; icon?: string; sub?: string; scale?: number } = {}): void {
    const enabled = opts.enabled ?? true
    const key = opts.color ?? 'pass'
    const base = enabled ? C[key] : C.disabled
    const light = enabled ? C[`${key}Light` as const] : C.disabledLight
    const dark = enabled ? C[`${key}Dark` as const] : C.disabledDark
    const down = !!game.pressed && game.pressed.cmd === cmd
    const lip = 3
    const g = this.g
    const y = r.y + (down ? lip - 1 : 0)
    const h = r.h - lip
    g.fillStyle = C.shadow
    g.fillRect(r.x + 1, r.y + 2, r.w, r.h)
    g.fillStyle = C.ink
    g.fillRect(r.x, y, r.w, h + (down ? 1 : lip))
    g.fillStyle = dark
    g.fillRect(r.x + 1, y + 1, r.w - 2, h + (down ? -1 : lip - 2))
    g.fillStyle = base
    g.fillRect(r.x + 1, y + 1, r.w - 2, h - 2)
    g.fillStyle = light
    g.fillRect(r.x + 2, y + 1, r.w - 4, 1)
    g.fillRect(r.x + 1, y + 2, 1, h - 4)
    const tc = enabled ? C.text : C.dim
    const scale = opts.scale ?? labelScale(label, r, !!opts.icon)
    const subH = opts.sub && h >= 26 ? LINE : 0
    const iconW = opts.icon ? 8 * Math.max(1, scale - 1) + 3 : 0
    const tw = measure(label, scale) + iconW
    const cy = y + Math.floor((h - GLYPH_H * scale - subH) / 2)
    let x = Math.round(r.x + (r.w - tw) / 2)
    if (opts.icon) {
      this.iconAt(opts.icon, x, cy + Math.floor((GLYPH_H * scale - 8 * Math.max(1, scale - 1)) / 2), Math.max(1, scale - 1), tc)
      x += iconW
    }
    drawTextShadow(g, label, x, cy, tc, dark, scale)
    if (subH) this.text(fitText(opts.sub!, r.w - 6), r.x + r.w / 2, cy + GLYPH_H * scale + 3, enabled ? C.goldLight : C.dim, 1, 'center')
    this.region(r, cmd)
  }

  private drawMute(game: Game): void {
    const r = this.layout.mute
    const name = game.muted ? 'muted' : 'speaker'
    this.panel(r, C.panel, C.ink, C.panelLight, false)
    this.iconAt(name, r.x + Math.floor((r.w - 8) / 2), r.y + Math.floor((r.h - 8) / 2), 1, C.text)
    this.region(r, 'mute')
  }

  private drawToast(text: string): void {
    const L = this.layout
    const w = Math.min(L.area.w - 16, measure(text) + 12)
    const lines = wrapText(text, w - 10)
    const h = lines.length * LINE + 6
    const r = { x: Math.round(L.area.x + (L.area.w - w) / 2), y: L.top.y + L.top.h + 2, w, h }
    this.panel(r, C.ink, C.gold)
    lines.forEach((l, i) => this.text(l, r.x + w / 2, r.y + 4 + i * LINE, C.gold, 1, 'center'))
  }

  // ------------------------------------------------------------ play

  private drawPlay(game: Game): void {
    const L = this.layout
    const run = game.run
    this.anchors.clear()
    // top bar
    this.g.fillStyle = C.barBack
    this.g.fillRect(0, 0, L.w, L.top.y + L.top.h)
    const ty = L.top.y + Math.floor((L.top.h - 14) / 2) + 1
    const left = run.timeLeftMs
    const lastTen = left <= T.lastSecondsMs && !run.timerPaused
    const pulse = lastTen && Math.floor(left / 250) % 2 === 0
    this.iconAt('clock', L.top.x + 4, ty + 3, 1, lastTen ? C.bad : C.text)
    this.shadowText(run.timerPaused ? 'WAIT' : clockText(left), L.top.x + 15, ty, pulse ? C.bad : lastTen ? C.goldLight : C.text, 2)
    const cashText = money(run.cash)
    const cw = measure(cashText, 2) + 11
    const cx = Math.round(L.top.x + L.top.w / 2 - cw / 2)
    this.iconAt('coin', cx, ty + 3)
    this.shadowText(cashText, cx + 11, ty, C.cash, 2)
    this.anchors.set('wallet', { x: cx + 4, y: ty + 6 })
    const modeX = L.mute.x - 4
    if (modeX - measure(game.modeLabel) > cx + cw + 4) this.shadowText(game.modeLabel, modeX, ty + 4, C.text, 1, 'right')

    this.drawStall(game)
    this.drawCardArea(game)
    this.drawClues(game)
    this.drawButtons(game)
  }

  private drawCardArea(game: Game): void {
    const L = this.layout
    const run = game.run
    let card = L.card
    const hint = game.hint
    if (hint) {
      const lines = wrapText(hint, card.w - 12)
      const hh = lines.length * LINE + 5
      const hr = { x: card.x, y: card.y, w: card.w, h: hh }
      this.panel(hr, C.ink, C.gold)
      lines.forEach((l, i) => this.text(l, hr.x + hr.w / 2, hr.y + 3 + i * LINE, C.gold, 1, 'center'))
      card = { x: card.x, y: card.y + hh + 2, w: card.w, h: card.h - hh - 2 }
    }
    const g = this.g
    g.save()
    g.beginPath()
    g.rect(card.x - 1, card.y - 1, card.w + 5, card.h + 5)
    g.clip()
    const out = game.outgoing
    const t = run.elapsedMs
    const dist = L.w
    if (out) {
      const q = (t - out.at) / run.config.slideInMs
      if (out.kind === 'pass' && q < 1) this.drawCard(game, out.item, out.ask, card, -Math.round(ease(Math.max(0, q)) * dist), 0, false)
      else if (out.kind === 'buy' && q < 1) {
        const dx = L.portrait ? 0 : Math.round(ease(q) * dist)
        const dy = L.portrait ? Math.round(ease(q) * card.h * 1.5) : 0
        this.drawCard(game, out.item, out.ask, card, dx, dy, false)
      } else if (out.kind === 'nodeal') {
        const hold = run.config.haggleFailLockMs - run.config.slideInMs
        const tt = t - out.at
        if (tt < hold + run.config.slideInMs) {
          const qq = tt < hold ? 0 : (tt - hold) / run.config.slideInMs
          this.drawCard(game, out.item, out.ask, card, -Math.round(ease(qq) * dist) + this.wobble(game), 0, false)
        }
      }
    }
    const cur = run.current
    if (cur && t >= cur.readyAtMs - run.config.slideInMs) {
      const p = Math.max(0, Math.min(1, (cur.readyAtMs - t) / run.config.slideInMs))
      const dx = Math.round(p * p * dist) + (out?.kind === 'nodeal' ? 0 : this.wobble(game))
      this.drawCard(game, cur.item, cur.ask, card, dx, 0, true)
    }
    g.restore()
    if (!cur && !out) this.panel(card, C.panel, C.ink)
    // stamps over the card
    const st = game.stamp
    if (st && st.slot === null && game.clock >= st.from) this.drawStamp(st.text, st.kind === 'deal' ? C.goodDark : C.badDark, card.x + card.w / 2, card.y + card.h / 2, card.w > 200 ? 3 : 2)
  }

  private wobble(game: Game): number {
    const dt = game.clock - game.wobbleAt
    if (dt < 0 || dt > T.wobbleMs) return 0
    return Math.round(Math.sin((dt / T.wobbleMs) * Math.PI * 6) * 3 * (1 - dt / T.wobbleMs))
  }

  private drawStamp(text: string, color: string, cx: number, cy: number, scale: number): void {
    const w = measure(text, scale) + 10
    const h = GLYPH_H * scale + 8
    const r = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h }
    const g = this.g
    g.fillStyle = color
    g.fillRect(r.x, r.y, r.w, r.h)
    g.fillStyle = C.paper
    g.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4)
    g.fillStyle = color
    g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6)
    this.text(text, cx, r.y + 4, C.paper, scale, 'center')
  }

  private drawCard(game: Game, item: PricedItem, ask: number, box: Rect, dx: number, dy: number, live: boolean): void {
    const L = this.layout
    const run = game.run
    const r = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h }
    const grail = item.tier === 'grail'
    this.panel(r, C.paper, grail ? C.cashDark : C.ink, C.white)
    if (grail) {
      const g = this.g
      g.fillStyle = Math.floor(game.clock / 200) % 2 ? C.gold : C.goldLight
      g.fillRect(r.x + 1, r.y + 1, r.w - 2, 2)
      g.fillRect(r.x + 1, r.y + r.h - 3, r.w - 2, 2)
    }
    const pad = 5
    const bubble = live ? run.cluesShown.find((c) => c.kind === 'bubble') ?? null : null
    const faceScale = r.h >= 120 && r.w >= 200 ? 2 : 1
    const faceSize = FACE_PX * faceScale
    if (!L.portrait) {
      // picture left, details right; the picture box hugs a whole number sprite scale
      const fitS = Math.max(1, Math.floor((Math.min(r.h - pad * 2, r.w * 0.4) - 6) / ITEM_PX))
      const side = Math.min(r.h - pad * 2, fitS * ITEM_PX + 6)
      this.picture(item, { x: r.x + pad, y: r.y + pad, w: side, h: side }, grail, game)
      const ix = r.x + pad * 2 + side
      const iw = r.x + r.w - pad - ix
      let y = r.y + pad
      this.face(item.sellerType, item.sellerFace, ix, y, faceScale)
      if (live) this.anchors.set('seller', { x: ix + faceSize / 2, y: y + faceSize / 2 })
      this.text(SELLER_NAME[item.sellerType], ix + faceSize + 4, y + Math.floor((faceSize - GLYPH_H) / 2), sellerInk(item.sellerType))
      y += faceSize + 2
      const bubbleLines = bubble ? wrapText(`"${bubble.text}"`, iw - 8) : []
      const bubbleH = bubble ? Math.min(2, bubbleLines.length) * LINE + 5 : 0
      const priceH = 14 + LINE + 2
      const nameStep = GLYPH_H + 1
      const nameRoom = r.y + r.h - pad - (bubble ? bubbleH + 4 : 0) - priceH - y
      const nameLines = clampLines(wrapText(item.name, iw), Math.max(1, Math.min(3, Math.floor(nameRoom / nameStep))), iw)
      nameLines.forEach((l, i) => this.text(l, ix, y + i * nameStep, C.ink))
      y += nameLines.length * nameStep + 2
      this.prices(item, ask, ix, y, iw)
      if (bubble) this.bubble(clampLines(bubbleLines, 2, iw - 8), { x: ix, y: Math.min(y + priceH + 4, r.y + r.h - pad - bubbleH), w: iw, h: bubbleH })
    } else {
      // picture top left, face and prices right, name and bubble below
      const side = Math.max(40, Math.min(r.w - pad * 3 - 64, Math.round(r.h * 0.5)))
      this.picture(item, { x: r.x + pad, y: r.y + pad, w: side, h: side }, grail, game)
      const ix = r.x + pad * 2 + side
      const iw = r.x + r.w - pad - ix
      let y = r.y + pad
      const fs = iw >= 40 && side >= 80 ? 2 : 1
      this.face(item.sellerType, item.sellerFace, ix, y, fs)
      if (live) this.anchors.set('seller', { x: ix + (FACE_PX * fs) / 2, y: y + (FACE_PX * fs) / 2 })
      y += FACE_PX * fs + 2
      this.text(fitText(SELLER_NAME[item.sellerType], iw), ix, y, sellerInk(item.sellerType))
      y += LINE + 2
      const pricesBottom = this.prices(item, ask, ix, y, iw, true)
      y = Math.max(r.y + pad + side, pricesBottom) + 4
      const nameLines = clampLines(wrapText(item.name, r.w - pad * 2), 3, r.w - pad * 2)
      nameLines.forEach((l, i) => this.text(l, r.x + pad, y + i * LINE, C.ink))
      y += nameLines.length * LINE + 4
      if (bubble) {
        const lines = clampLines(wrapText(`"${bubble.text}"`, r.w - pad * 2 - 8), 3, r.w - pad * 2 - 8)
        const bh = lines.length * LINE + 5
        this.bubble(lines, { x: r.x + pad, y: Math.min(y + 3, r.y + r.h - pad - bh), w: r.w - pad * 2, h: bh })
      }
    }
    if (live) this.anchors.set('card', { x: r.x + r.w / 2, y: r.y + r.h / 2 })
  }

  private picture(item: PricedItem, box: Rect, grail: boolean, game: Game): void {
    const g = this.g
    g.fillStyle = C.paperDark
    g.fillRect(box.x, box.y, box.w, box.h)
    g.fillStyle = C.paperShade
    g.fillRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2)
    // a little table cloth under the item
    g.fillStyle = C.clothA
    g.fillRect(box.x + 1, box.y + box.h - Math.round(box.h * 0.22), box.w - 2, Math.round(box.h * 0.22) - 1)
    g.fillStyle = C.clothB
    for (let x = box.x + 1; x < box.x + box.w - 1; x += 4) g.fillRect(x, box.y + box.h - Math.round(box.h * 0.22), 2, 1)
    const s = Math.max(1, Math.floor((Math.min(box.w, box.h) - 4) / ITEM_PX))
    const size = ITEM_PX * s
    this.sprite(itemSprite(item.category, item.artSeed, item.palette), box.x + Math.floor((box.w - size) / 2), box.y + Math.floor((box.h - size) / 2), s)
    if (grail) {
      const k = Math.floor(game.clock / 150)
      for (let i = 0; i < 4; i++) {
        const sx = box.x + 3 + ((k * 7 + i * 13) % Math.max(1, box.w - 6))
        const sy = box.y + 3 + ((k * 5 + i * 11) % Math.max(1, box.h - 6))
        g.fillStyle = C.goldLight
        g.fillRect(sx - 1, sy, 3, 1)
        g.fillRect(sx, sy - 1, 1, 3)
      }
      this.text('GRAIL', box.x + 3, box.y + 3, C.cashDark)
    }
  }

  private face(type: SellerType, face: number, x: number, y: number, scale: number): void {
    const size = FACE_PX * scale
    const g = this.g
    g.fillStyle = C.ink
    g.fillRect(x - 1, y - 1, size + 2, size + 2)
    g.fillStyle = C[type]
    g.fillRect(x, y, size, size)
    this.sprite(faceSprite(type, face), x, y, scale)
  }

  /** Draws guide and ask; returns the y just below what it drew. */
  private prices(item: PricedItem, ask: number, x: number, y: number, w: number, stacked = false): number {
    const guideTxt = money(item.guide)
    const askTxt = money(ask)
    const askColor = ask < item.guide ? C.goodDark : ask > item.guide ? C.badDark : C.ink
    const big = (s: string) => (measure(s, 2) <= (stacked ? w : w / 2 - 4) ? 2 : 1)
    if (stacked) {
      this.text('GUIDE', x, y, C.inkSoft)
      this.text(guideTxt, x, y + LINE, C.inkSoft, big(guideTxt))
      const y2 = y + LINE + GLYPH_H * big(guideTxt) + 4
      this.text('ASK', x, y2, C.inkSoft)
      this.text(askTxt, x, y2 + LINE, askColor, big(askTxt))
      let bottom = y2 + LINE + GLYPH_H * big(askTxt)
      if (ask < item.ask) {
        this.strike(`was ${money(item.ask)}`, x, bottom + 2)
        bottom += LINE + 2
      }
      return bottom
    }
    const half = Math.floor(w / 2)
    this.text('GUIDE', x, y, C.inkSoft)
    this.text(guideTxt, x, y + LINE, C.inkSoft, big(guideTxt))
    this.text('ASK', x + half, y, C.inkSoft)
    this.text(askTxt, x + half, y + LINE, askColor, big(askTxt))
    if (ask < item.ask) this.strike(`was ${money(item.ask)}`, x + half + measure('ASK') + 4, y)
    return y + LINE + GLYPH_H * Math.max(big(guideTxt), big(askTxt))
  }

  private strike(s: string, x: number, y: number): void {
    const w = this.text(s, x, y, C.inkSoft)
    this.g.fillStyle = C.badDark
    this.g.fillRect(x - 1, y + 3, w + 2, 1)
  }

  private bubble(lines: string[], r: Rect): void {
    const g = this.g
    g.fillStyle = C.ink
    g.fillRect(r.x, r.y, r.w, r.h)
    g.fillStyle = C.white
    g.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2)
    // tail toward the seller above
    g.fillStyle = C.ink
    g.fillRect(r.x + 6, r.y - 3, 1, 3)
    g.fillRect(r.x + 7, r.y - 2, 1, 2)
    g.fillStyle = C.white
    g.fillRect(r.x + 7, r.y, 3, 1)
    lines.forEach((l, i) => this.text(fitText(l, r.w - 6), r.x + 4, r.y + 3 + i * LINE, C.bubbleInk))
  }

  private drawClues(game: Game): void {
    const L = this.layout
    const run = game.run
    const r = L.clues
    const cur = run.current
    const ready = cur && run.elapsedMs >= cur.readyAtMs
    const shown = ready ? run.cluesShown : []
    const chips = shown.filter((c) => c.kind === 'chip')
    const total = cur ? Math.min(cur.item.clues.length, run.config.clueTimesMs.length) : 0
    const waiting = cur ? total - shown.length : 0
    const slots: Array<Clue | 'wait' | null> = [...chips, ...Array.from({ length: waiting }, () => 'wait' as const)]
    while (slots.length < 3) slots.push(null)
    const rows = L.portrait ? 3 : 1
    const cols = L.portrait ? 1 : 3
    const gap = 3
    const cw = Math.floor((r.w - gap * (cols - 1)) / cols)
    const ch = Math.floor((r.h - gap * (rows - 1)) / rows)
    for (let i = 0; i < 3; i++) {
      const x = r.x + (i % cols) * (cw + gap)
      const y = r.y + Math.floor(i / cols) * (ch + gap)
      const s = slots[i]
      const box = { x, y, w: cw, h: ch }
      if (s === null) {
        this.g.fillStyle = C.chipEmpty
        this.g.fillRect(x, y, cw, ch)
      } else if (s === 'wait') {
        this.panel(box, C.panelDark, C.ink, undefined, false)
        const dots = '.'.repeat(1 + (Math.floor(game.clock / 250) % 3))
        this.text(dots, x + cw / 2, y + Math.floor((ch - GLYPH_H) / 2), C.dim, 1, 'center')
      } else {
        this.panel(box, C.chip, C.ink, C.panelLight, false)
        const ic = s.trait === 'condition' ? 'wrench' : s.trait === 'box' ? 'box' : 'glass'
        this.iconAt(ic, x + 3, y + Math.floor((ch - 8) / 2))
        const color = chipColor(s)
        const lines = clampLines(wrapText(s.text, cw - 15), Math.max(1, Math.floor((ch - 2) / LINE)), cw - 15)
        const ty = y + Math.floor((ch - lines.length * LINE + 2) / 2)
        lines.forEach((l, k) => this.text(fitText(l, cw - 15), x + 13, ty + k * LINE, color))
      }
    }
  }

  private drawStall(game: Game): void {
    const L = this.layout
    const run = game.run
    const r = L.stall
    const g = this.g
    // awning and table
    this.panel(r, C.wood, C.ink, C.woodLight)
    const awn = 7
    for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      g.fillStyle = Math.floor((x - r.x) / 6) % 2 ? C.clothB : C.clothA
      g.fillRect(x, r.y + 1, 1, awn - 2)
      if (Math.floor((x - r.x) / 3) % 2 === 0) g.fillRect(x, r.y + awn - 1, 1, 1)
    }
    this.text('YOUR STALL', r.x + r.w / 2, r.y + awn + 1, C.paper, 1, 'center')
    const body = { x: r.x + 3, y: r.y + awn + LINE + 1, w: r.w - 6, h: r.h - awn - LINE - 4 }
    const slots = run.config.stallSlots
    const vertical = !L.portrait
    const gap = 2
    const sw = vertical ? body.w : Math.floor((body.w - gap * (slots - 1)) / slots)
    const sh = vertical ? Math.floor((body.h - gap * (slots - 1)) / slots) : body.h
    for (let s = 0; s < slots; s++) {
      const x = vertical ? body.x : body.x + s * (sw + gap)
      const y = vertical ? body.y + s * (sh + gap) : body.y
      this.anchors.set(`slot${s}` as Anchor, { x: x + sw / 2, y: y + sh / 2 })
      g.fillStyle = C.woodDark
      g.fillRect(x, y, sw, sh)
      g.fillStyle = C.groundDark
      g.fillRect(x + 1, y + 1, sw - 2, sh - 2)
      const entry = run.stall.find((e) => e.slot === s)
      if (entry) {
        const scale = sh - 4 >= ITEM_PX && sw >= ITEM_PX + 4 ? 1 : 0.5
        const size = ITEM_PX * scale
        const img = itemSprite(entry.item.category, entry.item.artSeed, entry.item.palette)
        const sx = vertical ? x + 3 : x + Math.floor((sw - size) / 2)
        const sy = y + Math.floor((sh - size) / 2) - (vertical ? 0 : 3)
        g.drawImage(img, 0, 0, ITEM_PX, ITEM_PX, sx, sy, size, size)
        const left = Math.max(0, entry.sellAtMs - run.elapsedMs) / run.config.holdMs
        g.fillStyle = C.ink
        g.fillRect(x + 2, y + sh - 4, sw - 4, 3)
        g.fillStyle = C.gold
        g.fillRect(x + 3, y + sh - 3, Math.round((sw - 6) * (1 - left)), 1)
        const paid = money(entry.paid)
        if (vertical) {
          this.text('PAID', sx + size + 4, y + Math.floor(sh / 2) - LINE + 1, C.paperShade)
          this.text(fitText(paid, sw - size - 10), sx + size + 4, y + Math.floor(sh / 2) + 1, C.paper)
        } else {
          drawTextShadow(g, fitText(paid, sw - 2), x + sw / 2, y + sh - 4 - LINE, C.paper, C.ink, 1, 'center')
        }
      } else {
        this.text('empty', x + sw / 2, y + Math.floor((sh - GLYPH_H) / 2), C.woodLight, 1, 'center')
      }
      const pop = game.pops.find((p) => p.slot === s)
      if (pop) {
        const k = (game.clock - pop.from) / T.salePopMs
        const py = y + Math.floor(sh / 2) - 4 - Math.round(ease(k) * 12)
        const txt = signed(pop.profit)
        const color = pop.profit >= 0 ? C.good : C.bad
        drawTextShadow(g, txt, x + sw / 2, py, color, C.ink, measure(txt, 2) <= sw ? 2 : 1, 'center')
      }
      const st = game.stamp
      if (st && st.slot === s) this.drawStamp('FAKE', C.badDark, x + sw / 2, y + sh / 2 + 4, 1)
    }
  }

  private drawButtons(game: Game): void {
    const L = this.layout
    const run = game.run
    const b = L.buttons
    const wide = !L.portrait
    const cur = run.current
    let buySub = wide ? 'Right or D' : ''
    if (cur && !run.locked && !run.canBuy) buySub = run.stallFull ? 'Stall full' : 'Not enough cash'
    const scale = Math.min(labelScale('PASS', b.pass, true), labelScale('HAGGLE', b.haggle, true), labelScale('BUY', b.buy, true))
    this.button(b.pass, 'PASS', 'pass', game, { enabled: run.canPass, color: 'pass', icon: 'left', sub: wide ? 'Left or A' : '', scale })
    this.button(b.haggle, 'HAGGLE', 'haggle', game, { enabled: run.canHaggle, color: 'haggle', icon: 'up', sub: wide ? 'Up, W or Space' : '', scale })
    this.button(b.buy, 'BUY', 'buy', game, { enabled: run.canBuy, color: 'buy', icon: 'right', sub: buySub, scale })
  }

  private drawParticles(game: Game): void {
    const g = this.g
    for (const p of game.particles) {
      const k = (game.clock - p.t0) / p.life
      if (k < 0 || k > 1) continue
      const a = this.anchors.get(p.from)
      if (!a) continue
      if (p.kind === 'coin' && p.to) {
        const b = this.anchors.get(p.to)
        if (!b) continue
        const e = ease(k)
        const mx = (a.x + b.x) / 2 + p.dx * 6
        const my = Math.min(a.y, b.y) - 24 + p.dy * 4
        const x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * mx + e * e * b.x
        const y = (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * my + e * e * b.y
        this.sprite(icon('coin'), x - 4, y - 4, 1)
      } else {
        const x = a.x + p.dx * k
        const y = a.y + p.dy * k + 40 * k * k
        g.fillStyle = p.kind === 'shard' ? (Math.floor(k * 10) % 2 ? C.bad : C.paper) : Math.floor(k * 8) % 2 ? C.gold : C.goldLight
        const s = p.kind === 'shard' ? 2 : 1
        g.fillRect(Math.round(x), Math.round(y), s, s)
        if (p.kind === 'spark') {
          g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1)
          g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3)
        }
      }
    }
  }

  // ------------------------------------------------------------ other screens

  private dim(alpha = 0.55): void {
    const L = this.layout
    this.g.fillStyle = inkAlpha(alpha)
    this.g.fillRect(0, 0, L.w, L.h)
  }

  private centerPanel(maxW: number, h: number): Rect {
    const a = this.layout.area
    const w = Math.min(maxW, a.w - 12)
    return { x: Math.round(a.x + (a.w - w) / 2), y: Math.round(a.y + Math.max(this.layout.top.h + 2, (a.h - h) / 2)), w, h }
  }

  private drawOffer(game: Game): void {
    this.dim()
    const p = this.centerPanel(230, 96)
    this.panel(p, C.panel, C.ink, C.panelLight)
    this.shadowText("TIME'S UP", p.x + p.w / 2, p.y + 8, C.gold, 2, 'center')
    this.text('Watch a short ad for', p.x + p.w / 2, p.y + 30, C.text, 1, 'center')
    this.text('15 more seconds?', p.x + p.w / 2, p.y + 30 + LINE, C.text, 1, 'center')
    const bw = Math.floor((p.w - 18) / 2)
    const skipR = { x: p.x + 6, y: p.y + p.h - 34, w: bw, h: 28 }
    const watchR = { x: p.x + 12 + bw, y: p.y + p.h - 34, w: bw, h: 28 }
    const scale = Math.min(labelScale('NO THANKS', skipR, false), labelScale('+15 SEC', watchR, true))
    // The skip choice must look exactly like the watch choice (portal ad rules).
    this.button(skipR, 'NO THANKS', 'skip', game, { color: 'pass', scale })
    this.button(watchR, '+15 SEC', 'watch', game, { color: 'pass', icon: 'video', scale })
  }

  private drawTitle(game: Game): void {
    const L = this.layout
    const a = L.area
    const cx = a.x + a.w / 2
    const big = L.w >= 360 ? 4 : 3
    const bw = Math.min(L.portrait ? a.w - 24 : 220, a.w - 24)
    const sw = Math.min(Math.max(bw, 264), a.w - 12)
    const k = game.keepers
    const statLines = joinFit([`Best ${money(k.best)}`, `Streak ${game.streak}`, `Profit ${money(Math.max(0, k.lifetimeProfit))}`], '   ', sw - 10)
    const statsH = (statLines.length + 1) * LINE + 7
    const contentH = (GLYPH_H * big + 4) * 2 + 2 + LINE + 8 + 34 + 6 + 28 + 8 + statsH
    let y = a.y + Math.max(L.top.h + 4, Math.round((a.h - contentH) / 2) - (L.portrait ? 20 : 4))
    this.logo('SWAP MEET', cx, y, big, C.gold)
    y += GLYPH_H * big + 4
    this.logo('SPRINT', cx, y, big, C.paper)
    y += GLYPH_H * big + 6
    this.shadowText('Buy, haggle or pass. One minute.', cx, y, C.text, 1, 'center')
    y += LINE + 8
    const bh = 34
    const bx = Math.round(cx - bw / 2)
    const daily = game.dailyDone
    const dailySub = daily ? `Today: ${money(k.dailyScore ?? 0)}. Replays are practice.` : `${game.todayLabel}. Same items for all.`
    this.button({ x: bx, y, w: bw, h: bh }, 'DAILY MORNING', 'daily', game, { color: 'buy', icon: 'star', sub: dailySub })
    y += bh + 6
    this.button({ x: bx, y, w: bw, h: 28 }, 'FREE PLAY', 'free', game, { color: 'haggle', icon: 'right' })
    y += 28 + 8
    // keepers
    const sr = { x: Math.round(cx - sw / 2), y, w: sw, h: statsH }
    this.panel(sr, C.panelDark, C.ink, C.panel)
    statLines.forEach((l, i) => this.text(l, sr.x + sr.w / 2, sr.y + 4 + i * LINE, C.text, 1, 'center'))
    const fy = sr.y + 4 + statLines.length * LINE
    this.iconAt('shelf', sr.x + 6, fy - 1)
    this.text(`Finds ${game.findsCount} of ${GRAIL_COUNT}`, sr.x + 18, fy, C.gold)
    this.text('OPEN SHELF', sr.x + sr.w - 6, fy, C.goldLight, 1, 'right')
    this.region(sr, 'finds')
    this.shadowText('Made by Bal Tak', cx, a.y + a.h - LINE - 2, C.paperShade, 1, 'center')
  }

  private logo(s: string, cx: number, y: number, scale: number, color: string): void {
    const g = this.g
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [1, 1],
      [2, 2],
    ])
      drawText(g, s, cx + dx * Math.max(1, scale - 2), y + dy * Math.max(1, scale - 2), C.ink, scale, 'center')
    drawText(g, s, cx, y, color, scale, 'center')
  }

  private drawResult(game: Game): void {
    const L = this.layout
    const r = game.result
    if (!r) return
    const a = L.area
    const p = { x: a.x + 6, y: a.y + L.top.h + 2, w: a.w - 12, h: a.h - L.top.h - 8 }
    this.panel(p, C.paper, C.ink, C.white)
    const cx = p.x + p.w / 2
    let y = p.y + 6
    // home
    const home = { x: p.x + 4, y: p.y + 4, w: 18, h: 16 }
    this.panel(home, C.pass, C.ink, C.passLight, false)
    this.iconAt('home', home.x + 5, home.y + 4, 1, C.text)
    this.region(home, 'home')
    const title = r.bust ? 'BUST!' : r.mode === 'daily' ? (r.scored ? 'DAILY DONE' : 'PRACTICE OVER') : 'MORNING OVER'
    this.text(title, cx, y + 3, C.ink, 1, 'center')
    y += LINE + 6
    const scoreTxt = money(r.score)
    const sc = measure(scoreTxt, 4) <= p.w - 20 && p.h > 150 ? 4 : 3
    drawTextShadow(this.g, scoreTxt, cx, y, r.score >= r.start ? C.goodDark : C.badDark, C.paperDark, sc, 'center')
    y += GLYPH_H * sc + 4
    this.text(`${money(r.start)} into ${money(r.score)}`, cx, y, C.inkSoft, measure(`${money(r.start)} into ${money(r.score)}`, 2) <= p.w - 12 ? 2 : 1, 'center')
    y += 18
    if (r.newBest) {
      this.drawStamp('NEW BEST', C.goodDark, cx, y + 4, 1)
      y += 16
    } else if (r.mode === 'daily' && !r.scored && game.keepers.dailyScore !== null) {
      this.text(`Your scored run today: ${money(game.keepers.dailyScore)}`, cx, y, C.inkSoft, 1, 'center')
      y += LINE + 4
    }
    const rowW = Math.min(p.w - 16, 300)
    const rx = Math.round(cx - rowW / 2)
    const dealRow = (label: string, deal: NonNullable<typeof r.bestDeal>, color: string) => {
      const rh = 20
      this.g.fillStyle = C.paperShade
      this.g.fillRect(rx, y, rowW, rh)
      const img = itemSprite(deal.item.category, deal.item.artSeed, deal.item.palette)
      this.g.drawImage(img, 0, 0, ITEM_PX, ITEM_PX, rx + 2, y + 2, 16, 16)
      this.text(label, rx + 22, y + 2, C.inkSoft)
      const amt = signed(deal.profit) + (deal.item.fake ? ' FAKE' : '')
      this.text(amt, rx + rowW - 3, y + 2, color, 1, 'right')
      this.text(fitText(deal.item.name, rowW - 26), rx + 22, y + 2 + LINE, C.ink)
      y += rh + 3
    }
    if (r.bestDeal) dealRow('BEST DEAL', r.bestDeal, r.bestDeal.profit >= 0 ? C.goodDark : C.badDark)
    if (r.worstDeal && r.worstDeal !== r.bestDeal) dealRow('WORST DEAL', r.worstDeal, r.worstDeal.profit >= 0 ? C.goodDark : C.badDark)
    if (!r.bestDeal) {
      this.text('You bought nothing. Brave.', cx, y + 4, C.inkSoft, 1, 'center')
      y += LINE + 8
    }
    const keep = [`Bought ${r.bought}`, `Haggles ${r.haggles}`, `Streak ${r.streak}`, `Finds ${game.findsCount} of ${GRAIL_COUNT}`]
    if (r.newFinds) keep.push(`${r.newFinds} new`)
    joinFit(keep, '   ', p.w - 12)
      .slice(0, 3)
      .forEach((l, i) => this.text(l, cx, y + 2 + i * LINE, C.inkSoft, 1, 'center'))
    // buttons
    const bh = L.portrait ? 38 : 32
    const by = p.y + p.h - bh - 6
    const double = game.canOfferDouble
    if (double) {
      const dr = { x: p.x + 6, y: by - 26, w: p.w - 12, h: 22 }
      this.button(dr, 'START NEXT WITH $100', 'double', game, { color: 'pass', icon: 'video' })
    }
    const bw = Math.floor((p.w - 18) / 2)
    const shareR = { x: p.x + 6, y: by, w: bw, h: bh }
    const againR = { x: p.x + 12 + bw, y: by, w: bw, h: bh }
    const scale = Math.min(labelScale('SHARE', shareR, true), labelScale('PLAY AGAIN', againR, false))
    this.button(shareR, 'SHARE', 'share', game, { color: 'pass', icon: 'share', scale })
    this.button(againR, 'PLAY AGAIN', 'again', game, { color: 'buy', sub: L.portrait ? '' : 'Enter or Space', scale })
  }

  private drawFinds(game: Game): void {
    const L = this.layout
    const a = L.area
    const p = { x: a.x + 6, y: a.y + L.top.h + 2, w: a.w - 12, h: a.h - L.top.h - 8 }
    this.panel(p, C.wood, C.ink, C.woodLight)
    const home = { x: p.x + 4, y: p.y + 4, w: 18, h: 16 }
    this.panel(home, C.pass, C.ink, C.passLight, false)
    this.iconAt('home', home.x + 5, home.y + 4, 1, C.text)
    this.region(home, 'home')
    this.shadowText(`FINDS SHELF  ${game.findsCount} of ${GRAIL_COUNT}`, p.x + p.w / 2, p.y + 8, C.gold, 1, 'center')
    const cols = L.portrait ? 5 : 8
    const rows = Math.ceil(GRAIL_COUNT / cols)
    const top = p.y + 22
    const bottom = p.y + p.h - LINE * 2 - 8
    const cell = Math.max(12, Math.min(Math.floor((p.w - 12) / cols), Math.floor((bottom - top) / rows)))
    const gx = Math.round(p.x + (p.w - cell * cols) / 2)
    const found = new Set(game.keepers.finds)
    for (let i = 0; i < GRAIL_COUNT; i++) {
      const gr = GRAILS[i]
      const x = gx + (i % cols) * cell
      const y = top + Math.floor(i / cols) * cell
      const c = { x: x + 1, y: y + 1, w: cell - 2, h: cell - 2 }
      this.g.fillStyle = game.selectedFind === i ? C.gold : C.woodDark
      this.g.fillRect(c.x, c.y, c.w, c.h)
      this.g.fillStyle = C.groundDark
      this.g.fillRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2)
      const s = c.w - 2 >= ITEM_PX ? 1 : 0.5
      const img = found.has(i) ? itemSprite(gr.category, gr.artSeed, gr.palette) : itemSilhouette(gr.category, gr.artSeed, gr.palette, C.panelDark)
      const size = ITEM_PX * s
      this.g.drawImage(img, 0, 0, ITEM_PX, ITEM_PX, Math.round(c.x + (c.w - size) / 2), Math.round(c.y + (c.h - size) / 2), size, size)
      this.region(c, `find${i}`)
    }
    const sel = game.selectedFind
    const msg = sel === null ? 'Sell a real grail to put it on the shelf.' : found.has(sel) ? GRAILS[sel].name : 'Not found yet. Keep looking.'
    const lines = wrapText(msg, p.w - 12).slice(0, 2)
    lines.forEach((l, i) => this.shadowText(l, p.x + p.w / 2, p.y + p.h - LINE * 2 - 4 + i * LINE, C.paper, 1, 'center'))
  }
}

/** Keep at most n lines; when text is cut, the last line ends with a dot so nothing vanishes silently. */
function clampLines(lines: string[], n: number, maxW: number): string[] {
  if (lines.length <= n) return lines
  const head = lines.slice(0, Math.max(0, n - 1))
  return [...head, fitText(`${lines.slice(n - 1).join(' ')} `, maxW - 1)]
}

/** Join whole phrases into lines that fit, never splitting a phrase. */
function joinFit(parts: string[], sep: string, maxW: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const p of parts) {
    const test = line ? line + sep + p : p
    if (line && measure(test) > maxW) {
      lines.push(line)
      line = p
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function labelScale(label: string, r: Rect, hasIcon: boolean): number {
  return measure(label, 2) + (hasIcon ? 12 : 0) <= r.w - 8 && r.h - 3 >= 22 ? 2 : 1
}

function sellerInk(t: SellerType): string {
  return t === 'clueless' ? C.goodDark : t === 'fair' ? C.cashDark : C.badDark
}

function chipColor(c: Clue): string {
  switch (c.claim) {
    case 'broken':
    case 'fake':
      return C.bad
    case 'worn':
    case 'unboxed':
      return C.text
    case 'mint':
    case 'boxed':
      return C.gold
    case 'real':
    case 'clean':
      return C.good
  }
}

export { inset }

// Store covers, drawn in code at a low resolution and scaled by a whole
// number so the pixel art stays crisp. Portal rule: no text but the title,
// no borders, no icons or store logos.

import { C } from './theme.ts'
import { drawScene } from './scene.ts'
import { drawText, measure, GLYPH_H } from './font.ts'
import { itemSprite, faceSprite, icon, ITEM_PX, FACE_PX } from './art.ts'
import { GRAILS } from '../core/grails.ts'

/** Grails picked to show one of each kind of thing on the table. */
const SHOWCASE = [0, 25, 10, 15, 30, 20, 35, 5]

function logo(g: CanvasRenderingContext2D, text: string, cx: number, y: number, scale: number, color: string): void {
  const o = Math.max(1, Math.floor(scale / 2))
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [1, 1],
    [2, 2],
  ])
    drawText(g, text, cx + dx * o, y + dy * o, C.ink, scale, 'center')
  drawText(g, text, cx, y, color, scale, 'center')
}

function fitScale(text: string, maxW: number, max: number): number {
  let s = max
  while (s > 1 && measure(text, s) > maxW) s--
  return s
}

/** Draw a cover of exactly w by h device pixels. */
export function drawCover(w: number, h: number): HTMLCanvasElement {
  const scale = Math.max(1, Math.floor(Math.min(w, h) / 220))
  const lw = Math.ceil(w / scale)
  const lh = Math.ceil(h / scale)
  const small = document.createElement('canvas')
  small.width = lw
  small.height = lh
  const g = small.getContext('2d')!
  g.imageSmoothingEnabled = false
  drawScene(g, lw, lh, 0.6)

  // the title, sized to a height budget
  const landscape = lw > lh * 1.3
  const lines = landscape ? ['SWAP MEET', 'SPRINT'] : ['SWAP', 'MEET', 'SPRINT']
  const byHeight = Math.floor((lh * (landscape ? 0.46 : 0.4)) / (lines.length * (GLYPH_H + 1.5)))
  const ts = Math.max(1, Math.min(byHeight, ...lines.map((l) => fitScale(l, lw * 0.86, 6))))
  let y = Math.round(lh * 0.06) + 5
  lines.forEach((l, i) => {
    logo(g, l, lw / 2, y, ts, i === lines.length - 1 ? C.paper : C.gold)
    y += GLYPH_H * ts + Math.max(2, Math.round(ts * 1.2))
  })
  const titleBottom = y

  // the table with a striped cloth
  const tableTop = Math.round(lh * 0.7)
  const tableH = Math.round(lh * 0.13)
  const tx = Math.round(lw * 0.04)
  const tw = lw - tx * 2
  const wide = lw >= 400
  const is = wide ? 2 : 1
  const size = ITEM_PX * is

  // the seller stands behind the middle of the table
  const fs = wide ? 3 : 2
  const faceW = FACE_PX * fs
  const fx = Math.round(lw / 2 - faceW / 2)
  const fy = tableTop - faceW + fs * 3
  g.drawImage(faceSprite('greedy', 2), 0, 0, FACE_PX, FACE_PX, fx, fy, faceW, faceW)

  g.fillStyle = C.ink
  g.fillRect(tx - 1, tableTop - 1, tw + 2, tableH + 2)
  g.fillStyle = C.wood
  g.fillRect(tx, tableTop, tw, tableH)
  for (let x = tx; x < tx + tw; x++) {
    g.fillStyle = Math.floor((x - tx) / 6) % 2 ? C.clothB : C.clothA
    g.fillRect(x, tableTop, 1, Math.round(tableH * 0.55))
    if (Math.floor((x - tx) / 3) % 2 === 0) g.fillRect(x, tableTop + Math.round(tableH * 0.55), 1, 1)
  }
  g.fillStyle = C.woodDark
  g.fillRect(tx + 4, tableTop + tableH, 3, lh - tableTop - tableH)
  g.fillRect(tx + tw - 7, tableTop + tableH, 3, lh - tableTop - tableH)

  // items either side of the seller
  const sideW = (tw - faceW) / 2 - 4
  const perSide = Math.max(1, Math.min(3, Math.floor(sideW / (size + 4))))
  let pick = 0
  for (const side of [0, 1]) {
    const x0 = side === 0 ? tx + 2 : fx + faceW + 4
    const gap = (sideW - perSide * size) / (perSide + 1)
    for (let i = 0; i < perSide; i++) {
      const gr = GRAILS[SHOWCASE[pick++ % SHOWCASE.length]]
      const ix = Math.round(x0 + gap + i * (size + gap))
      const iy = tableTop - size + Math.round(size * 0.15) + ((i + side) % 2) * is
      g.drawImage(itemSprite(gr.category, gr.artSeed, gr.palette), 0, 0, ITEM_PX, ITEM_PX, ix, iy, size, size)
    }
  }

  // coins and sparkles in the open band between the title and the table
  const bandTop = titleBottom + 2
  const bandBottom = tableTop - size - 4
  if (bandBottom - bandTop >= 10) {
    const cs = wide ? 2 : 1
    const spots = [
      [0.14, 0.7],
      [0.27, 0.25],
      [0.4, 0.8],
      [0.62, 0.35],
      [0.76, 0.85],
      [0.88, 0.2],
    ]
    for (const [cx, cy] of spots) {
      const px = Math.round(lw * cx) - 4 * cs
      const py = Math.round(bandTop + (bandBottom - bandTop - 8 * cs) * cy)
      g.drawImage(icon('coin'), 0, 0, 8, 8, px, py, 8 * cs, 8 * cs)
    }
    g.fillStyle = C.goldLight
    for (const [sx, sy] of [
      [0.2, 0.3],
      [0.52, 0.55],
      [0.82, 0.6],
    ]) {
      const px = Math.round(lw * sx)
      const py = Math.round(bandTop + (bandBottom - bandTop) * sy)
      g.fillRect(px - 2, py, 5, 1)
      g.fillRect(px, py - 2, 1, 5)
    }
  }

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const o = out.getContext('2d')!
  o.imageSmoothingEnabled = false
  o.drawImage(small, 0, 0, lw, lh, 0, 0, lw * scale, lh * scale)
  return out
}

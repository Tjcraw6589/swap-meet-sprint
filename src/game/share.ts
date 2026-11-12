// The share card: a 1080 by 1080 image drawn at 180 by 180 logical pixels and
// scaled by 6, so it keeps the game's pixel look.

import type { Game } from './game.ts'
import { C } from './theme.ts'
import { drawScene } from './scene.ts'
import { drawText, drawTextShadow, measure, fitText, wrapText } from './font.ts'
import { itemSprite, icon, ITEM_PX } from './art.ts'
import { GRAIL_COUNT } from '../core/grails.ts'
import type { Deal } from '../core/run.ts'

export const CARD_PX = 1080
const LOGICAL = 180
const SCALE = CARD_PX / LOGICAL

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export function drawShareCard(game: Game): HTMLCanvasElement {
  const small = document.createElement('canvas')
  small.width = LOGICAL
  small.height = LOGICAL
  const g = small.getContext('2d')!
  g.imageSmoothingEnabled = false
  drawScene(g, LOGICAL, LOGICAL, 0.85)

  const r = game.result
  const daily = r?.mode === 'daily' && game.keepers.dailyScore !== null
  const score = daily ? game.keepers.dailyScore! : r?.score ?? 0
  const start = daily ? 50 : r?.start ?? 50
  const cx = LOGICAL / 2

  // panel
  const top = 42
  const bottom = LOGICAL - 22
  g.fillStyle = C.ink
  g.fillRect(12, top, LOGICAL - 24, bottom - top)
  g.fillStyle = C.paper
  g.fillRect(13, top + 1, LOGICAL - 26, bottom - top - 2)
  g.fillStyle = C.white
  g.fillRect(13, top + 1, LOGICAL - 26, 1)

  const logo = (s: string, y: number, color: string) => {
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [1, 1],
    ])
      drawText(g, s, cx + dx, y + dy, C.ink, 2, 'center')
    drawText(g, s, cx, y, color, 2, 'center')
  }
  logo('SWAP MEET', 10, C.gold)
  logo('SPRINT', 26, C.paper)

  let y = top + 6
  const label = daily ? `DAILY  ${game.todayLabel.toUpperCase()}` : 'FREE PLAY'
  drawText(g, label, cx, y, C.inkSoft, 1, 'center')
  y += 12
  const big = measure(money(score), 3) <= LOGICAL - 40 ? 3 : 2
  drawTextShadow(g, money(score), cx, y, score >= start ? C.goodDark : C.badDark, C.paperDark, big, 'center')
  y += 7 * big + 5
  drawText(g, `${money(start)} into ${money(score)}`, cx, y, C.ink, 1, 'center')
  y += 12

  const deal: Deal | null = daily ? null : r?.bestDeal ?? null
  const bestName = daily ? game.keepers.dailyBestName : deal && deal.profit > 0 ? deal.item.name : null
  const bestProfit = daily ? game.keepers.dailyBestProfit : deal?.profit ?? null
  if (bestName) {
    g.fillStyle = C.paperShade
    g.fillRect(20, y, LOGICAL - 40, 38)
    const art = deal ? deal.item : daily ? game.keepers.dailyBestArt : null
    if (art) {
      const img = itemSprite(art.category, art.artSeed, art.palette)
      g.drawImage(img, 0, 0, ITEM_PX, ITEM_PX, 25, y + 3, ITEM_PX, ITEM_PX)
    } else {
      g.drawImage(icon('star'), 0, 0, 8, 8, 26, y + 7, 24, 24)
    }
    drawText(g, 'BEST DEAL', 62, y + 4, C.inkSoft)
    wrapText(bestName, LOGICAL - 90)
      .slice(0, 2)
      .forEach((l, i) => drawText(g, fitText(l, LOGICAL - 90), 62, y + 13 + i * 9, C.ink))
    drawText(g, `+${money(bestProfit ?? 0)}`, LOGICAL - 24, y + 4, C.goodDark, 1, 'right')
    y += 42
  } else y += 6

  const line = `Streak ${game.streak}   Finds ${game.findsCount} of ${GRAIL_COUNT}`
  drawText(g, line, cx, bottom - 12, C.inkSoft, 1, 'center')
  if (!bestName) drawText(g, daily ? 'Same morning for all today.' : 'Buy, haggle or pass.', cx, y + 10, C.ink, 1, 'center')
  drawTextShadow(g, 'Made by Bal Tak', cx, LOGICAL - 14, C.paper, C.ink, 1, 'center')

  const out = document.createElement('canvas')
  out.width = CARD_PX
  out.height = CARD_PX
  const o = out.getContext('2d')!
  o.imageSmoothingEnabled = false
  o.drawImage(small, 0, 0, LOGICAL, LOGICAL, 0, 0, LOGICAL * SCALE, LOGICAL * SCALE)
  return out
}

export function shareCardBlob(game: Game): Promise<Blob | null> {
  const c = drawShareCard(game)
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'))
}

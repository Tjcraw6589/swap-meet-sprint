// Milestone 2 proof: screenshots of every screen at the three required sizes,
// and a muted 10 second capture of the game playing itself.

import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = 'proof/m2'
mkdirSync(OUT, { recursive: true })

const SIZES = [
  { name: '800x450', width: 800, height: 450 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844 },
]

const KEEPERS = {
  v: 1,
  best: 1240,
  lifetimeProfit: 3480,
  runs: 7,
  streak: 3,
  dailyDate: '2026-11-11',
  dailyScore: 880,
  dailyBestName: null,
  dailyBestProfit: null,
  finds: [0, 5, 11, 21, 33],
  guided: true,
  muted: true,
}

async function seedKeepers(page: Page, keepers: object | null): Promise<void> {
  await page.addInitScript((k) => {
    if (k) localStorage.setItem('sms.keepers.v1', JSON.stringify(k))
    else localStorage.removeItem('sms.keepers.v1')
  }, keepers)
}

async function state(page: Page) {
  return page.evaluate(() => (window as unknown as { __sms: { state(): Record<string, unknown> } }).__sms.state())
}

async function waitFor(page: Page, pred: () => Promise<boolean>, ms = 20_000): Promise<void> {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await pred()) return
    await page.waitForTimeout(100)
  }
  throw new Error('timed out')
}

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

for (const size of SIZES) {
  test.describe(`screens at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 })

    test('guided first run', async ({ page }) => {
      const errors = collectErrors(page)
      await seedKeepers(page, null)
      await page.goto('/?debug=1&today=2026-11-12')
      await waitFor(page, async () => (await state(page)).locked === false)
      await page.waitForTimeout(1600)
      await page.screenshot({ path: `${OUT}/${size.name}-1-guided.png` })
      expect(errors).toEqual([])
    })

    test('title, play, result, shelf', async ({ page }) => {
      const errors = collectErrors(page)
      await seedKeepers(page, KEEPERS)
      await page.goto('/?debug=1&today=2026-11-12')
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${OUT}/${size.name}-0-title.png` })
      expect((await state(page)).screen).toBe('title')

      // Daily Morning in one tap.
      await page.keyboard.press('Enter')
      await waitFor(page, async () => (await state(page)).screen === 'play')
      expect((await state(page)).mode).toBe('daily')
      // Play a few items: buy cheap ones, pass the rest.
      let shots = 0
      let last = -1
      const t0 = Date.now()
      while (Date.now() - t0 < 14_000) {
        const s = (await state(page)) as { locked: boolean; canBuy: boolean; item: { index: number; ask: number; guide: number } | null; stall: number }
        if (!s.locked && s.item && s.item.index !== last) {
          await page.waitForTimeout(1500)
          last = s.item.index
          if (s.item.ask < s.item.guide && s.canBuy) await page.keyboard.press('ArrowRight')
          else await page.keyboard.press('ArrowLeft')
          if (s.stall >= 1 && shots === 0) {
            await page.waitForTimeout(250)
            await page.screenshot({ path: `${OUT}/${size.name}-2-play.png` })
            shots++
          }
        }
        await page.waitForTimeout(60)
      }
      if (shots === 0) await page.screenshot({ path: `${OUT}/${size.name}-2-play.png` })
      // Hurry to the end.
      await page.evaluate(() => ((window as unknown as { __sms: { loop: { speed: number } } }).__sms.loop.speed = 20))
      await waitFor(page, async () => (await state(page)).screen === 'result', 30_000)
      await page.evaluate(() => ((window as unknown as { __sms: { loop: { speed: number } } }).__sms.loop.speed = 1))
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${OUT}/${size.name}-3-result.png` })
      if (size.name === '800x450') {
        const url = await page.evaluate(() => (window as unknown as { __sms: { shareCard(): string } }).__sms.shareCard())
        writeFileSync(`${OUT}/share-card.png`, Buffer.from(url.split(',')[1], 'base64'))
      }
      const st = (await state(page)) as { keepers: { dailyDate: string; dailyScore: number } }
      expect(st.keepers.dailyDate).toBe('2026-11-12')
      expect(typeof st.keepers.dailyScore).toBe('number')

      await page.keyboard.press('Escape')
      await waitFor(page, async () => (await state(page)).screen === 'title')
      await page.keyboard.press('KeyF')
      await waitFor(page, async () => (await state(page)).screen === 'play')
      expect((await state(page)).mode).toBe('free')
      expect(errors).toEqual([])
    })

    test('finds shelf', async ({ page }) => {
      await seedKeepers(page, KEEPERS)
      await page.goto('/?debug=1&today=2026-11-12')
      await page.waitForTimeout(400)
      await page.evaluate(() => (window as unknown as { __sms: { game: { command(c: string): void } } }).__sms.game.command('finds'))
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${OUT}/${size.name}-4-shelf.png` })
    })
  })
}


// The iPhone store kit: app icon, splash image and App Store screenshots.
// Apple wants no alpha channel in icons or screenshots, so each image is
// flattened to plain RGB with ffmpeg. Run with: npm run store

import { test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

const SHOTS = 'store/ios/screenshots'
mkdirSync(SHOTS, { recursive: true })
mkdirSync('ios-app/assets', { recursive: true })

function flatten(input: string, output: string): void {
  execFileSync(ffmpeg as unknown as string, ['-y', '-loglevel', 'error', '-i', input, '-pix_fmt', 'rgb24', output])
}

const VETERAN = {
  v: 1, best: 2140, lifetimeProfit: 9870, runs: 18, streak: 6, dailyDate: '2026-11-11', dailyScore: 1310, dailyBestName: null,
  dailyBestProfit: null, dailyBestArt: null, finds: [0, 3, 5, 9, 11, 17, 21, 26, 30, 33, 38], guided: true, muted: true,
}

type Sms = { __sms: { filmFrame(ms: number): string; icon(size: number, opaque: boolean): string; game: { command(c: string): void } } }

test('app icon and splash image', async ({ page }) => {
  await page.goto('/?debug=1&film=1')
  const icon = await page.evaluate(() => (window as unknown as Sms).__sms.icon(1024, true))
  writeFileSync('ios-app/assets/icon-alpha.png', Buffer.from(icon.split(',')[1], 'base64'))
  flatten('ios-app/assets/icon-alpha.png', 'ios-app/assets/icon.png')
  const { rmSync } = await import('node:fs')
  rmSync('ios-app/assets/icon-alpha.png')
  const splash = await page.evaluate(() => (window as unknown as Sms).__sms.icon(1024, false))
  writeFileSync('ios-app/assets/splash-icon.png', Buffer.from(splash.split(',')[1], 'base64'))
  flatten('ios-app/assets/icon.png', join('store/ios', 'icon-1024.png'))
})

// [name, points wide, points high, safe top, safe bottom] at 3x
const DEVICES: Array<[string, number, number, number, number]> = [
  ['iphone-dynamic-island-medium-1206x2622', 402, 874, 62, 34],
  ['iphone-dynamic-island-large-1320x2868', 440, 956, 62, 34],
]

async function shoot(page: Page, file: string): Promise<void> {
  const raw = `${file}.raw.png`
  await page.screenshot({ path: raw })
  flatten(raw, `${file}.png`)
  const { rmSync } = await import('node:fs')
  rmSync(raw)
}

for (const [name, w, h, top, bottom] of DEVICES) {
  test.describe(name, () => {
    test.use({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
    test('screenshots', async ({ page }) => {
      const inset = `inset=${top},0,${bottom},0`
      const frame = (ms: number) => page.evaluate((m) => (window as unknown as Sms).__sms.filmFrame(m), ms)
      await page.addInitScript((k) => localStorage.setItem('sms.keepers.v1', JSON.stringify(k)), VETERAN)
      await page.goto(`/?debug=1&film=1&demo=1&seed=ad-clip-3&${inset}`)
      for (const [i, ms] of [3200, 3000, 6000].entries()) {
        for (let t = 0; t < ms; t += 100) await frame(100)
        await shoot(page, join(SHOTS, `${name}-${i + 1}-play`))
      }
      for (let t = 0; t < 60_000; t += 500) await frame(500)
      await frame(800)
      await shoot(page, join(SHOTS, `${name}-4-result`))
      await page.goto(`/?debug=1&film=1&today=2026-11-12&${inset}`)
      await frame(300)
      await shoot(page, join(SHOTS, `${name}-5-title`))
      await page.evaluate(() => (window as unknown as Sms).__sms.game.command('finds'))
      await frame(300)
      await shoot(page, join(SHOTS, `${name}-6-shelf`))
    })
  })
}

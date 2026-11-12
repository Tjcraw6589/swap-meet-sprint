// A muted 10 second clip of the game playing itself, for an ad or a store page.
// Playwright video has no sound track, so the clip is silent by design.

import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT = 'proof/m2'
mkdirSync(OUT, { recursive: true })

test.use({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  video: { mode: 'on', size: { width: 1280, height: 720 } },
})

test('a muted 10 second clip of the game playing itself', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'sms.keepers.v1',
      JSON.stringify({ v: 1, best: 0, lifetimeProfit: 0, runs: 3, streak: 1, dailyDate: null, dailyScore: null, dailyBestName: null, dailyBestProfit: null, finds: [], guided: true, muted: true }),
    )
  })
  await page.goto('/?debug=1&demo=1&seed=ad-clip-3')
  // stills from the clip, for review
  for (const [i, at] of [1500, 2500, 2500, 2000, 2000].entries()) {
    await page.waitForTimeout(at)
    await page.screenshot({ path: `${OUT}/clip-frame-${i + 1}.png` })
  }
  const cash = await page.evaluate(() => (window as unknown as { __sms: { state(): { cash: number } } }).__sms.state().cash)
  expect(cash).toBeGreaterThan(0)
  const video = page.video()
  await page.close()
  if (video) await video.saveAs(`${OUT}/clip-10s.webm`)
})

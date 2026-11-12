import { test, expect, type Page } from '@playwright/test'

interface State {
  screen: 'play' | 'result'
  seed: string
  cash: number
  timeLeftMs: number
  locked: boolean
  canBuy: boolean
  canHaggle: boolean
  stall: number
  item: { index: number; name: string; guide: number; ask: number; seller: string; clues: string[] } | null
  result: { score: number; bought: number; bust: boolean } | null
}

async function state(page: Page): Promise<State> {
  return page.evaluate(() => (window as unknown as { __sms: { state(): State } }).__sms.state())
}

test('plays a seeded morning with the keyboard to the result screen', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/?seed=e2e-1&debug=1')
  await page.locator('canvas#game').click({ position: { x: 400, y: 100 } })
  await expect.poll(async () => (await state(page)).screen).toBe('play')

  let decisions = 0
  let lastIndex = -1
  const started = Date.now()
  while (Date.now() - started < 90_000) {
    const s = await state(page)
    if (s.screen === 'result') break
    if (!s.locked && s.item && s.item.index !== lastIndex) {
      lastIndex = s.item.index
      // A simple policy: cheap asks are bought, the rest are passed.
      const cheap = s.item.ask <= s.item.guide * 0.6
      if (cheap && s.canBuy) await page.keyboard.press('ArrowRight')
      else if (cheap && s.canHaggle && s.item.ask > s.cash) await page.keyboard.press('Space')
      else await page.keyboard.press('ArrowLeft')
      decisions++
    }
    await page.waitForTimeout(80)
  }

  const final = await state(page)
  expect(final.screen).toBe('result')
  expect(final.result).not.toBeNull()
  expect(final.result!.score).toBeGreaterThan(0)
  expect(decisions).toBeGreaterThan(10)
  expect(final.seed).toBe('e2e-1')
  await page.screenshot({ path: 'test-results/m1-result.png' })

  // Play again lands straight back in play. Presses in the first 0.6 s are
  // ignored so a player mashing keys at 0 s does not skip the result.
  await page.waitForTimeout(700)
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await state(page)).screen).toBe('play')
  expect(errors).toEqual([])
})

test('pointer buttons and swipes drive the run', async ({ page }) => {
  await page.goto('/?seed=e2e-2&debug=1')
  const canvas = page.locator('canvas#game')
  const box = (await canvas.boundingBox())!
  await page.waitForTimeout(500)
  const before = await state(page)
  expect(before.item).not.toBeNull()
  // PASS is the left of three buttons along the bottom.
  await canvas.click({ position: { x: box.width * 0.17, y: box.height * 0.9 } })
  await page.waitForTimeout(500)
  const afterPass = await state(page)
  expect(afterPass.item!.index).toBe(before.item!.index + 1)
  // Swipe left on the card passes too.
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const afterSwipe = await state(page)
  expect(afterSwipe.item!.index).toBe(afterPass.item!.index + 1)
})

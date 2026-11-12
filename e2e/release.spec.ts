// Milestone 3 proof: each release zip unpacks and plays from a plain static server.

import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { unzip } from '../scripts/zip.ts'
import { serveDir } from '../scripts/serve.ts'

const zips = readdirSync('release').filter((f) => f.endsWith('.zip'))

test('there is a zip for each portal', () => {
  expect(zips.some((z) => z.includes('crazygames'))).toBe(true)
  expect(zips.some((z) => z.includes('itch'))).toBe(true)
})

zips.forEach((zip, i) => {
  test(`${zip} runs from a static server`, async ({ page }) => {
    const dir = join(tmpdir(), `sms-zip-${i}-${Date.now()}`)
    for (const [name, data] of unzip(readFileSync(join('release', zip)))) {
      const out = join(dir, name)
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, data)
    }
    const port = 4300 + i
    const server = await serveDir(dir, port)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    const failed: string[] = []
    page.on('requestfailed', (r) => failed.push(r.url()))
    try {
      await page.goto(`http://127.0.0.1:${port}/`)
      await page.waitForTimeout(2500)
      // First visit: the guided run. Buy the first item with the keyboard.
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(800)
      const shot = await page.screenshot()
      expect(shot.length).toBeGreaterThan(5000)
      const saved = await page.evaluate(() => localStorage.getItem('sms.keepers.v1'))
      // Nothing is saved until the first run ends; the game must still be running.
      expect(saved === null || saved.startsWith('{')).toBe(true)
      expect(errors).toEqual([])
      expect(failed.filter((u) => u.startsWith(`http://127.0.0.1:${port}`))).toEqual([])
    } finally {
      server.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// Builds everything a portal submission form asks for into store/:
// covers, screenshots and silent preview videos. Run with: npm run store

import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

const OUT = 'store'
for (const d of ['covers', 'screenshots', 'video']) mkdirSync(join(OUT, d), { recursive: true })

const VETERAN = {
  v: 1,
  best: 2140,
  lifetimeProfit: 9870,
  runs: 18,
  streak: 6,
  dailyDate: '2026-11-11',
  dailyScore: 1310,
  dailyBestName: null,
  dailyBestProfit: null,
  dailyBestArt: null,
  finds: [0, 3, 5, 9, 11, 17, 21, 26, 30, 33, 38],
  guided: true,
  muted: true,
}

async function keepers(page: Page, k: object): Promise<void> {
  await page.addInitScript((v) => localStorage.setItem('sms.keepers.v1', JSON.stringify(v)), k)
}

function saveDataUrl(url: string, file: string): void {
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'))
}

const COVERS: Array<[string, number, number]> = [
  ['crazygames-landscape-1920x1080', 1920, 1080],
  ['crazygames-portrait-800x1200', 800, 1200],
  ['crazygames-square-800x800', 800, 800],
  ['itch-cover-630x500', 630, 500],
  ['social-1200x630', 1200, 630],
]

test('covers', async ({ page }) => {
  await keepers(page, VETERAN)
  await page.goto('/?debug=1&film=1&today=2026-11-12')
  for (const [name, w, h] of COVERS) {
    const url = await page.evaluate(([cw, ch]) => (window as unknown as { __sms: { cover(w: number, h: number): string } }).__sms.cover(cw, ch), [w, h])
    saveDataUrl(url, join(OUT, 'covers', `${name}.png`))
  }
  expect(readdirSync(join(OUT, 'covers')).length).toBeGreaterThanOrEqual(COVERS.length)
})

const SHOT_SIZES: Array<[string, number, number]> = [
  ['1920x1080', 1920, 1080],
  ['1280x720', 1280, 720],
  ['portrait-1080x1920', 1080, 1920],
]

for (const [name, w, h] of SHOT_SIZES) {
  test.describe(`screenshots ${name}`, () => {
    test.use({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    test('title, play and result', async ({ page }) => {
      await keepers(page, VETERAN)
      await page.goto('/?debug=1&film=1&today=2026-11-12')
      const frame = (ms: number) => page.evaluate((m) => (window as unknown as { __sms: { filmFrame(ms: number): string } }).__sms.filmFrame(m), ms)
      await frame(400)
      await page.screenshot({ path: join(OUT, 'screenshots', `${name}-1-title.png`) })
      await page.goto('/?debug=1&film=1&demo=1&seed=ad-clip-3')
      // moments chosen from this seed: a grail on the table, a full stall, a sale
      const moments = [3200, 3000, 6000]
      for (const [i, ms] of moments.entries()) {
        for (let t = 0; t < ms; t += 100) await frame(100)
        await page.screenshot({ path: join(OUT, 'screenshots', `${name}-${i + 2}-play.png`) })
      }
      for (let t = 0; t < 60_000; t += 500) await frame(500)
      await frame(800)
      await page.screenshot({ path: join(OUT, 'screenshots', `${name}-5-result.png`) })
    })
  })
}

const VIDEOS: Array<[string, number, number]> = [
  ['preview-landscape-1920x1080', 1920, 1080],
  ['preview-portrait-1080x1620', 1080, 1620],
]

for (const [name, w, h] of VIDEOS) {
  test.describe(`video ${name}`, () => {
    test.use({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    test('a silent preview video that opens on the cover', async ({ page }) => {
      test.setTimeout(600_000)
      await keepers(page, VETERAN)
      await page.goto('/?debug=1&film=1&demo=1&seed=ad-clip-3')
      const dir = join(tmpdir(), `sms-film-${name}-${Date.now()}`)
      mkdirSync(dir, { recursive: true })
      const FPS = 30
      const SECONDS = 18
      let n = 0
      const put = (url: string) => {
        saveDataUrl(url, join(dir, `f${String(n).padStart(4, '0')}.png`))
        n++
      }
      // Portal rule: the static cover is the opening frame.
      const cover = await page.evaluate(([cw, ch]) => (window as unknown as { __sms: { cover(w: number, h: number): string } }).__sms.cover(cw, ch), [w, h])
      for (let i = 0; i < FPS; i++) put(cover)
      while (n < FPS * SECONDS) {
        const batch = await page.evaluate(
          ({ count, step }) => {
            const s = (window as unknown as { __sms: { filmFrame(ms: number): string } }).__sms
            const out: string[] = []
            for (let i = 0; i < count; i++) out.push(s.filmFrame(step))
            return out
          },
          { count: Math.min(15, FPS * SECONDS - n), step: 1000 / FPS },
        )
        batch.forEach(put)
      }
      const file = join(OUT, 'video', `${name}.mp4`)
      execFileSync(ffmpeg as unknown as string, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', file])
      // stills pulled back out of the finished video, for review
      execFileSync(ffmpeg as unknown as string, ['-y', '-loglevel', 'error', '-i', file, '-vf', 'select=eq(n\\,0)+eq(n\\,150)+eq(n\\,330),scale=iw/2:-1', '-vsync', '0', join(OUT, 'video', `${name}-still-%d.png`)])
      rmSync(dir, { recursive: true, force: true })
    })
  })
}

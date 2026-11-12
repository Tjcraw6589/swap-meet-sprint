// The fixed step loop advances the same game time at any display rate.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLoop, STEP_MS } from '../src/game/loop.ts'

afterEach(() => vi.unstubAllGlobals())

function runAt(hz: number, seconds: number): { steps: number; frames: number } {
  let now = 0
  const box: { pending: ((t: number) => void) | null } = { pending: null }
  vi.stubGlobal('performance', { now: () => now })
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    box.pending = cb
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    box.pending = null
  })
  let steps = 0
  let frames = 0
  const loop = createLoop(
    () => steps++,
    () => frames++,
  )
  loop.start()
  const frameMs = 1000 / hz
  const total = Math.round(seconds * hz)
  for (let i = 0; i < total; i++) {
    now += frameMs
    const cb = box.pending
    box.pending = null
    if (cb) cb(now)
  }
  loop.stop()
  return { steps, frames }
}

describe('fixed step loop', () => {
  for (const hz of [60, 144, 165, 30]) {
    it(`runs one minute of game time in one minute at ${hz} Hz`, () => {
      const { steps, frames } = runAt(hz, 60)
      expect(Math.abs(steps - 60_000 / STEP_MS)).toBeLessThanOrEqual(1)
      expect(frames).toBe(Math.round(60 * hz))
    })
  }
})

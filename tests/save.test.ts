import { describe, it, expect } from 'vitest'
import { freshKeepers, loadKeepers, saveKeepers, startDaily, liveStreak, addFind, prettyDate, utcDate } from '../src/game/save.ts'
import type { PlatformStorage } from '../src/platform/types.ts'

function memoryStorage(): PlatformStorage {
  const m = new Map<string, string>()
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) }
}

describe('keepers', () => {
  it('round trips through storage and survives junk', () => {
    const s = memoryStorage()
    const k = freshKeepers()
    k.best = 999
    k.finds = [3, 7]
    saveKeepers(s, k)
    expect(loadKeepers(s)).toEqual(k)
    s.set('sms.keepers.v1', '{not json')
    expect(loadKeepers(s)).toEqual(freshKeepers())
  })

  it('counts a day streak on consecutive UTC days and lapses after a gap', () => {
    const k = freshKeepers()
    startDaily(k, '2026-11-10')
    expect(k.streak).toBe(1)
    startDaily(k, '2026-11-10')
    expect(k.streak).toBe(1)
    startDaily(k, '2026-11-11')
    expect(k.streak).toBe(2)
    expect(liveStreak(k, '2026-11-12')).toBe(2)
    expect(liveStreak(k, '2026-11-13')).toBe(0)
    startDaily(k, '2026-11-14')
    expect(k.streak).toBe(1)
    startDaily(k, '2026-12-01')
    startDaily(k, '2026-12-02')
    expect(k.streak).toBe(2)
  })

  it('adds each find once', () => {
    const k = freshKeepers()
    expect(addFind(k, 5)).toBe(true)
    expect(addFind(k, 5)).toBe(false)
    expect(k.finds).toEqual([5])
  })

  it('shows dates without hyphens', () => {
    expect(prettyDate('2026-11-12')).toBe('12 Nov 2026')
    expect(utcDate(new Date(Date.UTC(2026, 0, 2, 23, 59)))).toBe('2026-01-02')
  })
})

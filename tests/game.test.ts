import { describe, it, expect } from 'vitest'
import { Game } from '../src/game/game.ts'
import type { Platform, PlatformStorage, RewardPlacement } from '../src/platform/types.ts'
import { freshKeepers, SAVE_KEY } from '../src/game/save.ts'

interface Log {
  rewarded: RewardPlacement[]
  breaks: number
  starts: number
  stops: number
  haptics: string[]
}

function makePlatform(ads: boolean, keepers?: object): { platform: Platform; log: Log; store: Map<string, string> } {
  const store = new Map<string, string>()
  if (keepers) store.set(SAVE_KEY, JSON.stringify(keepers))
  const storage: PlatformStorage = { get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v), remove: (k) => void store.delete(k) }
  const log: Log = { rewarded: [], breaks: 0, starts: 0, stops: 0, haptics: [] }
  const platform: Platform = {
    name: 'web',
    adsEnabled: ads,
    ads: {
      canShowRewarded: () => ads,
      showRewarded: (p, onReward, onDone) => {
        log.rewarded.push(p)
        onReward()
        onDone?.()
      },
      showBreak: (onDone) => {
        log.breaks++
        onDone()
      },
    },
    storage,
    share: { share: async () => true },
    haptics: { tap: (k) => void log.haptics.push(k) },
    lifecycle: {
      ready: () => {},
      gameplayStart: () => void log.starts++,
      gameplayStop: () => void log.stops++,
      onVisibility: () => {},
    },
  }
  return { platform, log, store }
}

const hooks = { sfx: () => {}, share: async () => true }
const veteran = { ...freshKeepers(), guided: true }

function playOut(g: Game, max = 20_000): void {
  for (let i = 0; i < max && g.screen === 'play'; i++) g.update(10)
}

function toResult(g: Game): void {
  playOut(g)
  if (g.screen === 'offer') g.command('skip')
  for (let i = 0; i < 70; i++) g.update(10)
  expect(g.screen).toBe('result')
}

describe('game flow', () => {
  it('a first ever visit opens straight into the guided run', () => {
    const { platform, store } = makePlatform(false)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    expect(g.screen).toBe('play')
    expect(g.guided).toBe(true)
    expect(g.run.timerPaused).toBe(true)
    expect(g.hint).toContain('Buy it')
    // the clock waits for the player on the three guided items
    for (let i = 0; i < 2000; i++) g.update(10)
    expect(g.run.timeLeftMs).toBe(60_000)
    for (let k = 0; k < 3; k++) {
      while (g.run.locked) g.update(10)
      g.command('pass')
    }
    expect(g.run.timerPaused).toBe(false)
    toResult(g)
    expect(JSON.parse(store.get(SAVE_KEY)!).guided).toBe(true)
  })

  it('later visits land on the title, one tap from play', () => {
    const { platform } = makePlatform(false, veteran)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    expect(g.screen).toBe('title')
    g.command('free')
    expect(g.screen).toBe('play')
  })

  it('the first Daily attempt is scored, replays are practice', () => {
    const { platform } = makePlatform(true, veteran)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    g.command('daily')
    expect(g.scored).toBe(true)
    expect(g.seed).toBe('daily-2026-11-12')
    playOut(g)
    // never offer extra time in the scored Daily attempt
    for (let i = 0; i < 70; i++) g.update(10)
    expect(g.screen).toBe('result')
    const score = g.keepers.dailyScore
    expect(score).toBe(g.result!.score)
    g.command('again')
    expect(g.scored).toBe(false)
    expect(g.seed).toBe('daily-2026-11-12')
    expect(g.modeLabel).toBe('PRACTICE')
    toResult(g)
    expect(g.keepers.dailyScore).toBe(score)
  })

  it('the same Daily gives the same items to everyone', () => {
    const a = new Game(makePlatform(false, veteran).platform, hooks, { today: '2026-11-12' })
    const b = new Game(makePlatform(false, veteran).platform, hooks, { today: '2026-11-12' })
    a.command('daily')
    b.command('daily')
    expect(a.run.current!.item.name).toBe(b.run.current!.item.name)
    expect(a.run.current!.item.guide).toBe(b.run.current!.item.guide)
  })

  it('offers extra time once per Free Play run and adds 15 seconds', () => {
    const { platform, log } = makePlatform(true, veteran)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    g.command('free')
    playOut(g)
    expect(g.screen).toBe('offer')
    g.command('watch')
    expect(log.rewarded).toEqual(['extra_time'])
    expect(g.screen).toBe('play')
    expect(g.run.timeLeftMs).toBe(15_000)
    playOut(g)
    expect(g.screen).toBe('result')
  })

  it('shows a break after every third finished run, never before the first', () => {
    const { platform, log } = makePlatform(true, veteran)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    g.command('free')
    expect(log.breaks).toBe(0)
    for (let run = 1; run <= 7; run++) {
      toResult(g)
      g.command('again')
      expect(g.screen).toBe('play')
      expect(log.breaks, `after run ${run}`).toBe(Math.floor(run / 3))
    }
  })

  it('no ads and no offers on a target without ads', () => {
    const { platform, log } = makePlatform(false, veteran)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    for (let run = 0; run < 4; run++) {
      if (g.screen === 'title') g.command('free')
      else g.command('again')
      playOut(g)
      expect(g.screen).toBe('result')
      expect(g.canOfferDouble).toBe(false)
      for (let i = 0; i < 70; i++) g.update(10)
    }
    expect(log.breaks).toBe(0)
    expect(log.rewarded).toEqual([])
  })

  it('tells the platform when gameplay starts and stops', () => {
    const { platform, log } = makePlatform(false, veteran)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    g.command('free')
    expect(log.starts).toBe(1)
    toResult(g)
    expect(log.stops).toBe(1)
  })

  it('share text names the scored Daily even from a practice run, with no hyphen', () => {
    const { platform } = makePlatform(false, veteran)
    const g = new Game(platform, hooks, { today: '2026-11-12' })
    g.command('daily')
    toResult(g)
    const scored = g.keepers.dailyScore!
    for (let i = 0; i < 70; i++) g.update(10)
    g.command('again')
    toResult(g)
    const text = g.shareText()
    expect(text).toContain('12 Nov 2026')
    expect(text).toContain(`$${scored.toLocaleString('en-US')}`)
    expect(text.includes('-')).toBe(false)
  })
})

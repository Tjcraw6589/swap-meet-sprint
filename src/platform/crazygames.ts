// The CrazyGames target. Their SDK is loaded by a script tag the build adds
// to index.html. Rules honoured here (read 12 Nov 2026):
// * gameplay start and stop events from the game module, loading events
// * saves through their data module when it is available, else local storage
// * ads only through their SDK, and off during the trial launch (ADS_LIVE)
// * game sound paused while an ad plays
// Outside CrazyGames domains the SDK reports a "disabled" environment and
// every call is skipped, so the same build still runs anywhere.

import type { Platform, PlatformStorage, RewardPlacement } from './types.ts'
import { localStorageStorage, shareWithBrowser, onVisibility } from './web.ts'

/** Flip to true only when CrazyGames invites the game to its full launch (Milestone 5). */
export const ADS_LIVE = false

interface CgAdCallbacks {
  adStarted?: () => void
  adFinished?: () => void
  adError?: (e: unknown) => void
}

interface CgSdk {
  init(): Promise<void>
  environment: 'local' | 'crazygames' | 'disabled'
  game: { gameplayStart(): void; gameplayStop(): void; loadingStart(): void; loadingStop(): void; happytime(): void }
  ad: { requestAd(type: 'midgame' | 'rewarded', cb: CgAdCallbacks): void }
  data: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
}

function sdk(): CgSdk | null {
  const w = window as unknown as { CrazyGames?: { SDK?: CgSdk } }
  return w.CrazyGames?.SDK ?? null
}

let live: CgSdk | null = null
let adAudio: (playing: boolean) => void = () => {}

function call(fn: (s: CgSdk) => void): void {
  if (!live) return
  try {
    fn(live)
  } catch {
    // the SDK throws outside its own domains; the game carries on
  }
}

/** Storage through the data module, falling back to local storage if it is off. */
const dataStorage: PlatformStorage = {
  get(key) {
    if (live) {
      try {
        return live.data.getItem(key)
      } catch {
        // data module disabled
      }
    }
    return localStorageStorage.get(key)
  },
  set(key, value) {
    if (live) {
      try {
        live.data.setItem(key, value)
        return
      } catch {
        // data module disabled
      }
    }
    localStorageStorage.set(key, value)
  },
  remove(key) {
    call((s) => s.data.removeItem(key))
    localStorageStorage.remove(key)
  },
}

function requestAd(type: 'midgame' | 'rewarded', onFinished: () => void, onDone: () => void): void {
  if (!live || !ADS_LIVE) {
    onDone()
    return
  }
  let started = false
  try {
    live.ad.requestAd(type, {
      adStarted: () => {
        started = true
        adAudio(true)
      },
      adFinished: () => {
        if (started) adAudio(false)
        onFinished()
        onDone()
      },
      adError: () => {
        if (started) adAudio(false)
        onDone()
      },
    })
  } catch {
    onDone()
  }
}

export const crazyGamesPlatform: Platform = {
  name: 'crazygames',
  get adsEnabled() {
    return ADS_LIVE && live !== null
  },
  async init() {
    const s = sdk()
    if (!s) return
    try {
      await s.init()
      if (s.environment === 'disabled') return
      live = s
      call((x) => x.game.loadingStart())
      // carry an earlier local save over to the data module once
      const key = 'sms.keepers.v1'
      const local = localStorageStorage.get(key)
      let remote: string | null = null
      try {
        remote = s.data.getItem(key)
      } catch {
        remote = null
      }
      if (local && !remote) {
        try {
          s.data.setItem(key, local)
        } catch {
          // data module disabled
        }
      }
    } catch {
      live = null
    }
  },
  ads: {
    canShowRewarded: (_p: RewardPlacement) => ADS_LIVE && live !== null,
    showRewarded: (_placement, onReward, onDone) => requestAd('rewarded', onReward, () => onDone?.()),
    showBreak: (onDone) => requestAd('midgame', () => {}, onDone),
    onAdAudio: (cb) => {
      adAudio = cb
    },
  },
  storage: dataStorage,
  share: { share: shareWithBrowser },
  haptics: { tap: () => {} },
  lifecycle: {
    ready: () => call((s) => s.game.loadingStop()),
    gameplayStart: () => call((s) => s.game.gameplayStart()),
    gameplayStop: () => call((s) => s.game.gameplayStop()),
    onVisibility,
    happy: () => call((s) => s.game.happytime()),
  },
}

import type { Platform, TargetName, PlatformAds } from './types.ts'
import { webPlatform } from './web.ts'
import { crazyGamesPlatform } from './crazygames.ts'

declare const __TARGET__: string

export function targetName(): TargetName {
  const t = typeof __TARGET__ === 'string' ? __TARGET__ : 'web'
  if (t === 'crazygames' || t === 'ios') return t
  return 'web'
}

/**
 * Debug only stand in for a real ad network: "plays" an ad for a moment, then
 * rewards. Lets the money hooks be seen and tested on the plain web build.
 */
export const stubAds: PlatformAds = {
  canShowRewarded: () => true,
  showRewarded: (_placement, onReward, onDone) => {
    setTimeout(() => {
      onReward()
      onDone?.()
    }, 600)
  },
  showBreak: (onDone) => setTimeout(onDone, 600),
}

let instance: Platform | null = null

/** The platform for the current build target. The ios target arrives in Milestone 4. */
export function getPlatform(opts: { stubAds?: boolean } = {}): Platform {
  if (instance) return instance
  const base = targetName() === 'crazygames' ? crazyGamesPlatform : webPlatform
  instance = opts.stubAds ? { ...webPlatform, adsEnabled: true, ads: stubAds } : base
  return instance
}

export type { Platform } from './types.ts'

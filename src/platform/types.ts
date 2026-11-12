// The platform layer: one interface with five parts. Every target implements
// all five, stubbing what it does not have.

export type TargetName = 'web' | 'crazygames' | 'ios'
export type RewardPlacement = 'extra_time' | 'double_start'
export type HapticKind = 'buy' | 'sale' | 'fake' | 'grail' | 'deal' | 'nodeal'

export interface PlatformAds {
  /** True when a rewarded ad could be shown for this placement right now. */
  canShowRewarded(placement: RewardPlacement): boolean
  showRewarded(placement: RewardPlacement, onReward: () => void, onDone?: () => void): void
  showBreak(onDone: () => void): void
  /** Tells the game when an ad starts and stops playing, so game sound can pause. */
  onAdAudio?(cb: (adPlaying: boolean) => void): void
}

export interface PlatformStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export interface PlatformShare {
  /** Resolves true when a share sheet or clipboard copy happened. */
  share(text: string, image?: Blob): Promise<boolean>
}

export interface PlatformHaptics {
  tap(kind: HapticKind): void
}

export interface PlatformLifecycle {
  ready(): void
  gameplayStart(): void
  gameplayStop(): void
  /** Called when the page or app goes to the background or comes back. */
  onVisibility(cb: (visible: boolean) => void): void
  /** A moment worth celebrating, such as a new best score. */
  happy?(): void
}

export interface Platform {
  readonly name: TargetName
  /** Optional async setup before the game starts (a portal SDK, native saves). */
  init?(): Promise<void>
  readonly adsEnabled: boolean
  ads: PlatformAds
  storage: PlatformStorage
  share: PlatformShare
  haptics: PlatformHaptics
  lifecycle: PlatformLifecycle
}

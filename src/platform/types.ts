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
}

export interface Platform {
  readonly name: TargetName
  readonly adsEnabled: boolean
  ads: PlatformAds
  storage: PlatformStorage
  share: PlatformShare
  haptics: PlatformHaptics
  lifecycle: PlatformLifecycle
}

// The plain web target: GitHub Pages and itch.io. No ads, local storage saves,
// the browser share sheet when there is one, otherwise the clipboard.

import type { Platform, PlatformStorage } from './types.ts'

const memory = new Map<string, string>()

export const localStorageStorage: PlatformStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },
  set(key, value) {
    memory.set(key, value)
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // private mode or blocked storage: memory only
    }
  },
  remove(key) {
    memory.delete(key)
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

export async function shareWithBrowser(text: string, image?: Blob): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (image && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const file = new File([image], 'swap-meet-sprint.png', { type: 'image/png' })
    const data: ShareData = { text, files: [file] }
    if (nav.canShare(data)) {
      try {
        await nav.share(data)
        return true
      } catch {
        // user cancelled or the sheet failed; fall through
      }
    }
  }
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ text })
      return true
    } catch {
      // fall through to the clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function onVisibility(cb: (visible: boolean) => void): void {
  document.addEventListener('visibilitychange', () => cb(document.visibilityState === 'visible'))
  window.addEventListener('pagehide', () => cb(false))
  window.addEventListener('pageshow', () => cb(true))
}

export const webPlatform: Platform = {
  name: 'web',
  adsEnabled: false,
  ads: {
    canShowRewarded: () => false,
    showRewarded: (_placement, _onReward, onDone) => onDone?.(),
    showBreak: (onDone) => onDone(),
  },
  storage: localStorageStorage,
  share: { share: shareWithBrowser },
  haptics: { tap: () => {} },
  lifecycle: {
    ready: () => {},
    gameplayStart: () => {},
    gameplayStop: () => {},
    onVisibility,
  },
}

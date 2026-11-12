// The iPhone target: the game runs inside the Expo app's web view and talks to
// the native side through messages.
// * saves: the app reads them from native storage before the page loads and
//   hands them over in window.__SMS_NATIVE__; every write is sent back
// * haptics and the share sheet are native
// * the app tells the page when it goes to the background and back
// No ads until Milestone 5.

import type { Platform, PlatformStorage, HapticKind } from './types.ts'

interface NativeBoot {
  saves?: Record<string, string>
}

type OutMessage =
  | { t: 'save'; k: string; v: string | null }
  | { t: 'haptic'; kind: HapticKind }
  | { t: 'share'; text: string; image: string | null }
  | { t: 'ready' }

function bridge(): { postMessage(s: string): void } | null {
  const w = window as unknown as { ReactNativeWebView?: { postMessage(s: string): void } }
  return w.ReactNativeWebView ?? null
}

function send(msg: OutMessage): void {
  try {
    bridge()?.postMessage(JSON.stringify(msg))
  } catch {
    // not inside the app (a browser preview of the ios build)
  }
}

const boot: NativeBoot = (window as unknown as { __SMS_NATIVE__?: NativeBoot }).__SMS_NATIVE__ ?? {}
const memory = new Map<string, string>(Object.entries(boot.saves ?? {}))

const nativeStorage: PlatformStorage = {
  get: (key) => memory.get(key) ?? null,
  set(key, value) {
    memory.set(key, value)
    send({ t: 'save', k: key, v: value })
  },
  remove(key) {
    memory.delete(key)
    send({ t: 'save', k: key, v: null })
  },
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export const iosPlatform: Platform = {
  name: 'ios',
  adsEnabled: false,
  ads: {
    canShowRewarded: () => false,
    showRewarded: (_placement, _onReward, onDone) => onDone?.(),
    showBreak: (onDone) => onDone(),
  },
  storage: nativeStorage,
  share: {
    async share(text, image) {
      const dataUrl = image ? await blobToDataUrl(image).catch(() => null) : null
      if (!bridge()) return false
      send({ t: 'share', text, image: dataUrl })
      return true
    },
  },
  haptics: { tap: (kind) => send({ t: 'haptic', kind }) },
  lifecycle: {
    ready: () => send({ t: 'ready' }),
    gameplayStart: () => {},
    gameplayStop: () => {},
    onVisibility(cb) {
      window.addEventListener('sms-native-visibility', (e) => cb(!!(e as CustomEvent<boolean>).detail))
      document.addEventListener('visibilitychange', () => cb(document.visibilityState === 'visible'))
    },
  },
}

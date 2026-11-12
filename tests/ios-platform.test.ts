// The iPhone platform sends saves, haptics and shares to the native side, and
// starts from the saves the app hands over before the page loads.

import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load(saves: Record<string, string>) {
  const sent: unknown[] = []
  const listeners = new Map<string, (e: unknown) => void>()
  vi.stubGlobal('window', {
    __SMS_NATIVE__: { saves },
    ReactNativeWebView: { postMessage: (s: string) => sent.push(JSON.parse(s)) },
    addEventListener: (name: string, fn: (e: unknown) => void) => listeners.set(name, fn),
  })
  vi.stubGlobal('document', { addEventListener: () => {}, visibilityState: 'visible' })
  const { iosPlatform } = await import('../src/platform/ios.ts')
  return { p: iosPlatform, sent, listeners }
}

describe('ios platform', () => {
  it('reads the saves the app hands over and sends every write back', async () => {
    const { p, sent } = await load({ 'sms.keepers.v1': '{"best":5}' })
    expect(p.storage.get('sms.keepers.v1')).toBe('{"best":5}')
    p.storage.set('sms.keepers.v1', '{"best":9}')
    expect(p.storage.get('sms.keepers.v1')).toBe('{"best":9}')
    p.storage.remove('sms.keepers.v1')
    expect(sent).toEqual([
      { t: 'save', k: 'sms.keepers.v1', v: '{"best":9}' },
      { t: 'save', k: 'sms.keepers.v1', v: null },
    ])
  })

  it('sends haptics, ready and the share text', async () => {
    const { p, sent } = await load({})
    p.haptics.tap('grail')
    p.lifecycle.ready()
    expect(await p.share.share('hello')).toBe(true)
    expect(sent).toEqual([{ t: 'haptic', kind: 'grail' }, { t: 'ready' }, { t: 'share', text: 'hello', image: null }])
    expect(p.adsEnabled).toBe(false)
    expect(p.ads.canShowRewarded('extra_time')).toBe(false)
  })

  it('follows the app going to the background and back', async () => {
    const { p, listeners } = await load({})
    const seen: boolean[] = []
    p.lifecycle.onVisibility((v) => seen.push(v))
    listeners.get('sms-native-visibility')!({ detail: false })
    listeners.get('sms-native-visibility')!({ detail: true })
    expect(seen).toEqual([false, true])
  })
})

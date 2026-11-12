// Swap Meet Sprint for iPhone: one full screen web view showing the game,
// which is bundled inside the app as a single HTML page. Fully offline.
// The page talks to this side through messages:
//   save    store a value in native storage, so progress survives
//   haptic  a short haptic tap (buy, sale, fake, grail, deal, no deal)
//   share   the native share sheet with the score text and card image
//   ready   the game has loaded; hide the splash screen
// Nothing is ever sent off the phone.

import { useCallback, useEffect, useRef, useState, type ComponentClass, type Ref } from 'react'
import { AppState, Share, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Paths } from 'expo-file-system'
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview'
import { GAME_HTML } from './game/html'

void SplashScreen.preventAutoHideAsync().catch(() => {})

// The package's own class type defaults its extra props to undefined, which strict
// TypeScript reads as "no props at all"; this alias gives it the real props.
type GameWeb = WebView<object>
const GameWebView = WebView as unknown as ComponentClass<WebViewProps & { ref?: Ref<GameWeb> }>

const SAVE_KEYS = ['sms.keepers.v1']
const BACKGROUND = '#2b1d3a'

type InMessage =
  | { t: 'save'; k: string; v: string | null }
  | { t: 'haptic'; kind: 'buy' | 'sale' | 'fake' | 'grail' | 'deal' | 'nodeal' }
  | { t: 'share'; text: string; image: string | null }
  | { t: 'ready' }

function haptic(kind: string): void {
  const go = (p: Promise<void>) => void p.catch(() => {})
  switch (kind) {
    case 'buy':
      go(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
      break
    case 'sale':
      go(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
      break
    case 'fake':
      go(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
      break
    case 'grail':
      go(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
      setTimeout(() => go(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 120)
      break
    case 'deal':
      go(Haptics.selectionAsync())
      break
    case 'nodeal':
      go(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
      break
  }
}

async function shareScore(text: string, image: string | null): Promise<void> {
  let url: string | undefined
  if (image && image.startsWith('data:image/png;base64,')) {
    try {
      const file = new File(Paths.cache, 'swap-meet-sprint.png')
      if (file.exists) file.delete()
      file.create()
      file.write(image.slice('data:image/png;base64,'.length), { encoding: 'base64' })
      url = file.uri
    } catch {
      url = undefined
    }
  }
  await Share.share(url ? { message: text, url } : { message: text }).catch(() => {})
}

export default function App() {
  const [boot, setBoot] = useState<string | null>(null)
  const web = useRef<GameWeb>(null)

  // Read saves before the page loads, so the game starts with them.
  useEffect(() => {
    let alive = true
    void (async () => {
      const saves: Record<string, string> = {}
      for (const key of SAVE_KEYS) {
        try {
          const v = await AsyncStorage.getItem(key)
          if (v !== null) saves[key] = v
        } catch {
          // a fresh install has nothing to read
        }
      }
      if (alive) setBoot(`window.__SMS_NATIVE__ = ${JSON.stringify({ saves })}; true;`)
    })()
    return () => {
      alive = false
    }
  }, [])

  // Tell the game when the app goes to the background and back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const visible = state === 'active'
      web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('sms-native-visibility', { detail: ${visible} })); true;`)
    })
    return () => sub.remove()
  }, [])

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: InMessage
    try {
      msg = JSON.parse(e.nativeEvent.data) as InMessage
    } catch {
      return
    }
    switch (msg.t) {
      case 'save':
        if (SAVE_KEYS.includes(msg.k)) void (msg.v === null ? AsyncStorage.removeItem(msg.k) : AsyncStorage.setItem(msg.k, msg.v)).catch(() => {})
        break
      case 'haptic':
        haptic(msg.kind)
        break
      case 'share':
        void shareScore(msg.text, msg.image)
        break
      case 'ready':
        void SplashScreen.hideAsync().catch(() => {})
        break
    }
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {boot !== null && (
        <GameWebView
          ref={web}
          style={styles.web}
          source={{ html: GAME_HTML, baseUrl: 'about:blank' }}
          originWhitelist={['about:*', 'data:*']}
          // The game is the whole app: no links out, no new windows.
          onShouldStartLoadWithRequest={(req: { url: string }) => req.url.startsWith('about:') || req.url.startsWith('data:')}
          setSupportMultipleWindows={false}
          injectedJavaScriptBeforeContentLoaded={boot}
          onMessage={onMessage}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsLinkPreview={false}
          allowsBackForwardNavigationGestures={false}
          textInteractionEnabled={false}
          dataDetectorTypes="none"
          keyboardDisplayRequiresUserAction
          hideKeyboardAccessoryView
          webviewDebuggingEnabled={__DEV__}
          onContentProcessDidTerminate={() => web.current?.reload()}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND },
  web: { flex: 1, backgroundColor: BACKGROUND },
})

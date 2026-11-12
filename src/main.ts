import { Game } from './game/game.ts'
import { Renderer } from './game/render.ts'
import { computeLayout, type Layout, type Insets } from './game/layout.ts'
import { attachInput } from './game/input.ts'
import { createLoop } from './game/loop.ts'
import { Sound } from './game/audio.ts'
import { shareCardBlob, drawShareCard } from './game/share.ts'
import { setDebug, track, trackedEvents } from './game/events.ts'
import { getPlatform } from './platform/index.ts'

const params = new URLSearchParams(location.search)
const debug = import.meta.env.DEV || params.has('debug')
setDebug(debug)

const platform = getPlatform({ stubAds: debug && params.get('ads') === 'stub' })
if (debug && params.has('fresh')) platform.storage.remove('sms.keepers.v1')
const canvas = document.getElementById('game') as HTMLCanvasElement
const safeProbe = document.getElementById('safe') as HTMLDivElement
const renderer = new Renderer(canvas)
const sound = new Sound()

function safeInsets(): Insets {
  const cs = getComputedStyle(safeProbe)
  const px = (v: string) => Math.max(0, parseFloat(v) || 0)
  return { top: px(cs.top), right: px(cs.right), bottom: px(cs.bottom), left: px(cs.left) }
}

let layout: Layout
function resize(): void {
  const cssW = window.innerWidth
  const cssH = window.innerHeight
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  layout = computeLayout(cssW, cssH, dpr, safeInsets())
  renderer.setLayout(layout)
  // Centre the canvas in the small gap left by whole number scaling.
  const usedW = (layout.w * layout.scale) / dpr
  const usedH = (layout.h * layout.scale) / dpr
  canvas.style.width = `${usedW}px`
  canvas.style.height = `${usedH}px`
  canvas.style.left = `${Math.floor((cssW - usedW) / 2)}px`
  canvas.style.top = `${Math.floor((cssH - usedH) / 2)}px`
}
window.addEventListener('resize', resize)
window.addEventListener('orientationchange', () => setTimeout(resize, 50))
resize()

const game = new Game(
  platform,
  {
    sfx: (name) => sound.play(name),
    share: async (text) => {
      const blob = await shareCardBlob(game)
      return platform.share.share(text, blob ?? undefined)
    },
  },
  {
    seed: params.get('seed') ?? undefined,
    demo: debug && params.has('demo'),
    today: debug ? params.get('today') ?? undefined : undefined,
  },
)
sound.setMuted(game.muted)
track('session_start', { target: platform.name })

const loop = createLoop(
  (step) => {
    game.update(step)
    if (sound.muted !== game.muted) sound.setMuted(game.muted)
  },
  () => renderer.draw(game),
)
if (debug && params.has('speed')) loop.speed = Math.max(0.1, Math.min(20, Number(params.get('speed')) || 1))

attachInput(canvas, {
  layout: () => layout,
  screen: () => game.screen,
  hit: (x, y) => renderer.hit(x, y),
  interact: () => sound.unlock(),
  command: (cmd) => game.command(cmd),
})

platform.lifecycle.onVisibility((visible) => {
  if (visible) loop.start()
  else {
    loop.stop()
    sound.suspend()
  }
})
platform.lifecycle.ready()
loop.start()
canvas.focus()

if (debug) {
  const w = window as unknown as { __sms: unknown }
  w.__sms = {
    game,
    loop,
    layout: () => layout,
    events: () => trackedEvents(),
    shareCard: () => drawShareCard(game).toDataURL('image/png'),
    state: () => {
      const run = game.run
      const cur = run?.current
      return {
        screen: game.screen,
        seed: game.seed,
        mode: game.mode,
        cash: run?.cash ?? 0,
        timeLeftMs: run?.timeLeftMs ?? 0,
        timerPaused: run?.timerPaused ?? false,
        locked: run?.locked ?? true,
        canBuy: run?.canBuy ?? false,
        canHaggle: run?.canHaggle ?? false,
        stall: run?.stall.length ?? 0,
        hint: game.hint,
        item: cur
          ? {
              index: cur.item.index,
              name: cur.item.name,
              tier: cur.item.tier,
              guide: cur.item.guide,
              ask: cur.ask,
              seller: cur.item.sellerType,
              clues: run.cluesShown.map((c) => c.text),
            }
          : null,
        result: game.result ? { score: game.result.score, bought: game.result.bought, bust: game.result.bust } : null,
        keepers: game.keepers,
      }
    },
  }
}

import { Game } from './game/game.ts'
import { Renderer, resultButtons } from './game/render.ts'
import { computeLayout, type Layout, type Insets } from './game/layout.ts'
import { attachInput } from './game/input.ts'
import { createLoop } from './game/loop.ts'
import { setDebug, track, trackedEvents } from './game/events.ts'
import { getPlatform } from './platform/index.ts'

const params = new URLSearchParams(location.search)
const debug = import.meta.env.DEV || params.has('debug')
setDebug(debug)

const platform = getPlatform()
const canvas = document.getElementById('game') as HTMLCanvasElement
const safeProbe = document.getElementById('safe') as HTMLDivElement
const renderer = new Renderer(canvas)

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

const seed = params.get('seed') ?? undefined
const game = new Game(platform, { seed })
track('session_start', { target: platform.name })

const loop = createLoop(
  (step) => game.update(step),
  () => renderer.draw(game),
)
if (debug && params.has('speed')) loop.speed = Math.max(0.1, Math.min(20, Number(params.get('speed')) || 1))

attachInput(canvas, {
  layout: () => layout,
  screen: () => game.screen,
  resultButtons: () => resultButtons(layout),
  interact: () => {},
  command: (cmd) => {
    if (cmd === 'again') {
      if (game.screen === 'result') game.playAgain()
    } else if (cmd === 'share') {
      if (game.screen === 'result') void game.share()
    } else {
      game.action(cmd)
    }
  },
})

platform.lifecycle.onVisibility((visible) => {
  if (visible) loop.start()
  else loop.stop()
})
platform.lifecycle.ready()
loop.start()

if (debug) {
  const w = window as unknown as { __sms: unknown }
  w.__sms = {
    game,
    layout: () => layout,
    events: () => trackedEvents(),
    state: () => {
      const run = game.run
      const cur = run.current
      return {
        screen: game.screen,
        seed: game.seed,
        cash: run.cash,
        timeLeftMs: run.timeLeftMs,
        locked: run.locked,
        canBuy: run.canBuy,
        canHaggle: run.canHaggle,
        stall: run.stall.length,
        item: cur
          ? {
              index: cur.item.index,
              name: cur.item.name,
              guide: cur.item.guide,
              ask: cur.ask,
              seller: cur.item.sellerType,
              clues: run.cluesShown.map((c) => c.text),
            }
          : null,
        result: game.result ? { score: game.result.score, bought: game.result.bought, bust: game.result.bust } : null,
      }
    },
  }
}

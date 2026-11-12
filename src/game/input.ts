// Input: pointer events for every on screen control and for swipes, and the
// keyboard for the same actions. The layout is never chosen by detecting touch.

import type { Cmd, Screen } from './game.ts'
import type { Layout } from './layout.ts'

export interface InputHandlers {
  layout(): Layout
  screen(): Screen
  /** The control under a logical point. */
  hit(x: number, y: number): Cmd | null
  command(cmd: Cmd): void
  /** Any interaction, used to unlock audio inside a gesture. */
  interact(): void
}

const SWIPE_CSS_PX = 28

export function attachInput(canvas: HTMLCanvasElement, h: InputHandlers): () => void {
  let downId = -1
  let downX = 0
  let downY = 0
  let downOnControl = false

  const toLogical = (ev: PointerEvent): { x: number; y: number } => {
    const L = h.layout()
    const rect = canvas.getBoundingClientRect()
    const x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * L.w
    const y = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * L.h
    return { x, y }
  }

  const onDown = (ev: PointerEvent): void => {
    h.interact()
    if (downId !== -1) return
    ev.preventDefault()
    const p = toLogical(ev)
    downId = ev.pointerId
    downX = ev.clientX
    downY = ev.clientY
    try {
      canvas.setPointerCapture(ev.pointerId)
    } catch {
      // some browsers refuse capture on synthetic events
    }
    const cmd = h.hit(p.x, p.y)
    downOnControl = cmd !== null
    if (cmd) h.command(cmd)
  }

  const onUp = (ev: PointerEvent): void => {
    if (ev.pointerId !== downId) return
    downId = -1
    if (downOnControl || h.screen() !== 'play') return
    const dx = ev.clientX - downX
    const dy = ev.clientY - downY
    if (Math.abs(dx) < SWIPE_CSS_PX && Math.abs(dy) < SWIPE_CSS_PX) return
    if (Math.abs(dx) > Math.abs(dy)) h.command(dx > 0 ? 'buy' : 'pass')
    else if (dy < 0) h.command('haggle')
  }

  const onCancel = (ev: PointerEvent): void => {
    if (ev.pointerId === downId) downId = -1
  }

  const keyCmd = (code: string, screen: Screen): Cmd | null => {
    if (code === 'KeyM') return 'mute'
    switch (screen) {
      case 'play':
        if (code === 'ArrowLeft' || code === 'KeyA') return 'pass'
        if (code === 'ArrowRight' || code === 'KeyD') return 'buy'
        if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') return 'haggle'
        return null
      case 'result':
        if (code === 'Enter' || code === 'Space') return 'again'
        if (code === 'Escape') return 'home'
        return null
      case 'title':
        if (code === 'Enter' || code === 'Space') return 'daily'
        if (code === 'KeyF') return 'free'
        return null
      case 'offer':
        if (code === 'Enter') return 'watch'
        if (code === 'Escape') return 'skip'
        return null
      case 'finds':
        if (code === 'Escape' || code === 'Enter') return 'home'
        return null
    }
  }

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return
    const cmd = keyCmd(ev.code, h.screen())
    if (cmd) {
      ev.preventDefault()
      h.interact()
      h.command(cmd)
    }
  }

  const noMenu = (e: Event) => e.preventDefault()
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  canvas.addEventListener('contextmenu', noMenu)
  window.addEventListener('keydown', onKey)

  return () => {
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onCancel)
    canvas.removeEventListener('contextmenu', noMenu)
    window.removeEventListener('keydown', onKey)
  }
}

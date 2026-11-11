// Input: pointer events for the three buttons and swipes, keyboard for the
// same three actions. The layout is never chosen by detecting touch.

import type { Action } from '../core/run.ts'
import type { Layout } from './layout.ts'
import { contains } from './layout.ts'

export type UiCommand = Action | 'again' | 'share'

export interface InputHandlers {
  layout(): Layout
  screen(): 'play' | 'result'
  resultButtons(): { share: { x: number; y: number; w: number; h: number }; again: { x: number; y: number; w: number; h: number } }
  command(cmd: UiCommand): void
  /** Any first interaction, used to unlock audio. */
  interact(): void
}

const SWIPE_PX = 24

export function attachInput(canvas: HTMLCanvasElement, h: InputHandlers): () => void {
  let downId = -1
  let downX = 0
  let downY = 0
  let downOnButton = false

  const toLogical = (ev: PointerEvent): { x: number; y: number } => {
    const L = h.layout()
    const rect = canvas.getBoundingClientRect()
    const x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * L.w
    const y = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * L.h
    return { x, y }
  }

  const buttonAt = (x: number, y: number): UiCommand | null => {
    const L = h.layout()
    if (h.screen() === 'play') {
      if (contains(L.buttons.pass, x, y)) return 'pass'
      if (contains(L.buttons.haggle, x, y)) return 'haggle'
      if (contains(L.buttons.buy, x, y)) return 'buy'
      return null
    }
    const rb = h.resultButtons()
    if (contains(rb.share, x, y)) return 'share'
    if (contains(rb.again, x, y)) return 'again'
    return null
  }

  const onDown = (ev: PointerEvent): void => {
    if (downId !== -1) return
    h.interact()
    ev.preventDefault()
    const p = toLogical(ev)
    downId = ev.pointerId
    downX = p.x
    downY = p.y
    try {
      canvas.setPointerCapture(ev.pointerId)
    } catch {
      // some browsers refuse capture on synthetic events
    }
    const cmd = buttonAt(p.x, p.y)
    downOnButton = cmd !== null
    if (cmd) h.command(cmd)
  }

  const onUp = (ev: PointerEvent): void => {
    if (ev.pointerId !== downId) return
    downId = -1
    if (downOnButton) return
    if (h.screen() !== 'play') return
    const p = toLogical(ev)
    const L = h.layout()
    const dx = ((p.x - downX) * L.scale) / Math.max(1, window.devicePixelRatio || 1)
    const dy = ((p.y - downY) * L.scale) / Math.max(1, window.devicePixelRatio || 1)
    if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) return
    if (Math.abs(dx) > Math.abs(dy)) h.command(dx > 0 ? 'buy' : 'pass')
    else if (dy < 0) h.command('haggle')
  }

  const onCancel = (ev: PointerEvent): void => {
    if (ev.pointerId === downId) downId = -1
  }

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.repeat) return
    const target = ev.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    let cmd: UiCommand | null = null
    if (h.screen() === 'play') {
      switch (ev.code) {
        case 'ArrowLeft':
        case 'KeyA':
          cmd = 'pass'
          break
        case 'ArrowRight':
        case 'KeyD':
          cmd = 'buy'
          break
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          cmd = 'haggle'
          break
      }
    } else if (ev.code === 'Space' || ev.code === 'Enter') cmd = 'again'
    if (cmd) {
      ev.preventDefault()
      h.interact()
      h.command(cmd)
    }
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  return () => {
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
  }
}

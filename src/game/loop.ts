// Fixed time step loop. The game advances in 10 ms steps no matter how often
// the display refreshes, so 60, 144 and 165 Hz all play the same morning.

export const STEP_MS = 10
const MAX_FRAME_MS = 250 // after a stall, catch up at most this much

export interface Loop {
  start(): void
  stop(): void
  /** Debug only: how many steps run per real step. 1 is normal speed. */
  speed: number
}

export function createLoop(update: (stepMs: number) => void, render: () => void): Loop {
  let running = false
  let last = 0
  let acc = 0
  let handle = 0

  const loop: Loop = {
    speed: 1,
    start() {
      if (running) return
      running = true
      last = performance.now()
      acc = 0
      handle = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(handle)
    },
  }

  function frame(now: number): void {
    if (!running) return
    let dt = now - last
    last = now
    if (dt < 0) dt = 0
    if (dt > MAX_FRAME_MS) dt = MAX_FRAME_MS
    acc += dt * loop.speed
    let guard = 0
    while (acc >= STEP_MS && guard < 200) {
      update(STEP_MS)
      acc -= STEP_MS
      guard++
    }
    render()
    handle = requestAnimationFrame(frame)
  }

  return loop
}

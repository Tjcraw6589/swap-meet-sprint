// Every sound is made with the Web Audio API at runtime. No audio files.
// The context is created on the first tap and resumed inside any later tap,
// which is what browsers need after the page was in the background.

export type SoundName =
  | 'thud'
  | 'coin'
  | 'register'
  | 'deal'
  | 'nodeal'
  | 'crack'
  | 'fanfare'
  | 'tick'
  | 'tock'
  | 'click'
  | 'whoosh'
  | 'bell'
  | 'loss'

type Ctx = AudioContext

export class Sound {
  private ctx: Ctx | null = null
  private master: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  muted = false

  /** Call from inside a user gesture. Creates or resumes the context. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        this.ctx = new AC()
        this.master = this.ctx.createGain()
        this.master.gain.value = this.muted ? 0 : 0.5
        this.master.connect(this.ctx.destination)
        const len = Math.floor(this.ctx.sampleRate * 0.5)
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
        const d = this.noiseBuf.getChannelData(0)
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      }
      if (this.ctx.state !== 'running') void this.ctx.resume()
    } catch {
      this.ctx = null
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend()
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.01)
  }

  play(name: SoundName): void {
    const ctx = this.ctx
    if (!ctx || !this.master || this.muted || ctx.state !== 'running') return
    const t = ctx.currentTime + 0.005
    switch (name) {
      case 'thud':
        this.tone(t, 110, 0.12, 'sine', 0.7, 45)
        this.noise(t, 0.06, 0.25, 'lowpass', 500)
        break
      case 'coin':
        this.tone(t, 988, 0.05, 'square', 0.15)
        this.tone(t + 0.05, 1319, 0.12, 'square', 0.15)
        break
      case 'register':
        this.noise(t, 0.04, 0.3, 'highpass', 3000)
        this.tone(t + 0.03, 1568, 0.35, 'triangle', 0.3)
        this.tone(t + 0.03, 2093, 0.45, 'triangle', 0.22)
        this.tone(t + 0.08, 2637, 0.3, 'sine', 0.12)
        break
      case 'loss':
        this.noise(t, 0.04, 0.2, 'highpass', 2000)
        this.tone(t + 0.02, 392, 0.25, 'triangle', 0.25, 330)
        break
      case 'deal':
        this.tone(t, 523, 0.08, 'square', 0.18)
        this.tone(t + 0.08, 784, 0.16, 'square', 0.18)
        this.noise(t, 0.05, 0.25, 'bandpass', 900)
        break
      case 'nodeal':
        this.tone(t, 220, 0.25, 'sawtooth', 0.22, 110)
        this.noise(t, 0.05, 0.3, 'bandpass', 600)
        break
      case 'crack':
        this.noise(t, 0.18, 0.5, 'highpass', 1500)
        this.noise(t + 0.03, 0.12, 0.4, 'bandpass', 3000)
        this.tone(t, 80, 0.2, 'sine', 0.5, 40)
        break
      case 'fanfare': {
        const notes = [523, 659, 784, 1047]
        notes.forEach((f, i) => this.tone(t + i * 0.09, f, i === 3 ? 0.4 : 0.1, 'square', 0.16))
        this.tone(t + 0.27, 1319, 0.4, 'triangle', 0.12)
        break
      }
      case 'tick':
        this.tone(t, 1600, 0.03, 'square', 0.1)
        break
      case 'tock':
        this.tone(t, 1100, 0.05, 'square', 0.16)
        break
      case 'click':
        this.tone(t, 700, 0.03, 'square', 0.08)
        break
      case 'whoosh':
        this.noise(t, 0.15, 0.18, 'bandpass', 1200, 400)
        break
      case 'bell':
        this.tone(t, 880, 0.8, 'triangle', 0.3)
        this.tone(t, 1320, 0.6, 'sine', 0.15)
        break
    }
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master!)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private noise(t: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, sweepTo?: number): void {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.setValueAtTime(freq, t)
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.master!)
    src.start(t)
    src.stop(t + dur + 0.02)
  }
}

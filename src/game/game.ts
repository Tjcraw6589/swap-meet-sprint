// The game: screens, the current run, keepers, and every animation the
// renderer needs. Pure state driven by the fixed step loop and by commands.
// Audio and haptics go out through callbacks so this file has no DOM.

import { Run, DEFAULT_CONFIG, type Action, type ActionResult, type RunEvent, type Deal } from '../core/run.ts'
import type { PricedItem } from '../core/items.ts'
import { GRAIL_COUNT } from '../core/grails.ts'
import { ClueReaderBot } from '../core/bots.ts'
import type { Platform, RewardPlacement } from '../platform/types.ts'
import type { SoundName } from './audio.ts'
import { track } from './events.ts'
import { T } from './theme.ts'
import { guidedItems, GUIDED_COUNT, GUIDED_SEED, guidedHint } from './guided.ts'
import { loadKeepers, saveKeepers, startDaily, hasScoredDaily, addFind, utcDate, prettyDate, liveStreak, type Keepers } from './save.ts'

export type Screen = 'title' | 'play' | 'offer' | 'result' | 'finds'
export type Mode = 'free' | 'daily'
export type Cmd =
  | Action
  | 'again'
  | 'share'
  | 'mute'
  | 'daily'
  | 'free'
  | 'home'
  | 'finds'
  | 'watch'
  | 'skip'
  | 'double'
  | `find${number}`

export type Anchor = 'wallet' | 'seller' | 'card' | 'slot0' | 'slot1' | 'slot2' | 'slot3'

export interface Particle {
  kind: 'coin' | 'shard' | 'spark'
  from: Anchor
  to: Anchor | null
  t0: number
  life: number
  dx: number
  dy: number
}

export interface Stamp {
  text: string
  kind: 'deal' | 'nodeal' | 'fake'
  from: number
  until: number
  slot: number | null
}

export interface SalePop {
  slot: number
  profit: number
  from: number
  until: number
  fake: boolean
}

export interface Outgoing {
  item: PricedItem
  ask: number
  kind: 'pass' | 'buy' | 'nodeal'
  at: number
  slot: number | null
}

export interface ResultSummary {
  score: number
  start: number
  bestDeal: Deal | null
  worstDeal: Deal | null
  bought: number
  haggles: number
  bust: boolean
  mode: Mode
  scored: boolean
  newBest: boolean
  newFinds: number
  streak: number
}

export interface GameHooks {
  sfx(name: SoundName): void
  /** Share the result. The text is ready; the image is drawn on demand. */
  share(text: string, mode: Mode): Promise<boolean>
}

export interface GameOptions {
  seed?: string
  demo?: boolean
  today?: string
}

/** How long a press made while input is locked is kept. */
export const INPUT_BUFFER_MS = 220

export function freePlaySeed(): string {
  const r = Math.floor(Math.random() * 0xffffffff).toString(36)
  return `free-${Date.now().toString(36)}-${r}`
}

export function dailySeed(date: string): string {
  return `daily-${date}`
}

export class Game {
  readonly platform: Platform
  readonly hooks: GameHooks
  readonly keepers: Keepers
  readonly today: string
  screen: Screen = 'title'
  run!: Run
  seed = ''
  mode: Mode = 'free'
  /** True for the one scored Daily attempt of the day. */
  scored = false
  guided = false
  /** Game time in ms. Advances by the fixed step on every screen. */
  clock = 0
  runStartedAt = 0
  stamp: Stamp | null = null
  pops: SalePop[] = []
  particles: Particle[] = []
  outgoing: Outgoing | null = null
  wobbleAt = -1e9
  shakeUntil = 0
  shakeMag = 0
  flashUntil = 0
  flashColor = '#ffd866'
  toast: { text: string; until: number } | null = null
  pressed: { cmd: Cmd; until: number } | null = null
  result: ResultSummary | null = null
  resultAt = 0
  sessionRuns = 0
  extraUsed = false
  nextStartCash = DEFAULT_CONFIG.startCash
  adBusy = false
  selectedFind: number | null = null
  newFindsThisRun = 0
  /** A press that came while input was locked, kept for a moment. */
  private buffered: { a: Action; until: number } | null = null
  private landedIndex = -1
  private lastTick = -1
  private breaksShownAt = 0
  private fixedSeed: string | undefined
  private demoBot: ClueReaderBot | null

  constructor(platform: Platform, hooks: GameHooks, opts: GameOptions = {}) {
    this.platform = platform
    this.hooks = hooks
    this.keepers = loadKeepers(platform.storage)
    this.today = opts.today ?? utcDate()
    this.fixedSeed = opts.seed
    this.demoBot = opts.demo ? new ClueReaderBot({ reactionS: 0.45 }) : null
    if (opts.demo) this.startRun('free')
    else if (!this.keepers.guided && !opts.seed) this.startRun('free', { guided: true })
    else if (opts.seed) this.startRun('free')
    else this.screen = 'title'
  }

  get muted(): boolean {
    return this.keepers.muted
  }

  get streak(): number {
    return liveStreak(this.keepers, this.today)
  }

  get findsCount(): number {
    return this.keepers.finds.length
  }

  get dailyDone(): boolean {
    return hasScoredDaily(this.keepers, this.today)
  }

  get todayLabel(): string {
    return prettyDate(this.today)
  }

  get modeLabel(): string {
    if (this.guided) return 'FIRST MORNING'
    if (this.mode === 'daily') return this.scored ? 'DAILY' : 'PRACTICE'
    return 'FREE PLAY'
  }

  get hint(): string | null {
    return this.screen === 'play' ? guidedHint(this.run, this.guided, this.run.elapsedMs, 0) : null
  }

  get canOfferDouble(): boolean {
    return this.screen === 'result' && this.mode === 'free' && !this.adBusy && this.platform.ads.canShowRewarded('double_start')
  }

  startRun(mode: Mode, opts: { guided?: boolean } = {}): void {
    this.mode = mode
    this.guided = !!opts.guided
    this.scored = false
    if (this.guided) this.seed = GUIDED_SEED
    else if (mode === 'daily') {
      this.seed = dailySeed(this.today)
      this.scored = !this.dailyDone
      if (this.scored) {
        startDaily(this.keepers, this.today)
        saveKeepers(this.platform.storage, this.keepers)
      }
    } else this.seed = this.fixedSeed ?? freePlaySeed()
    const startCash = mode === 'free' && !this.guided ? this.nextStartCash : DEFAULT_CONFIG.startCash
    this.nextStartCash = DEFAULT_CONFIG.startCash
    this.run = new Run(
      this.seed,
      { ...DEFAULT_CONFIG, startCash },
      this.guided ? { scripted: guidedItems(), pauseTimerBelowIndex: GUIDED_COUNT } : {},
    )
    this.screen = 'play'
    this.stamp = null
    this.pops = []
    this.particles = []
    this.outgoing = null
    this.result = null
    this.extraUsed = false
    this.landedIndex = -1
    this.lastTick = -1
    this.newFindsThisRun = 0
    this.buffered = null
    this.runStartedAt = this.clock
    this.demoBot?.reset()
    track('run_start', { mode: this.mode, seed: this.seed })
    this.platform.lifecycle.gameplayStart()
    this.drainEvents()
  }

  update(stepMs: number): void {
    this.clock += stepMs
    if (this.screen === 'play') {
      const run = this.run
      if (this.demoBot && !run.locked) {
        const a = this.demoBot.decide(run)
        if (a) this.action(a)
      }
      run.step(stepMs)
      if (this.buffered) {
        if (this.clock > this.buffered.until) this.buffered = null
        else if (!run.locked) {
          const a = this.buffered.a
          this.buffered = null
          this.action(a)
        }
      }
      this.drainEvents()
      this.checkLanding()
      this.checkTicks()
      if (this.outgoing && run.elapsedMs > this.outgoing.at + 1400) this.outgoing = null
      if (run.phase === 'ended') this.endOfMorning()
    }
    if (this.stamp && this.clock >= this.stamp.until) this.stamp = null
    if (this.toast && this.clock >= this.toast.until) this.toast = null
    if (this.pressed && this.clock >= this.pressed.until) this.pressed = null
    this.pops = this.pops.filter((p) => this.clock < p.until)
    this.particles = this.particles.filter((p) => this.clock < p.t0 + p.life)
  }

  /** Every input device ends up here. */
  command(cmd: Cmd): void {
    if (this.adBusy) return
    if (cmd === 'mute') {
      this.keepers.muted = !this.keepers.muted
      saveKeepers(this.platform.storage, this.keepers)
      this.press(cmd)
      return
    }
    switch (this.screen) {
      case 'play':
        if (cmd === 'buy' || cmd === 'haggle' || cmd === 'pass') {
          if (this.run.locked && this.run.phase === 'playing') this.buffered = { a: cmd, until: this.clock + INPUT_BUFFER_MS }
          else this.action(cmd)
        }
        return
      case 'offer':
        if (cmd === 'watch') this.watchExtraTime()
        else if (cmd === 'skip') this.finishRun()
        return
      case 'result':
        if (this.clock < this.resultAt + 600) return
        if (cmd === 'again') this.startWithBreak(() => this.startRun(this.mode))
        else if (cmd === 'share') void this.share()
        else if (cmd === 'home') this.goTitle()
        else if (cmd === 'double') this.watchDoubleStart()
        return
      case 'title':
        if (cmd === 'daily') this.startWithBreak(() => this.startRun('daily'))
        else if (cmd === 'free') this.startWithBreak(() => this.startRun('free'))
        else if (cmd === 'finds') this.openFinds()
        return
      case 'finds':
        if (cmd === 'home') {
          this.screen = 'title'
          this.sfx('click')
        } else if (cmd.startsWith('find')) {
          this.selectedFind = Number(cmd.slice(4))
          this.sfx('click')
        }
        return
    }
  }

  /** A player action. Returns null when it did nothing. */
  action(a: Action): ActionResult | null {
    if (this.screen !== 'play') return null
    const run = this.run
    if (run.locked) return null
    const cur = run.current!
    const item = cur.item
    const ask = cur.ask
    const seconds = run.secondsOnItem
    const result = run.act(a)
    if (result === 'blocked') return null
    this.press(a)
    track('item_decision', { action: a, tier: item.tier, seconds: Math.round(seconds * 100) / 100, result })
    if (result === 'deal' || result === 'nodeal') {
      this.wobbleAt = this.clock
      const deal = result === 'deal'
      this.stamp = {
        text: deal ? 'DEAL' : 'NO DEAL',
        kind: deal ? 'deal' : 'nodeal',
        from: this.clock + T.wobbleMs,
        until: this.clock + (deal ? T.wobbleMs + T.stampMs : DEFAULT_CONFIG.haggleFailLockMs),
        slot: null,
      }
      if (!deal) this.outgoing = { item, ask, kind: 'nodeal', at: run.elapsedMs, slot: null }
    } else if (a === 'pass') {
      this.outgoing = { item, ask, kind: 'pass', at: run.elapsedMs, slot: null }
    }
    this.drainEvents()
    return result
  }

  private press(cmd: Cmd): void {
    this.pressed = { cmd, until: this.clock + 140 }
  }

  private sfx(name: SoundName): void {
    if (!this.keepers.muted) this.hooks.sfx(name)
  }

  private shake(ms: number, mag: number): void {
    this.shakeUntil = Math.max(this.shakeUntil, this.clock + ms)
    this.shakeMag = mag
  }

  private coins(from: Anchor, to: Anchor, n: number): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({ kind: 'coin', from, to, t0: this.clock + i * 45, life: T.coinMs, dx: (i % 3) - 1, dy: i % 2 })
    }
  }

  private burst(kind: 'shard' | 'spark', at: Anchor, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3
      const sp = kind === 'shard' ? 22 : 30
      this.particles.push({ kind, from: at, to: null, t0: this.clock, life: kind === 'shard' ? 600 : 800, dx: Math.cos(a) * sp, dy: Math.sin(a) * sp - 8 })
    }
  }

  private drainEvents(): void {
    const events: RunEvent[] = this.run.events
    for (const ev of events) {
      switch (ev.type) {
        case 'buy':
          this.outgoing = { item: ev.item, ask: ev.paid, kind: 'buy', at: this.run.elapsedMs, slot: ev.slot }
          this.coins('wallet', 'seller', 5)
          this.sfx('coin')
          this.platform.haptics.tap('buy')
          break
        case 'deal':
          this.sfx('deal')
          this.platform.haptics.tap('deal')
          break
        case 'nodeal':
          this.sfx('nodeal')
          this.platform.haptics.tap('nodeal')
          this.shake(T.shakeMs, 2)
          break
        case 'pass':
          this.sfx('whoosh')
          break
        case 'sale': {
          const { deal, slot } = ev
          const anchor = `slot${slot}` as Anchor
          this.pops.push({ slot, profit: deal.profit, from: this.clock, until: this.clock + T.salePopMs, fake: deal.item.fake })
          if (deal.item.fake) {
            this.sfx('crack')
            this.stamp = { text: 'FAKE', kind: 'fake', from: this.clock, until: this.clock + T.crackMs, slot }
            this.burst('shard', anchor, 8)
            this.shake(T.shakeMs * 2, 2)
            this.platform.haptics.tap('fake')
          } else {
            this.sfx(deal.profit >= 0 ? 'register' : 'loss')
            if (deal.sold > 0) this.coins(anchor, 'wallet', deal.profit > 0 ? 4 : 2)
            this.platform.haptics.tap('sale')
          }
          if (deal.item.grailId !== null && !deal.item.fake && !this.guided) {
            if (addFind(this.keepers, deal.item.grailId)) {
              this.newFindsThisRun++
              saveKeepers(this.platform.storage, this.keepers)
              this.toast = { text: `New find! ${this.findsCount} of ${GRAIL_COUNT} on your shelf.`, until: this.clock + 2200 }
              this.platform.haptics.tap('grail')
            }
          }
          break
        }
        case 'end':
          this.sfx('bell')
          break
        case 'item':
          break
      }
    }
    events.length = 0
  }

  private checkLanding(): void {
    const run = this.run
    const cur = run.current
    if (!cur || cur.item.index === this.landedIndex) return
    if (run.elapsedMs < cur.readyAtMs) return
    this.landedIndex = cur.item.index
    this.sfx('thud')
    this.shake(90, 1)
    if (cur.item.tier === 'grail') {
      this.flashUntil = this.clock + T.flashMs
      this.flashColor = '#ffd866'
      this.sfx('fanfare')
      this.burst('spark', 'card', 12)
      this.platform.haptics.tap('grail')
    }
  }

  private checkTicks(): void {
    const left = this.run.timeLeftMs
    if (left > T.lastSecondsMs || left <= 0 || this.run.timerPaused) return
    const sec = Math.ceil(left / 1000)
    if (sec !== this.lastTick) {
      this.lastTick = sec
      this.sfx(sec <= 3 ? 'tock' : 'tick')
    }
  }

  private endOfMorning(): void {
    this.platform.lifecycle.gameplayStop()
    this.outgoing = null
    const offer =
      !this.extraUsed &&
      !this.run.bust &&
      !this.guided &&
      !(this.mode === 'daily' && this.scored) &&
      !this.demoBot &&
      this.platform.ads.canShowRewarded('extra_time')
    if (offer) {
      this.screen = 'offer'
      return
    }
    this.finishRun()
  }

  private watchExtraTime(): void {
    this.showRewarded('extra_time', () => {
      this.extraUsed = true
      if (this.run.extend(15_000)) {
        this.screen = 'play'
        this.landedIndex = -1
        this.lastTick = -1
        this.platform.lifecycle.gameplayStart()
      }
    }, () => {
      if (this.screen === 'offer') this.finishRun()
    })
  }

  private watchDoubleStart(): void {
    if (!this.canOfferDouble) return
    this.showRewarded('double_start', () => {
      this.nextStartCash = DEFAULT_CONFIG.startCash * 2
    }, () => {
      if (this.nextStartCash > DEFAULT_CONFIG.startCash) this.startWithBreak(() => this.startRun('free'))
    })
  }

  private showRewarded(placement: RewardPlacement, onReward: () => void, onDone: () => void): void {
    this.adBusy = true
    track('ad_rewarded_shown', { placement })
    let rewarded = false
    this.platform.ads.showRewarded(
      placement,
      () => {
        rewarded = true
        onReward()
      },
      () => {
        this.adBusy = false
        if (!rewarded || placement === 'double_start') onDone()
      },
    )
  }

  /** Breaks come after every third finished run, never during play, never before the first. */
  private startWithBreak(start: () => void): void {
    this.sfx('click')
    if (this.sessionRuns > 0 && this.sessionRuns % 3 === 0 && this.breaksShownAt !== this.sessionRuns && this.platform.adsEnabled) {
      this.breaksShownAt = this.sessionRuns
      this.adBusy = true
      track('ad_break_shown', { runs: this.sessionRuns })
      this.platform.ads.showBreak(() => {
        this.adBusy = false
        start()
      })
      return
    }
    start()
  }

  private finishRun(): void {
    const run = this.run
    const k = this.keepers
    this.sessionRuns++
    const start = run.config.startCash
    const newBest = !this.guided && run.cash > k.best
    if (!this.guided) {
      k.runs++
      k.lifetimeProfit += run.cash - start
      if (newBest) k.best = run.cash
    }
    if (this.mode === 'daily' && this.scored) {
      k.dailyScore = run.cash
      k.dailyBestName = run.bestDeal && run.bestDeal.profit > 0 ? run.bestDeal.item.name : null
      k.dailyBestProfit = run.bestDeal && run.bestDeal.profit > 0 ? run.bestDeal.profit : null
      const it = run.bestDeal && run.bestDeal.profit > 0 ? run.bestDeal.item : null
      k.dailyBestArt = it ? { category: it.category, artSeed: it.artSeed, palette: it.palette } : null
    }
    if (this.guided) k.guided = true
    saveKeepers(this.platform.storage, k)
    this.result = {
      score: run.cash,
      start,
      bestDeal: run.bestDeal,
      worstDeal: run.worstDeal,
      bought: run.bought,
      haggles: run.haggles,
      bust: run.bust,
      mode: this.mode,
      scored: this.scored,
      newBest,
      newFinds: this.newFindsThisRun,
      streak: this.streak,
    }
    this.screen = 'result'
    this.resultAt = this.clock
    track('run_end', {
      score: run.cash,
      bought: run.bought,
      haggles: run.haggles,
      bust: run.bust,
      seconds: Math.round(run.elapsedMs / 100) / 10,
    })
  }

  private goTitle(): void {
    this.sfx('click')
    this.screen = 'title'
  }

  private openFinds(): void {
    this.sfx('click')
    this.selectedFind = null
    this.screen = 'finds'
  }

  /** The text that goes with a share. Daily shares always use the scored attempt. */
  shareText(): string {
    const money = (n: number) => `$${n.toLocaleString('en-US')}`
    const r = this.result
    if (!r) return ''
    if (r.mode === 'daily' && this.keepers.dailyScore !== null) {
      const best = this.keepers.dailyBestName ? ` Best deal: ${this.keepers.dailyBestName}, +${money(this.keepers.dailyBestProfit ?? 0)}.` : ''
      return `Swap Meet Sprint, ${this.todayLabel}: I turned $50 into ${money(this.keepers.dailyScore)}.${best} Same morning for everyone today. Can you beat it?`
    }
    const best = r.bestDeal && r.bestDeal.profit > 0 ? ` Best deal: ${r.bestDeal.item.name}, +${money(r.bestDeal.profit)}.` : ''
    return `Swap Meet Sprint: I turned ${money(r.start)} into ${money(r.score)} in one morning.${best}`
  }

  async share(): Promise<boolean> {
    track('share_tapped', { score: this.result?.score ?? 0, mode: this.mode })
    this.sfx('click')
    const ok = await this.hooks.share(this.shareText(), this.result?.mode ?? 'free')
    this.toast = { text: ok ? 'Shared!' : 'Could not share here.', until: this.clock + 1600 }
    return ok
  }
}

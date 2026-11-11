// Local only events. Logged to memory, and to the console in debug builds.
// Nothing is ever sent anywhere.

export type EventName =
  | 'session_start'
  | 'run_start'
  | 'item_decision'
  | 'run_end'
  | 'ad_rewarded_shown'
  | 'ad_break_shown'
  | 'share_tapped'

export interface TrackedEvent {
  name: EventName
  data: Record<string, unknown>
  at: number
}

const log: TrackedEvent[] = []
let debug = false

export function setDebug(on: boolean): void {
  debug = on
}

export function isDebug(): boolean {
  return debug
}

export function track(name: EventName, data: Record<string, unknown> = {}): void {
  const ev: TrackedEvent = { name, data, at: Date.now() }
  log.push(ev)
  if (log.length > 2000) log.shift()
  if (debug) console.log(`[track] ${name}`, data)
}

export function trackedEvents(): readonly TrackedEvent[] {
  return log
}

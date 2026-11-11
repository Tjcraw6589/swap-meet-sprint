import type { Platform, TargetName } from './types.ts'
import { webPlatform } from './web.ts'

declare const __TARGET__: string

export function targetName(): TargetName {
  const t = typeof __TARGET__ === 'string' ? __TARGET__ : 'web'
  if (t === 'crazygames' || t === 'ios') return t
  return 'web'
}

let instance: Platform | null = null

/** The platform for the current build target. Other targets arrive in Milestones 3 to 5. */
export function getPlatform(): Platform {
  if (instance) return instance
  instance = webPlatform
  return instance
}

export type { Platform } from './types.ts'

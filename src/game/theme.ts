// The single place for shared visual values: colours, sizes and timings.
// Draw code reads from here and never writes a literal colour.

export const C = {
  // sky from night to full morning
  skyNight: '#2b1d3a',
  skyDawn: '#8a4a6b',
  skyMorning: '#f2b56b',
  skyBright: '#ffe9b0',
  sun: '#ffd866',
  sunGlow: '#ffb347',
  hillsFar: '#5c3d6e',
  hillsNear: '#3b2a4f',
  ground: '#8c5a3c',
  groundDark: '#6b4128',
  grass: '#6f9d4a',
  tentA: '#e0524f',
  tentB: '#f2e6d0',
  tentC: '#3f8fa8',
  bunting: ['#e0524f', '#ffd866', '#3f8fa8', '#6f9d4a', '#f28c6b'],

  // ui panels
  panel: '#3d2b50',
  panelLight: '#55406c',
  panelDark: '#2a1c3a',
  line: '#9a86b4',
  paper: '#f6eee0',
  paperShade: '#d9cdb8',
  paperDark: '#b8a98f',
  ink: '#2a1c3a',
  inkSoft: '#5a4a6a',

  // text
  text: '#f6eee0',
  dim: '#b8a9cc',
  cash: '#ffd866',
  cashDark: '#b8860b',
  good: '#7ad17a',
  goodDark: '#3f8f3f',
  bad: '#ff6b6b',
  badDark: '#a83232',
  gold: '#ffd866',
  goldLight: '#fff2b0',
  white: '#ffffff',
  black: '#000000',

  // buttons
  buy: '#2e8b57',
  buyLight: '#4fc27d',
  buyDark: '#1d5a38',
  haggle: '#c98f2b',
  haggleLight: '#f0b848',
  haggleDark: '#8a5f14',
  pass: '#6c5b7b',
  passLight: '#8f7ca3',
  passDark: '#483a54',
  disabled: '#4a3f58',
  disabledLight: '#5a4f68',
  disabledDark: '#352c40',

  // sellers
  clueless: '#7ad17a',
  fair: '#ffd866',
  greedy: '#ff6b6b',

  // stall
  wood: '#a86a3c',
  woodDark: '#7a4a28',
  woodLight: '#c98a55',
  clothA: '#e0524f',
  clothB: '#f6eee0',

  // chips
  chip: '#55406c',
  chipLine: '#9a86b4',
  bubble: '#f6eee0',
  bubbleInk: '#2a1c3a',
  slotEmpty: '#2a1c3a',

  // translucent ink for shadows and overlays
  shadow: 'rgba(28,18,38,0.45)',
  barBack: 'rgba(28,18,38,0.55)',
  chipEmpty: 'rgba(42,28,58,0.35)',
} as const

/** Ink at a given opacity, for dimming the screen behind a panel. */
export function inkAlpha(alpha: number): string {
  return `rgba(28,18,38,${alpha})`
}

export const T = {
  stampMs: 600,
  salePopMs: 900,
  shakeMs: 160,
  coinMs: 520,
  flashMs: 450,
  wobbleMs: 320,
  crackMs: 900,
  lastSecondsMs: 10_000,
  readyPulseMs: 1200,
} as const

export const S = {
  sprite: 48,
  face: 24,
  gap: 4,
  topBar: 18,
} as const

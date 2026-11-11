import { describe, it, expect } from 'vitest'
import { RandomBot, AlwaysBuyBot, ClueReaderBot } from '../src/core/bots.ts'
import { simulateMany, summarize } from '../src/core/sim.ts'

const RUNS = 2000

describe('balance over 2,000 seeded mornings per bot', () => {
  const random = summarize(simulateMany(new RandomBot(), RUNS))
  const always = summarize(simulateMany(new AlwaysBuyBot(), RUNS))
  const reader = summarize(simulateMany(new ClueReaderBot(), RUNS))

  const money = (x: number) => `$${Math.round(x)}`
  const pct = (x: number) => `${Math.round(x * 100)}%`
  console.log(
    [random, always, reader]
      .map(
        (r) =>
          `${r.bot}: median ${money(r.median)}, mean ${money(r.mean)}, P10 ${money(r.p10)}, P90 ${money(r.p90)}, under $50 in ${pct(r.underStart)}, sees ${r.itemsSeen.toFixed(1)} items, buys ${r.bought.toFixed(1)}, haggles ${r.haggles.toFixed(1)}`,
      )
      .join('\n'),
  )

  it('the clue reader scores at least 5 times the random bot at the median', () => {
    expect(reader.median).toBeGreaterThanOrEqual(5 * random.median)
  })

  it('always buy ends under $50 in at least half its runs', () => {
    expect(always.underStart).toBeGreaterThanOrEqual(0.5)
  })

  it('the clue reader median lands between $400 and $3,000', () => {
    expect(reader.median).toBeGreaterThanOrEqual(400)
    expect(reader.median).toBeLessThanOrEqual(3000)
  })
})

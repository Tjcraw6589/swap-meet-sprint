// Prints the balance numbers used in BALANCE.md.
// Run with: npm run balance

import { RandomBot, AlwaysBuyBot, ClueReaderBot } from '../src/core/bots.ts'
import { simulateMany, summarize, type Summary } from '../src/core/sim.ts'

const runs = Number(process.argv[2] ?? 2000)
const bots = [new RandomBot(), new AlwaysBuyBot(), new ClueReaderBot()]
const rows: Summary[] = []
const t0 = Date.now()
for (const bot of bots) {
  rows.push(summarize(simulateMany(bot, runs)))
}
const ms = Date.now() - t0

const money = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`
const pct = (x: number) => `${Math.round(x * 100)}%`

console.log(`${runs} seeded mornings per bot, ${ms} ms total`)
console.log('')
for (const r of rows) {
  console.log(
    `* ${r.bot}: median ${money(r.median)}, mean ${money(r.mean)}, P10 ${money(r.p10)}, P90 ${money(r.p90)}, best ${money(r.max)}, under $50 in ${pct(r.underStart)}, sees ${r.itemsSeen.toFixed(1)} items, buys ${r.bought.toFixed(1)}, haggles ${r.haggles.toFixed(1)}`,
  )
}
const random = rows[0]
const always = rows[1]
const reader = rows[2]
console.log('')
console.log(`Clue reader median over random median: ${(reader.median / Math.max(1, random.median)).toFixed(1)}x (target 5x or more)`)
console.log(`Always buy under $50: ${pct(always.underStart)} (target 50% or more)`)
console.log(`Clue reader median: ${money(reader.median)} (target $400 to $3,000)`)

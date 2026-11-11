# Balance

Numbers from the headless simulator in `src/core`. Reprint them any time with `npm run balance`. The same checks run in `npm test` (see `tests/balance.test.ts`).

## Targets from the brief

* The clue reader's median score is at least 5 times the random bot's.
* Always buy ends under $50 in at least half its runs.
* The clue reader's median lands between $400 and $3,000.

## Result: 2,000 seeded mornings per bot

Seeds are `sim-0` to `sim-1999`, played at a fixed 10 ms step. All three checks hold with the numbers in the brief unchanged.

* Random bot: median $61, mean $75, P10 $19, P90 $143, best $610, under $50 in 39% of runs, sees 31.7 items, buys 10.2, haggles 12.3.
* Always buy: median $40, mean $88, P10 $9, P90 $205, best $4,875, under $50 in 57% of runs, sees 36.5 items, buys 28.2, haggles 0.
* Clue reader: median $1,234, mean $1,859, P10 $403, P90 $3,808, best $24,522, under $50 in 0% of runs, sees 64.7 items, buys 26.0, haggles 18.4.

Checks:

* Clue reader median over random median: 20.2x (5x needed).
* Always buy under $50: 57% (50% needed).
* Clue reader median: $1,234 ($400 to $3,000 needed).

Busts: 0% for every bot. With whole dollar prices and a $1 floor, a bought item always comes back as at least $1, so cash under $1 with an empty stall cannot happen after a purchase. The rule is still in the code as a safety net.

## Numbers as shipped

From the brief, unchanged:

* Morning 60 s, start $50, score is final cash.
* Clue chips at 0 s, 0.7 s and 1.4 s. Every item carries 3 clues.
* Haggle cuts the ask by 25%. First haggle chance: clueless 80%, fair 55%, greedy 30%. Each further haggle on the same item halves the chance. A failed haggle removes the item and locks input for 1.2 s.
* Stall of 4 slots, 4 s hold, sale at true value, everything left sells at 0 s.
* Net worth N = cash plus what was paid for stall items, never below 50.
* Tier shares and guide bands, hidden trait shares and multipliers, seller shares and ask bands: exactly the tables in the brief.
* Authenticity chip on 60% of good and better items. Seller speech bubble true 70% of the time.

Numbers the brief left to me (marked `tune` in `src/core/run.ts`):

* Slide in: 350 ms before a new item accepts input.
* DEAL stamp: 450 ms input lock after a won haggle.
* Haggles per item capped at 6 (by then the chance is tiny anyway).

How clues are chosen (`src/core/items.ts`):

* Every item starts with a condition chip, a box chip and a seller bubble.
* On 60% of good, rare and grail items an authenticity chip replaces one of those three at random.
* The seller bubble talks about condition, authenticity or the box. When it lies, it claims a different value for that trait.
* Chips are always true.

## The bots

* Random: waits 0.2 to 2.0 s, then does a random action. A buy it cannot afford becomes a pass.
* Always buy: buys at 0.3 s whenever it can. With a full stall it waits for a slot. With too little cash it waits for a sale, or passes when the stall is empty.
* Clue reader: updates its belief about the hidden traits from the chips (certain) and the seller bubble (70% weight), enumerates all 16 hidden outcomes, and scores buy, haggle, wait and pass by expected profit. Its own numbers: reaction 0.2 s after each clue, one second of the morning is worth 3% of net worth, tying cash up on the stall costs 15% of the ask, a wait is expected to deliver 80% of the perfect information value, and it waits up to 1.5 s for a stall slot.

## Sensitivity of the clue reader (600 mornings each)

Changing one bot number at a time keeps the median inside the window, so the window is not a knife edge:

* Reaction 0.1 s: median $1,654. Reaction 0.35 s: median $810.
* Time value 2%: $1,060. Time value 5%: $1,551.
* Hold cost 5%: $1,299. Hold cost 30%: $1,166.
* Info quality 0.5: $1,380. Info quality 1.0: $1,045.
* Slot wait 4 s: $1,282.

A human who reads clues at roughly the clue reader's speed should land near $1,000. The P90 of $3,808 is the kind of run that makes a share card.

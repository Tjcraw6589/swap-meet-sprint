# Swap Meet Sprint

A 60 second game. Items come to your stall one at a time. Buy, haggle or pass. Everything you buy sells four seconds later for what it is really worth. End with more cash than you started with. Same items for everyone each morning, so scores are fair to compare.

Made by Bal Tak. Built with TypeScript, Vite and Canvas 2D, no game engine and no runtime dependencies.

## Commands

* `npm install` once.
* `npm test` runs every check, including the 10,000 item generator check and 6,000 simulated mornings.
* `npm run balance` prints the balance numbers that live in `BALANCE.md`.
* `npm run typecheck` runs the TypeScript compiler.
* `npm run dev` starts the game in the browser (from Milestone 1).

## Layout

* `src/core` the rules: seeded random, item generator, economy, run state machine, bots, simulator. Pure TypeScript, no browser needed.
* `tests` Vitest tests.
* `scripts` small tools.
* `BALANCE.md` the tuned numbers and how they were checked.
* `SESSION_HANDOVER.md` current status for whoever picks this up next.
* `CREDITS.md` who made what and under which licence.

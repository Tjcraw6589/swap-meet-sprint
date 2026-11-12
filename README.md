# Swap Meet Sprint

A one minute game. Items come to your table one at a time. Buy, haggle or pass. Everything you buy sells four seconds later for what it is really worth. Read the clues, spot the fakes, and end the morning with more cash than you started with. The Daily Morning gives everyone the same items, so scores are fair to compare.

Made by Bal Tak. Built with TypeScript, Vite and Canvas 2D, no game engine and no runtime dependencies.

## Commands

* `npm install` once, then `npx playwright install chromium` once for the browser tests.
* `npm run dev` starts the game at http://localhost:5173.
* `npm test` runs the unit tests, including the 10,000 item generator check and 6,000 simulated mornings.
* `npm run e2e` runs the browser tests and writes proof screenshots and a 10 second clip to `proof/m2`.
* `npm run balance` prints the balance numbers that live in `BALANCE.md`.
* `npm run typecheck` runs the TypeScript compiler.
* `npm run build` builds the web target into `dist/web`.
* `npm run release` builds the CrazyGames and itch.io zips into `release/`.
* `npm run store` renders covers, screenshots and preview videos into `store/`.

## Debug address options

Dev builds, or any build with `?debug=1`:

* `seed=abc` plays a fixed Free Play morning.
* `fresh=1` wipes the save, so the guided first run plays again.
* `today=2026-11-12` pretends it is that UTC day (Daily and streak).
* `demo=1` lets a bot play by itself (used for the ad clip).
* `ads=stub` turns on a pretend ad network so the money hooks can be seen.
* `speed=4` runs the clock faster.
* `window.__sms.state()` in the console reports the run.

## Layout

* `src/core` the rules: seeded random, item generator, grails, economy, run state machine, bots, simulator. Pure TypeScript, no browser needed.
* `src/game` the game: screens and state (`game.ts`), renderer, layout, pixel font, pixel art, scene, sound, saves, share card, input, fixed step loop, guided first run, local events.
* `src/platform` the platform layer: ads, storage, share, haptics and lifecycle. `web.ts` for GitHub Pages and itch.io, `crazygames.ts` for CrazyGames.
* `store` everything the portal forms ask for. `release` the portal zips.
* `.github/workflows/pages.yml` tests and publishes the web build to GitHub Pages on every push.
* `tests` Vitest tests. `e2e` Playwright tests.
* `proof` screenshots and the clip each milestone was checked with.
* `BALANCE.md` the tuned numbers and how they were checked.
* `SESSION_HANDOVER.md` current status for whoever picks this up next.
* `CREDITS.md` who made what and under which licence.

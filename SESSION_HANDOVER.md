# Session handover

Another assistant reads this file to report status. Keep it current after every milestone.

Project: Swap Meet Sprint. A 60 second buy, haggle or pass game for web portals and iPhone from one codebase. Credit: Bal Tak. Brief: `C:\Users\Tyjcr\Tools\GameBriefs\SWAP_MEET_SPRINT_PROMPT.md`.

Local folder: `C:\Users\Tyjcr\swap-meet-sprint`. Git author is set to Bal Tak with the GitHub noreply address. No remote yet.

## Done

### Milestone 0: content tool (done)

* Seeded random, item generator, economy, run state machine, three bots and a headless simulator in `src/core`, plain TypeScript with no runtime dependencies.
* `npm test` runs the generator check over 10,000 items (blocklist, tier and trait shares within 2 points), run rules, replay by seed, the three bot checks over 2,000 mornings each, and a scan that no markdown prose contains a hyphen.
* All three balance targets hold with the brief's numbers unchanged. Numbers are in `BALANCE.md`.
* Toolchain: TypeScript 7.0, Vite 8.3, Vitest 5.1, Playwright 1.65, Node 24.

### Milestone 1: grey box (done)

* `npm run dev` opens a full morning in the browser: item card, clue chips, stall, three buttons, result screen with best and worst deal, Share and Play Again.
* Fixed 10 ms step loop in `src/game/loop.ts`, so 60, 144 and 165 Hz play the same morning. Visual time comes from the step clock, not the display.
* Whole number scaling in `src/game/layout.ts`. Landscape from 320 by 180 logical pixels, portrait from 180 by 300, safe areas read from CSS. The layout fills the window at the chosen scale.
* Input in `src/game/input.ts`: pointer events for the buttons and swipes (left pass, right buy, up haggle), keyboard Left or A, Right or D, Up, W or Space. Enter or Space plays again.
* Platform layer in `src/platform`: one interface with ads, storage, share, haptics and lifecycle. The `web` target is in; `crazygames` and `ios` arrive in Milestones 3 and 4.
* Local only events in `src/game/events.ts`: `track(name, data)` logs to memory and, in debug builds, to the console. Nothing is sent anywhere.
* Proof: `npm run e2e` plays seed `e2e-1` with the keyboard to the result screen and checks buttons and swipes. Both pass.
* Debug helpers (dev builds or `?debug=1`): `?seed=` fixes the morning, `?speed=` speeds the clock, `window.__sms.state()` reports the run.

## Live

Nothing is live yet.

## Waiting on the owner

Nothing yet. Nothing in Milestones 0 and 1 needs him.

## Next

* Milestone 2: the real game. Pixel art drawn in code, juice, Web Audio sound, Daily mode, keepers, share card, guided first run, all layouts. Proof: screenshots at 800 by 450, 1920 by 1080 and 390 by 844, plus a muted 10 second capture.
* Then Milestone 3 (web release), Milestone 4 (iPhone shell), Milestone 5 (money).

## Decisions so far

* Working title stays Swap Meet Sprint until the store searches before anything goes public (Milestone 3).
* Repo will be `swap-meet-sprint`, public, on the existing GitHub account. The Pages link will show that account name.
* Daily seed uses the UTC date.
* Haggles per item are capped at 6; the chance halves each time as the brief says.
* Milestone 1 uses the system monospace font. The bundled pixel font comes with Milestone 2.

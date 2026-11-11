# Session handover

Another assistant reads this file to report status. Keep it current after every milestone.

Project: Swap Meet Sprint. A 60 second buy, haggle or pass game for web portals and iPhone from one codebase. Credit: Bal Tak. Brief: `C:\Users\Tyjcr\Tools\GameBriefs\SWAP_MEET_SPRINT_PROMPT.md`.

Local folder: `C:\Users\Tyjcr\swap-meet-sprint`. Git author is set to Bal Tak with the GitHub noreply address. No remote yet.

## Done

### Milestone 0: content tool (done)

* Seeded random, item generator, economy, run state machine, three bots and a headless simulator in `src/core`, plain TypeScript with no runtime dependencies.
* `npm test` runs 34 tests: generator check over 10,000 items (blocklist, tier and trait shares within 2 points), run rules, replay by seed, the three bot checks over 2,000 mornings each, and a scan that no markdown prose contains a hyphen.
* All three balance targets hold with the brief's numbers unchanged. Numbers are in `BALANCE.md`.
* Toolchain: TypeScript 7.0, Vite 8.3, Vitest 5.1, Node 24.

## Live

Nothing is live yet.

## Waiting on the owner

Nothing yet. Nothing in Milestone 0 needs him.

## Next

* Milestone 1: grey box. Fixed time step game loop (correct at 60, 144 and 165 Hz), canvas renderer with plain shapes, pointer and keyboard input, a full morning playable from first item to the result screen, and a Playwright test that plays a seeded run to the result.
* Then Milestone 2 (art, juice, sound, Daily, keepers, share card, guided first run, layouts), Milestone 3 (web release), Milestone 4 (iPhone shell), Milestone 5 (money).

## Decisions so far

* Working title stays Swap Meet Sprint until the store searches before anything goes public (Milestone 3).
* Repo will be `swap-meet-sprint`, public, on the existing GitHub account. The Pages link will show that account name.
* Daily seed uses the UTC date.
* Haggles per item are capped at 6; the chance halves each time as the brief says.

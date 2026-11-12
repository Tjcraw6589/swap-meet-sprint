# Session handover

Another assistant reads this file to report status. Keep it current after every milestone.

Project: Swap Meet Sprint. A one minute buy, haggle or pass game for web portals and iPhone from one codebase. Credit: Bal Tak. Brief: `C:\Users\Tyjcr\Tools\GameBriefs\SWAP_MEET_SPRINT_PROMPT.md`.

Local folder: `C:\Users\Tyjcr\swap-meet-sprint`. Git author is set to Bal Tak with the GitHub noreply address. No remote yet.

## Done

### Milestone 0: content tool (done)

* Seeded random, item generator, economy, run state machine, three bots and a headless simulator in `src/core`, plain TypeScript with no runtime dependencies.
* Generator check over 10,000 items (blocklist, tier and trait shares within 2 points) and the three bot checks over 2,000 mornings each all pass. Numbers are in `BALANCE.md`.

### Milestone 1: grey box (done)

* A full morning playable in the browser with plain shapes, fixed 10 ms step loop, whole number scaling, pointer, swipe and keyboard input, platform layer with the `web` target, local only events.
* Proof: `e2e/run.spec.ts` plays seed `e2e-1` with the keyboard to the result screen.

### Milestone 2: the real game (done)

* Pixel art drawn in code: 8 item categories built from parts with 8 palette swaps, 12 seller faces (the face and its colour show clueless, fair or greedy), icons, a swap meet at sunrise whose sky brightens through the morning and faster in the last 10 seconds.
* Bal Tak Pixel, a 5 by 7 bitmap font drawn in code (MIT, credited in `CREDITS.md`). Every string on screen uses it.
* Juice: slide in with a thud and a small shake, coins fly from wallet to seller on buy and from stall to wallet on sale, tug of war wobble then a DEAL or NO DEAL stamp, sale pop with a rising number and a register sound, fakes crack with shards and a red FAKE stamp, grails get a gold flash, sparkles and a fanfare, the last 10 seconds tick. Haptic calls go through the platform layer for iPhone.
* Sound: all made with Web Audio at runtime. Mute button always visible, saved. The audio context is resumed inside any tap or key press, and suspended while the page is hidden.
* Screens: title (one tap to Daily Morning or Free Play, keepers, shelf), play, extra time offer, result, Finds shelf.
* First ever visit opens straight into a guided first run: three hand made items with the clock held still and one line of help each. After that the game lands on the title, one tap from play.
* Daily Morning: seed is the UTC date, the first attempt is scored and saved, replays are practice. Day streak, best score, lifetime profit and a Finds shelf of 40 fixed grails are saved.
* Share: a 1080 by 1080 pixel card drawn on a canvas plus a text line. Daily shares always show the scored attempt. Uses the share sheet with the image where the browser allows, else copies the text.
* Money hooks wired and stubbed: extra time (once per run, never in the scored Daily), double start ($100 next Free Play), a break after every third finished run. The plain web target shows no ads. `?debug=1&ads=stub` shows them working.
* Layouts checked at 800 by 450, 1920 by 1080 and 390 by 844, device pixel ratio 1.
* First load is 90 KB of script (34 KB gzipped).
* Proof in `proof/m2`: screenshots of every screen at all three sizes, the share card, and `clip-10s.webm`, a muted 10 second clip of the game playing itself (stills next to it). I looked at every image.
* Tests: 59 unit tests (`npm test`) and 12 browser tests (`npm run e2e`) pass. New unit tests cover the game flow (guided run, Daily scored versus practice, break cadence, one extra time offer, no ads on the web target), keepers, text fitting the smallest card, and the loop advancing the same game time at 30, 60, 144 and 165 Hz.

## Live

Nothing is live yet.

## Waiting on the owner

Nothing yet. Nothing in Milestones 0 to 2 needs him.

## Next

* Milestone 3: web release. Search the App Store, CrazyGames and itch.io for the title first. Read the CrazyGames requirements pages. Add the `crazygames` target (their SDK, gameplay start and stop events, data module saves), a GitHub Pages workflow, zips for CrazyGames and itch.io in `release/`, and a `store/` folder with titles, descriptions, tags, controls text, covers, screenshots and a clip. the owner's steps (accounts, uploads) will come as one numbered list.
* Then Milestone 4 (iPhone shell) and Milestone 5 (money).

## Decisions so far

* Working title stays Swap Meet Sprint until the store searches before anything goes public (Milestone 3).
* Repo will be `swap-meet-sprint`, public, on the existing GitHub account. The Pages link will show that account name.
* Daily seed uses the UTC date.
* Haggles per item are capped at 6; the chance halves each time as the brief says.
* Grails: every grail tier item is one of the 40 fixed grails, so the shelf can fill. A grail counts as found when a real one sells from your stall.
* The guided first run does not count toward best score, profit or finds.
* Presses in the first 0.6 s of the result screen are ignored so mashing keys at 0 s cannot skip it.
* Rewarded extra time reopens the morning for 15 seconds with the cash in hand (the stall already sold at 0 s).

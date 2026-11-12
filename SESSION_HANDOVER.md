# Session handover

Another assistant reads this file to report status. Keep it current after every milestone.

Project: Swap Meet Sprint. A one minute buy, haggle or pass game for web portals and iPhone from one codebase. Credit: Bal Tak. Brief: `C:\Users\Tyjcr\Tools\GameBriefs\SWAP_MEET_SPRINT_PROMPT.md`.

Local folder: `C:\Users\Tyjcr\swap-meet-sprint`. Git author is set to Bal Tak with the GitHub noreply address. No remote yet (waiting on the owner's step 1).

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

### Milestone 3: web release (built, waiting on the owner to go live)

* Title check on 12 Nov 2026: no game called Swap Meet Sprint on the App Store (catalogue search), CrazyGames (site search) or itch.io (several games are called plain "Swap Meet", none "Swap Meet Sprint"). The title stays.
* Read the CrazyGames requirements pages (intro, technical, gameplay, ads, covers, SDK, data) on 12 Nov 2026. What they ask for is listed at the end of `store/crazygames.md`.
* `crazygames` target in `src/platform/crazygames.ts`: their SDK v3 (only that build loads it), loading and gameplay events, saves through the Data Module with a one time copy of an older local save, happy time on a new best, ads wired through their SDK but switched off (`ADS_LIVE = false`) for the trial launch, game sound paused while an ad plays. Tested on localhost, where their SDK runs in local mode.
* Ad offer screens now follow their rules: the skip button looks exactly like the watch button, and watch buttons carry a video icon.
* Audio also resumes on touch end and pointer up, which iOS needs.
* `npm run release` builds `release/swap-meet-sprint-crazygames-0.1.0.zip` and `release/swap-meet-sprint-itch-0.1.0.zip` (34 KB each, index.html at the root). Windows unzips both, and `e2e/release.spec.ts` unpacks each one, serves it from a plain static server and plays it.
* `.github/workflows/pages.yml` type checks, tests, builds and publishes the web target to GitHub Pages on every push to main.
* `store/` holds everything the forms ask for: `crazygames.md` and `itch.md` with every field ready to paste, three CrazyGames covers plus the itch.io cover and a link preview image, screenshots at three sizes, and two silent 18 second preview videos (1920 by 1080 and 1080 by 1620, H.264) that open on the cover. `npm run store` renders them all frame by frame. I looked at every cover and at stills pulled out of the finished videos.
* Tests: 77 unit tests and 15 browser tests pass. New: layout at all 14 portal and phone sizes (scale 2 or more, nothing overlaps, buttons at least 44 points tall, safe areas kept).

### Milestone 4: iPhone (built, waiting on the owner to run it)

* `ios-app/` is an Expo app on SDK 58 (the same major as Pumpwise), React Native 0.88.1, bundle ID `com.tyjcraw.swapmeetsprint`, owner `tjcraw6589s-team`, portrait, iPhone only, status bar hidden, dark splash.
* It shows one full screen web view with the `ios` target built as one self contained 93 KB HTML page (`npm run build:ios` writes `ios-app/game/`). Fully offline: the web view refuses every link and new window, with no browser chrome, no bounce, no text selection and no link previews.
* Bridge (`src/platform/ios.ts` and `ios-app/App.tsx`): saves go to native storage and are handed back before the page loads, so progress survives; haptics on buy, sale, fake, grail, deal and no deal through `expo-haptics`; Share opens the native share sheet with the score text and the 1080 by 1080 card image; the app tells the game when it goes to the background and back; the splash screen stays up until the game says it is ready.
* Checks: `expo-doctor` passes 20 of 20, the app type checks, and `expo export` bundles it for iOS. It has not run on a real iPhone yet (that needs the owner's step 4 below). Unit tests cover the bridge.
* `.github/workflows/ios-build.yml` is the Pumpwise workflow adapted: started by hand, runs tests, builds the game page, then `eas build --local` on GitHub's free Mac runner and uploads to TestFlight. It never submits for review.
* GitHub Pages site gains `privacy.html` (collects nothing, says so) and `support.html` (help, and issues on the project page as the contact; no personal email anywhere). Only the web build carries them.
* `store/ios/`: `app-store.md` with every App Store Connect field ready to paste (name, subtitle, promo text, description, keywords, URLs, categories, age rating answers, privacy label "Data Not Collected", review notes), the 1024 icon, and screenshots at 1206 by 2622 (the size Apple requires now) and 1320 by 2868, all flat RGB with no alpha. Sizes read from Apple's page on 12 Nov 2026.
* App icon and splash image are drawn in code (`drawIcon` in `src/game/cover.ts`) and rendered by `npm run store`.
* Tests: 81 unit tests and 15 browser tests pass.

## Live

Nothing is live yet. GitHub Pages goes live as soon as step 1 below is done. The link will be https://tjcraw6589.github.io/swap-meet-sprint/ (it shows the GitHub account name).

## Waiting on the owner

One list for Milestones 3 and 4. Steps 2, 3 and 4 can be done any time; steps 5 to 9 need step 1 first.

1. Let me use GitHub. Open a terminal and run `gh auth login`. Pick GitHub.com, then HTTPS, then "Login with a web browser". Copy the one time code it shows, press Enter, paste the code into the page that opens and approve. Then tell me "GitHub done". I will create the public repo `swap-meet-sprint`, push, switch on Pages and send you the live link.
2. CrazyGames. Go to https://developer.crazygames.com and sign up for a free developer account. Choose to submit a new game. Fill each field from `store/crazygames.md` and upload the files it lists (the zip, three covers, two videos). Payout details are yours alone; I never need them. Press submit when you are happy, then tell me it is in.
3. itch.io. Sign up for a free account at https://itch.io. Choose "Upload new project". Fill each field from `store/itch.md`, upload `release/swap-meet-sprint-itch-0.1.0.zip` and the cover and screenshots it lists. Set it public when you are happy, then send me the page link.
4. Try the iPhone app in Expo Go. Install Expo Go from the App Store on your iPhone (free). Put the phone on the same WiFi as this PC. In a terminal run `cd C:\Users\Tyjcr\swap-meet-sprint\ios-app` and then `npx expo start`. Point the iPhone camera at the QR code it shows and open it in Expo Go. Play a round: check you feel the taps on buy and sale, that Share opens the share sheet, and that your best score is still there after you close and reopen Expo Go. Tell me what you see.
5. Link the app to Expo. In the same `ios-app` folder run `npx eas-cli@latest init`. Sign in to Expo if it asks (you type the password, not me). Say yes to creating the project `swap-meet-sprint` under `tjcraw6589s-team`. Tell me "Expo done" and I will commit the change it makes.
6. Signing, once. In the same folder run `npx eas-cli@latest credentials --platform ios`. Pick the production profile and let Expo set up the distribution certificate and provisioning profile (reuse the Pumpwise certificate if it offers). Sign in to Apple when it asks. In the same menu choose the App Store Connect API key for EAS Submit and pick the existing key that Pumpwise uses.
7. Create the app record. In App Store Connect choose My Apps, the plus button, New App. Platform iOS, name Swap Meet Sprint, bundle ID `com.tyjcraw.swapmeetsprint` (it appears after step 6), SKU `swapmeetsprint`. Then open App Information and send me the Apple ID number shown there (it is not a secret). I put it in `ios-app/eas.json`.
8. The Expo token. On expo.dev open Account settings, then Access tokens, and create a token called "swap meet sprint github". On GitHub open the `swap-meet-sprint` repo, Settings, Secrets and variables, Actions, New repository secret. Name it `EXPO_TOKEN` and paste the token there. Never paste it into a chat.
9. Build. On GitHub open the repo, Actions, "iPhone build", Run workflow (branch main, TestFlight ticked). It takes 30 to 60 minutes, then the build shows in TestFlight. Later, when you are happy with TestFlight, fill the listing from `store/ios/app-store.md` and press Submit for Review yourself.

## Next

* Milestone 5 (money): AdMob rewarded ads on iPhone with Google's test ad units, the tracking permission prompt and privacy label text. This needs a development build (AdMob does not run in Expo Go), so it comes after the first TestFlight build works. CrazyGames ads switch on (`ADS_LIVE`) only when they invite the game to the full launch.
* Open item for Milestone 5: the CrazyGames ads page asks that a rewarded ad have an alternative way to earn the reward. Extra time and double start have none yet; decide before switching ads on.

## Decisions so far

* Title: Swap Meet Sprint, checked free on the App Store, CrazyGames and itch.io on 12 Nov 2026.
* Repo will be `swap-meet-sprint`, public, on the existing GitHub account. The Pages link will show that account name.
* Daily seed uses the UTC date.
* Haggles per item are capped at 6; the chance halves each time as the brief says.
* Grails: every grail tier item is one of the 40 fixed grails, so the shelf can fill. A grail counts as found when a real one sells from your stall.
* The guided first run does not count toward best score, profit or finds.
* Presses in the first 0.6 s of the result screen are ignored so mashing keys at 0 s cannot skip it.
* Rewarded extra time reopens the morning for 15 seconds with the cash in hand (the stall already sold at 0 s).
* The CrazyGames build keeps the title screen for returning players: their rules allow one click to gameplay, and new players land straight in the guided run.
* Preview videos are encoded with `ffmpeg-static`, a free dev tool from npm. It is never shipped in the game.

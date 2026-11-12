# CrazyGames submission

Copy each block into the field with the same name on the CrazyGames Developer Portal. Upload the files listed under Files.

## Game name

Swap Meet Sprint

## Short description

One minute at the swap meet. Buy low, haggle hard, spot the fakes and sell for a profit.

## Description

Swap Meet Sprint is a one minute trading game. The morning market opens, you have $50, and the sellers are already waiting at your table.

Items arrive one at a time: old handhelds, game cartridges, toy robots, lamps, records, cameras, watches and paintings. Every item shows a guide price, the seller's asking price and the seller's face. Clues appear as you wait: the condition, whether the box is included, sometimes whether it is genuine. The seller will also tell you things. Some sellers tell the truth.

Buy it, haggle for a better price, or pass. Everything you buy goes on your stall and sells a few seconds later for what it is really worth. A mint item in its box can sell for far more than the guide. A fake is worth almost nothing.

How to play:
Read the guide price and the ask. A clueless seller often asks too little, a greedy one asks too much.
Wait a moment for clues if you are unsure, but the clock is always running.
Haggle to cut the price by a quarter. Push your luck twice and the seller may walk away.
Your stall holds four items at a time.
Finish the minute with as much cash as you can.

Features:
Daily Morning: the same items for every player each day, so scores are fair to compare. Your first try of the day is the one that counts.
Free Play: a new morning every time.
A Finds shelf of 40 rare treasures to collect.
Day streaks, best score and lifetime profit.
Thousands of different invented items, drawn as pixel art.
Plays well with a mouse, a keyboard or a touch screen, in landscape or portrait.

## Controls

Mouse or touch: tap BUY, HAGGLE or PASS. You can also swipe right to buy, up to haggle and left to pass.
Keyboard: Right arrow or D to buy, Up arrow, W or Space to haggle, Left arrow or A to pass. M mutes the sound. Enter plays again.

## Category and tags

Category: Casual
Tags: Trading, Simulation, Pixel Art, Mouse, Touch, Time Management, Money, Daily Challenge, One Minute

## Settings to choose in the form

Orientation: both landscape and portrait.
Mobile and tablet: yes.
Progress Save: yes, using the Data Module from the CrazyGames SDK.
In game purchases: no.
Multiplayer: no.
Age suitability: suitable for everyone. No violence, no gambling, no chat, no personal data.
App store links: none yet. When the iPhone app is live, put its link in the metadata field here, never inside the game.

## Files

Game zip: `release/swap-meet-sprint-crazygames-0.1.0.zip` (index.html at the root, relative paths only, about 34 KB).
Landscape cover, 1920 by 1080: `store/covers/crazygames-landscape-1920x1080.png`
Portrait cover, 800 by 1200: `store/covers/crazygames-portrait-800x1200.png`
Square cover, 800 by 800: `store/covers/crazygames-square-800x800.png`
Landscape preview video, 1920 by 1080, 18 seconds, silent: `store/video/preview-landscape-1920x1080.mp4`
Portrait preview video, 1080 by 1620, 18 seconds, silent: `store/video/preview-portrait-1080x1620.mp4`

Both videos open on the static cover, as the CrazyGames guide asks.

## Rules this build already follows

Checked against the CrazyGames requirements pages on 12 Nov 2026.

* Their SDK is loaded and sends loading start and stop, and gameplay start and stop.
* Saves go through their Data Module, with a one time copy of any earlier local save.
* No ads of our own. Their ads are switched off in this build until the game is invited to the full launch.
* New players land straight in gameplay (a guided first morning). Returning players are one tap from play.
* English text, readable at every iframe size on their list at device pixel ratio 1.
* No login, no outside links, no App Store link, no custom fullscreen button.
* `user-select: none` on the page body, and no touch detection to choose controls.
* The same game speed at 60, 144 and 165 Hz.
* Sound resumes inside a tap after the page comes back from the background.

# Credits

Swap Meet Sprint is made by Bal Tak.

* Every item, maker, band, artist and title in the game is invented. Any likeness to a real product is accidental. A blocklist test checks every generated name against real brand and product names.
* Art: all pixel art (items, seller faces, icons, the swap meet scene, the share card) is drawn in code at runtime by `src/game/art.ts`, `src/game/scene.ts` and `src/game/share.ts`. No image files are shipped.
* Font: Bal Tak Pixel, a 5 by 7 bitmap font drawn in code in `src/game/font.ts`, made for this game and released under the MIT licence with the rest of this repository. It is bundled inside the game code; there is no separate font file.
* Sound: every sound is made with the Web Audio API at runtime by `src/game/audio.ts`. No audio files are shipped.
* No CC0 or third party assets are used so far. If any are added, their source and licence go here.
* Tools: TypeScript, Vite, Vitest and Playwright (all free and open source). Nothing in the shipped game depends on them at runtime.

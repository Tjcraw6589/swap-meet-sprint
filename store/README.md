# Store folder

Everything a submission form asks for. Rebuild the images and videos with `npm run store` after the game changes.

* `crazygames.md` every CrazyGames form field, ready to paste, and the files to upload.
* `itch.md` every itch.io form field, ready to paste, and the files to upload.
* `covers` cover images: CrazyGames landscape 1920 by 1080, portrait 800 by 1200 and square 800 by 800, the itch.io cover 630 by 500, and a 1200 by 630 image for link previews. Title only, no borders, no logos, as the CrazyGames guide asks.
* `screenshots` play, title and result screens at 1920 by 1080, 1280 by 720 and a 1080 by 1920 phone screen.
* `video` silent preview videos, 18 seconds, H.264: landscape 1920 by 1080 and portrait 1080 by 1620. Each opens on its cover. The stills next to them are frames pulled back out of the finished files.

The game zips are in `release` (build them with `npm run release`).

All of it is drawn in code from the game itself. No outside art is used.

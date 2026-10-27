# Peppy 🦊💪

Home workouts with a buddy who cheers you on. Peppy is a web app (PWA) for iPhone: you add it to your home screen from Safari, and it opens full screen with its own icon like any other app. It is free to use, works offline and needs no account and no API key.

## What it does

- **Five buddies to choose from:** Kit the fox, Bao the panda, Bolt the robot, Mo the monster and Pip the alien. Your buddy shows every exercise as you do it, sweats with you, and cheers you on.
- **8 workouts, 15 bodyweight moves:** Wake-Up Boost, Full Body Basics, Cardio Blast, Strong Legs, Core Power, Upper Body, 7-Minute Mix and Desk Break. No equipment needed.
- **Your pace:** Easy, Normal or Hard (20, 30 or 45 seconds per move) and 1 to 4 rounds.
- **Workout player:** a big timer, beeps for the last three seconds, a voice coach that calls out each move, pause, skip and back. The screen stays on while you train.
- **Levels and gear:** every workout earns XP. New levels unlock a sweatband, wristbands, sneakers, a gold medal, sunglasses, a hero cape and a crown for your buddy.
- **Progress:** streaks, a weekly goal, active minutes per day, a 12-week calendar and your recent workouts.
- **Backup:** save all your data to a file and restore it, for example on a new phone.

Listen to your body and stop if something hurts. Peppy is for fun and motivation, not medical advice.

## Get it on your iPhone

### 1. Put the app online

The app is just static files, so it can be hosted for free on GitHub Pages:

1. On GitHub, open the repository → **Settings** → **Pages**.
2. Under *Build and deployment*, choose **Deploy from a branch**, pick the branch (for example `main`) and the **/ (root)** folder, and press **Save**.
3. After a minute the app is live at `https://<your-username>.github.io/<repo-name>/`.

GitHub Pages needs a public repository unless you have GitHub Pro. The code contains no secrets. To keep the repository private, you can host it on Netlify or Cloudflare Pages instead; both can deploy a private repository for free.

### 2. Install it

1. Open the address in **Safari**.
2. Tap the **Share** button (the square with the arrow).
3. Choose **Add to Home Screen** and tap **Add**.

Then open Peppy from your home screen.

## Privacy

Your workouts, XP and settings are stored only on your phone, in the app's own storage. Nothing is sent anywhere. If you delete the app from your home screen, its data goes too, so save a backup first (Settings → Save backup).

## Development

There is no build step: `index.html` loads `js/main.js` directly as ES modules.

```
index.html          the screens
css/app.css         layout and design (light and dark mode)
css/figures.css     the buddies' moods and exercise animations
js/main.js          onboarding, Today, workout details, Progress, Buddy and Settings
js/player.js        the full-screen workout player
js/figures.js       the five buddies, drawn as SVG on one shared rig, plus their gear
js/exercises.js     exercises, workouts and difficulty levels
js/progress.js      XP, levels, streaks and weekly numbers
js/sound.js         beeps (Web Audio) and the voice coach
js/coach.js         everything the voice coach says
audio/              the coach's recorded lines (one MP3 per line)
js/state.js         local storage
sw.js               service worker (offline use and fast start)
```

Run it locally:

```sh
npm run serve        # then open http://localhost:8080
```

Rebuild the PNG icons from `icons/icon.svg` (needs `npm install`):

```sh
npm run icons
```

The coach's voice is generated with the open [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) voice model (Apache-2.0). After changing a line in `js/coach.js` or adding an exercise, rebuild the clips with `tools/make-voice.py` (setup steps are at the top of the file). If a clip can't be loaded, the app falls back to the phone's own speech voice.

All buddies share one rig (the same shoulder, hip and neck positions), so a new exercise only needs one set of keyframes in `css/figures.css` and an entry in `js/exercises.js`.

When you publish a new version, bump `CACHE` in `sw.js` (for example `peppy-v3`) so phones clear out old files. The app fetches new files in the background and uses them the next time it opens.

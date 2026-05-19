# Setup / Run / Deploy

## Run locally

Static ES-module site, no build step. Serve the **portal root** over
http (ES modules + importmap need http, not `file://`):

```
# from the repo root (game-portal/)
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000/games/jujutsu-cursed-roads/`
(or go via the portal landing page).

## Dependencies

- Three.js v0.162.0 — loaded from jsDelivr CDN via the importmap in
  `index.html`. No npm install, no bundler.

## Deploy

Same as the rest of the portal: push to GitHub → Vercel auto-deploys
the static site. The game is reachable from the portal card added to
the root `index.html`.

## Save data

Lives in the browser's `localStorage` (`jcr_save_<name>`, `jcr_slots`).
Clearing site data wipes progress. Cross-device saves require the
future backend adapter (see `docs/save.md`).

## Syntax check

```
node --check src/main.js
node --check src/save/saveAdapter.js
node --check src/save/localStorageAdapter.js
```

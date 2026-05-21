# Notes for AI Agents

Read `CLAUDE.md` then `docs/design.md` first.

## Conventions
- Vanilla JS ES modules, Three.js via CDN importmap. **No build step**;
  validate with `node --check` on every changed JS file.
- Game is self-contained in this folder (portal convention). To reuse
  combat/VFX from `dungeon-crawler-3d` / `anime-battle-royale`, **copy
  and adapt** into `src/` — don't cross-import between game folders.
- After code changes: update `docs/devlog.md`, keep `docs/todo.md`
  honest, then commit + push (portal workflow).

## Architecture boundaries (don't break)
- Gameplay never calls `localStorage` — only the `SaveAdapter`.
- World code doesn't know about quests; the quest manager places
  objectives/markers.
- `deriveStats()` is the single source of truth for player stats from
  `save.level` + `save.flags`.

## Current shape
- One monolithic `src/main.js` (MVP pragmatism, like dungeon-crawler-3d)
  + `src/save/{saveAdapter,localStorageAdapter}.js`. Split into the
  `src/world|combat|quests|progression` modules from
  `docs/architecture.md` only when it grows.
- Combat is **melee + dash only** (no cursed techniques — stripped
  2026-05-21). If a future task re-adds techniques, do it as a fresh
  dispatcher; the old `TECHNIQUES` map / `screenFlash` / `explode` /
  `shockRing` / `flashLight` / `vortexFx` / `ringFx` / `camShake` /
  `nova` / `coneHit` / `spawnTechProj` / `updateProjectiles` /
  `updateAllies` helpers are all gone. `burst`, `sfx`, `toast` are the
  feedback primitives that remain.
- Old saves may still contain a `technique` field — ignore it.

## Good next tasks
See `docs/todo.md` → NEXT / CONTENT / SYSTEMS. Highest value:
sound, more grade exams, veiled zones.

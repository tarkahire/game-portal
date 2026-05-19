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
- The 3 techniques (`TECHNIQUES` table, keys `strike`/`dismantle`/
  `flame` kept stable for saves) are **re-creations** of Megumi/Sukuna/
  Todo kits in this engine — do not try to literal-port
  dungeon-crawler-3d combat code (different engine/scale).
- Shared FX helpers exist (`explode`, `shockRing`, `flashLight`,
  `vortexFx`, `burst`, `ringFx`, `camShake`, `screenFlash`) + WebAudio
  `sfx` — reuse these rather than hand-rolling new ones.
- `allies[]` = Megumi's shadow hounds; clear them alongside `curses`
  on death/sign-out.

## Good next tasks
See `docs/todo.md` → NEXT / CONTENT / SYSTEMS. Highest value:
sound, more grade exams, technique select, veiled zones.

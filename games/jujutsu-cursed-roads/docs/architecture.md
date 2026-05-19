# Architecture (Planned)

> Design phase. This is the intended structure once the build starts —
> nothing here exists yet.

## Approach

Fork `games/anime-battle-royale/` (already 3rd-person Three.js with the
character roster, ability dispatcher, camera, and curse-styled enemies).
Strip the storm / battle-royale loop. Add: heightmap world, exterior
towns, a progression layer, a quest manager, a curse-spawn director, and a
localStorage save layer.

## Planned File Structure

| Path | Purpose |
|------|---------|
| `index.html` | Three.js importmap, sign-in screen, HUD, screens |
| `style.css` | UI (reuse the portal neon/horror styling baseline) |
| `src/main.js` | Game loop, scene, input, state machine, screen flow |
| `src/world/terrain.js` | Heightmap ground (hills), walkability, ground sampling |
| `src/world/props.js` | Trees/rocks/shrines/fences instancing |
| `src/world/town.js` | Town builder — non-enterable house props, board, smith, contact NPC, safe-zone radius |
| `src/world/veils.js` | Veiled-zone domes + zone gating by grade |
| `src/player/player.js` | Player state, stats derived from level/grade |
| `src/player/camera.js` | 3rd-person camera (reuse `anime-battle-royale/src/camera.js`) |
| `src/combat/techniques.js` | Cursed-technique loadouts (adapted from `dungeon-crawler-3d` `definitions.js` + ability code) |
| `src/combat/swords.js` | Cursed-tool weapon defs + viewmodels |
| `src/combat/vfx.js` | Ported VFX helpers (rings/particles/beams/hitstop) |
| `src/enemies/curses.js` | Curse spawn director; reuses `meshFactory.js` builders, tiered by grade |
| `src/progression/xp.js` | XP curve, level-up, grade rules, skill tree |
| `src/quests/questManager.js` | Quest defs, state, board UI, markers, rewards |
| `src/save/saveAdapter.js` | **Storage interface** (see `docs/save.md`) |
| `src/save/localStorageAdapter.js` | MVP implementation of the interface |
| `src/ui/hud.js` | HP / CE / XP / grade / mission / minimap |
| `docs/` | This documentation framework |

## Key Boundaries

- **Combat ⟂ Save**: gameplay never calls `localStorage` directly — only
  `saveAdapter`. Swapping to a backend later touches one file.
- **World ⟂ Quests**: the quest manager places markers/objectives; the
  world module knows nothing about quests.
- **Reuse via copy, then adapt**: copy proven modules from
  `dungeon-crawler-3d` / `anime-battle-royale` into `src/` and trim, rather
  than importing across game folders (each game stays self-contained, per
  portal convention).

## Coordinate / Scale Conventions

- Adopt the existing portal convention: world units, a `TILE`-style scale
  constant, player position in world space, terrain height sampled per
  frame for grounding. Finalise in `src/world/terrain.js` when built.

## Open Architectural Decisions

- Terrain: authored heightmap image vs. procedural noise (MVP leans
  authored single map for control).
- Curse spawning: fixed spawn nodes vs. director that spawns around the
  player out of sight. (Director preferred — keeps the world feeling alive
  without populating the whole map.)

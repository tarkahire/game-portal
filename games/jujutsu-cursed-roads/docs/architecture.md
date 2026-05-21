# Architecture

> **Status: BUILT (MVP + Updates 1–3).** The game is a self-contained
> Three.js (CDN importmap, no build) static site, written from scratch
> (the "fork anime-battle-royale" plan in the original draft was not
> taken — a clean lean build was faster). The planned multi-module
> `src/` split below is the **future refactor target**, not the current
> layout.

## Actual File Structure (current)

| Path | Purpose |
|------|---------|
| `index.html` | Three.js importmap, sign-in screen, HUD, overlay panels |
| `style.css` | Cyberpunk-ish UI: sign-in, HUD, overlay cards, minimap |
| `src/main.js` | **Everything** — monolithic (MVP pragmatism, like `dungeon-crawler-3d`'s `main.js`): scene/loop/input, terrain, town + NPCs, player, curses + spawn director, melee M1 + dash combat, `burst` VFX, WebAudio `sfx`, quests, progression, HUD/minimap, sign-in flow |
| `src/save/saveAdapter.js` | Storage interface + `newSave()` |
| `src/save/localStorageAdapter.js` | MVP localStorage implementation |
| `docs/` | This documentation framework |

## Key Boundaries (in force)

- **Gameplay ⟂ Save**: gameplay never calls `localStorage` directly —
  only the `SaveAdapter`. Swapping to a real backend = one new adapter
  file + one `new LocalStorageAdapter()` line. (Holds today.)
- **`deriveStats()`** is the single source of truth for player stats
  from `save.level` + `save.flags`.
- **Combat is melee + dash only.** Cursed techniques and the CE bar
  were stripped 2026-05-21 (see `docs/devlog.md`). If they come back,
  introduce a fresh dispatcher — do not resurrect the old `TECHNIQUES`
  scaffold piecemeal.
- Self-contained: no cross-imports from other game folders (portal
  convention).

## Planned Module Split (future refactor — NOT current)

When `main.js` grows too large, split into:
`src/world/{terrain,props,town,veils}.js`,
`src/player/{player,camera}.js`,
`src/combat/{melee,vfx}.js`,
`src/enemies/curses.js`, `src/progression/xp.js`,
`src/quests/questManager.js`, `src/ui/hud.js`.
Boundaries above already make this mechanical.

## Coordinate / Scale

World units; player position in world space (`player.x/z`); ground is
an analytic `terrainHeight(x,z)` sampled per frame for grounding
(player, curses, NPCs, props, FX).

## Resolved Decisions

- Terrain: **analytic procedural** heightfield (not an authored image),
  flattened toward the town.
- Curse spawning: **director** spawns around the player out of the town
  safe radius, capped + grade-scaled, despawns far ones.
- Build base: **clean from-scratch**, not a fork (faster than stripping
  anime-battle-royale). Combat/VFX *ideas* were reused, not the code.

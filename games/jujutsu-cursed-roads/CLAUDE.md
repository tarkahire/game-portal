# Jujutsu — Cursed Roads

A JJK-inspired **open-world action RPG** for the game portal. Roam a hilly
countryside dotted with little towns, exorcise cursed spirits with M1 melee
strikes + dash, clear missions for Jujutsu High, and climb the sorcerer
**grade system**.

> **STATUS: PLAYABLE.** MVP shipped 2026-05-19. **2026-05-21:** all cursed
> techniques (Megumi / Sukuna / Todo) and the CE bar were stripped — combat
> is now melee + dash only. Code lives in `index.html` + `style.css` +
> `src/main.js` + `src/save/`. History in `docs/devlog.md`; roadmap in
> `docs/todo.md`.

## Quick Reference

- **Genre**: 3rd-person open-world action RPG (JJK fan game)
- **Tech Stack (planned)**: Three.js v0.162.0 (CDN importmap, no build step),
  vanilla JS ES modules — same stack as `dungeon-crawler-3d` /
  `anime-battle-royale`
- **Base**: fork/strip `games/anime-battle-royale/` (already 3rd-person
  Three.js with the character roster + ability dispatcher + curse-styled
  enemies + camera)
- **Save/sign-in (MVP)**: name-based sign-in + `localStorage` autosave.
  Save layer is written behind an adapter so a real backend (Supabase /
  Vercel KV, using the existing Resend account for magic-link email) can
  drop in later **without touching gameplay code**.
- **Hosting**: Vercel static, same as the rest of the portal. No backend
  for the MVP.

## Design Pillars

1. **Exploration over menus** — you find curses and missions by roaming the
   hills, not clicking through UI.
2. **The grade climb** — Grade 4 → Special Grade is the spine of the whole
   game; every system feeds it.
3. **Reuse, don't reinvent** — the cursed-technique kits, VFX, domains, and
   curse meshes already exist in `dungeon-crawler-3d`; this game is a new
   *shell* (world, progression, quests, save) around proven combat tech.
4. **Scope honesty** — houses you can't enter, exterior-only towns, one
   hill map for the MVP. Ship small, expand later.

## Docs

| File | Purpose |
|------|---------|
| `docs/design.md` | The full game design / vision document — **start here** |
| `docs/architecture.md` | Planned file/module structure + reuse plan |
| `docs/world.md` | World, terrain, towns, veiled zones, props |
| `docs/progression.md` | Grades, levels, XP, cursed-technique/sword unlock tree |
| `docs/quests.md` | Quest types + quest-manager design |
| `docs/save.md` | localStorage save schema + future backend adapter |
| `docs/todo.md` | Build roadmap + MVP checklist |
| `docs/setup.md` | How to run / deploy (when code exists) |
| `docs/testing.md` | Test plan |
| `docs/bugs.md` | Known issues log |
| `docs/agents.md` | Notes for AI agents working on this project |
| `docs/devlog.md` | Reverse-chronological change log |

## Reuse Map (from existing portal code)

| Need | Reuse from |
|------|-----------|
| 3rd-person Three.js shell, camera, input | `anime-battle-royale/src/` |
| Cursed-technique kits (Z/X/C/V/F + Domain) | `dungeon-crawler-3d/src/classes/definitions.js` + `fruitAbility()` dispatcher in `main.js` |
| Curse/cursed-spirit enemy meshes | `dungeon-crawler-3d/src/enemies/meshFactory.js` |
| Sword/spear/cane viewmodels + swing system | `dungeon-crawler-3d/src/main.js` `buildFPS*()` |
| VFX (beams, rings, particles, hitstop, domains) | `dungeon-crawler-3d/src/main.js` VFX section |

## Portal

Already wired in: a card on the root `index.html` links here; Vercel
auto-deploys on push (static, no build). The portal uses an emoji
placeholder thumbnail (no image file needed).

## World (Kaizen-shaped map, Update 2)

Flat 240×240 m plaza, divided north/south:

- **North half** (z < -10): **Jujutsu High** — 30×14×18 m school
  block with window strips, perimeter walls, gate with stone pillars
  and a torii-style arch beam, two training dummy posts in the
  courtyard. Lighter courtyard tile distinguishes it from the road.
- **Centre** (|z| < 10): **Plaza** safe zone, `TOWN.r = 22 m`. Neon
  purple ring border, brighter pavement. Mission Board / Cursed Tool
  Smith / Jujutsu High Contact NPCs live here. Slow HP regen while
  inside; curses never spawn here.
- **South half** (z > 10): **Tokyo streets** — 7 boxy skyscrapers
  (20-36 m tall) of two concrete shades with sparse emissive purple
  window grids and randomised neon billboards (pink / blue / green /
  yellow / orange) plus a point light per neon. Three asphalt road
  strips with yellow lane dashes down the central N-S artery, and
  six streetlamps at intersections. Curses only spawn in this half
  (`CURSE_ZONE.minZ = 12`).

All buildings/walls/pillars/dummies are AABB obstacles in a single
`obstacles[]` list (`{minX, maxX, minZ, maxZ}`); the player can't
walk through them. Collision is resolved per-axis (`pushOutObstacles`)
so you slide along walls rather than sticking.

## Combat (current — Kaizen-style action shell, Updates 1–2 of 5)

Modelled on Roblox **Kaizen**'s combat rhythm:

- **LMB** — 3-hit punch chain (jab L → cross R → heavy R). 270 ms
  between hits, chain resets if you pause >700 ms. After the heavy
  there's a **1.5 s combo lockout** (Kaizen's "downtime") before any
  M1 fires again — forced breathing room.
- **Space** — jump. `vy = 10`, `GRAVITY = 25`, peak ≈ 2 m, airtime
  ≈ 0.8 s. Ground-only (no double-jump), blocked while blocking.
  Air control is 0.45× ground movement.
- **Q** — dash. 1.5 s cooldown, 20 stamina, 0.45 s i-frames. Works
  in the air. AABB-aware (won't phase through buildings).
- **F** — hold to block. 30 stamina/s drain. Reduces incoming damage
  by 70%. Can't move, M1, dash, jump, or grab while blocking.
- **G** — grab/lunge. 25 stamina, 3 s cooldown. 3 m reach, 1.4×
  base damage + strong knockback. Plays `assets/punch.m4a`.
- **Shift** — sprint (1.7× speed).
- **Stamina** bar (yellow, below HP): regens 18/s when not blocking.
  Caps at `90 + level*8`.
- **HUD cooldown pips** for Q / G / M1-lockout next to the stat bars.

Future updates (planned):
3. Cursed energy bar + cursed-technique hotkeys (Z/X/C/V) with
   per-ability cooldowns. Roster: leaning Gojo / Sukuna / Megumi / Yuji.
4. Awakening / Domain Expansion burst mode on R (drains CE, halves
   cooldowns, +damage).
5. Stat-point allocation on level-up (3 pts/level into Melee /
   Stamina / Defense / Cursed Energy / Weapon).
6. Fighting-style swap (Karate / Boxing / etc) chosen at sign-in,
   modifying the M1 moveset.

# Jujutsu — Cursed Roads

A JJK-inspired **open-world action RPG** for the game portal. Roam a hilly
countryside dotted with little towns, exorcise cursed spirits, clear missions
for Jujutsu High, climb the sorcerer **grade system**, and unlock cursed
techniques and cursed tools (swords).

> **STATUS: PLAYABLE.** MVP shipped 2026-05-19, plus Updates 1–3 (selectable
> techniques, sound, full grade chain, town NPCs, juicy VFX, and the three
> techniques re-themed to dungeon-crawler-3d character kits — Megumi / Sukuna
> / Todo). Code lives in `index.html` + `style.css` + `src/main.js` +
> `src/save/`. History in `docs/devlog.md`; roadmap in `docs/todo.md`.

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

## Cursed Techniques (current)

Three, chosen at sign-in, stored in `save.technique` (keys kept stable —
`strike`/`dismantle`/`flame` — so old saves still resolve). Re-themed to
dungeon-crawler-3d character kits:

| Key | Character | Z | X |
|-----|-----------|---|---|
| `strike` | Megumi — Ten Shadows | Divine Dogs (hound summons) | Nue (lightning strike) |
| `dismantle` | Sukuna | Dismantle (slash volley) | Cleave (front arc) |
| `flame` | Todo | Black Flash (blink-detonation) | Boulder Kick |

These are *re-creations* in this game's simpler engine — **not** a literal
port of dungeon-crawler-3d's combat code (different engine/scale).

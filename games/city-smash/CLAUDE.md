# City Smash

Anime-style 3D city brawler for the game portal. Punch crowds of NPCs across a giant neon city, chain combos, and survive escalating **Titan** bosses that spawn each wave.

## Quick Reference
- **Path**: `games/city-smash/`
- **Tech**: Three.js v0.162.0 (CDN importmap), vanilla JS ES modules — **no build step**
- **Entry**: `index.html` → `src/main.js` (single-file game)
- **Style**: `style.css` (per-game; cyberpunk-neon menu/HUD matching the portal's 3D games)

## Concept
Third-person brawler in a bounded ~180m neon city of procedural towers. The fun is **knockback**: every NPC you hit ragdolls through the air with simple hand-rolled physics (impulse + gravity + spin + ground bounce/skid). A 4-hit combo's final punch is a **LAUNCHER** that hits a wider cone and sends whole crowds flying. Endless waves; each wave spawns one giant **Titan** boss that stalks and ground-slams you. Beat the Titan → next, bigger wave.

## Controls
- **WASD / Arrows** — move (camera-relative)
- **Mouse** — look (pointer-locked; click canvas to lock)
- **Left Click** — punch; tap repeatedly to combo (hits 1–3 normal, hit 4 = launcher, then loops)
- **Space** — dash (short burst + 0.3s i-frames, 0.55s cd)
- **Shift** — sprint
- **F** — ground slam (radial launch + boss damage, 4.5s cd)

## Core systems (`src/main.js`)
- **City build** — procedural tower grid + neon street lines + boundary walls; `obstacles[]` are collision discs used by `resolveBuildings()`.
- **buildHumanoid()** — stylized blocky figure (torso/hips/head/hair/eyes, shoulder-pivoted arms for punch swing, hip-pivoted legs for walk cycle). Reused for player, pedestrians, and (scaled, evil-tinted) Titans.
- **Combat** — `tryPunch()` advances `comboStep` (1→4 loop), front-cone hit test, calls `hitEnemy()`. Pedestrians get `state='launched'` with an impulse; Titans flinch + take HP damage until `killBoss()`.
- **Enemy AI** — pedestrians wander and shuffle toward the player (so they walk into your fists); Titans chase + telegraph (arms up) then `bossSlam()` with an AoE that damages/knocks back the player.
- **Launch physics** — `state` machine: `walk → launched → down → (removed)`. Launched bodies integrate gravity, spin, bounce/skid on hard landings, then lie down and fade out.
- **Director** — `startWave(n)` sets pedestrian target count + schedules the Titan; `updateDirector()` keeps streets populated and drives the boss HP bar.
- **Juice** — `camPunch`/cam shake, `hitStop` (global dt scaling), `screenFlash`, impact rings, shockwaves, spark bursts, floating combo counter, banner announcements.

## Status
Playable MVP (2026-06-21). One player character (red brawler), endless escalating waves, 8 named Titan bosses (cosmetic name cycle, scaling HP/size/speed). See `docs/todo.md` for next steps and `docs/devlog.md` for history.

## Notes / conventions
- Matches portal conventions: self-contained folder, `<a href="../../index.html" class="back-link">` back button, registered as one card in the root `index.html`, emoji thumbnail (&#128165;).
- No physics engine — knockback is intentionally hand-rolled for an arcade "send them to orbit" feel, not realism.

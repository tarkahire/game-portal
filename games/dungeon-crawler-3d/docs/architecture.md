# Architecture

## Overview
Dungeon Crawler 3D is a first-person 3D dungeon crawler built with Three.js (CDN, no build step), vanilla JavaScript ES modules, and PeerJS for online multiplayer. Procedural dungeon generation, anime character roster, fleshy organic enemies, full split-screen local co-op, and host-authoritative online co-op for up to 4 players.

## File Structure

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~140 | Entry point, Three.js importmap, HUD, all UI screens (title, online, lobby, class select, game over, pause) |
| `style.css` | ~120 | Cyberpunk neon themed UI, HUD layout, ability cooldown bar, minimap |
| `src/main.js` | ~10,400 | Game loop, character builders, M1 combo, fruitAbility() dispatcher, oversouls, divine-dog wolves, VFX, online sync, debug overlay |
| `src/constants.js` | ~30 | Tile size, map dimensions (120×120), eye height, color palette |
| `src/classes/definitions.js` | ~80 | 11 character definitions (stats, ability metadata, cooldowns) |
| `src/dungeon/generator.js` | ~95 | Procedural room+corridor dungeon generation |
| `src/dungeon/meshBuilder.js` | ~310 | Floor/wall/neon-edge/panel meshes, geometry merging |
| `src/dungeon/torchLights.js` | ~70 | Torch point lights with flicker + room-based visibility |
| `src/enemies/meshFactory.js` | ~600 | Fleshy organic enemy meshes (Gaunt Stalker, Spire Wretch, Fleshmound, Maw Wing, Brute, Lich Crawler) with horror animations |
| `src/player/fpsCamera.js` | ~210 | FPS controls, mouse look, 1st/3rd person toggle, axis-separated wall collision, shared key state for split-screen |
| `src/network/network.js` | ~250 | PeerJS room management, lobby, host-authoritative state broadcast, retry logic on join |

## Code Organization (`main.js`)

| Lines | Section |
|------|---------|
| 1–46 | Imports, globals, online state |
| 49–63 | Enemy/boss tables |
| 70–253 | `init()` — renderer, cameras, key bindings, UI wiring, debug overlay |
| 254–320 | Class select grid, `startRun`, `selectClass` |
| 321–2168 | Per-character model builders + animation updaters (Gojo, Sukuna, Toji, Brook, Bakugo, Denji) |
| 2170–2693 | FPS viewmodel weapons (chainsaws/fists/sword/spear/cane), swing/combo system |
| 2695–2911 | `buildPlayerModelForClass`, `cleanupRemotePlayers`, `startGame`, `loadFloor`, `spawnEnemies`, `nextFloor`, `gameOver`, `resumeGame` |
| 2992–3505 | VFX — screen shake, hitstop, damage numbers, speed lines, FOV punch, slash trails, spark/particle pools, fire/beam/groundRing/lightFlash/screenFlash |
| 3507–3982 | `playerAttack`, `p2Attack`, `p2Ability`, `p2Dodge` |
| 3993–7211 | `fruitAbility(slot)` — Z/X/C/V/F dispatcher for all characters |
| 7214–8732 | Yoh/Horohoro/Megumi models, oversoul implementations |
| 8734–9304 | `updateFruitEffects`, divine-dog wolf spawn (lofted-body + fur tufts), wolf AI (heel + flank + wall collision + tail wag), other minion logic |
| 9306–9536 | `playerDodge`, `dealDamageToEnemy`, `sukunaBisect`, `dealDamageToPlayer` |
| 9538–9620 | `netUpdatePlayers` (online sync, interpolation), `updateDebugOverlay` |
| 9622–10142 | Main `update()` loop |
| 10144–10250 | `updateHUD`, `drawMinimap` (with online remote-player dots) |
| 10260–10310 | `gameLoop` (FPS counter + render — split-screen if local coop, single full-screen otherwise) |

## Frame Loop
1. **`gameLoop`** runs at the browser's requestAnimationFrame rate.
2. Tracks rolling FPS for the debug overlay.
3. Calls **`update()`** to advance simulation.
4. Renders either split-screen (local co-op only) or single full-screen view.

## update() responsibilities
- Advance `fpsCamera` and `fpsCamera2`
- `netUpdatePlayers(now, dt)` if online — receive remote positions, send mine, lerp remote meshes
- Update screen shake, FOV punch, walk-cycle animation
- Update torch flicker, particles, melee slashes, damage numbers
- Update minions (wolves, shadows, etc.)
- Update fruit-ability effects (Hollow Purple cutscene, oversouls, etc.)
- Update enemies (AI + wall-collision movement, attacks). Animations + billboarding **skipped for enemies >12 tiles from camera** (perf).
- Update projectiles
- Update HUD + debug overlay

## Coordinate System
- World space uses Three.js right-handed Y-up coordinates.
- One **tile** = `TILE = 4` world units. Map is 120×120 tiles.
- Player position is stored as **tile coordinates** in `fpsCamera.posX/posZ`. World position = `posX * TILE`.
- Enemies, minions, remote players all use the same tile-coord convention internally and multiply by TILE when setting `mesh.position`.

## Rendering
- `WebGLRenderer` with antialias, ACES filmic tone mapping (exposure 1.9), `setPixelRatio(min(devicePR, 2))`.
- Scene has ambient + hemisphere lights (boosted) + per-player point lights.
- Each torch is a `PointLight` with a small visible orb mesh; flickers via `updateTorchLights`.
- Open sky (no ceiling) — `meshBuilder` skips ceiling geometry.
- Geometry merged where possible (floors, walls, neon edges) to minimize draw calls.

# Architecture

## Overview
Dungeon Crawler is a top-down roguelike dungeon crawler built with HTML5 Canvas, vanilla JavaScript, and PeerJS for online multiplayer. No build step or framework required.

## File Structure

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~320 | Game page, all UI screens (title, class select, lobby, shop, stats, game over, inventory, pause) |
| `game.js` | ~5337 | All game logic: 95 classes, enemies, bosses, combat, rendering, dungeon gen, loot, UI |
| `network.js` | ~482 | PeerJS WebRTC multiplayer: room management, state sync, input relay |
| `style.css` | ~244 | Cyberpunk neon themed styling for all menus, overlays, class cards, lobby |
| `docs/` | — | Documentation (this folder) |

## Code Organization (game.js)

The game is a single monolithic file organized into sections:

1. **Constants & Config** — Tile size, map dimensions, color palette
2. **Game State** — Global variables (players, enemies, projectiles, particles, etc.)
3. **Meta Progression** — localStorage save/load for persistent gold, unlocks, stats
4. **Class Definitions** — `CLASSES` object with 95 character classes
5. **Enemy Definitions** — `ENEMY_TYPES` object with 6 enemy types
6. **Boss Definitions** — `BOSSES` array with 5 boss types (cycling on infinite floors)
7. **Loot Tables** — Weapons, armor, potions with rarity system
8. **Shop Items** — Persistent unlocks purchasable with banked gold
9. **Input Handling** — Keyboard + mouse input with network abstraction (`pKey`, `pMouse`)
10. **Dungeon Generation** — Procedural room-based dungeon with corridors
11. **Entity Creation** — Player, enemy, boss factory functions
12. **Game Flow** — startRun, selectClass, startGame, nextFloor, gameOver
13. **Inventory System** — Per-player inventory with equipment slots
14. **Combat System** — Player attacks, specials, secondaries, dodge, enemy AI
15. **Update Loop** — Main game tick (clients skip simulation, only render)
16. **Rendering** — Split-screen viewports, world drawing, HUD, minimap
17. **Character Drawing** — 95 class draw functions (unique + `makeDrawFn` generated)
18. **Enemy Drawing** — `drawEnemy` switch + 5 boss draw functions
19. **UI Buttons** — DOM event handlers for all menu buttons
20. **Game Loop** — `requestAnimationFrame` loop calling update + render

## Rendering Pipeline

```
gameLoop()
├── update(now)         — game simulation (host only in online mode)
│   ├── updatePlayer()  — movement, input, attacks
│   ├── updateEnemy()   — AI, pathfinding, attacks
│   ├── projectiles     — movement, bouncing, collision
│   ├── minions         — imp/clone/shadow AI
│   ├── beams/circles   — timed effect updates
│   └── particles       — visual particle updates
└── render()
    ├── splitScreen?    — divide canvas into N viewports
    └── renderWorldView() — per-viewport:
        ├── tiles       — floor/wall with fog of war
        ├── torches     — flickering light sources
        ├── loot drops  — chests, items, stairs, shops
        ├── enemies     — with HP bars
        ├── players     — class-specific drawing
        ├── minions     — imps, clones, shadows, dogs
        ├── effects     — healing circles, lightning nets, domains, beams
        ├── projectiles — with glow trails
        ├── particles   — fading visual particles
        └── damage nums — floating text
    ├── drawHUD()       — health, XP, cooldowns per player
    └── drawMinimap()   — explored rooms overview
```

## Network Architecture

See `network.md` for full details. Summary:
- **Host-authoritative**: Host runs all simulation, broadcasts state at 20 Hz
- **Clients**: Send input only, receive full game state, render locally
- **PeerJS**: WebRTC peer-to-peer, no backend server needed
- **Split screen**: Supports 1-3 viewports per device

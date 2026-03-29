# Architecture

## Overview

The game uses Phaser.js v3 with Arcade Physics. It runs entirely client-side in the browser with no backend or build tools required. It supports both vs AI and 2-player local multiplayer modes across 6 selectable maps.

## File Responsibilities

### Config
- **`gameConfig.js`** - Single source of truth for all numeric constants. Every tunable value (car speed, ball bounce, pitch size, AI parameters, boost settings, size/speed/gravity presets) lives here. Other files import and reference these values.
- **`maps.js`** - Defines `MAP_LIST`, an array of 6 map configurations. Each map specifies wall thickness (controls effective pitch size within the fixed 1024x600 canvas), pitch/wall/line colours, goal height, ball drag, and an obstacles array. Exports `MAP_LIST` and `DEFAULT_MAP`.

### Scenes
Each scene is a Phaser.Scene subclass responsible for one screen of the game:
- **BootScene** - Loads car images (JPGs), removes white backgrounds via pixel processing, generates ball texture, transitions to MenuScene
- **MenuScene** - Title screen with Play button and car preview
- **SettingsScene** - Scrollable match configuration UI (game mode, map, match condition, difficulty, speed, gravity, boost regen, car size, ball size)
- **GameScene** - Main gameplay loop. Creates all game objects, registers physics colliders, runs game logic each frame, handles goal celebrations with explosions, out-of-bounds respawn, ball auto-launch
- **GameOverScene** - Displays winner, final score, and replay/menu buttons

### Objects
Game object classes that extend Phaser sprites:
- **Car** (base) - Shared car setup: normalised height-based scaling, physics body sizing, bounce, flip direction, ground detection, position reset
- **PlayerCar** extends Car - Accepts configurable key bindings via an `options` object. Handles ground movement, jumping, air rotation, directional boost with fuel management, and flame particle trail. Used for both Player 1 and Player 2 (with different key configs)
- **AICar** extends Car - Receives movement commands from AI decision logic. Accepts wall thickness for map-aware positioning
- **Ball** - Circle physics body with bounce, drag, and configurable radius
- **Pitch** - Factory that creates the playing field from a map config: draws visuals (pitch background, centre line/circle, goal areas, walls) and creates all static physics walls and obstacle platforms. Uses minimum physics body thickness to prevent tunneling on thin-walled maps

### Systems
Logic modules that don't own a visual representation:
- **ScoreManager** - Tracks goals per team, checks win conditions (goal limit reached or time expired), supports draw results
- **MatchTimer** - Countdown timer for time-limited matches, provides formatted display string, urgency detection (last 30 seconds)

## Design Decisions

1. **No build tools** - ES modules loaded directly via `<script type="module">`. Keeps setup simple; a local HTTP server is the only requirement.
2. **Arcade Physics over Matter.js** - Simpler API, sufficient for AABB + circle collisions. The game doesn't need joints, complex shapes, or rotation physics.
3. **Side-view with gravity** - Car sprites are side-view illustrations, so the game plays as a side-scrolling style (like 2D Rocket League). Cars drive on the ground, jump, rotate in the air, and boost.
4. **Programmatic ball** - Ball texture is generated in code rather than loaded as an image, ensuring a clean circular shape at any configured radius.
5. **Static physics groups for walls** - All pitch boundaries are static Arcade Physics bodies grouped together for efficient collision registration.
6. **Map system with data-driven layout** - Maps are plain config objects in `maps.js`. Pitch.js consumes a map config and builds the entire field from it, so adding new maps requires no code changes -- just a new entry in `MAP_LIST`.
7. **Configurable PlayerCar for 2-player** - Rather than creating a separate Player2Car class, `PlayerCar` accepts key bindings and texture via an options object. In 2-player mode, both the blue and red cars are `PlayerCar` instances with different key configs (WASD vs arrows) and particle texture keys. A unified `this.redCar` reference in GameScene points to either the AICar or the second PlayerCar, keeping collision and reset logic identical regardless of mode.
8. **Minimum physics body thickness** - Thin visual walls (e.g. 5px on Colosseum/Chaos) have their invisible physics bodies enlarged to at least 20px, preventing high-velocity tunneling without affecting the visible pitch area.

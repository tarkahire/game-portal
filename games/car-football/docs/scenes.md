# Scenes

## Scene Flow

```
BootScene --> MenuScene --> SettingsScene --> GameScene --> GameOverScene
                ^               ^                              |
                |               |                              |
                |               +--- (Play Again) -------------+
                +------------------- (Main Menu) -------------+
```

GameScene also has a "MENU" button (top-right) that returns directly to MenuScene.

## BootScene
- Loads car sprite images (`blue car.jpg`, `red car.jpg`) under temporary keys (`blue-car-raw`, `red-car-raw`)
- Runs pixel-level white background removal on each image, producing clean transparent textures (`blue-car`, `red-car`)
- Generates the ball texture programmatically (white circle with dark outline and centre dot)
- Shows "Loading..." text while assets load
- Auto-transitions to MenuScene on completion

## MenuScene
- Displays game title "CAR FOOTBALL" and subtitle "2D Edition"
- Shows car preview images (blue vs red) with "BLUE vs RED" label
- Single "PLAY" button transitions to SettingsScene

## SettingsScene

A scrollable settings menu with all match configuration options. The title bar, back button, and start button are fixed in place; the settings rows scroll vertically via mouse wheel.

### Settings (in order)

1. **Game Mode** - "vs AI" (default) or "2 Player" local multiplayer
2. **AI Difficulty** - Easy / Medium / Hard (hidden when 2 Player is selected)
3. **Map** - 6 maps: Classic, Arena, Colosseum, Ice Rink, Fortress, Chaos
4. **Match End Condition** - Toggle between Goal Limit (1, 3, 5, 7, 10) or Time Limit (1, 2, 3, 5 minutes)
5. **Car Speed** - Slow / Normal / Fast / Very Fast
6. **Ball Gravity** - Normal / Low / Very Low / Moon
7. **Boost Regen** - Slow / Normal / Fast / Infinite
8. **Car Size** - Tiny / Small / Normal / Large
9. **Ball Size** - Tiny / Small / Normal / Large / Giant

### UI Implementation
- All selector rows are inside a Phaser container with a geometry mask clipping to the scroll area (y=50 to y=545)
- Dark overlay rectangles at depth 99 hide content scrolling behind the fixed title and start button
- Mouse wheel events adjust the container's Y position with clamping
- **Back** button (top-left) returns to MenuScene
- **START MATCH** button (bottom-centre) passes all settings to GameScene as scene data

## GameScene

### Setup
- Receives all settings from SettingsScene via scene `init(data)`
- Looks up the selected map config from `MAP_LIST`
- Extends world bounds to cover goal recesses
- Creates pitch (walls, visuals, obstacles) from map config
- Creates ball at centre with selected size and gravity override
- Creates player car (blue) and opponent (red AICar or red PlayerCar depending on game mode)
- Applies speed, boost regen, and car size settings to both cars
- Sets up all physics colliders (cars-walls, ball-walls, cars-ball, cars-obstacles, ball-obstacles)
- Creates goal scoring zones
- Creates HUD (score, timer, mode indicator, map/speed/gravity/size indicators, boost meters)

### Game Loop
- Checks for out-of-bounds objects (respawns after 2 seconds outside canvas)
- Updates player car (handles own input via internal key bindings)
- Updates boost meter display
- Updates opponent car (AI decision logic or Player 2 input)
- Updates match timer (if time-limited)
- Checks ball ground-stuck state (warning at 2s, auto-launch at 3s)

### Goal Flow
1. Ball enters scoring zone -> `handleGoal()` called
2. Clear any ball warning state
3. Pause timer (if active)
4. Screen flashes with scoring team's colour
5. Goal explosion: particle burst at goal mouth, blast force on cars and ball
6. Physics runs for 600ms (blast effect), then pauses
7. "GOAL!" and "BLUE/RED SCORES!" text displayed
8. After 2 seconds (`GOAL_PAUSE_DURATION`): check win condition
9. If match not over: reset all positions, resume play
10. If match over: transition to GameOverScene

### HUD Elements
- Score display (centre top): "BLUE 0 - 0 RED"
- Timer (top-right, time mode only)
- Mode indicator (top-left): "AI: EASY/MEDIUM/HARD" or "2 PLAYER"
- Map name (shown only when not Classic)
- Speed setting (shown only when not Normal)
- Gravity setting (shown only when not Normal)
- Car size (shown only when not Normal)
- Ball size (shown only when not Normal)
- P1 Boost meter (bottom-left), labelled "BOOST" or "P1 BOOST" in 2-player mode
- P2 Boost meter (bottom-right, 2-player mode only)
- MENU button (top-right)

## GameOverScene
- Displays winner ("BLUE WINS!", "RED WINS!", or "IT'S A DRAW!")
- Shows final score with team labels
- Two buttons: "PLAY AGAIN" (-> SettingsScene) and "MAIN MENU" (-> MenuScene)

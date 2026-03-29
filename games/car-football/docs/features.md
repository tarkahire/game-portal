# Feature Updates Log

A record of all features added to the project after the initial build.

---

## Feature #1 — Ball gravity setting (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/scenes/SettingsScene.js`, `src/scenes/GameScene.js`
- **Description:** Added a settings option to reduce ball gravity so the ball stays in the air longer.
- **Details:** Four gravity presets available in settings: Normal (900), Low (500), Very Low (250), Moon (100). Applied as a per-body gravity offset on the ball only — cars remain at full gravity. HUD shows active gravity mode when not set to Normal. Uses purple highlight buttons in the settings UI.

---

## Feature #2 — Ball ground-stuck auto-launch (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/scenes/GameScene.js`
- **Description:** Prevents boring ground-level rallies by automatically launching the ball upward after 3 seconds on the ground.
- **Details:** A timer tracks continuous ground time. At 2 seconds, the ball begins flashing as a warning (alpha pulsing tween). At 3 seconds, the ball is launched upward with a yellow "LAUNCH!" text effect. Timer resets when the ball leaves the ground, after goals, and during goal pauses. Config constants: `BALL_GROUND_STUCK_TIME`, `BALL_LAUNCH_VELOCITY`, `BALL_LAUNCH_WARNING_TIME`.

---

## Feature #3 — Car speed setting (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/scenes/SettingsScene.js`, `src/scenes/GameScene.js`, `src/objects/PlayerCar.js`, `src/objects/AICar.js`
- **Description:** Added a settings option to adjust car speed with four presets.
- **Details:** Presets: Slow (200/700), Normal (350/1200), Fast (500/1600), Very Fast (700/2200) — maxSpeed/acceleration values. AI car speed is capped at the lower of the speed preset or its difficulty-based max speed. Uses cyan highlight buttons in the settings UI. HUD shows speed mode when not Normal.

---

## Feature #4 — Air boost with rocket trail (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/objects/PlayerCar.js`, `src/scenes/GameScene.js`
- **Description:** Press the down arrow while in the air to activate a rocket boost that propels the car forward with a flame trail.
- **Details:** Boost pushes the car in whatever direction it's facing. Flame particle trail (orange/yellow, additive blend) sprays from behind the car. Boost has a fuel meter (HUD bottom-left) that drains while boosting and recharges on the ground. Fuel bar changes colour: orange (> 50%), amber (25-50%), red (< 25%). Config constants: `BOOST_THRUST`, `BOOST_MAX_FUEL`, `BOOST_DRAIN_RATE`, `BOOST_RECHARGE_RATE`, `BOOST_PARTICLE_LIFESPAN`.

---

## Feature #5 — Air rotation and angle-based boost (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/objects/PlayerCar.js`
- **Description:** While airborne, left/right arrow keys rotate the car, allowing the player to angle the car and direct boost thrust in any direction.
- **Details:** Left arrow = anti-clockwise rotation, right arrow = clockwise rotation at 180 degrees/sec. Boost thrust fires in the direction the car is facing. Flame particle trail follows the car's angle, always spraying from behind. When the car lands, rotation smoothly snaps back to level. On the ground, left/right controls horizontal movement as before. Config constant: `CAR_AIR_ROTATION_SPEED`.

---

## Feature #6 — Boost regen setting (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/scenes/SettingsScene.js`, `src/scenes/GameScene.js`
- **Description:** Added a settings option to customise boost fuel recovery speed.
- **Details:** Four presets: Slow (15 fuel/s), Normal (30 fuel/s), Fast (60 fuel/s), Infinite (never drains). In Infinite mode the fuel meter stays permanently full with a gold colour. Uses orange highlight buttons in the settings UI. Config: `BOOST_REGEN_OPTIONS`, `DEFAULT_BOOST_REGEN`.

---

## Feature #7 — White background removal from car sprites (2026-03-29)

- **Files changed:** `src/scenes/BootScene.js`
- **Description:** Runtime pixel processing removes white backgrounds from JPG car images so they appear transparent on the pitch.
- **Details:** Car JPGs load under temporary keys (`blue-car-raw`, `red-car-raw`). A `removeWhiteBackground()` method draws each image to an offscreen canvas, iterates all pixels, and sets alpha to 0 for any pixel where R > 230, G > 230, and B > 230 (white/near-white). Processed canvases are registered as clean Phaser textures under the original keys.

---

## Feature #8 — Normalised car sizing (2026-03-29)

- **Files changed:** `src/objects/Car.js`, `src/config/gameConfig.js`
- **Description:** Both cars now display at the same height regardless of source image dimensions.
- **Details:** Replaced the fixed `CAR_SCALE` approach with a `CAR_TARGET_HEIGHT` system (40px). Each car calculates its own scale factor as `targetHeight / this.height`, preserving aspect ratio. Physics body sizing updated to match.

---

## Feature #9 — Car size setting (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/scenes/SettingsScene.js`, `src/scenes/GameScene.js`, `src/objects/Car.js`, `src/objects/PlayerCar.js`, `src/objects/AICar.js`
- **Description:** Added a settings option to adjust car size with four presets.
- **Details:** Presets: Tiny (25px), Small (35px), Normal (40px), Large (55px) — target display height in pixels. Both cars are scaled to the selected height. The `targetHeight` parameter is passed through PlayerCar/AICar constructors down to Car, which overrides the default `CAR_TARGET_HEIGHT` config value. Uses green highlight buttons (0x66BB6A) in the settings UI. HUD shows car size when not Normal.

---

## Feature #10 — Ball size setting (2026-03-29)

- **Files changed:** `src/config/gameConfig.js`, `src/scenes/SettingsScene.js`, `src/scenes/GameScene.js`, `src/objects/Ball.js`
- **Description:** Added a settings option to adjust ball size with five presets.
- **Details:** Presets: Tiny (6px), Small (9px), Normal (12px), Large (18px), Giant (28px) — ball radius in pixels. When a non-default size is selected, GameScene regenerates the ball texture at the correct radius before creating the Ball. The radius is passed to the Ball constructor which sets the correct circle physics body. Uses blue highlight buttons (0x42A5F5) in the settings UI. HUD shows ball size when not Normal.

---

## Feature #11 — Map selection system (2026-03-29)

- **Files changed:** `src/config/maps.js` (new), `src/objects/Pitch.js`, `src/scenes/SettingsScene.js`, `src/scenes/GameScene.js`, `src/objects/AICar.js`
- **Description:** Added a map selection system with 6 distinct maps, each with unique pitch size, colour theme, goal size, and obstacles.
- **Details:** Maps are defined in `src/config/maps.js` as a `MAP_LIST` array. Each map specifies wall thickness (controls effective pitch size within the fixed 1024x600 canvas), pitch/wall/line colours, goal height, ball drag, and an obstacles array. The 6 maps: **Classic** (standard green, default), **Arena** (small red pitch via thick 80px walls, normal goals), **Colosseum** (large sandy pitch via thin 5px walls, wide 200px goals), **Ice Rink** (blue theme, small 110px goals, low ball drag of 10 for slippery feel), **Fortress** (dark stone theme, small 100px goals, one center platform obstacle), **Chaos** (night theme, large pitch, wide goals, three platform obstacles at varying heights). Pitch.js constructor now accepts a `mapConfig` object and creates an `obstacles` static physics group. Obstacles are visible rectangles with static physics bodies that cars and ball collide with. SettingsScene shows a map selector row as the first option under the title, using orange highlight buttons (0xE65100). GameScene receives the map name, looks up the config, and uses it for world bounds, wall/goal positions, goal zones, car spawn height, ball drag, and obstacle colliders. AICar receives wall thickness so AI positioning adapts to different map sizes. HUD shows the active map name when not Classic.

---

## Feature #12 — 2-player local multiplayer (2026-03-29)

- **Files changed:** `src/objects/PlayerCar.js`, `src/scenes/SettingsScene.js`, `src/scenes/GameScene.js`
- **Description:** Added a "Game Mode" setting allowing players to choose between "vs AI" (default) and "2 Player" local multiplayer.
- **Details:** PlayerCar constructor now accepts an `options` object with `textureKey`, `facingRight`, `keys` (key binding config), and `particleKey` (unique particle texture key per player). In vs AI mode, Player 1 uses arrow keys as before. In 2-player mode, Player 1 (blue car, left side) uses WASD (W=jump, A=left/rotate, D=right/rotate, S=boost) and Player 2 (red car, right side) uses arrow keys (Up=jump, Left=left/rotate, Right=right/rotate, Down=boost). The red car in 2-player mode is a full PlayerCar instance with boost, air rotation, and fuel meter — not an AICar. GameScene uses a unified `this.redCar` reference for collisions, goal blasts, and reset logic, pointing to either the AICar or Player 2's PlayerCar. A second boost meter ("P2 BOOST") appears at bottom-right in 2-player mode. The HUD shows "2 PLAYER" instead of "AI: MEDIUM" when in 2-player mode. The AI difficulty row in settings is hidden when 2 Player is selected. Both players receive the same speed, boost regen, and car size settings.

---

## Feature #13 — Scrollable settings menu (2026-03-29)

- **Files changed:** `src/scenes/SettingsScene.js`
- **Description:** Made the settings screen scrollable to accommodate all settings rows without cramming.
- **Details:** All selector rows are placed inside a Phaser container (`settingsContainer`) at comfortable vertical spacing. The title ("MATCH SETTINGS"), Back button, and Start Match button remain fixed at their positions outside the container with depth 100. Dark overlay rectangles at depth 99 mask content scrolling behind the title and start button areas. A geometry mask clips the scrollable area to the region between the title (y=50) and start button (y=545). Mouse wheel events adjust the container's Y position with clamping so content cannot scroll past the top or bottom. Each `create*Selector` method returns the next available Y position, keeping spacing consistent. The settings order is: Game Mode, AI Difficulty, Map, Match End Condition, Car Speed, Ball Gravity, Boost Regen, Car Size, Ball Size.

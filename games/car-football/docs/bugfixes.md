# Bug Fixes Log

A record of all bugs found and fixes applied to the project.

---

## Fix #1 — World bounds blocking goal scoring (CRITICAL)

- **Date:** 2026-03-29
- **Files changed:** `src/scenes/GameScene.js`
- **Problem:** The default Phaser physics world bounds (0,0 to 1024,600) prevented the ball from entering the goal recesses, which extend beyond the canvas (left goal back wall at x=-34, right at x=1058). Goals could never be scored because the ball was stopped at x=0 and x=1024 by the world boundary.
- **Fix:** Added `this.physics.world.setBounds()` in `GameScene.create()` to extend the world bounds to cover the full goal recess areas on both sides.

---

## Fix #2 — Car physics body not scaled with sprite (CRITICAL)

- **Date:** 2026-03-29
- **Files changed:** `src/objects/Car.js`
- **Problem:** `setScale(0.12)` was called after `scene.physics.add.existing(this)`, but Phaser Arcade Physics does not auto-scale the body with the sprite. The physics body remained at the full original image size (e.g. 800x400px) while the visible sprite was only ~96x48px. This caused massive invisible collision areas — the ball would bounce off thin air far from the car.
- **Fix:** After calling `setScale()`, manually set the body size to match the display dimensions using `body.setSize()` and centred it with `body.setOffset()`.

---

## Fix #3 — Fragile children.list index reference (Significant)

- **Date:** 2026-03-29
- **Files changed:** `src/scenes/SettingsScene.js`
- **Problem:** The "goals to win" label was grabbed by accessing `this.children.list[this.children.list.length - 1]` which relies on the label being the last child added. Any future code change adding display objects before this line would break the reference.
- **Fix:** Stored the text object directly from the `this.add.text()` call: `this.goalsLabel = this.add.text(...)`.

---

## Fix #4 — Incorrect fallback for nullable settings values (Minor)

- **Date:** 2026-03-29
- **Files changed:** `src/scenes/GameScene.js`
- **Problem:** `data.goalLimit || DEFAULT` used the `||` operator, which treats `null` as falsy and falls back to the default. When match mode is "time", `goalLimit` is intentionally passed as `null`, but `||` replaced it with the default value of 5. While the current code guards against this with a `matchMode` check, it was a latent bug that could cause issues if logic changed.
- **Fix:** Changed `||` to `??` (nullish coalescing) so that only `undefined` and `null` trigger the fallback, not `0` or other falsy values.

---

## Fix #5 — Blue car facing wrong direction (Visual)

- **Date:** 2026-03-29
- **Files changed:** `src/objects/PlayerCar.js`
- **Problem:** The blue car was facing away from the red goal instead of toward it.
- **Fix:** Changed `facingRight` from `true` to `false` in the PlayerCar constructor, removing the unnecessary `setFlipX` since the source image already faces the correct direction.

---

## Fix #6 — Game freezes when boosting in the air (CRITICAL)

- **Date:** 2026-03-29
- **Files changed:** `src/objects/PlayerCar.js`
- **Problem:** Pressing the down arrow to boost while airborne froze the game. The boost code called `this.boostEmitter.setParticleAngle()` every frame to rotate the flame trail, but `setParticleAngle()` does not exist on `ParticleEmitter` in Phaser 3.60 (the particle system was completely rewritten in that version). The resulting `TypeError` was thrown on every frame update while the key was held, causing the game to lock up.
- **Fix:** Replaced the non-existent `setParticleAngle()` call with `this.boostEmitter.setConfig({ angle: { min, max } })`, which is the correct Phaser 3.60 API for dynamically updating an emitter's particle emission angle. All other boost behaviour (thrust, fuel drain, emitter positioning) was unaffected.

---

## Fix #7 — Cars and ball fall through the floor (CRITICAL)

- **Date:** 2026-03-29
- **Files changed:** `src/objects/Pitch.js`, `src/objects/Car.js`, `src/objects/Ball.js`
- **Problem:** Cars (and the ball) could tunnel through the floor and walls, falling out of the playing area entirely. This was caused by two compounding issues:
  1. **Thin physics bodies on certain maps.** Phaser Arcade Physics uses discrete (per-frame) collision detection. If an object moves further than a wall's thickness in a single frame, it passes straight through without any collision being detected. The Colosseum and Chaos maps use `wallThickness: 5`, meaning a car only needed to move >5px/frame (~300px/s at 60fps) to tunnel through. The goal explosion blast applies 600px/s horizontal and 350px/s vertical velocity, easily exceeding this threshold. After the blast, cars fly upward, then fall back down under gravity (900px/s^2), reaching high speeds before hitting the 5px floor -- and passing right through it.
  2. **No world bounds safety net.** Neither cars nor the ball had `setCollideWorldBounds(true)`, so once an object tunneled through a wall, nothing prevented it from leaving the world entirely.
- **Fix (three changes):**
  1. **Minimum physics body thickness** (`Pitch.js`): All boundary walls (ceiling, floor, left/right walls, and goal floors) now use a minimum physics body thickness of 20px, regardless of the map's visual `wallThickness`. The extra thickness extends *outward* (away from the playing area) so the playable space and visual appearance are completely unchanged. A 5px-thick visual wall now has a 20px-thick invisible physics body behind it, making tunneling far less likely at any reasonable velocity.
  2. **World bounds collision on cars** (`Car.js`): Added `body.setCollideWorldBounds(true)` so that even if a car somehow passes through a wall, it is stopped at the world boundary edge rather than falling into the void.
  3. **World bounds collision on ball** (`Ball.js`): Same safety net applied to the ball. The world bounds already extend to cover goal recesses (set in `GameScene.js`), so the ball can still enter goals normally.

---

## Fix #8 — Out-of-bounds respawn safety net (Significant)

- **Date:** 2026-03-29
- **Files changed:** `src/scenes/GameScene.js`
- **Problem:** Despite previous tunneling fixes, cars and the ball could still occasionally clip through the floor or walls (especially during goal explosions or high-speed boost collisions) and get stuck outside the playing area permanently.
- **Fix:** Added an out-of-bounds detection system. Every frame, the game checks whether each object (player car, AI car, ball) is more than 50px outside the canvas bounds. If an object remains out of bounds continuously for 2 seconds, it is automatically teleported back to its spawn position with velocity reset. Three timers (`playerOobTime`, `aiOobTime`, `ballOobTime`) track continuous out-of-bounds time and reset when the object returns to the playable area. Timers do not run during goal pauses.

---

## Known Issues (Not Yet Fixed)

### Cars can enter goal recesses
- **Severity:** Low (gameplay)
- **Problem:** There are no barriers preventing cars from driving into the goal areas. A car could enter a goal and get stuck, or push the ball out from behind.
- **Suggested fix:** Add invisible collider walls at the goal mouth that block cars but allow the ball through, or restrict car movement to the main pitch area.

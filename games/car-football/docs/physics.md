# Physics System

## Engine

Phaser Arcade Physics with gravity enabled (`GRAVITY_Y: 900`). All dynamic objects (cars, ball) are affected by gravity and fall to the floor. Ball gravity can be overridden per-match via a settings preset (Normal 900, Low 500, Very Low 250, Moon 100), applied as a per-body gravity offset so cars remain at full gravity.

## Pitch Boundaries

The pitch is a closed rectangle with goal recesses on left and right sides. Static physics bodies form a complete boundary so the ball can never escape:

- **Ceiling** - Full-width static body at the top
- **Floor** - Full-width static body at the bottom (extends into both goal areas)
- **Side walls** - Vertical static bodies on left and right, with gaps where the goals are
- **Goal crossbars** - Horizontal static bodies above each goal opening. Ball bounces off these
- **Goal back walls** - Vertical static bodies at the far edge of each goal recess
- **Goal ceilings** - Horizontal bodies above each goal recess (prevents ball escaping upward inside goal)
- **Obstacles** - Some maps include static platform bodies (e.g. Fortress has one centre platform, Chaos has three) that cars and ball collide with

### Minimum Wall Thickness

Arcade Physics uses discrete collision detection, so objects moving faster than a wall's thickness per frame can tunnel through. To prevent this, all boundary physics bodies are enforced to a minimum thickness of 20px regardless of the map's visual `wallThickness`. The extra thickness extends outward (away from the playing area) so the playable space is unaffected. Maps like Colosseum and Chaos (5px visual walls) benefit from this.

### Per-Map Ball Drag

Each map defines its own `ballDrag` value, applied to the ball in GameScene. Most maps use 30, but Ice Rink uses 10 for a slippery feel.

## Ball Physics

| Property | Value | Purpose |
|----------|-------|---------|
| Shape | Circle (configurable radius, default 12px) | Accurate round collisions |
| Bounce | 0.75 | Lively bouncing off walls |
| Drag X | 30 (default, per-map override) | Friction when rolling on ground |
| Drag Y | 0 | No vertical drag |
| Max Speed | 600 px/s | Prevents extreme velocities |
| Collide World Bounds | true | Safety net to stop ball escaping the world |

Ball size presets: Tiny (6px), Small (9px), Normal (12px), Large (18px), Giant (28px). When a non-default size is selected, the ball texture is regenerated at the correct radius.

## Car Physics

| Property | Value | Purpose |
|----------|-------|---------|
| Target Height | 40px (configurable) | Normalised display size |
| Acceleration | 1200 px/s^2 (configurable) | Snappy, responsive controls |
| Max Speed | 350 px/s (configurable) | Reasonable top speed |
| Drag X | 800 px/s^2 | Quick deceleration when no input |
| Bounce | 0.3 | Slight bounce off walls |
| Jump Velocity | -450 px/s | Upward impulse when jumping |
| Collide World Bounds | true | Safety net to stop car escaping the world |

Car speed presets: Slow (200/700), Normal (350/1200), Fast (500/1600), Very Fast (700/2200) -- maxSpeed/acceleration. Car size presets: Tiny (25px), Small (35px), Normal (40px), Large (55px) -- target display height.

## Boost Physics (Air Rocket)

Players can activate a directional boost while airborne. The boost fires thrust in the direction the car is currently facing (controlled by air rotation).

| Property | Value | Purpose |
|----------|-------|---------|
| Thrust | 1800 force units | Substantial momentum added per second in facing direction |
| Max Fuel | 100 | Full tank capacity |
| Drain Rate | 50 fuel/s | Fuel consumed while boosting |
| Recharge Rate | 30 fuel/s (configurable) | Fuel recovered per second while on ground |
| Particle Lifespan | 300ms | Duration of each flame particle |

Boost regen presets: Slow (15/s), Normal (30/s), Fast (60/s), Infinite (never drains, fuel stays at max).

Boost thrust is applied as velocity adjustment each frame: `velocity += cos/sin(angle) * BOOST_THRUST * dt`. This means the car accelerates in whatever direction it's pointing, allowing aerial manoeuvring.

## Air Rotation Mechanics

While airborne, left/right keys rotate the car instead of moving it horizontally:

| Property | Value |
|----------|-------|
| Rotation Speed | 180 degrees/s |
| Direction | Left key = anti-clockwise, Right key = clockwise |
| Landing Behaviour | Angle snaps smoothly back to 0 (multiplicative decay: `angle *= 0.8`) |

The flame particle trail follows the car's angle, always spraying from behind (angle + 180 degrees).

## Kick Mechanic

When a car collides with the ball:

1. Calculate the direction vector from car centre to ball centre
2. Normalise the vector
3. Calculate kick strength = `KICK_FORCE` (350) + car's current speed x `KICK_CAR_SPEED_FACTOR` (0.5)
4. Apply the kick strength along the direction vector as the ball's new velocity

This creates natural directional kicking -- driving into the ball from the left pushes it right, hitting from below launches it up.

## Goal Explosion Blast

When a goal is scored, an explosion originates from the goal mouth:

- **Blast Force**: 600 px/s horizontal, -350 px/s vertical (applied to both cars)
- **Ball Blast**: 400 px/s horizontal, -300 px/s vertical
- **Direction**: Each car is blasted away from the explosion based on its position relative to the explosion point
- **Particle Effect**: 40 particles with additive blending, speed 150-500, lifespan 800ms
- **Physics Pause**: Physics runs for 600ms to let the blast play out, then pauses during the "GOAL!" text display

## Goal Detection

Scoring zones are thin invisible rectangles positioned at the back of each goal recess. When the ball overlaps a scoring zone, a goal is registered. The zones are positioned deep enough that the ball must be fully inside the goal for overlap to trigger.

## Ball Ground-Stuck Auto-Launch

To prevent boring ground-level rallies, the game monitors how long the ball stays on the ground:

| Threshold | Effect |
|-----------|--------|
| 2 seconds | Ball begins flashing (alpha pulsing tween) as a warning |
| 3 seconds | Ball is launched upward at -500 px/s with a "LAUNCH!" text effect |

The timer resets when the ball leaves the ground, after goals, and during goal pauses.

## Out-of-Bounds Respawn

Every frame, the game checks whether each object (player car, red car, ball) is more than 50px outside the canvas bounds. If an object remains out of bounds continuously for 2 seconds, it is teleported back to its spawn position with velocity reset. Three independent timers track continuous out-of-bounds time and reset when the object returns to the playable area.

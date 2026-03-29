# Controls

## Key Bindings

Controls differ based on the selected game mode and whether the car is on the ground or in the air.

### vs AI Mode (single player)

Player 1 (blue car) uses arrow keys:

| Key | On Ground | In Air |
|-----|-----------|--------|
| Left Arrow | Accelerate left | Rotate anti-clockwise |
| Right Arrow | Accelerate right | Rotate clockwise |
| Up Arrow | Jump | (no effect) |
| Down Arrow | (no effect) | Activate boost |

### 2-Player Mode

Player 1 (blue car) uses WASD:

| Key | On Ground | In Air |
|-----|-----------|--------|
| A | Accelerate left | Rotate anti-clockwise |
| D | Accelerate right | Rotate clockwise |
| W | Jump | (no effect) |
| S | (no effect) | Activate boost |

Player 2 (red car) uses arrow keys:

| Key | On Ground | In Air |
|-----|-----------|--------|
| Left Arrow | Accelerate left | Rotate anti-clockwise |
| Right Arrow | Accelerate right | Rotate clockwise |
| Up Arrow | Jump | (no effect) |
| Down Arrow | (no effect) | Activate boost |

## Ground Movement

The controls are arcade-style for snappy, responsive gameplay:

- **High acceleration** (1200 px/s^2, configurable) -- car responds instantly to input
- **High drag** (800 px/s^2) -- car stops quickly when input is released
- **Single jump** -- can only jump when grounded (no double jumps)
- **Jump velocity** -- -450 px/s upward impulse

## Air Rotation

While airborne, left/right keys rotate the car instead of moving it horizontally:

- **Rotation speed** -- 180 degrees per second
- **Left** rotates anti-clockwise, **Right** rotates clockwise
- **Landing snap** -- when the car touches the ground, its angle smoothly decays back to level (multiplied by 0.8 each frame until within 5 degrees, then snapped to 0)

Air rotation is essential for aiming boost thrust. Point the car in the direction you want to fly.

## Boost (Air Rocket)

Pressing the boost key (Down Arrow or S) while airborne activates a rocket boost:

- **Thrust direction** -- fires in the direction the car is currently facing (controlled by air rotation)
- **Thrust force** -- 1800 units per second, applied as velocity adjustment each frame
- **Fuel system** -- boost has a 100-unit fuel tank that drains at 50 units/second while active
- **Recharge** -- fuel recovers while the car is on the ground (default 30 units/second, configurable via settings)
- **Infinite mode** -- "Infinite" boost regen setting prevents fuel from draining
- **Visual trail** -- orange/yellow flame particles spray from behind the car, following its rotation angle

### Boost Meter (HUD)

A horizontal bar at the bottom of the screen shows remaining fuel:

| Fuel Level | Colour |
|------------|--------|
| > 50% | Orange (or gold in Infinite mode) |
| 25-50% | Amber |
| < 25% | Red |

In 2-player mode, Player 1's meter is bottom-left ("P1 BOOST") and Player 2's is bottom-right ("P2 BOOST").

## How to Kick the Ball

Drive into the ball to kick it. The ball is pushed away from the car in the direction of impact. Faster cars kick harder due to the speed multiplier in the kick formula.

Strategies:
- Drive into the ball at full speed for powerful kicks
- Jump and land on top of the ball to push it down into the goal
- Use the walls and ceiling to bounce the ball strategically
- Boost into the ball while airborne for aerial hits
- Rotate the car to angle your approach for more precise direction control

## Menu Controls

- **Mouse wheel** -- scroll through settings in SettingsScene
- **Mouse click** -- all buttons and selectors are click-interactive

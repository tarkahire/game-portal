# Car Football - 2D Edition

A 2D car football game built with Phaser.js. Supports vs AI and 2-player local multiplayer across 6 maps with configurable match settings, boost mechanics, and air rotation.

## Quick Reference

- **Tech Stack**: Phaser.js v3.60, HTML5 Canvas, vanilla JavaScript (ES modules)
- **Entry Point**: `index.html` loads Phaser CDN then `src/main.js`
- **Run Locally**: Needs a local HTTP server (e.g. `npx serve .` or VS Code Live Server) due to ES module imports

## Project Structure

| Path | Purpose |
|------|---------|
| `src/main.js` | Phaser.Game bootstrap and config |
| `src/config/gameConfig.js` | All tunable constants (dimensions, speeds, physics, presets) |
| `src/config/maps.js` | Map definitions (6 maps with unique layouts, colours, obstacles) |
| `src/scenes/` | Phaser scenes (Boot, Menu, Settings, Game, GameOver) |
| `src/objects/` | Game objects (Car, PlayerCar, AICar, Ball, Pitch) |
| `src/systems/` | Game systems (ScoreManager, MatchTimer) |
| `assets/images/` | Car sprite images (blue car.jpg, red car.jpg) |

## Documentation

Detailed documentation is in the `docs/` folder:

- [Architecture](docs/architecture.md) - Overall design and file responsibilities
- [Physics](docs/physics.md) - Collision system, bouncing, kick mechanics, boost
- [AI System](docs/ai-system.md) - Difficulty levels and AI behaviour
- [Scenes](docs/scenes.md) - Scene flow and lifecycle
- [Controls](docs/controls.md) - Input handling, key bindings, boost and air rotation
- [Features](docs/features.md) - Record of all feature updates added after initial build
- [Bug Fixes](docs/bugfixes.md) - Record of all bugs found and fixes applied
- [Deployment](docs/deployment.md) - Vercel deployment guide and game portal setup

# Game Portal

A static game portal website designed for deployment on Vercel. Hosts multiple browser-based games with a landing page for game selection.

## Quick Reference

- **Tech Stack**: Static HTML/CSS/JS, deployed on Vercel
- **Hosting**: Vercel (user has a subscription)
- **Entry Point**: `index.html` (landing page with game cards)
- **Deployment**: Connect GitHub repo to Vercel, auto-deploys on push
- **No backend required** — all games run entirely in the browser

## Project Structure

| Path | Purpose |
|------|---------|
| `index.html` | Portal landing page with game cards |
| `styles.css` | Portal-wide styling |
| `assets/thumbnails/` | Game thumbnail images |
| `games/` | Each subfolder is a self-contained game |
| `games/car-football/` | 2D Car Football game (Phaser.js) |
| `games/stickman-fighter/` | 2D Stickman Fighter game (vanilla JS Canvas) |
| `vercel.json` | Vercel deployment config |

## Games

### Car Football (2D Edition)
- **Path**: `games/car-football/`
- **Tech**: Phaser.js v3.60, HTML5 Canvas, vanilla JS (ES modules)
- **Features**: vs AI and 2-player local multiplayer, 6 maps, boost mechanics, air rotation, configurable match settings
- **Full docs**: See `games/car-football/docs/` for detailed documentation

### Stickman Fighter
- **Path**: `games/stickman-fighter/`
- **Tech**: HTML5 Canvas, vanilla JS, CSS
- **Features**: 36 fighting styles selectable at a style select screen, each with 4 unique attacks and custom visuals; rage system with upgraded attacks; combo system; 2-player local, VS AI, and Training modes; health bars, round timer, cooldown displays; dramatic visual effects (screen shake, particles, hell background for meteor, cinematic boulder crush)
- **Styles**: Lightning, Fire, Water, Wind, Earth, Acid, Light, Dark, Shadow, Portal, Washer, Corrupt, Crystal, Duck, Keyboard, Chef, DJ, Pigeon, Samurai, Selfie, Ice, Gravity, Time, Vampire, Dragon, Necro, Magnet, Mech, Pizza, Cat, Banana, Grandma, Painter, Bee, Teacher, Plumber
- **Controls**: Player 1: WASD + ZXCV attacks, Player 2: Arrows + \/., attacks

## Adding a New Game

1. Build the game as a self-contained folder with its own `index.html`
2. Drop it into `games/<game-name>/`
3. Add a card to the portal's `index.html`
4. Add a thumbnail image to `assets/thumbnails/`
5. Push to GitHub — Vercel auto-deploys

## Deployment (Vercel)

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com), click "Add New Project"
3. Import the GitHub repository
4. Framework Preset: select "Other" (static site)
5. Build settings: leave blank (no build step)
6. Click "Deploy"
7. (Optional) Add a custom domain in project settings

## Cost

| Plan | Price | Bandwidth |
|------|-------|-----------|
| Hobby | Free | 100 GB/month (~20,000-50,000 game loads) |
| Pro | $20/month | 1 TB/month |

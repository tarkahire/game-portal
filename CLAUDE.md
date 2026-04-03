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
- **Features**: 102 fighting styles with 4 unique attacks each; rage system with upgraded attacks; domain expansion counter-mechanic; combo system; finisher moves (sword lunge at 25% HP); flight for all characters; 12 selectable stage backgrounds; unique character transformations on damage; victory dances; 2-player local, VS AI, and Training modes; health bars, round timer, cooldown displays; dramatic visual effects
- **Controls**:
  - Player 1: WASD move/fly, ZXCV attacks, F punch, G kick, E rage, Q domain, R finisher
  - Player 2: Arrows move/fly, \/., attacks, 0 punch, 1 kick, M rage, 4 domain, 3 finisher
- **Styles (102)**: Lightning, Fire, Water, Wind, Earth, Acid, Light, Dark, Shadow, Portal, Washer, Corrupt, Crystal, Duck, Keyboard, Chef, DJ, Pigeon, Samurai, Selfie, Ice, Gravity, Time, Vampire, Dragon, Necro, Magnet, Mech, Pizza, Cat, Banana, Grandma, Painter, Bee, Teacher, Plumber, Football, Magma, Poison, Sound, Sand, Plasma, Nature, Storm, LavaLamp, Werewolf, Zombie, Cupid, Minotaur, Kraken, Reaper, Boxing, Basketball, Tennis, Wrestling, Archery, WiFi, Baby, Toilet, Clown, Fridge, Roomba, Cactus, Ninja, Cowboy, Pirate, Astronaut, Rockstar, Pharaoh, Viking, Spartan, Zeus, Medusa, Hacker, Alien, Cyborg, Glitch, AI, Shark, Gorilla, Scorpion, Eagle, Snake, Sushi, Coffee, Taco, IceCream, Popcorn, Firefighter, Doctor, Lawyer, Dentist, Mailman, Metal, Rap, Opera, Country, Trampoline, Bubble, Mirror, Rubber, Cheese
- **Stages (12)**: Default, Dojo, Rooftop, Volcano, Arctic, Space, Underwater, Graveyard, Cyberpunk, Forest, Desert, Castle

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

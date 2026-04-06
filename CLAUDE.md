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
| `games/dungeon-crawler/` | 2D Roguelike dungeon crawler (vanilla JS Canvas + PeerJS) |
| `games/dungeon-crawler-3d/` | 3D First-person dungeon crawler (Three.js + PeerJS) |
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

### Dungeon Crawler (2D)
- **Path**: `games/dungeon-crawler/`
- **Tech**: HTML5 Canvas, vanilla JS, CSS, PeerJS (WebRTC multiplayer)
- **Features**: 62 playable character classes; cyberpunk neon visual style; roguelike procedural dungeon generation; infinite floors with scaling difficulty; 5 lives system with respawn on next floor; 6 enemy types + 5 cycling bosses; loot system with 4 rarity tiers (weapons, armor, potions); real-time action combat with bouncing projectiles; summoned minions (Demon imps, Naruto clones (permanent/immortal), Megumi divine dogs, Jin-Woo shadow army with boss generals, face-huggers, rats, pawns, charmed allies); healing circles, lightning nets, beam attacks, tongue whip, fire trails, honey ball projectiles, ink puddles, dough portals with fist punches; split-screen local co-op (2-4 players); online co-op via PeerJS WebRTC (up to 4 players with retry logic + STUN servers); 2-local-players-per-device in online mode; per-player inventory system; meta progression with persistent gold, shop unlocks, stat tracking
- **Controls**:
  - Player 1: WASD move, Mouse aim+click attack, E special, R secondary, Q class-specific, F arise boss (Jin-Woo), Space dodge, Tab inventory
  - Player 2: Arrow keys move, Numpad 0 attack, 1 special, 5 secondary, 4 class-specific, 6 arise boss, 2 dodge, 3 inventory
- **Classes (64)**: Angel, Demon, Draco, Healer, Lightning, Portal, Katakuri, Naruto, Megumi, Jin-Woo, Frog, Bee Swarm, T-Rex, Wendigo, Alien Queen, Comet, Telekinesis, Mind Control, Chimera, Mimic, Supernova, Puppet Master, Medusa, Cerberus, Minotaur, Anubis, Thor, Venom, Cordyceps, Leech, Chrono, Dimension Cutter, Paradox, Drummer, Siren, Mercury, Acid, Smoke, Ant Colony, Rat King, Locust, Mecha Shark, Ghost Rider, Ice Phoenix, Plague Rat, Card Dealer, Dice Roller, Chess King, Rage, Fear, Love, Chaos, Senor Pink, Ink, Dog, Kitsune, Mahoraga, Parasite, Skeleton, Archer, Slime, Bat, Dark Knight, Necromancer
- **Recent additions**: Katakuri 16-portal ring system with dough fist M1s + Fusillade + Haki (blue); Senor Pink (Sui Sui) walk-through-walls + dive + whirlpool; Ink class with puddle resource system + Draw Soldier + Masterpiece golem; Dog class (OP) with permanent pack + puppy spawn + fetch frenzy + alpha howl; Kitsune with tails meter transformation (human -> nine-tailed fox with cyan arc slashes)
- **Full docs**: See `games/dungeon-crawler/docs/` for architecture, classes, gameplay, network, controls

### Dungeon Crawler 3D
- **Path**: `games/dungeon-crawler-3d/`
- **Tech**: Three.js v0.162.0 (CDN via jsdelivr importmap), ES modules, PeerJS (WebRTC multiplayer)
- **Features**: First-person 3D dungeon crawler inspired by Wolfenstein/DOOM; same 64 classes as 2D version; procedural dungeon generation (reused from 2D); cyberpunk neon walls/floors/ceilings with torch lighting; futuristic horror enemies with gaping mouths and sharp teeth; all 64 class specials ported (E/R/Q/F abilities); 3D minion system (shadows, clones, imps, dogs, face-huggers etc.); boss encounters with floating "BOSS" labels; full HUD (HP, XP, floor, lives, gold, special cooldown, boss HP bar, minimap); 1st/3rd person camera toggle (C key); online co-op via PeerJS; class selection screen with all 64 classes
- **Controls**:
  - WASD / Arrow keys: move (forward/back/strafe)
  - Mouse: look around (pointer lock)
  - Left click: attack (melee arc or ranged projectile based on class)
  - E: special ability, R: secondary ability, Q: class ability, F: class F-ability
  - Space: dodge, C: toggle 1st/3rd person camera, ESC: pause
- **Katakuri 3D specifics**: Two dough donut portals float at player's sides; M1 punches big navy blocky fists from portals with lock-on auto-aim and knockback; E Fusillade fires 16 rapid fists from side portals (Blox Fruits style) with enemy pull + stun; R Restless Dough Barrage rapid fists; Q Haki permanent blue upgrade; F grab enemies with hands + throw launches them via floor portal uppercut into ceiling ricochet
- **Parasite 3D specifics**: Tendril-based class that steals from enemies; M1 tendril lash (narrow cone, drains HP on hit); E Infest (attach to an enemy — ride them as they fight other enemies for 8s, camera follows, player invincible); R Drain (AoE HP steal with visible green tendrils connecting to each victim); Q Evolve (stacking permanent stat buff — +damage/HP/speed each use, kills absorb enemy stats proportional to stacks, player model grows); F Apex Predator (merge with nearest enemy or boss — absorb their stats permanently, full heal, mutated horror model with 6 tendril arms, green glow, AoE burst)
- **Mahoraga 3D specifics**: Wheel of Dharma floats above player (8-spoke spinning wheel); Sword of Extermination visible during attacks; M1 wide sweeping sword slashes with knockback; E Adaptation spins wheel, heals, grants stacking damage reduction (up to 60%); R Cleave massive overhead sword slam with AoE stun + bounce; Q Wheel Turn AoE pull + damage + 3s stun; F Divine General Transformation (permanent: 1.8x damage, 1.5x HP, full heal, 1.3x speed, faster attacks, purple positive energy glow on sword/wheel, AoE burst on transform)
- **File structure**:
  - `index.html` — entry point with Three.js importmap, HUD markup, all menu screens
  - `style.css` — cyberpunk neon HUD + menu styling
  - `src/main.js` — game loop, state, combat, all 63 specials, Katakuri portal system, Mahoraga wheel/sword system, minion system, HUD
  - `src/constants.js` — TILE, WALL_HEIGHT, EYE_HEIGHT, color palette
  - `src/dungeon/generator.js` — dungeon generation (ported from 2D)
  - `src/dungeon/meshBuilder.js` — tile grid to 3D walls/floors/ceilings with textures
  - `src/dungeon/torchLights.js` — PointLight placement + flicker
  - `src/player/fpsCamera.js` — FPS controls, pointer lock, WASD, wall collision, 1st/3rd person toggle
  - `src/enemies/meshFactory.js` — 3D enemy mesh builders (horror style with teeth)
  - `src/classes/definitions.js` — all 64 class stats
  - `src/network/network.js` — PeerJS multiplayer (create/join room, lobby, state sync)

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

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

### Dungeon Crawler 3D (Blox Fruits Edition)
- **Path**: `games/dungeon-crawler-3d/`
- **Tech**: Three.js v0.162.0 (CDN via jsdelivr importmap), ES modules, PeerJS (WebRTC multiplayer)
- **Features**: First-person 3D dungeon crawler with Blox Fruits class system; 15 playable fruits (Dough, Dragon, Leopard, Buddha, Light, Dark, Flame, Ice, Magma, Phoenix, Rumble, Quake, Venom, Spirit, Sound); Blox Fruits-style controls (Z/X/C/V/F abilities, Q dash, M1 4-hit combo); Beast fruit transformations (Dragon, Leopard, Buddha, Phoenix, Venom); procedural dungeon generation; cyberpunk neon visual style; screen shake, hitstop, floating damage numbers, speed lines; boss encounters; 5-slot ability cooldown HUD; 1st/3rd person camera toggle (T key)
- **Controls** (Blox Fruits style):
  - WASD / Arrow keys: move
  - Mouse: look around (pointer lock)
  - Left click (M1): 4-hit melee combo (4th hit = finisher with extra knockback + screen shake)
  - Z: Ability 1, X: Ability 2, C: Ability 3, V: Ability 4 (transform for Beast fruits), F: Ability 5 (flight/mobility)
  - Q / Space: Dash (300ms invincibility + 3x speed + speed lines + FOV punch)
  - T: toggle 1st/3rd person camera, ESC: pause
- **Fruits (15)**:
  - **Dough** (Special): Roller Donut projectile, Restless Barrage, Fusillade channeled 16-hit barrage with pull, Unstoppable AoE slam, flight
  - **Dragon** (Beast): Fire Breath cone, Dragon Claw dash, Fire Shower rain, Dragon Transform (2x scale, wings, 1.8x dmg), flight
  - **Leopard** (Beast): Prowl Punch dash, Spiraling Frenzy multi-hit, Predator Leap, Leopard Transform (1.3x, speed aura, 1.8x speed), rush
  - **Buddha** (Beast): Impact Fist shockwave, Shift teleport, Heavenly Stomp, Buddha Transform (3x golden giant, 2.5x HP, 50% dmg reduction), zen dash
  - **Light** (Elemental): Light Beam, Barrage of Light 5-shot, Light Speed Kick dash, Divine Arrow mega beam, flight
  - **Dark** (Elemental): Dimensional Slash, Dark Vortex pull+AoE, Black Hole massive pull, World of Darkness screen-wide, flight
  - **Flame** (Elemental): Fire Bullets 3-shot, Fire Column AoE, Fire Fist big projectile, Flame Destroyer AoE, flight
  - **Ice** (Elemental): Ice Spears + freeze, Glacial Surge freeze wave, Ice Bird projectile, Absolute Zero freeze-all, flight
  - **Magma** (Elemental): Magma Fist, Magma Eruption cone, Magma Hound tracking, Volcanic Storm AoE, flight
  - **Phoenix** (Beast): Blue Flames heal+attack, Flame Gatling 8-shot, Regeneration Flame big heal, Phoenix Transform (wings, heal-over-time), flight
  - **Rumble** (Elemental): Thunder Bolt + stun, Lightning Storm AoE, Sky Judgement big strike, Thunderstorm massive, flight
  - **Quake** (Natural): Quake Punch shockwave, Quake Erupt ground smash, Sea Quake massive, Tsunami screen-wide destruction, quake dash
  - **Venom** (Natural): Poison Daggers, Toxic Fog DOT cloud, Venom Shower rain, Hydra Transform (3-headed, 1.7x dmg), dash
  - **Spirit** (Natural): Fire Spirit proj, Ice Spirit proj+freeze, Fire Spirit AoE, Spirit Convergence dual-element mega, flight
  - **Sound** (Natural): Sound Blast cone+stun, Rhythmic Barrage multi-hit, Tempo Charge speed/dmg buff, Fortissimo AoE, dash
- **File structure**:
  - `index.html` — entry point with Three.js importmap, HUD with 5-slot ability bar
  - `style.css` — cyberpunk neon HUD + menu styling
  - `src/main.js` — game loop, M1 combo system, fruitAbility() dispatcher, VFX (screen shake, hitstop, damage numbers, slash trails, speed lines), beast transform models, minion system, HUD
  - `src/classes/definitions.js` — 15 Blox Fruit definitions with stats + ability metadata + cooldowns
  - `src/player/fpsCamera.js` — FPS controls, pointer lock, WASD, wall collision, 1st/3rd person toggle (T key)
  - `src/dungeon/generator.js` — dungeon generation
  - `src/dungeon/meshBuilder.js` — 3D walls/floors/ceilings
  - `src/dungeon/torchLights.js` — torch lighting
  - `src/enemies/meshFactory.js` — 3D enemy mesh builders
  - `src/network/network.js` — PeerJS multiplayer

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

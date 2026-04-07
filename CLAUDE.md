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
- **Features**: First-person 3D dungeon crawler with anime character system; 10 playable characters with custom 3D models, unique abilities, and detailed VFX; Z/X/C/V/F abilities + Q oversoul/dash; M1 4-hit melee combo (4th hit = bisect finisher); procedural dungeon generation (120x120 map, rooms 9-16 tiles, 3-wide corridors); cyberpunk neon visual style; hitstop, floating damage numbers, speed lines, FOV punch; boss encounters; 5-slot ability cooldown HUD; 1st/3rd person camera toggle (T key); no ceiling (open sky); no screen shake; no dash cooldown
- **Controls**:
  - WASD / Arrow keys: move
  - Mouse: look around (pointer lock)
  - Left click (M1): 4-hit melee combo (4th hit = finisher)
  - Z: Ability 1, X: Ability 2, C: Ability 3, V: Ability 4, F: Ability 5 (mobility)
  - Q: Dash (no cooldown, 300ms invincibility) OR Oversoul activation (Shaman King characters)
  - T: toggle 1st/3rd person camera, ESC: pause
  - P2: Arrow keys move, Backslash attack, M/,/./Slash abilities, N mobility, Numpad0 dodge, 4 oversoul
- **Characters (10)**:
  - **Gojo Satoru** (Sorcerer, 120HP): Blue gravitational pull, Red repulsion blast, Hollow Purple cutscene, Domain Expansion freeze, Teleport
  - **Ryomen Sukuna** (Sorcerer, 150HP): Dismantle, Cleave, Fire Arrow, Malevolent Shrine domain, Dash — custom detailed model with tattoos, 4 eyes, pink hair, cursed sword
  - **Toji Fushiguro** (Assassin, 140HP): Inverted Spear, Chain Strike, Playful Cloud, Heavenly Restriction buff, Flash Step — muscular build, lip scar, spear weapon
  - **Brook** (Swordsman, 100HP): Hanauta Sancho, Soul Solid, Blizzard Slice, Soul King, Dash — skeleton with cane sword
  - **Bakugo** (Brawler, 130HP): AP Shot, Stun Grenade, Howitzer Impact, Cluster Bomb, Blast Rush — explosive fist combat
  - **Denji** (Devil, 160HP, 6.0 speed): Chain Rip, Buzzsaw, Devil Charge, Full Devil transform (3x dmg), Chain Dash — chainsaw arms, fastest character, fiery aura trail
  - **Yoh Asakura** (Shaman, 130HP): Celestial Slash wave, Buddha Giri dash-slash, Double Medium 12-hit flurry, Fumon Tonkou eruption, Spirit Dash — brown hair, headphones, orange outfit, open shirt. Q activates permanent Spirit of Sword oversoul: massive floating white spirit arm with curved katana + purple/white energy rings, smooth lerped follow, low sweeping sword slash M1s with slash trail VFX
  - **Tao Ren** (Shaman, 140HP): Rapid Tempo Assault 6-thrust, Eleki Bang electric shockwave, Heaven Shaking Thunder triple pillar, Golden Thunder 5-pillar ultimate, Thunder Dash — purple tongari hair spike, golden eyes, mandarin collar outfit. Q activates permanent Bason oversoul: golden armored spirit arm with Kwan Dao halberd + gold/purple energy rings
  - **Horohoro** (Shaman, 135HP): Fist Slam jump+ice spikes, Ice Barrage 8-fist projectiles, Blizzard whirling ice storm, Avalanche 200-spike ice wall, Ice Dash — blue spiky hair, blue jacket, headband. Q activates permanent dual ice fists: two big blue armored spirit fists floating on both sides, alternating punch M1s with ice impact rings
- **Shaman King Oversoul System**: Q key activates permanent armored oversoul for Yoh/Ren/Horohoro (P2 uses key 4). Oversouls are scene-level Three.js groups that smoothly lerp-follow the player per frame. Include: segmented armored arms, energy rings, glow lights, ghost aura shells. Oversoul characters use the weapon combo system (reduced M1 dmg, 4th-hit bisect finisher). FPS viewmodel swords hidden — the floating oversoul IS the visible weapon in both 1st/3rd person.
- **Map**: 120x120 tiles, rooms 9-16 tiles, 3-wide corridors, no ceiling (open sky)
- **File structure**:
  - `index.html` — entry point with Three.js importmap, HUD with 5-slot ability bar
  - `style.css` — cyberpunk neon HUD + menu styling
  - `src/main.js` — game loop, M1 combo system, fruitAbility() dispatcher, character model builders (Gojo/Sukuna/Toji/Brook/Bakugo/Denji/Yoh/Ren/Horohoro), oversoul system, VFX (hitstop, damage numbers, slash trails, speed lines, FOV punch), minion system, HUD, minimap with enemy dots
  - `src/classes/definitions.js` — 10 character definitions with stats + ability metadata + cooldowns
  - `src/constants.js` — tile size, map dimensions (120x120), eye height, colors
  - `src/player/fpsCamera.js` — FPS controls, pointer lock, WASD, wall collision, 1st/3rd person toggle (T key), per-character eyeHeight override
  - `src/dungeon/generator.js` — procedural dungeon generation (rooms + 3-wide corridors)
  - `src/dungeon/meshBuilder.js` — 3D walls/floors (no ceiling)
  - `src/dungeon/torchLights.js` — torch lighting
  - `src/enemies/meshFactory.js` — 3D enemy mesh builders (skeleton, archer, slime, bat, dark knight, necromancer)
  - `src/network/network.js` — PeerJS multiplayer
  - `todo.md` — next session priorities (performance optimization, Horohoro fist slam check)

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

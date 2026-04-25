# Enemies

Built in `src/enemies/meshFactory.js`. Designed to be **visceral organic horror creatures** — pale veiny flesh, oversized fanged or grinning mouths, beady black eyes, smooth organic deformed shapes (no blocky primitives).

## Enemy Types

| Internal name | In-game | HP | Spd | Dmg | Atk Spd | Range | Type | XP |
|---------------|---------|-----|-----|------|---------|-------|------|------|
| `skeleton` | Gaunt Stalker | 25 | 1.2 | 6 | 800 | 1.5 | melee | 10 |
| `archerSkeleton` | Spire Wretch | 18 | 0.9 | 8 | 1200 | 8 | ranged | 15 |
| `slime` | Fleshmound | 35 | 0.7 | 5 | 1000 | 1 | melee | 12 |
| `bat` | Maw Wing | 12 | 2.8 | 4 | 600 | 0.8 | melee | 8 |
| `darkKnight` | Brute | 60 | 1.0 | 12 | 1000 | 1.2 | melee | 25 |
| `necromancer` | Lich Crawler | 30 | 0.8 | 10 | 2000 | 7 | summoner | 30 |

Bosses scale to 2.5× size and use one of these meshes (defined in `BOSSES` array in `main.js`):
- Bone King — skeleton mesh, 200 HP
- Slime Mother — slime mesh, 250 HP
- Shadow Wraith — necromancer mesh, 180 HP
- Dragon Hatchling — darkKnight mesh, 300 HP
- Lich Lord — necromancer mesh, 400 HP

Bosses cycle on infinite floors.

## Visual Design

Built using shared helpers in `meshFactory.js`:

- `organicGeo(radius, deformAmount, segs)` — deformed sphere via vertex noise displacement, no perfectly round shapes
- `capsuleGeo(radius, length)` — smooth organic limbs
- `addBeadyEyes` — tiny black spheres + wet shine highlights
- `addGlowEyes` — emissive iris (red / purple)
- `addExtraEye` — single asymmetric extra eye (cheek, below mouth)
- `addGrinMouth` — wide grin with rows of human-like flat teeth (SCP-style)
- `addFangedMaw` — gaping maw with irregular sharp fangs, tongue, dark interior, raw red meat behind
- `addDrool` — hanging cylinder strings from mouth corners, sway in animation
- `addTendrils` — writhing tube tendrils (CatmullRomCurve3 + TubeGeometry) from heads/backs/shoulders
- `addBoneSpikes` — cone bone spikes erupting from spine/shoulders
- `addClaws` — long hooked bone claws on fingers
- `addGlowCrack` — pulsing red emissive segments — heartbeat scale animation
- `addExposedRibs` — torn-flesh wound cavity with rib bones in front, raw red meat behind
- `addVeins`, `addBloodStains` — surface detail

## Per-Enemy Design

### Gaunt Stalker (skeleton)
- Hunched, tilted head at wrong angle (head jitter target — twitches randomly)
- Elongated bulbous pale head
- Huge horizontal grin of human-like teeth + drool strings
- Two beady black eyes high on head + asymmetric third eye below mouth
- Glowing red crack pulsing down chest
- Bone spikes erupting from spine
- Asymmetric arms (one longer/lower), 4 hooked claws per hand
- Inner red point light in chest

### Spire Wretch (archerSkeleton)
- Taller, leaner, head jitters
- Pinprick red glow from empty eye sockets + asymmetric extra eye
- Drool from grin
- Bone spikes through both shoulders
- Bone bow + drawn bowstring
- Claws on offhand
- Long legs

### Fleshmound (slime)
- Pulsing veiny pink flesh blob (squish animation)
- 3 fanged maws (1 large front + 2 smaller sides), drool from each
- 5+ scattered eyes in wrong places (cluster on top + side strays)
- Writhing tendrils on top
- Spider-leg bone spikes sticking out at angles
- Exposed ribcage poking through front with raw red meat behind
- Inner red point light

### Maw Wing (bat)
- Fleshy organic body
- Glowing red eyes (instead of beady — more menacing in darkness)
- Underside fanged mouth with drool
- Leathery wings with rib bones
- Hooked wing-tip claws
- Long writhing tail tendril
- Wing flap animation

### Brute (darkKnight)
- Towering muscular monstrosity, head jitters
- Massive drool strings from gaping fanged maw
- Lolling tongue hanging out
- Tiny blank white staring eyes + asymmetric extra eye on cheek
- Exposed ribcage on chest with raw red meat behind
- Pulsing red emissive crack across chest (heartbeat scale)
- 6+ bone spikes from back, 2 from each shoulder
- Asymmetric outstretched veiny muscular arms (one larger)
- 5 hooked claws per fist
- 4 tendrils growing from back/shoulders
- Inner pulsing red point light at chest

### Lich Crawler (necromancer)
- Tapered organic robe with tendrils trailing from hem
- Hooded head with sickly grey exposed face inside
- Deep-set glowing purple eyes
- Drool from small grin
- Outstretched arm with claws + skeletal staff arm
- Bone staff topped with skull (glowing purple eye sockets) + glowing purple orb
- 3 floating purple runes orbiting the figure (boxes, spin + bob)
- Sickly purple point light

## Animations

`animateEnemyMesh(mesh, type, time)` — runs per frame for visible enemies within ~12 tiles:

| Effect | Method |
|--------|--------|
| Head jitter | `headJitter` group sin/cos rotation + occasional violent twitch |
| Tendril writhe | per-tendril sin/cos around base rotation |
| Drool sway | each drool's z-rotation oscillates with personal phase |
| Glow crack pulse | scale lerp on heartbeat sin |
| Inner glow light pulse | intensity oscillates |
| Orbiting runes | angular velocity + Y bob (Necromancer only) |
| Wing flap | bat wings oscillate y-rotation |
| Slime squish | body scale Y oscillates with inverse X/Z |
| Subtle breathing | mesh.scale.y oscillates slightly per frame for everyone else |

## Performance

`update()` enemy loop applies a distance check: enemies further than 12 tiles from the camera **skip both `billboardEnemy` and `animateEnemyMesh`** each frame. Visibility itself is unchanged (still controlled by 15-tile distance OR explored room) — but distant ones aren't running per-frame matrix updates and animation logic. This was the largest single perf hit in dungeons with many spawned enemies across explored rooms.

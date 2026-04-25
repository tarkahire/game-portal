# Characters

11 playable anime characters across 4 categories. All defined in `src/classes/definitions.js`. Models built in `src/main.js` via `build<Name>Model()` functions and dispatched in `buildPlayerModelForClass(classId, labelPrefix)`.

## Stats Summary

| Char | Type | HP | Spd | Damage | Atk Spd | Range | Weapon |
|------|------|-----|-----|--------|---------|-------|--------|
| Gojo Satoru | sorcerer | 120 | 3.2 | 14 | 300 | 35 | fist |
| Ryomen Sukuna | sorcerer | 150 | 3.4 | 18 | 250 | 35 | fist |
| Toji Fushiguro | assassin | 140 | 4.0 | 20 | 200 | 40 | spear |
| Brook | swordsman | 100 | 3.6 | 16 | 220 | 38 | sword |
| Bakugo | brawler | 130 | 3.5 | 17 | 230 | 30 | fist |
| Denji | devil | 160 | **6.0** | 19 | 240 | 35 | chainsaw |
| Yoh Asakura | shaman | 130 | 3.6 | 16 | 220 | 38 | fist (Spirit of Sword on Q) |
| Tao Ren | shaman | 140 | 3.8 | 18 | 210 | 40 | fist (Bason on Q) |
| Horohoro | shaman | 135 | 3.5 | 15 | 230 | 38 | fist (Ice fists on Q) |
| Megumi Fushiguro | sorcerer | 130 | 3.5 | 16 | 240 | 35 | fist |

## Abilities

Each character has 5 abilities mapped to Z/X/C/V/F. Cooldowns in `definitions.js` under `abilityCooldowns`. Implementation lives in `fruitAbility(slot)` in `main.js` (~3200 lines, dispatched by `player.classId`).

| Char | Z | X | C | V | F |
|------|---|---|---|---|---|
| Gojo | Blue (gravity pull) | Red (repulsion blast) | Hollow Purple (cutscene) | Domain Expansion (freeze) | Teleport |
| Sukuna | Dismantle | Cleave | Fire Arrow | Malevolent Shrine | Dash |
| Toji | Inverted Spear | Chain Strike | Playful Cloud | Heavenly Restriction (buff) | Flash Step |
| Brook | Hanauta Sancho | Soul Solid | Blizzard Slice | Soul King | Dash |
| Bakugo | AP Shot | Stun Grenade | Howitzer Impact | Cluster Bomb | Blast Rush |
| Denji | Chain Rip | Buzzsaw | Devil Charge | Full Devil (3× dmg) | Chain Dash |
| Yoh | Celestial Slash | Buddha Giri (dash-slash) | Double Medium (12-hit) | Fumon Tonkou | Spirit Dash |
| Ren | Rapid Tempo Assault (6 thrusts) | Eleki Bang | Heaven-Shaking Thunder | Golden Thunder (5 pillars) | Thunder Dash |
| Horohoro | Fist Slam (jump+spikes) | Ice Barrage (8 fists) | Blizzard | Avalanche (200 spikes) | Ice Dash |
| Megumi | Divine Dogs (2 wolves) | Nue | Toad | Chimera Shadow Garden | Shadow Dash |

## M1 Combo

Left click triggers a 4-hit melee combo (`COMBO_STEPS` in main.js). 4th hit is a finisher. Sukuna's 4th hit triggers `sukunaBisect()` — splits the enemy mesh in half with blood splash, screen shake, hitstop.

Combo window: 600ms between hits — past that, combo resets.

## Shaman King Oversouls (Q key)

Yoh, Ren, and Horohoro have a unique Q ability: a permanent armored "oversoul" spirit that floats next to the player, follows via per-frame lerp, and provides:
- **Yoh — Spirit of Sword**: white floating arm + curved katana, low sweeping slash M1s with slash-trail VFX, purple/white energy rings
- **Ren — Bason**: golden armored arm + Kwan Dao halberd, gold/purple rings
- **Horohoro — Ice Fists**: dual blue armored fists alternating-punch M1s with ice impact rings

Once active, the oversoul replaces the FPS viewmodel — the floating spirit IS the visible weapon in both 1st and 3rd person. M1 damage is reduced to compensate for the visual impact, but the 4th-hit bisect finisher still applies.

## Megumi Divine Dogs

Z ability summons 2 anatomically realistic wolves (1 white, 1 black) that follow Megumi at sideOffset 1.4 / backOffset 0.4 tiles. AI in `updateMinions()` divineDog branch:

- **Heel mode**: when no nearby enemy, walks beside player on its assigned side (`_dogSide = ±1`)
- **Flank mode**: when an enemy is within 8 tiles, moves to flank from its assigned side at distance 1.0
- **Bite attack**: triggers `dealDamageToEnemy` + bite particles when in attack range
- **Wall collision**: axis-separated `isWalkable` checks (radius 0.4) — dogs slide along walls, never phase through them
- **Teleport recovery**: if separated by walls (>9 tiles from player), snaps to a walkable tile next to the player
- **Tail wag**: slow during follow, faster during attack
- **Leg walk animation**: 4 leg pivots, paired front-left/back-right phase

### Wolf model
- Single smooth lofted body (custom `buildLoftedBody` — Catmull-Rom spline + cross-section ring sampling, oval cross-section) flowing snout → forehead → neck → shoulder → slim hunting waist → hip — no visible joints
- Belly underside as a separate gentle loft
- Bushy tail as a separate flowing loft (wags from group transform)
- ~50 cone "fur tufts" oriented radially outward from the body surface using the curve's tangent frame — tufts on back ridge, denser mane at shoulders/neck, bushy tail tufts
- Long sleek capsule legs (no knee balls), paws with 3 small claws each
- Almond eye sockets, glowing iris (amber for white wolf, blood-red for black), vertical slit predator pupils
- Large pointed upright ears, nose tip + mouth slit + corner fangs
- Bright per-wolf glow aura PointLight

## FPS Viewmodels

Built in `buildFPS<X>()` functions, parented to camera. Animated by `triggerSwordSwing(comboStep)` + `updateSwordSwing()` for combo M1s.

| Class | Viewmodel |
|-------|-----------|
| Sukuna | sword |
| Toji | spear |
| Brook | cane |
| Bakugo | fists |
| Denji | dual chainsaws |
| Gojo / Megumi | none (fist combat) |
| Yoh / Ren / Horohoro | sword/etc until Q activates oversoul, then hidden |

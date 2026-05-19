# Characters

12 playable characters. All defined in `src/classes/definitions.js`. Models built in `src/main.js` via `build<Name>Model()` functions and dispatched in `buildPlayerModelForClass(classId, labelPrefix)`.

## Stats Summary

| Char | Type | HP | Spd | Damage | Atk Spd | Range | Weapon |
|------|------|-----|-----|--------|---------|-------|--------|
| Gojo Satoru | sorcerer | 120 | 3.2 | 14 | 300 | 35 | fist |
| Ryomen Sukuna | sorcerer | 150 | 3.4 | 18 | 250 | 35 | fist |
| Toji Fushiguro | assassin | 140 | 4.0 | 20 | 200 | 40 | spear |
| Brook | swordsman | 100 | 3.6 | 16 | 220 | 38 | sword |
| Denji | devil | 160 | **6.0** | 19 | 240 | 35 | chainsaw |
| Yoh Asakura | shaman | 130 | 3.6 | 16 | 220 | 38 | fist (Spirit of Sword on Q) |
| Tao Ren | shaman | 140 | 3.8 | 18 | 210 | 40 | fist (Bason on Q) |
| Horohoro | shaman | 135 | 3.5 | 15 | 230 | 38 | fist (Ice fists on Q) |
| Megumi Fushiguro | sorcerer | 130 | 3.5 | 16 | 240 | 35 | fist |
| TODO | fighter | **220** | 3.0 | 5 | 320 | 35 | fist (Z: Black Flash) |
| Yuta Okkotsu | sorcerer | 135 | 3.6 | 17 | 220 | 38 | sword (no abilities yet) |
| Mahito | curse | 145 | 3.6 | 8 | 230 | 36 | fist (full kit + E mark/detonate) |

**Mahito** — `buildMahitoModel()` (reworked for anime accuracy): ashen grey-blue patchwork "Stitchface" skin with **dense cross-hatched stitching** across the face/torso/arms (long master seam down through the right eye plus forehead, cheek, jaw, nose-bridge, chin, torso and forearm panel seams via the local `stitchSeam()` helper); **heterochromia** — dark-blue left iris, grey right iris; faint unsettling upturned mouth; **grey-blue hair gathered into three thick segmented rope-strands** down the back, each cinched with dark binding ties and tapering to a tuft (`hairRope()` helper), plus an off-centre swept fringe and short side locks; near-black teal robe with a wide upturned collar and the signature **left shawl-sleeve split into three stacked panels** (matching three-panel left-shoulder drape); black pants; faint cursed soul aura. Reuses Sukuna's walk/idle animation.

**Idle Transfiguration — mark & detonate (E):** every M1 that connects calls `markMahito(e)` — the enemy gets `_mahitoMarked` and a floating soul-orb + stitch-cross tag, and is pushed to the `mahitoMarks` queue. Pressing **E** (`mahitoDetonate()`, Mahito-only — replaces the generic E alt-attack) bursts every marked enemy via `explodeMahito(e)`: a **~540 ms grotesque bulge phase** — the enemy mesh swells unevenly and throbs under a stretched-skin membrane (`_mahitoBursting` flag makes the enemy update loop hand the mesh over), blood bubbling out and a building tremor — then `_mahitoPop()`: white over-pressure ring, deformed dark-red flesh sphere, heavy blood/flesh-chunk gore spray, ballistic chunk meshes, ring/decal/flash, then an instant kill. Detonations are **staggered 130 ms apart** so a big mark count spreads the work over frames instead of one spike. `mahitoMarks` resets on floor change.

**Visual theme:** all Mahito ability VFX use a **pale pastel "reshaped-soul" palette** (`#e7c9e0`/`#cdbce8`/`#bfe0cf`/`#bcd6ee` + white) instead of the old gore-red, to match the anime's Idle Transfiguration look. Damage/cooldowns/ranges are unchanged — this was a visual + minion pass only.

**Abilities** (dispatched from the `id === 'mahito'` block in `fruitAbility`):
- **Z — Idle Transfiguration** (`mahitoIdleTransfig`): short forward palm-touch cone (~3.2 tiles), `damage ×2.2`, **auto-marks** survivors for the E detonation + a ~0.9 s warp-stun. Each struck soul now visibly warps — an expanding additive distortion shell + pastel soul wisps peel off the body. Core combo enabler.
- **X — Body Repel** (`mahitoBodyRepel`): 4.2-tile shockwave — `damage ×1.8` + hard radial knockback. **Mahito slams both hands onto the floor** (arm anim + pastel slam ring); then **7 separate long snake-like transfigured humans erupt from BELOW Mahito**, fanned (~98°) toward where he's aiming, and strike forward. Each body is a **continuous smooth lofted tube** (rebuilt every frame via `buildLoftedTube` — not a string of blobs), ~8 tiles long, with a **single gaping dark mouth at the tip — no hands, no eyes**; per-snake varied reach/slither/head-lift, surfaces from under him then lashes out and retracts. Mahito hops 3 tiles backward with ~0.45 s i-frames.
- **C — Soul Multiplicity** (`mahitoSoulMultiplicity`): spawns 5 temporary **transfigured-human** minions (custom `transfigured` mesh — malformed pastel humanoid, **no face, just a gaping dark mouth + lumpen body/asymmetric limbs**, faint soul aura; each rolls a random pastel tone; ~9 s life) that swarm enemies. They rise out of columns of pastel soul-matter.
- **V — Self-Embodiment of Perfection** (`mahitoDomain`): cut-in (front camera, hand-sign, flesh orb, "Domain Expansion: / Self-Embodiment of Perfection" subtitles), then the dark domain field (8-tile radius, 6.5 s) where **8 giant grasping arms rise from the perimeter and clasp inward**, weaving the canon flower-like hand net over the trapped souls. Traps every enemy inside (`_domainTrapped`) and **auto-transfigures them one at a time** via `explodeMahito` (the bulge→burst), chipping any remainder. Player invincible the whole sequence.
- **F — Shadow Step** (`mahitoShadowStep`): 6-tile blink, line damage `×1.5`, ~0.35 s i-frames + speed lines + a pale pastel soul-trail and a fading reshaped-flesh afterimage left at the origin.
- **Q** = generic dash (no oversoul); **E** = the mark detonation above.

## Abilities

Each character has 5 abilities mapped to Z/X/C/V/F. Megumi gets two extras on G and H. Cooldowns in `definitions.js` under `abilityCooldowns`. Implementation lives in `fruitAbility(slot)` in `main.js` (dispatched by `player.classId`); Megumi's G/H are top-level functions (`megumiToad`, `megumiSerpent`) called from the keydown handler.

| Char | Z | X | C | V | F |
|------|---|---|---|---|---|
| Gojo | Blue (gravity pull) | Red (repulsion blast) | Hollow Purple (cutscene) | Domain Expansion (freeze) | Teleport |
| Sukuna | Dismantle | Cleave | Fire Arrow | Malevolent Shrine | Dash |
| Toji | Inverted Spear | Chain Strike | Playful Cloud | Heavenly Restriction (buff) | Flash Step |
| Brook | Hanauta Sancho | Soul Solid | Blizzard Slice | Soul King | Dash |
| Denji | Chain Rip | Buzzsaw | Devil Charge | Full Devil (3× dmg) | Chain Dash |
| Yoh | Celestial Slash | Buddha Giri (dash-slash) | Double Medium (12-hit) | Fumon Tonkou | Spirit Dash |
| Ren | Rapid Tempo Assault (6 thrusts) | Eleki Bang | Heaven-Shaking Thunder | Golden Thunder (5 pillars) | Thunder Dash |
| Horohoro | Fist Slam (jump+spikes) | Ice Barrage (8 fists) | Blizzard | Avalanche (200 spikes) | Ice Dash |
| Megumi | Divine Dogs (2 wolves) | Mahoraga | Nue | Chimera Shadow Garden | Shadow Dash |

**Megumi extras (Megumi only):**
- **G** — Toad: fan of 3 winged toad shikigami, each fires a sticky tongue at a nearby enemy and yanks them toward Megumi
- **H** — Great Serpent: persistent slithering snake shikigami; avenges any divine dog or Mahoraga that takes damage

## Sukuna — Malevolent Shrine (V)

Domain expansion with a built 3D structure (`buildMalevolentShrine()` in `main.js`). On cast: hand-sign pose, black-out → blood-red screen wash, enemies within ~3.75 tiles trapped (`_domainTrapped`), player invincible 5.5s.

- **Structure**: a 3-tier dark pagoda — shrinking tiers with dark cores, four corner pillars, glowing-red torii frames on all 4 faces, flared 4-sided eave roofs with red under-glow, and a spire finial. Eight skeletal spider-rib `TubeGeometry` arches sweep from a 9.5-unit ground ring up over the tower (with bone spikes). Sits on a dark reflective floor disc with faint cyan rings. Two red point lights.
- **Hand-sign cut-in** (first, ~1100ms): `setCinematic()` swings the camera to a front view of Sukuna, enemy AI frozen (`_cutsceneActive`), both arms raise and converge so the hands meet centre-front (with a press/clench tremor), and a cursed-energy orb condenses + brightens between them with inward-spiralling wisps. On completion it flares, clears the cinematic, and calls `beginShrine()`. Player invincible for the whole 8.8s sequence.
- **Animation**: shrine spawns 6 tiles in front of Sukuna. **Rise** (~1300ms, ease-out cubic) up from `SUNK_Y` while every glow material's opacity and both lights ramp 0→base, with debris/embers + a ground-breach ring. **Active**: heartbeat pulse on all glow mats/lights + slow rib drift; white/red Dismantle slash planes rain down around the player. **Collapse** (after 12 damage ticks): sinks back down + glow fades, then `disposeGroup()` frees all geometry/materials.
- **Damage unchanged**: 12 ticks @400ms of `player.damage * 1.5` to enemies within 8 tiles (balance identical to the old dome version).

## M1 Combo

Left click triggers a 4-hit melee combo (`COMBO_STEPS` in main.js). 4th hit is a finisher with extra knockback + screen shake + hitstop + a bigger slash/punch impact, but no longer instant-kills — the old "4 consecutive M1 hits → sukunaBisect" execute mechanic was removed; weapon characters now do full M1 damage like fist characters.

Combo window: 600ms between hits — past that, combo resets.

## Shaman King Oversouls (Q key)

Yoh, Ren, and Horohoro have a unique Q ability: a permanent armored "oversoul" spirit that floats next to the player, follows via per-frame lerp, and provides:
- **Yoh — Spirit of Sword**: white floating arm + curved katana, low sweeping slash M1s with slash-trail VFX, purple/white energy rings
- **Ren — Bason**: golden armored arm + Kwan Dao halberd, gold/purple rings
- **Horohoro — Ice Fists**: dual blue armored fists alternating-punch M1s with ice impact rings

Once active, the oversoul replaces the FPS viewmodel — the floating spirit IS the visible weapon in both 1st and 3rd person.

## Megumi Ten Shadows Technique (full shikigami roster)

Megumi's whole kit is summon-based. Shadows that can take damage (Divine Dogs, Mahoraga, Serpent) all have a billboarded HP bar built by `buildDogHpBar()` and a death-cleanup branch in `updateMinions()`. Damage to any of them goes through `dealDamageToDog(m, dmg, attacker)` — when the attacker arg is supplied the global `_lastShadowAttack = { enemy, time }` is updated, which the Serpent reads to avenge other shadows. Enemy melee passes its attacker directly; enemy projectiles carry `_attacker` so dog/mahoraga hits on impact also credit the original shooter.

### Z — Divine Dogs
2 anatomically realistic wolves (1 white, 1 black) that follow Megumi at sideOffset 1.4 / backOffset 0.4 tiles. AI in `updateMinions()` divineDog branch:

- **Heel mode**: when no nearby enemy, walks beside player on its assigned side (`_dogSide = ±1`)
- **Flank mode**: when an enemy is within 8 tiles, moves to flank from its assigned side at distance 1.0
- **Bite attack**: triggers `dealDamageToEnemy` + bite particles when in attack range
- **Wall collision**: axis-separated `isWalkable` checks (radius 0.4) — dogs slide along walls
- **Teleport recovery**: if separated by walls (>9 tiles from player), snaps to a walkable tile next to the player
- **Tail wag**: slow during follow, faster during attack
- **Leg walk animation**: 4 leg pivots, paired front-left/back-right phase
- 120 HP each, alignable facing (both face same direction as Megumi when heeling)

**Wolf model**: single smooth lofted body (custom `buildLoftedBody` — Catmull-Rom spline + cross-section ring sampling, oval cross-section) flowing snout → forehead → neck → shoulder → slim waist → hip — no visible joints. Belly + bushy tail as separate lofts. ~50 cone fur tufts radiating outward, denser mane at shoulders/neck. Sleek capsule legs with paws + 3 claws each. Almond eye sockets, glowing iris (amber/blood-red), vertical slit predator pupils. Bright per-wolf glow aura PointLight.

### X — Mahoraga
Single autonomous "adapting divine general" — bigger and tougher than the dogs. **No riding mechanic** (was prototyped, scrapped). 18s cooldown, one at a time. 250 HP / `0.7 × player.damage` / 2.5-tile attack range / 800ms swing.

- **Mesh**: white muscular humanoid, ~4-unit-tall body scaled 1.45×. Black hakama shorts + grey knotted sash, mummy-wrapped forearms with bands, dark wrist & ankle cuffs, 3-tassel necklace, exposed-teeth mouth slit. Articulated arm/leg pivots — runs with full opposite-phase arm/leg cycle via `updateMahoragaAnimation`. Long segmented coiling tail trailing from his back.
- **Dharma Chakra halo** on his head: outer rim torus + thinner inner gold rim + central hub disc + raised cream boss + **8 radial spokes** (Noble Eightfold Path) with dark flanged plates at the rim and gold ferrules at the hub. Spins on Y each frame.
- **AI**: pursues nearest enemy within 12 tiles using `findPath()` (BFS over the 120×120 tile grid, recomputed every 500ms, snaps start + goal to nearest walkable). Wall-slide tries 9 angles (direct, ±0.4, ±0.9, ±π/2, ±2.1 rad) plus a final point-collision fallback. Otherwise heels behind Megumi. Teleports back to her if orphaned >14 tiles.
- **Punches**: alternating left/right fist via `triggerPunchArm` — 3-phase tween (windup → snap forward → recovery, ~510ms total) tracked in the global `activePunches` registry and applied **last** in `update()` via `updatePunchArms()` so other anims can't overwrite the swing.

### C — Nue
Flying owl shikigami one-shot (8s cooldown). Big crimson red feathered owl scaled 2.2× — chunky body with 22 cone tufts forming a bushy chest mane, head with another 16 spiky mane tufts, white face mask box across the eyes, glowing yellow eyes, hooked black beak with separate lower jaw, big talons. Wings are 3 stacked feather rows × 7 long feather planes per side fanned from the shoulder bulk. Crackling cyan lightning aura built from `TubeGeometry` arcs that spawn each frame and decay over ~10 frames.

Behaviour: spawns above Megumi, rises, swoops to the nearest enemy within 12 tiles in front, fires a vertical lightning bolt on arrival (bright cylinder + white core, hitstop, screen shake, ground rings + decal, 8 radiating speed-line streaks, 50-particle burst). AoE 3.5× player damage within 3 tiles + 1s stun. Owl fades after the strike.

### V — Chimera Shadow Garden
Megumi's domain expansion, rendered as a **black puddle of darkness**. 20s cooldown, 7s duration, 8-tile radius.
- **Cut-in (~1750ms)**: Malevolent-Shrine-style — `setCinematic()` swings the camera to a front view of Megumi, `_cutsceneActive` freezes the world, both arms raise and clasp into the domain seal with a press tremor, and a navy/violet shadow-energy orb condenses + brightens between his hands. On-screen subtitles fire on a timeline (from `src/classes/domain expansion.gif`): **"Screw it!" → "I'll do it!" → "Domain Expansion:" → "Chimera Shadow Garden"** (via `showCinematicSubtitle()`). Player invincible for the whole cut-in + domain.
- **Visual**: an irregular pitch-black `CircleGeometry` pool + deeper void core + faint violet rim + low purple PointLight (so the arena stays readable), sized to the full **8-tile** radius (`radius * TILE`) and eased outward over 750ms. Black shadow tendrils bubble up from the surface; rim "breathes". No dome/rings/spokes.
- **Freeze**: every enemy inside is locked in place for the whole domain via `_domainTrapped` (re-applied each 250ms tick so stragglers also lock; emissive shadow-tint cleared on collapse).
- Activation burst: 3× damage to every enemy in radius.
- Spawns 2 temporary divine dogs that auto-flank inside (life timestamp = now + 7s, despawn cleanly at end).
- Per-tick (250ms): 0.8× damage to all enemies inside, every 4th tick fires a violet shadow-lightning bolt at the highest-HP enemy for 2× damage.
- Puddle shrinks + fades out, `disposeGroup()` frees it when duration elapses.

### G — Toad (Megumi-only key)
Fan of 3 winged toad shikigami, 7s cooldown. Each toad: squat green body, lighter underbelly, big bulbous white eyes with black pupils, wide mouth, ring belly pattern, two small white feathered angel-wings on the back, four leg bumps, faint green aura.

Spawn: skips wall positions, picks a target each from a forward cone (10 tiles long, 5 wide). Each toad fires a 12-segment pink tongue along an arched curve in 3 phases:
- **Extend** (220ms) — tongue shoots toward enemy
- **Wrap** (120ms) — damage on contact (1.5× player damage + 1.2s stun)
- **Yank** (320ms) — eased pull of the enemy along the tongue back to ~1.2 tiles in front of Megumi

Toads despawn ~2.5s after summon.

### H — Great Serpent (Megumi-only key, **rideable mount**)
Persistent slithering snake shikigami, 8s cooldown, **one at a time**. 160 HP / 0.75× player damage / 2.0 attack range / 600ms swing, infinite life.

**Surfing/riding**: pressing H summons the serpent and **mounts** Megumi on top of it (`fpsCamera.flyHeight = 1.85`, body centre Y `0.9` + max body radius `0.832` ≈ snake-top `1.73`, so the player stands cleanly above without intersecting). The serpent's head is pinned 1.4 tiles ahead of the player along their facing direction, and the body chain trails behind, slithering as Megumi moves. Pressing H again **dismounts** and despawns the serpent. Auto-dismount on serpent death and on player death (`dismountSerpent()` resets `flyHeight` and clears `player._serpentRiding`).

- **Body**: continuous lofted tube (no bead gaps) — `buildLoftedTube(spinePoints, radii, radialSegs, colorFn)` builds a Catmull-Rom spline + cross-section ring sampling along the curve. 26 spine points, 14 radial segments, 24 radii entries (uniform ~0.32 width for the first ~70%, then a clean taper to a fine tail tip over the last ~25%). **Vertex-colored**: olive-yellow scales on the upper body with cream belly underneath; the tail end transitions into alternating black-and-white bands (top) with a white belly throughout. Body radii baked at 2.6× directly, head group separately scaled 2.6×, body centre at Y=0.9 so the underside clears the floor.
- **Head**: narrow elongated skull with proper snake features — pointed snout cone, frontal/parietal scale plates and a central dorsal stripe, brow ridges above each eye, visible nostrils on the snout, and jaw lines along both sides. Yellow eyes inside black skull-pattern sockets, vertical-slit pupils, long 3-segment curved red markings sweeping back from each eye.
- **Mouth**: wide-open jaw (lower-jaw rotation -0.75 rad ≈ 43°). Vivid magenta interior (`#6a1530`) with a darker throat (`#2a0510`) recessed deeper, pink upper-lip ridge, and a hanging lower jaw (white outside, pink inside, with a small chin tip cone). Two long curved white fangs from the upper jaw plus two smaller front fangs. Long forked red tongue lolling out and down past the jawline.
- **Head** (separate Group, positioned at spine[0] each frame): white elongated skull + forward snout + darker top shading; yellow eyes with vertical-slit pupils; red angled marking stripes extending back from each eye; open dark mouth cavity + 2 white curved fangs; long red forked tongue lolling forward and down with subtle scale-flick.
- **Slither**: AI maintains a world-space spine array, head-trailing chain follow at 0.55 world units between points, with a sin lateral wobble of ±0.18 tiles when moving. Body geometry rebuilt every frame from the spine; old geometry disposed.
- **Targeting**: prioritises any enemy that has damaged a divine dog or Mahoraga in the last 3 seconds (reads `_lastShadowAttack`); otherwise hunts the nearest enemy within 12 tiles. Movement uses 7-angle wall-slide (radius 0.25). Bites in range with green/pink particles + tongue flick.
- **HP bar** follows the head's actual world position from `spine[0]` (not the logical tile position, so it doesn't drift while wobbling).

## Hand-attack VFX (boxing-style)

Used by player M1 for fist characters (Gojo, Megumi, pre-oversoul Yoh / Ren / Horohoro) and by Mahoraga's auto-punches.

- **`spawnPunchImpact(wx, wy, wz, color)`** — bright white core flash + tinted outer impact ring + slow shockwave ring + 9 long radiating speed-line streaks + 18-particle spark burst + brief PointLight flash. Replaces the curved slash arc for fist attacks.
- **`triggerPunchArm(model, side)`** — registers a 3-phase arm swing (windup ~110ms → snap forward ~170ms → recovery ~230ms) on the global `activePunches` registry. Each arm has a `_punchUntil` timestamp; the global `updatePunchArms()` runs **last** in the main update loop (after walk/AI/oversoul anims) so per-character animations can't overwrite an active swing. Works for both player models (pivots exposed as direct properties) and Mahoraga (pivots on userData).

Player M1 alternates the side each combo step. Weapon characters (Sukuna, Toji, Brook, Denji, oversoul-active shamans) keep their existing slash trail + viewmodel-swing path.

## FPS Viewmodels

Built in `buildFPS<X>()` functions, parented to camera. Animated by `triggerSwordSwing(comboStep)` + `updateSwordSwing()` for combo M1s.

| Class | Viewmodel |
|-------|-----------|
| Sukuna | sword |
| Toji | spear |
| Brook | cane |
| Denji | dual chainsaws |
| Gojo / Megumi | none (fist combat) |
| Yoh / Ren / Horohoro | sword/etc until Q activates oversoul, then hidden |

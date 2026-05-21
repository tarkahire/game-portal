# Dev Log

Reverse-chronological record of notable changes. Newest first.

---

## 2026-05-21 — Password sign-in, Register button, dbag admin panel

### Password gate

- Save schema gained `pwHash` (client-side djb2 hash — privacy-theatre
  only; localStorage is anyone's to read with dev tools).
- Sign-in screen now has two inputs (name + password) and two
  buttons:
  - **Enter the Roads** — login only. Fails if name doesn't exist
    or password is wrong. Pre-password saves backfill their hash on
    first sign-in.
  - **Register account** — create new save. Fails if name is taken.
- Inline `#signin-error` div shows mismatch / taken / empty-field
  messages instead of a console-only log.
- Slot-click chips now just populate the name and focus the
  password field — they no longer auto-submit.
- Tab order: name → password (Enter), password → submit (Enter).

### Admin panel (dbag only)

- `isAdmin()` returns true when `save.name.toLowerCase() === 'dbag'`.
- HUD gains a small red **ADMIN PANEL · F1** button top-right,
  visible only for the dbag account. **F1 hotkey** also opens/closes.
- Overlay shows a 3-column grid of ~20 commands:
  - **Currency**: +1M gold, +9999 shards
  - **Progression**: Level +5, Level +20, Set Special Grade, Reset
    to Grade 4
  - **State**: Full HP+Stamina, Save now
  - **Toggles**: God mode, Inf Stamina, One-Shot, Noclip (green ✓
    on active)
  - **World**: Kill all curses, Spawn 10 curses, Spawn boss, Curse
    Rain (30 s of 4/s spawns), TP plaza, TP city centre
  - **Quests**: Complete all active quests
  - **Danger** (red): Wipe save (with confirm + reload)
- Toggles wired into the game loop:
  - **god** → `damagePlayer` early returns
  - **infStam** → block doesn't drain, stamina forced to max each tick
  - **oneShot** → melee damage × 9999
  - **noclip** → bypasses AABB push-out on both ground move + air-leap

### Files touched

- `index.html` — password input, error div, register button, admin button
- `style.css` — input spacing, error styling, admin button + grid styles
- `src/save/saveAdapter.js` — `pwHash` field
- `src/main.js` — `hashPw`, `readSigninFields`, `enterPressed` (login-only),
  `registerPressed`, full admin panel infrastructure + per-toggle hooks

`src/main.js`: 1881 → 2026 lines.

---

## 2026-05-21 — Repeatable quests, tiered givers, auto grade-up, tougher curses

Big quest + progression rework.

### Repeatable quests

- `completeQuest` no longer locks a quest to `'done'`. After paying out
  rewards it resets `state='available'` and `progress=0` so the player
  can grind. New per-quest `completedCount` is incremented each time
  and surfaced in the giver overlay + on the mission HUD as `×N`.
- Mission Board overlay button says **"Retake mission"** after a first
  clear, not "Done".

### Tiered city quest givers (Lv 10 / 20 / 30 / 40)

Four new NPCs scattered around Tokyo, each gated by player level:

| Lv  | NPC                     | Location  | Quest                  | Target | Reward       |
|-----|-------------------------|-----------|------------------------|--------|--------------|
| 10  | Curse Hunter (blue)     | (-60, 60) | Sweep the Backstreets  | 10     | 260 XP / 130g |
| 20  | Veteran Sorcerer (gold) | (60, 110) | Cursed Spirit Hunt     | 20     | 520 XP / 260g |
| 30  | Special Grade Mentor    | (-80, 150)| Special Grade Watch    | 30     | 880 XP / 440g |
| 40  | Elder Sorcerer (pink)   | (80, 170) | The Reckoning          | 50     | 1600 XP / 800g|

- Interacting while under-level shows a toast `Need Lv.X to take this
  mission` instead of opening the overlay.
- All quest givers (plaza board + the 4 city ones) live in
  `questGivers[]`. Each NPC has `userData._questId` and `_minLevel`.
- New generic `openQuestGiver(npc)` overlay replaces the old shared
  `openBoard()` — shows just that NPC's single quest with Accept /
  Retake / In-progress state + reward line + completion count.
- Kills credit **all active exorcism quests** simultaneously, so
  stacking them is the move.

### Overhead arrow

- Yellow cone + shaft arrow attached above the player model (visible
  from third-person camera).
- Per frame in `update()` it picks the closest unlocked-with-available-
  quest giver and rotates to point at it. Hides when within 12 m, when
  no eligible giver, or when the player is below Lv 10 (the first
  tiered giver unlocks at Lv 10).
- Bobs slowly via `Math.sin(tNow * 0.005)`.

### Auto grade-up every 20 levels

- Exam quest **removed** (`QUESTS.exam`, `examReqLevel`, the boss
  spawn on accept, the contact's exam overlay — all gone).
- New logic in `gainXp`: after each level-up,
  `newGrade = max(0, 4 - floor(level/20))`. If lower than current,
  promote with sfx + delayed toast. So **Lv 20→G3, 40→G2, 60→G1,
  80→Special Grade**.
- `openContact` now shows pure progression: "Next promotion: G3 at
  Lv 20. X levels to go." No more exam offer.
- `refreshMissionHud` falls back to "Grade up at Lv.X" when no quest
  is active.

### Tougher curses

- Curse base HP **34 → 40**, base damage **9 → 14**. Boss HP 320 → 380,
  boss damage 22 → 28.
- `gradeMul = 1 + (4 - grade) * 0.5` (was 0.4) — steeper grade scaling.
- New `levelMul = 1 + level * 0.04` multiplied on top of `gradeMul`.
  At Lv 80 Special Grade, a normal curse hits ~120 dmg and survives
  4-5 punches (was 1-2). The game should feel *challenging* at high
  rank — Kaizen's whole appeal.
- XP and gold drops also scale with level so payouts keep up.
- Curse spawn cap **6+(4-grade) → 7+(4-grade)*2** (Special Grade fills
  the streets) and spawn timer tightens with grade (down to ~0.6 s
  between spawns at Special).

### Other

- `onBossKilled` is now a no-op (kept for future).
- `acceptQuest` no longer special-cases exam.
- `questProgress` no longer skips id==='exam' (the entry is gone).

### Cursed Technique Vendor + shard currency

- New plaza NPC **Cursed Technique Vendor** (pink-purple ring), placed
  next to the Mission Board. `tryInteract` routes to a new
  `openTechniqueShop()` overlay.
- **Shards**: new `save.shards` currency. Backfilled to 0 on existing
  saves at `startGame`. Drop rule in `damageCurse` kill block: bosses
  → +5 shards guaranteed, normal curses → 67% chance of +1.
- **HUD** gold line now reads `Gold: X  ·  Shards: Y  ·  Lv.Z`.
- **Shop UI**: scrollable list (50vh max, custom purple scrollbar)
  of 10 placeholder cursed techniques (Limitless / Dismantle / Ten
  Shadows / Black Flash / Copy / Straw Doll / Cursed Speech /
  Boogie Woogie / Projection / Blood Manipulation), each with an
  icon, name, flavor blurb, gold + shard cost, and a disabled
  "Soon" button. Real purchase logic comes in a later update — for
  now the structure is wired so we can swap in actual techniques
  without rebuilding the UI.
- **Bug fix discovered**: the NPC proximity scan + idle anim +
  minimap were all hardcoded to `[board, smith, contact]`, which
  means the 4 new tiered city quest givers (Curse Hunter, Veteran,
  Mentor, Elder) were unreachable. Replaced with
  `[board, smith, contact, vendor, ...questGivers.slice(1)]` so
  every interactable NPC is now scanned/animated/mapped.
- `style.css` gained `.shop-list`, `.shop-row`, `.shop-icon`,
  `.shop-body`, `.shop-cost` rules + bumped `.card` max-width to
  620 px so the shop has breathing room.

`src/main.js`: 1694 → 1881 lines.

---

## 2026-05-21 — Tokyo perf rescue (lights + meshes + grid)

Previous Tokyo build was crashing low-end machines. Mesh count was
~3000+ and PointLight count was ~70 (every neon billboard + every
streetlamp + every vending machine), which makes WebGL recompile
every standard material's shader and run a brutal per-pixel light
loop. This pass cuts both.

### Lights: ~70 → ~5

- Per-neon PointLights on skyscrapers and shops: **removed**. The
  `MeshBasicMaterial`-coloured neon box self-glows; no actual light
  source needed for the look.
- Per-streetlamp PointLights: **removed**. The emissive bulb sphere
  + scene ambient/hemisphere/sun is enough.
- Vending machine display + PointLight: **removed** — vending is
  now a single emissive box (3 meshes → 1).
- Traffic light tri-dots: **removed** — replaced with a single
  emissive green box on the pole (5 meshes → 2).
- Curse, NPC marker, and player aura PointLights kept (they're few
  and load-bearing for gameplay readability).

### Mesh count: ~3000+ → ~800

- **Grid** trimmed: 9×5 (40 blocks) → 7×4 (24 blocks).
- **Cars** simplified: 13 meshes (body / cabin / 4 windshields /
  4 wheels / 2 head + tail lights) → 2 meshes (body + tinted
  cabin). Spawn frequency 50% → 25%.
- **Building windows**: north-face only (was N+S), tighter caps
  (max 8 rows × 5 cols → ~40 / building, 60% skip rate).
- **Shop windows**: capped at 4 max per building (was a full grid).
- **Rooftop antennas + water tanks**: removed.
- **Road centerline dashes**: removed (were ~200 tiny meshes).
- **Crosswalk stripes**: 5 → 3 per side per intersection.
- **Traffic lights**: every other intersection only.
- **Sidewalk furniture per block**: 8 slots → 4, biased to trees.
- **Skyline boxes**: 40 → 14.

### Result

`src/main.js` 1768 → 1694 lines. City still reads as a busy district
(plenty of buildings, varying heights, neon, sidewalks, road grid)
but should run smoothly on modest hardware.

If it still chugs after this pass, the next levers are: merging
all building bodies into a single `BufferGeometry`, switching to
`InstancedMesh` for windows/lamps/trees, or reducing block count
further. Tell me which way it's going.

---

## 2026-05-21 — Tokyo procedural city + forward-leap jump

Massive city expansion + jump retune.

### Jump → low forward leap

- `JUMP_VY` 10 → **5.5** (peak ~0.6 m, airtime ~0.55 s).
- New `JUMP_FORWARD = 16` m/s burst applied to `player.airVx` /
  `airVz` in the look direction on jump. Decays at `LEAP_DECAY = 1.8`
  per second (∴ you cover ~6-8 m before friction kicks in).
- Vertical integrator extended to push the player along
  `airVx`/`airVz` each frame and resolve AABB collisions, so leaps
  can't phase through buildings.
- Resets `airVx`/`airVz` to 0 on ground contact.
- `player` init in `startGame` gained `airVx`/`airVz` fields.

### World scale + fog

- `WORLD` 120 → **280** half-extent (560 m wide map).
- `CURSE_ZONE.maxZ` 100 → **260** — curses spawn across the whole
  new city.
- Curse despawn distance 70 → **120** so they don't pop in your
  face on the bigger map.
- Fog density 0.006 → **0.0028** for the longer view distance, with
  the moody dark blue tint kept.

### Procedural Tokyo (replaces hand-placed 7 buildings)

`buildCity()` is now a procedural generator:

- **Road grid**: 9×6 intersections forming an 8-column / 5-row grid
  of 50 m city blocks. East-west + north-south asphalt roads with
  yellow centerline dashes throughout.
- **Crosswalks + traffic lights** at every intersection (5 white
  zebra stripes on each approach + a tri-light pole with red/
  amber/green dots).
- **Per-block content** rolled randomly:
  - **TOWER** (55%) — single 22-58 m skyscraper with sparse
    emissive window grid (warm + cool tints), random neon
    billboard (each with its own point light), rooftop AC unit,
    optional antenna, optional water tank, ground-level door.
  - **ROW** (25%) — 2-3 mid-rise shops or office mid-rises in a
    line. Shops get awnings + neon signs over the door.
  - **PARK** (13%) — grass slab + 4-9 trees + a bench + trash can.
  - **PARKING LOT** (7%) — asphalt slab with white lane stripes
    + 3-6 parked cars with separate body / cabin / windshields /
    wheels / head- and tail-lights.
- **Per-block sidewalk decoration**: 8 furniture slots per block
  (4 along the N edge, 4 along the S edge), rolling between
  streetlamp / tree / bench / trash-can / vending-machine. Lamps
  add point lights; vending machines add an illuminated display.
- **Curbs**: thin raised strips around every block separating
  sidewalk from road.
- **Distant skyline**: 40 dark non-collidable boxes scattered
  south of the city to suggest depth into the haze.
- **Window optimisation**: skyscraper windows are placed on the
  N + S faces only (sparser sampling, ~45% drop rate per cell),
  capped at 8 cols × 14 rows per face — keeps the total mesh
  count manageable while still reading as a busy city.

`src/main.js` 1411 → 1768 lines. Mesh count rough estimate:
~2000-3000 active scene objects.

---

## 2026-05-21 — Kaizen Update 2: Jujutsu High + Tokyo plaza map, jump movement

Second of the Kaizen-shaped updates. Whole world rebuilt; movement
gets vertical for the first time.

### World rewrite

- **Terrain flattened**: analytic hilly heightmap → flat asphalt
  plane. `terrainHeight()` kept as a function (returns 0) so every
  downstream callsite (curses, NPCs, camera floor, player snap)
  still works. Procedural tree/rock scatter removed.
- **Map halves**:
  - **North (z < -10): Jujutsu High** — 30×14×18 m school block
    with three floors of emissive blue window strips and a purple
    "Jujutsu High" banner; east/west/back perimeter walls + a
    front wall with a gate gap; stone gate pillars + a torii arch
    beam; two training dummy posts in the courtyard; lighter
    courtyard floor tile.
  - **South (z > 10): Tokyo streets** — 7 boxy skyscrapers
    (20-36 m tall) in two concrete shades, sparse emissive purple
    window grids, randomised neon billboards in 5 colours (each
    with its own point light); three asphalt road strips with
    yellow lane dashes; six streetlamps at intersections.
  - **Centre: Plaza** — `TOWN.r = 22`, brighter pavement, neon
    purple boundary ring. 3 NPCs relocated here.
- **World shrank**: `WORLD = 240 → 120` half-extent. The map's a
  hub now, not a wilderness.
- **AABB obstacle system**: replaced `houses[]` circles with
  `obstacles[]` rectangles (`{minX,maxX,minZ,maxZ}`). New helpers:
  - `pushOutObstacles(nx, nz, axis, prev)` — per-axis push-out so
    the player slides along walls instead of sticking.
  - `inAnyObstacle(x, z, pad)` — used by the curse director to
    reject spawns inside buildings.
- **Curse spawn director** now picks points in `CURSE_ZONE` (the
  south half, z 12 → 100), rejecting plaza overlap or building
  overlap, with up to 12 retry attempts per tick.
- **Quest copy** updated: "Cleansing the Backroads" → "Patrol the
  City".

### Movement

- **Space = jump**. `vy = 10`, `GRAVITY = 25` m/s² (peak ≈ 2 m,
  airtime ≈ 0.8 s). Ground-only — no double-jump yet. Blocked while
  blocking. `doJump()` is a no-op if `player.y > 0.01`.
- **Player gains vertical state**: `player.y`, `player.vy`. Initialised
  in `startGame`. Integrated in `update()` (gravity tick, ground snap).
- **Air control**: ground movement times 0.45 when `player.y > 0`,
  so you can steer slightly in the air but not full-walk.
- **Camera tracks the jump**: `cy = gy + player.y + camHt - sin(pitch)*5`
  and `lookAt(player.x, gy + player.y + 1.7, player.z)`.
- **Dash is AABB-aware**: `doDash()` now runs the 5 m teleport through
  the same `pushOutObstacles` resolver so you can't phase through
  buildings.

### Files touched

`src/main.js` (1411 lines), `index.html` (controls hint),
`CLAUDE.md` (combat + new world section), `docs/devlog.md`.
Updates 3-6 (CE bar / techniques / Domain / stat tree / fighting
styles) still pending; numbering reflected in CLAUDE.md.

---

## 2026-05-21 — Kaizen Update 1: combat fundamentals

First of five planned updates retooling the combat to match Roblox
**Kaizen**'s feel: action-game tempo with a block / dash / grab
defensive triangle, stamina resource, and forced post-combo downtime.

- **Stamina resource** (`player.stamina` / `player.maxStamina = 90 +
  lv*8`). Regenerates 18/s when not blocking. Drained by dash (20),
  grab (25), and block hold (30/s). New yellow bar in the HUD panel
  (`#hud-st`), under HP.
- **Dash rebind**: Space → **Q**. Costs 20 stamina + 1.5 s cooldown,
  0.45 s i-frames retained. Bail-outs if stamina too low or while
  blocking. Cooldown pip on HUD.
- **F = Block** (hold). Sets `player.blocking`. Drains 30 stamina/s.
  Locks out movement, M1, dash, grab. Halves incoming damage to 30%
  (70% reduction). New animation branch: both arms fold tight across
  the face (shoulder.x -1.05, .z ±0.95, elbow -1.95), knees deeper
  bent, chin tucked.
- **G = Grab**. 25 stamina, 3 s cooldown, 3 m reach. Right-arm
  forward lunge — triggers `rArmSwing = 1`, `lungeAmount = 0.7`,
  `torsoTwist = -0.25`. Deals `damage * 1.4` + 3 m knockback on the
  curse. Plays `assets/punch.m4a`. Useful right now as a long-reach
  knockback attack; will break blocks once enemy / PvP block kits
  ship.
- **Post-combo lockout**: heavy 3rd punch sets
  `player.comboLockUntil = now + 1500 ms`. `meleeStrike()` no-ops
  during that window. This is Kaizen's defining tempo.
- **HUD cooldown pips**: three small boxes (`Q`, `G`, `M1`) at the
  bottom of the stat panel. They fill from the bottom while on
  cooldown / locked and clear when ready (added `.cdrow` and
  `.cdpip` to `style.css`). M1 lockout pip uses a red tint
  (`.cdpip.lock`) instead of the default purple.
- **Controls hint** updated: "LMB combo · Q dash · F block · G
  grab · Shift sprint".
- **damagePlayer** now multiplies incoming damage by 0.30 if
  `player.blocking`. Stamina + blocking flag reset on respawn.
- Project `CLAUDE.md` "Combat (current)" section rewritten to
  document the new bindings + tempo, and to flag the future
  updates (CE bar / awakening / stat points / fighting styles)
  that are still pending.

This shipped without breaking the existing punch animation work —
the 3-hit chain, the chunky arm geometry, the cocky idle, the
`punch.m4a` sound, and the heavy 3rd-punch lunge all still apply.

---

## 2026-05-21 — Custom punch sound (assets/punch.mp3)

Player can drop a recording at `games/jujutsu-cursed-roads/assets/
punch.mp3` and it'll play on every melee strike. Loaded once on
first audio init (the existing canvas-click handshake), cached as
an `AudioBuffer`, then triggered via a fresh `BufferSource` per
punch so rapid hits don't choke each other. Silently no-ops if the
file is missing — the synthesized `sfx('hit')` blip still plays on
contact regardless. Gain set to 0.7 so it sits above the blips but
doesn't clip.

---

## 2026-05-21 — Chunkier arms + over-emphasized punch visuals

Punches were hard to read — too thin, too fast, too restrained. This
pass makes them undeniably visible.

- **Chunkier arms** in `buildHumanoid`: deltoid 0.10 → 0.13, upper arm
  0.075/0.07 → 0.105/0.095, elbow 0.075 → 0.105, forearm 0.065/0.058
  → 0.092/0.084, hand box 0.10×0.12×0.06 → 0.14×0.15×0.10, thumb
  bumped to match. Shoulder offset pushed 0.34 → 0.37 outward so the
  bigger deltoid doesn't clip the chest. Both the player and the
  three town NPCs get the new dimensions (they share the rig).
- **Slower arm decay**: 7/s → 4.5/s, so each punch holds visibly
  extended for ~250 ms instead of snapping back instantly. Torso
  twist decay 8/s → 5/s to match.
- **Combo cooldown** 200 → 270 ms so successive punches don't
  overlap each other's hang-time.
- **Lunge on every punch** (was heavy-only): jab/cross now
  `lungeAmount = 0.4`, heavy stays `1.0`. Whole-body commit reads on
  every strike.
- **Fist scale-up**: wrist group scales 1 → 1.35× with the active
  arm's swing — the chunky fist visibly grows as the punch peaks.
- **Punch trail sparkles**: every punch spawns three small `burst`
  particles along the extension line (33%/66%/100% of `reach`) in
  the punch's tint colour (cyan for jab/cross, gold for heavy), so
  the path is unambiguous even if the camera misses the arm motion.
- Hit-burst counts bumped: regular 6 → 10, heavy 18 → 22.

---

## 2026-05-21 — Heavy 3rd punch (Ryu-style committed straight)

Combo trimmed from 4 hits to 3, with the third becoming a committed
heavy straight that lunges the body forward into the strike.

- `COMBO` now: **jab (L)** → **cross (R)** → **HEAVY straight (R)**.
- Punch reach pushed up on all hits (2.4/2.5 → 2.8/2.9, heavy 2.7 →
  3.8). Heavy damage 0.9× → 1.5×; knockback 0.9 → 1.8 m.
- Extended-arm pose pushed further on every punch: shoulder.x -1.40
  → -1.52, elbow.x -0.05 → 0.00. So jabs/crosses already extend
  noticeably more than before.
- `lungeAmount` (0–1, decay 3.2/s — slower than the 7/s arm decay so
  the body lingers in the lunge) re-introduced. On the heavy hit:
  - shoulder.x extended target slides further to -1.67, elbow to
    +0.22 (slight overextension look).
  - Pelvis throws forward by 0.28 m in model space
    (`pelvisPivot.position.z`); player.x/z does not actually move,
    so the bigger reach is purely the heavy hit's larger `reach`
    field, not a teleport.
  - Upper torso pitches forward by +0.28 rad over whatever the idle
    or walk branch set.
  - Torso Y-twist multiplied 2.2× for a bigger commit.
- Burst particle count on the heavy 18 (was 12); colour stays
  yellow vs. the regular purple; `boss` sfx still layered on top of
  `hit`.

---

## 2026-05-21 — Cocky idle (asymmetric guard, hip cock, breathing sway)

Previous idle was symmetric and frozen. Re-posed it as a smug
"about-to-fight teenager" — alive, asymmetric, layered with slow
wobble so it never holds a single frame.

- **Asymmetric arms**: lead (left) hand floats *forward and out* as a
  loose half-guard (shoulder.x -0.60, .z +0.30, elbow -1.55), while
  the rear (right) hand sits *low and tucked* across the chest
  (shoulder.x -0.18, .z -0.60, elbow -1.85) — "I'm barely guarding."
  The lead arm gets a tiny breath/sway wobble baked into shoulder.x
  and .z so it drifts continuously.
- **Hips / legs**: weight planted on the rear (right) leg with the
  knee nearly straight (load-bearing); lead leg pushed forward with a
  softer knee and the foot kicked out a touch. Hip Z rotation gives a
  contrapposto cock, counter-tilted at the lower torso so the chest
  doesn't lean off-axis.
- **Head**: chin lifted (head.rotation.x -0.13) plus a slight tilt
  (.z +0.10) that drifts with the sway oscillator.
- **Continuous motion**: three layered oscillators driven off
  `performance.now()` — `sway` (slow side-to-side weight shift),
  `breath` (chest rise), `bounce` (small ball-of-feet bob on the
  pelvis). All zeroed when walking.
- Walking explicitly clears all cocky-only channels (pelvis.z,
  lowerTorso.z, head.x, head.z, upperTorso.x/.z) each frame so the
  stride doesn't inherit the contrapposto pose.

Punch animation unchanged — the straight-arm extension lerps from
whichever guard shape the arm currently has toward the same extended
pose, so jabs still snap cleanly out of the new lazy stance.

---

## 2026-05-21 — Boxer stance + straight-punch animation, weaker damage

Retuned the combo to feel like a boxer's jab chain rather than a
wind-up flurry.

- **Idle stance**: orthodox boxer guard. Lead (left) leg forward, rear
  (right) leg back, both knees slightly bent, hips bladed a little.
  Both arms in guard pose — upper arms raised forward ~30°, shoulders
  rotated inward, elbows folded tight so the fists sit by the face.
  Driven only when `!moving` (walking still uses the stride anim).
- **Punch motion**: each hit lerps the active arm from guard to a
  straight extension — shoulder pitches from -0.55 → -1.40 rad
  (forward), shoulder.z from ±0.55 → ±0.05 (rotates out to align), and
  elbow.x from -2.00 → -0.05 (snaps the forearm straight). It reads
  as the arm *straightening* into a jab/cross rather than swinging
  from the shoulder. Decay rate bumped to 7/s for snappier retracts.
- **Damage**: roughly halved. jab/cross/jab now 0.50–0.55× base; the
  4th hard cross is 0.90× (down from 2.0×) with a 0.9 m knockback
  (down from 2.2 m). `boss` sfx still layered on the 4th. The
  finisher lunge (pelvis dip + chest pitch-forward) is gone — these
  are straight punches, not lurches.
- Per-hit cooldown tightened 220 → 200 ms; reset window unchanged
  at 700 ms.

---

## 2026-05-21 — 4-hit punch combo (jab → cross → hook → finisher)

LMB melee is no longer a single strike — it's a chain that alternates
left and right arm with a body torque per punch (reference: Naruto vs
Sasuke fist flurry).

- `COMBO` table in `src/main.js` holds the 4 hits with per-hit `hand`,
  `reach`, `dmgMul`, `knock`, and `swing` amplitude. Defaults:
  jab (L, 2.8 m, 1.0×), cross (R, 3.0 m, 1.0×), hook (L, 2.9 m, 1.1×),
  finisher (R, 3.6 m, 2.0× + 2.2 m knockback + extra burst + `boss`
  sfx layered over the `hit` sfx).
- `COMBO_HIT_CD = 220 ms` between hits inside the chain (down from
  the old 380 ms single-strike cooldown); `COMBO_RESET_MS = 700 ms` —
  pause longer than that and the next click starts at the jab again.
- New animation state: `lArmSwing` / `rArmSwing` (per-hand punch snap,
  decay rate 6/s), `torsoTwist` (signed body torque per punch, decay
  7/s), `lungeAmount` (forward dip + chest pitch on the finisher only,
  decay 4/s). Old single-arm `armSwing` / `swingArm()` removed.
- Walk-anim block in `update()` rewritten to layer these on top of
  the existing stride: left punch torques the chest right and snaps
  the left shoulder + bends the left elbow (and vice versa for right
  punches); the finisher dips the pelvis and pitches the upper torso
  forward.

---

## 2026-05-21 — Construction-style humanoid (player + town NPCs)

Replaced the single-capsule player + NPC bodies with a proper jointed
humanoid built off the user's anatomy/construction reference (separate
pelvis / abdomen / chest boxes, jointed shoulders → elbows → wrists,
jointed hips → knees → ankles, wedge hands and boots, boxy head with
jaw + hair cap + bangs).

- New `buildHumanoid(opts)` helper in `src/main.js`. Opts cover height
  scale + per-region materials (skin / hair / coat / pants / boots /
  belt) + an optional chest-accent stripe + an optional `'high'`
  collar. Returns a Group anchored at feet with joint pivots exposed
  on `userData`: `pelvisPivot`, `lowerTorsoPivot`, `upperTorsoPivot`,
  `headPivot`, `lShoulder`/`rShoulder`, `lElbow`/`rElbow`,
  `lWrist`/`rWrist`, `lHip`/`rHip`, `lKnee`/`rKnee`,
  `lAnkle`/`rAnkle`.
- `buildPlayerModel()` is now a one-liner around `buildHumanoid` with
  the JJK navy coat + cyan chest stripe + the existing aura
  PointLight.
- `makeNpc()` calls `buildHumanoid` with role-tinted coat, then
  applies a role pose: mission-board clerk holds a clipboard in the
  raised right hand; smith leans slightly forward, hammer gripped in
  the right hand, leather apron over the chest, anvil prop unchanged;
  Jujutsu High contact stands with arms crossed (rotated shoulders +
  fully bent elbows). The `_head`/`_ring`/`_mk`/`_t` userData hooks
  are preserved, so the existing per-frame NPC idle (marker spin,
  ring pulse, head-track player) keeps working.
- Walk animation in `update()` now drives the joint pivots: opposite-
  phase hips with knees bending on the backswing for proper foot
  pickup, counter-swing arms with elbows bending on the return, a
  light pelvic bob in step with the stride, and a subtle torso twist.
  Right-arm attack swing is baked into `rShoulder` + `rElbow`. Idle
  pose has a tiny breathing bob. Old `larm`/`rarm`/`lleg`/`rleg` flat
  capsules are gone.

`main.js` is now 828 → 1002 lines (most growth in the new helper).

---

## 2026-05-21 — Cursed techniques removed (combat = melee + dash)

All fighting styles stripped at the user's request. Removed from
`src/main.js`:

- `TECHNIQUES` dispatcher table, `curTech()`, `spend()`, `techZ()`,
  `techX()`, and the sign-in `chooseTechnique()` picker / `pendingSave`
  handshake.
- The three character kits in full: **Sukuna** (`sukunaDismantle`,
  `sukunaCleave`), **Todo** (`todoBlackFlash`, `todoBoulderKick`),
  **Megumi** (`buildHoundMesh`, `spawnHound`, `megumiDivineDogs`,
  `megumiNue`, `updateAllies`) plus the `allies[]` shadow-hound array.
- Technique-only VFX helpers: `screenFlash`, `explode`, `shockRing`,
  `flashLight`, `camShake` (+ `shakeAmp`/`shakeT` globals and the
  per-frame shake block), `vortexFx`, `ringFx`, `nova`, `coneHit`,
  `spawnTechProj`, plus `projectiles[]` + `updateProjectiles()`.
- Cursed energy: `player.ce` / `player.maxCe`, the regen tick, the HUD
  CE bar (DOM + CSS class), the smith's "Cursed Charm +20 max CE" item
  and `flags.ceBonus`, and the welcome-toast technique-name suffix.
- Save schema: dropped `technique` field from `newSave()`. Existing
  saves with `technique` set are ignored (field never read).
- Input: Z and X are now unbound.
- HUD: controls hint updated to drop "Z / X cursed technique".

Combat is now just LMB M1 (~380 ms cd, front-cone, ~3 m reach) and
Space dash (1.5 s cd, brief i-frames). `burst`, `sfx`, and `toast` are
kept — they're the only feedback the melee path still uses.

---

## 2026-05-19 — Update 3: techniques become DC-3D character kits

The three cursed techniques are re-themed to dungeon-crawler-3d
characters (save keys kept — `strike`/`dismantle`/`flame` — so
existing saves still resolve):

- **`strike` → Megumi (Ten Shadows)**: Z **Divine Dogs** summons a
  white + black shadow hound (new lightweight `allies` system —
  `spawnHound`/`updateAllies`, ~10 s, seek-and-bite nearest curse,
  else heel by the player); X **Nue** calls a lightning strike + AoE
  on the nearest curse in front.
- **`dismantle` → Sukuna**: Z **Dismantle** — a 6-slash red/white
  plane volley streaking forward, each cutting curses in a line;
  X **Cleave** — ~150° front arc, big damage + knockback + huge
  double red sweeping arc + screen flash.
- **`flame` → Todo**: Z **Black Flash** — blink forward, line+landing
  crush, black→red two-stage screen flash + double explosion;
  X **Boulder Kick** — heavy slow rock projectile, big AoE.

Added `screenFlash()` helper + `allies` array (cleared on death /
sign-out alongside curses). HUD/picker pick up the new names/colours
automatically (generic). `node --check` clean.

---

## 2026-05-19 — Update 2: town NPCs replace poles + juicier moves

- **Town people**: the glowing "poles" (board / smith / contact) are
  replaced by `makeNpc()` humanoids — torso/head/arms/legs, role
  clothing + props (board: clipboard + notice board; smith: apron +
  anvil + hammer; contact: crossed arms + high collar). Kept findable
  via a soft ground ring + light + spinning marker. They idle-breathe,
  the marker spins/bobs, the ring pulses, and **they turn to face you**
  when you get close. `userData` API unchanged so proximity/minimap/
  interaction still work.
- **Juicier technique VFX**: new helpers `explode()` (white core flash
  + double shockwave ring + sparks + light + camera shake),
  `shockRing()`, `flashLight()`, `vortexFx()`, and a lightweight
  `camShake()` (applied after the camera each frame). Applied to:
  projectiles (glowing comet trail + spin + big impact explosion),
  Dismantle cleave (sweeping torus slash arc), Flame Nova (huge layered
  blast + rings), Reversal Pull (inward vortex + explosion). All with
  hit/boss SFX.

`node --check` clean.

---

## 2026-05-19 — Update 1: techniques + sound + full grade chain

- **Selectable cursed techniques** (`TECHNIQUES` map): new sorcerers
  pick one at sign-in (overlay picker); stored in `save.technique`.
  Three kits, each with **Z primary + X secondary**:
  - Cursed Strike — Z bolt projectile · X Reversal Pull (yank+dmg).
  - Dismantle — Z close cleave cone · X piercing slash-wave.
  - Flame Arrow — Z explosive arrow · X Flame Nova (AoE).
  `cursedTechnique()` replaced by `techZ()/techX()` + helpers
  (`spawnTechProj`, `coneHit`, `nova`, `ringFx`, `spend`). Projectiles
  now support pierce + per-shot radius/AoE/colour/hit-set.
- **Sound**: tiny WebAudio synth (`audioInit`/`blip`/`sfx`) — no asset
  files. Cues: hit, tech, curse death, hurt, level-up, boss, UI. Audio
  context unlocked on first gesture (sign-in / canvas click).
- **Full grade-exam chain**: generalized `exam_g3` → reusable `exam`
  quest. The Jujutsu High Contact offers the next promotion gated by
  `examReqLevel(grade)` (G4→Lv4, G3→7, G2→10, G1→13) + the cleansing
  quest; each win promotes one grade and re-opens for the next, all
  the way to **Special Grade**. Boss + rewards scale with grade.
- HUD shows grade · technique; hint + welcome toast updated;
  `newSave()` carries `technique`.

`node --check` clean on all 3 JS files.

---

## 2026-05-19 — MVP built (first playable)

New game **Jujutsu — Cursed Roads** scaffolded and built to a playable
MVP in one pass.

**Design phase (committed first):** `CLAUDE.md` + full docs framework
(`design`, `architecture`, `world`, `progression`, `quests`, `save`,
`todo`, `setup`, `testing`, `bugs`, `agents`, `devlog`). Save approach
chosen: **localStorage MVP** behind a swappable `SaveAdapter`.

**Build:**
- `src/save/saveAdapter.js` — interface + `newSave()`.
- `src/save/localStorageAdapter.js` — MVP persistence (`jcr_save_<name>`,
  `jcr_slots`).
- `index.html` / `style.css` — sign-in screen, HUD, overlay panels.
- `src/main.js` — full MVP:
  - analytic hilly heightmap terrain (flattened under town) + scattered
    tree/rock props;
  - town: 9 solid non-enterable houses + board / smith / contact
    interactables + safe-zone (no spawns, slow heal);
  - 3rd-person player (built model, walk/arm anim), pointer-lock
    mouse-look, WASD, sprint, Space dash w/ i-frames;
  - combat: LMB melee arc, Z cursed-technique projectile (CE cost +
    small AoE), CE regen, hit flashes, gore bursts;
  - curse spirits (deformed glow mesh) + grade-scaled spawn director,
    chase/contact-damage AI, boss curse;
  - quests (`exorcism1`, `exam_g3`) with board/contact overlays, HUD
    tracker, grade promotion G4→G3;
  - progression: XP curve, level-ups, smith gold upgrades into
    `save.flags`;
  - name sign-in + autosave (events + 20 s + unload), continue slots;
  - HUD (HP/CE/XP/grade/gold), minimap, toasts, pause overlay.
- Portal: card added to root `index.html` + thumbnail.

`node --check` clean on all 3 JS files. Smoke checklist in
`docs/testing.md`. Roadmap in `docs/todo.md`.

> Scope honesty: houses are exterior-only by design; one hill map; one
> town; one cursed technique; G4→G3. Everything past that is tracked as
> CONTENT/SYSTEMS in `todo.md`.

# Dev Log

Reverse-chronological record of notable changes. Newest first.

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

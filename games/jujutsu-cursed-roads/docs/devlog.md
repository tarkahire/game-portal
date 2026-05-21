# Dev Log

Reverse-chronological record of notable changes. Newest first.

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

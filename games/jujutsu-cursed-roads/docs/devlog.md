# Dev Log

Reverse-chronological record of notable changes. Newest first.

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

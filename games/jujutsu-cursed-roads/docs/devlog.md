# Dev Log

Reverse-chronological record of notable changes. Newest first.

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

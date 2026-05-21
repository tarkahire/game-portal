# Known Issues / Bug Log

Newest first. None blocking the MVP.

## Open
- Camera can graze terrain on very steep slopes (mitigated by a
  `terrainHeight + 1.2` clamp; may still jitter on sharp ridges).
- Curse pathing is straight-line (no terrain/house avoidance) — they
  can clip house corners while chasing.
- House collision is a flat circle (footprint), so very tall roofs
  overhang slightly with no collision (cosmetic only).
- No death penalty (full heal + curses cleared at town) — intentional
  for the MVP; tracked as a design toggle in `docs/todo.md`.
- Combat is now melee-only (techniques removed 2026-05-21). High
  grades may feel harder than during the technique era — re-balance
  curse HP/damage scaling if it becomes a problem.

## Resolved
- (Megumi's shadow hounds clipping house corners while chasing —
  no longer applicable: hounds + all technique allies were removed
  2026-05-21.)

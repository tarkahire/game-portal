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

## Resolved
- (none yet)

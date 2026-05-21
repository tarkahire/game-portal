# Progression

## Grades (the spine)

`Grade 4 → 3 → 2 → 1 → Special Grade`. Stored as `save.grade`
(4 → 0). Rank-up only via a **Grade Exam** boss mission from the
Jujutsu High Contact. Curse HP/damage scale with player grade
(`gradeMul = 1 + (4 - grade) * 0.4`) so the world keeps pace.

The **full chain is implemented** (G4 → 3 → 2 → 1 → Special). One
reusable `exam` quest from the Contact, gated by `examReqLevel(grade)`
(G4→Lv4, G3→7, G2→10, G1→13) + the cleansing quest; each win promotes
one grade and re-opens for the next.

## Combat (current)

Melee + dash only — the three cursed techniques (Megumi / Sukuna /
Todo), the cursed-energy bar, and the sign-in technique picker were
removed 2026-05-21 (see `docs/devlog.md`). LMB does an M1 strike
(~380 ms cd, ~3 m reach, front-cone) and Space is a 1.5 s dash with
brief i-frames.

## Levels

- `xpToNext(lv) = round(60 · lv^1.45)`.
- XP from curse kills (~22) and quest rewards.
- On level up: stats re-derived, full HP restore, toast.

Derived stats (`deriveStats()`):
- `maxHp = 90 + lv·15`
- `damage = 14 + lv·3`  (+ permanent shop `flags.dmgBonus`)

## Cursed Tool Smith (MVP shop)

Gold sinks, permanent upgrades stored in `save.flags`:
- Whetstone — +6 base damage (120 g)

## Skill tree (STRETCH, documented for build-against)

Future: spend per-level skill points on melee sub-nodes (heavier M1,
extra dash charge, dash i-frame extension, lifesteal). MVP auto-scales
stats by level instead of a tree to keep the first build shippable.

# Progression

## Grades (the spine)

`Grade 4 → 3 → 2 → 1 → Special Grade`. Stored as `save.grade`
(4 → 0). Rank-up only via a **Grade Exam** boss mission from the
Jujutsu High Contact. Curse HP/damage scale with player grade
(`gradeMul = 1 + (4 - grade) * 0.4`) so the world keeps pace.

MVP ships **Grade 4 → Grade 3** (one exam). Further exams are content
additions (same pattern, new boss + requirements).

## Levels

- `xpToNext(lv) = round(60 · lv^1.45)`.
- XP from curse kills (~22) and quest rewards.
- On level up: stats re-derived, full HP/CE restore, toast.

Derived stats (`deriveStats()`):
- `maxHp = 90 + lv·15`
- `maxCe = 60 + lv·8`
- `damage = 14 + lv·3`  (+ permanent shop `flags.dmgBonus`)
- `maxCe += flags.ceBonus` (shop)

## Cursed energy

Resource bar; regenerates ~7/s. Cursed Technique (Z) costs 25.
Reverse Cursed Technique heal = planned skill node (stretch).

## Cursed Tool Smith (MVP shop)

Gold sinks, permanent upgrades stored in `save.flags`:
- Whetstone — +6 base damage (120 g)
- Cursed Charm — +20 max CE (100 g)

## Skill tree (STRETCH, documented for build-against)

Spend per-level skill points on technique sub-nodes (extra ability
slots, Domain Expansion, RCT heal, dash i-frames, CE regen). MVP
auto-scales stats by level instead of a tree to keep the first build
shippable; the tree slots into `src/progression/` later without
touching combat.

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

## Cursed Techniques (chosen at sign-in)

New saves pick one of three in `save.technique` (permanent) — each is
a dungeon-crawler-3d character kit (save keys kept for compatibility):
- **Ten Shadows / Megumi** (`strike`): Z **Divine Dogs** (summons a
  white + black shadow hound that hunt curses for ~10 s) · X **Nue**
  (lightning strike + AoE on the nearest curse ahead).
- **Dismantle / Sukuna** (`dismantle`): Z **Dismantle** (forward
  red slash volley, cuts in a line) · X **Cleave** (wide front arc,
  heavy damage + knockback).
- **Black Flash / Todo** (`flame`): Z **Black Flash** (blink-strike,
  black→red detonation) · X **Boulder Kick** (heavy rock projectile).

Z primary, X secondary; both spend cursed energy.

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

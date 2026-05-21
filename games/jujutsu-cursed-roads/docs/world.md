# World & Towns

## Terrain

- **Hilly heightmap**: rolling ground, gentle valleys, ridgelines that
  block sightlines (curses ambush from over a hill). Player is grounded by
  sampling terrain height each frame.
- **Props** (instanced for perf): trees, rocks, shrines/torii, fences,
  lanterns, the odd broken cart. Sparse on open hills, denser near towns.
- **Paths**: visual dirt roads connecting towns — guidance, not walls.
  You can leave the path anywhere.

## Towns (exterior only — you cannot enter houses)

This is a deliberate scope decision: **houses are solid exterior props**.
No interiors, no room LOD, no door logic.

A town =
- A cluster of **non-enterable houses** (9, collide as solid circles).
- **SHIPPED — three walk-up human NPCs** (`makeNpc`), not signposts:
  - **Mission Board clerk** (clipboard + a notice board behind) →
    quest list overlay.
  - **Cursed Tool Smith** (apron, hammer, anvil) → gold upgrades
    overlay (permanent +damage; cursed-tool weapons TBD).
  - **Jujutsu High Contact** (crossed arms, high collar) → Grade Exam
    chain overlay.
  Each idles (breathing, spinning marker, pulsing ground ring) and
  turns to face the player nearby. Press **E** in range.
- A **safe-zone radius**: no curse spawns inside; slow HP regen while
  inside.

MVP: **1 town**. Stretch: 3–4 towns with fast-travel between discovered
boards.

## Veiled Zones

- A **curtain/veil** = a dark translucent dome visible from distance.
- Inside: higher curse density + higher curse grade + better loot; some
  veils contain a **named curse** (mini-boss).
- **Grade-gated**: a Special-Grade veil won't let a Grade 4 player take its
  mission (board refuses; entering anyway = overwhelming curses — soft
  gate via difficulty, not invisible walls).

## Curse Distribution

- Open hills: low-grade curses, sparse, spawned by the director near the
  player out of direct sight.
- Near veils / at night (stretch): denser, higher grade.
- Towns: none (safe).

## World Checklist

- [x] Heightmap terrain + per-frame grounding
- [x] Scattered props (trees + rocks; ~260, none in town)
- [x] 1 town: 9 solid houses + 3 human NPCs + safe radius + town heal
- [ ] 1 veiled zone (dome + gating) — stretch, not built
- [ ] Path decals between key points — stretch, not built

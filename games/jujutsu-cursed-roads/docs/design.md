# Jujutsu — Cursed Roads — Game Design Document

> Vision + future-direction doc. Design phase; nothing here is built yet.

## 1. Elevator Pitch

A JJK-inspired open-world action RPG. You start as the lowest-rank Jujutsu
sorcerer. Roam a hilly countryside of little towns and curse-infested
backroads, take missions from Jujutsu High, exorcise cursed spirits with a
**cursed technique** and a **cursed tool (sword)**, gain XP, level up, and
climb the **grade system** from Grade 4 to **Special Grade**. Sign in with a
name; your progress autosaves.

## 2. Core Fantasy

"I am a rising sorcerer." Every session you feel stronger: a new technique
slot, a sharper sword, a higher grade, a scarier curse you can now beat.

## 3. Core Loop

```
Roam the hills  →  spot a curse / pick up a mission at a town board
      →  fight (cursed technique + sword + cursed energy)
      →  gain XP + cursed-energy mastery + gold
      →  level up → unlock technique/sword nodes
      →  pass a Grade Exam (boss mission) → rank up
      →  harder curses + new areas open  →  repeat
```

Session length target: a quest is 3–8 minutes. Always something nearby.

## 4. The World

- **Hilly open terrain**: a rolling heightmap with paths, trees, rocks,
  shrines/torii, fences. Traversal is part of the game — curses ambush you
  between objectives.
- **Little towns (exterior only)**: clusters of houses you **cannot enter**
  (deliberate scope choice). A town has a **Mission Board**, a **Cursed
  Tool Smith**, and a **Jujutsu High contact** NPC. Towns are safe (no curse
  spawns inside the town radius).
- **Veiled zones**: a dark dome on the horizon marks a curtain/veil. Inside
  = stronger curses, better rewards, sometimes a named curse.
- **Day/night (stretch)**: night raises curse count + grade.

Full spec: `docs/world.md`.

## 5. Progression

- **Grades**: Grade 4 → 3 → 2 → 1 → Special Grade. Each rank-up is a scripted
  **Grade Exam** boss mission. Grade gates which veiled zones / missions you
  can take and which technique/sword nodes you can buy.
- **Levels**: XP from kills + missions → level → +max HP, +max cursed energy,
  +base damage, +1 skill point.
- **Skill tree**: spend skill points to unlock/upgrade cursed-technique
  abilities (the Z/X/C/V/F + Domain slots) and passive nodes (CE regen,
  movement, reverse cursed technique heal).
- **Cursed tools (swords)**: bought from the Smith or found in veils; each is
  a swappable weapon with its own moveset. Examples: Playful Cloud, Inverted
  Spear of Heaven, Slaughter Demon, Split Soul Katana, Soul Solid.

Full spec: `docs/progression.md`.

## 6. Combat

- Reuse `dungeon-crawler-3d`'s combat feel: M1 melee combo, Z/X/C/V/F
  abilities, F mobility, dash i-frames, Domain Expansion ultimate, hitstop +
  VFX. Cursed energy is a resource bar abilities spend; **Reverse Cursed
  Technique** heals (unlockable).
- **One starting Cursed Technique** at MVP (pick at first sign-in), more
  unlockable later. CTs are loadouts adapted from the existing 12-character
  `definitions.js` kits.
- Curses (enemies) reuse `meshFactory.js` fleshy-horror builders, grouped by
  curse grade so difficulty tracks the player's grade.

## 7. Quests

Mission types (issued at town boards / picked up by roaming):
- **Exorcism** — kill N curses / one named curse in a marked area.
- **Veil clear** — enter a veiled zone, clear it, survive a wave.
- **Escort / patrol** — move an NPC between towns through the hills.
- **Investigation** — visit map markers, trigger a fight at the last one.
- **Grade Exam** — scripted boss; the only way to rank up.

A light story spine threads the Grade Exams (mentor NPC at Jujutsu High
outposts). Full spec: `docs/quests.md`.

## 8. Sign-in & Save (MVP = localStorage)

- First load: a **sign-in screen** — enter a name (acts as the save slot
  key). Returning with the same name resumes; new name = new game.
- **Autosave** to `localStorage` on key events (level up, grade up, quest
  complete, area change) + on a timer.
- All persistence goes through a **save adapter interface** so a real
  backend (Supabase / Vercel KV + Resend magic-link email — the account
  already exists) can be swapped in later with **zero gameplay-code
  changes**. Save schema + adapter contract: `docs/save.md`.

## 9. MVP Scope (first playable)

- 1 hilly map, 1 town (board + smith + contact).
- Player + **1 cursed technique** + **1 starter sword**.
- Levels 1–10; Grade 4 → Grade 3 (one Grade Exam boss).
- 3 quest types: Exorcism, Escort, Grade Exam.
- Curse spawn director (3–4 curse types tiered by grade).
- Name sign-in + localStorage autosave.
- HUD: HP, cursed energy, XP/level, grade, current mission, minimap.

Anything past this is **stretch** (see §11).

## 10. Why This Is Achievable Here

The hard part (3rd-person Three.js combat, anime cursed-technique kits,
domains, curse enemies, VFX) **already exists** in `anime-battle-royale` +
`dungeon-crawler-3d`. This game is a new *shell*: terrain + towns + a
progression/quest/save layer wrapped around proven combat. No backend, no
build step, deploys on Vercel like every other portal game.

## 11. Stretch / Future Vision

- Multiple cursed techniques + technique-swap.
- Domain Expansion vs Domain clashes; Simple Domain.
- Cursed tool affinities / upgrades at the Smith.
- Binding Vows (risk/reward toggles: cap your HP for huge damage, etc).
- Day/night curse surges; "Special Grade incident" world events.
- Online: co-op missions (PeerJS — already used in the portal).
- Real accounts + cloud saves (Supabase + Resend).
- Enterable key buildings (Jujutsu High interior) — later, if scope allows.

## 12. Open Questions

- Tone: faithful JJK names/lore vs. legally-distinct "inspired by"?
- Camera: pure 3rd-person, or 1st/3rd toggle like dungeon-crawler-3d?
- How combat-heavy vs. exploration-heavy should the pacing be?
- Procedural hills vs. one hand-placed authored map for the MVP?

Tracked for resolution before the build starts — see `docs/todo.md`.

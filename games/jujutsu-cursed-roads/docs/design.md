# Jujutsu — Cursed Roads — Game Design Document

> Vision + future-direction doc.
> **Current state: MVP + Updates 1–3 are BUILT and playable** (see
> `docs/devlog.md`). Sections below describe the intended design; where
> the shipped game differs it's noted inline. Remaining/cut scope is
> tracked in `docs/todo.md`.

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
  spawns inside the town radius). **SHIPPED:** the three are walk-up
  **human NPCs** (role clothing/props, idle anim, turn to face you) —
  press **E** to talk; a soft ground ring + marker keeps them findable.
- **Veiled zones**: a dark dome on the horizon marks a curtain/veil. Inside
  = stronger curses, better rewards, sometimes a named curse. *(stretch —
  not yet built)*
- **Day/night (stretch)**: night raises curse count + grade. *(not built)*

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

**SHIPPED:** the full grade chain (G4 → Special) works via one reusable
Grade-Exam quest from the Contact, level-gated. Stats auto-scale per
level (no skill tree yet); cursed *tools* aren't in yet — the Smith
currently sells permanent +damage / +max-CE upgrades for gold.

Full spec: `docs/progression.md`.

## 6. Combat

- Cursed energy is a regenerating resource bar; Z/X spend it. M1 melee +
  Space dash (i-frames). Juicy VFX: explosions, shockwave rings, slash
  arcs, vortex, comet trails, camera shake, WebAudio SFX.
- **SHIPPED:** the player picks **one of three cursed techniques** at
  sign-in (permanent, in `save.technique`). Each is a re-creation of a
  dungeon-crawler-3d character kit in this game's simpler engine —
  **Megumi** (Z Divine Dogs hound-summons / X Nue), **Sukuna**
  (Z Dismantle slash volley / X Cleave arc), **Todo** (Z Black Flash
  blink-detonation / X Boulder Kick). Not a literal code port — DC-3D
  has a different engine/scale. Technique-swap is a future item.
- Curses are deformed glow meshes spawned by a director that scales HP/
  damage with the player's grade.

## 7. Quests

Mission types (issued at town boards / picked up by roaming):
- **Exorcism** — kill N curses / one named curse in a marked area.
- **Veil clear** — enter a veiled zone, clear it, survive a wave.
- **Escort / patrol** — move an NPC between towns through the hills.
- **Investigation** — visit map markers, trigger a fight at the last one.
- **Grade Exam** — scripted boss; the only way to rank up.

**SHIPPED:** Exorcism (board) + the Grade Exam chain (contact). Veil
clear / escort / investigation are stretch. Full spec: `docs/quests.md`.

## 8. Sign-in & Save (MVP = localStorage)

- First load: a **sign-in screen** — enter a name (acts as the save slot
  key). Returning with the same name resumes; new name = new game.
- **Autosave** to `localStorage` on key events (level up, grade up, quest
  complete, area change) + on a timer.
- All persistence goes through a **save adapter interface** so a real
  backend (Supabase / Vercel KV + Resend magic-link email — the account
  already exists) can be swapped in later with **zero gameplay-code
  changes**. Save schema + adapter contract: `docs/save.md`.

## 9. Scope — what actually shipped (MVP + Updates 1–3)

- ✅ 1 hilly heightmap map, 1 town with non-enterable houses + 3 human NPCs.
- ✅ Player, M1 melee, dash; **3 selectable cursed techniques**
  (Megumi / Sukuna / Todo) with Z + X each + the shadow-hound ally system.
- ✅ Levels (uncapped curve); **full grade chain Grade 4 → Special**.
- ✅ Quests: Exorcism (board) + reusable Grade Exam (contact).
- ✅ Grade-scaled curse spawn director + scaling exam boss.
- ✅ Name sign-in + localStorage autosave behind a swappable adapter.
- ✅ HUD (HP/CE/XP/grade·technique/gold), minimap, pause, toasts.
- ✅ WebAudio SFX; juicy VFX + camera shake; smith gold upgrades.

Not yet built (see §11 + `docs/todo.md`): veiled zones, more quest
types, technique-swap/skill tree, cursed *tools*, more towns, sound
polish, model/animation upgrades, real backend.

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

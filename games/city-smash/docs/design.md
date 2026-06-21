# City Smash — Design

## Pillars
1. **Punches feel huge.** The single most important thing: hitting an NPC must launch them with weight, spin, and a satisfying landing. Everything else serves this.
2. **Combos reward rhythm.** Chaining 4 hits into a launcher that catches a crowd is the skill expression. Combo counter + score feed the loop.
3. **Escalating dread.** Pedestrians are cannon fodder; the wave's Titan is the threat. Telegraphed slams you must read and dash through.

## The knockback model
No physics engine. Each NPC is a state machine:
- `walk` — alive AI (wander / shuffle toward player / Titan chase).
- `launched` — impulse applied (`vel` forward+up, random `spin`); integrates `GRAVITY`; hard landings bounce & skid, soft landings → `down`.
- `down` — lies flat, fades out over ~1s, then removed (counts as a smash).
- `dead` — Titan death; removed immediately with a big VFX burst.

Tuning levers live at the top of `main.js` (`GRAVITY`, `PUNCH_REACH`, `PUNCH_CONE`, `COMBO_WINDOW`) and in `hitEnemy()` (`up`/`power` per normal vs launcher).

## Combat loop
1. LMB → `tryPunch()`; `comboStep` cycles 1→2→3→4→1.
2. Steps 1–3: normal knockback, single-ish target in a 55° cone, ~3.2m reach.
3. Step 4 (**launcher**): wider reach + cone, much higher `up`/`power`, shockwave, hitstop, big cam punch — catches crowds.
4. Combo window 1.25s; whiffing or waiting resets to step 0.

## Bosses (Titans)
- One per wave, scale `3.2 + wave*0.25`, HP `120 + wave*60`.
- Stalk the player; when in range, wind up (arms raised, warning ring) ~0.8s then slam: AoE damage + player knockback.
- Take reduced knockback (flinch only) until dead. Launchers and ground-slam (F) do bonus damage.
- 8 cosmetic names cycle (GROM, VESPER, KARNAGE, OBLIVION, BEHEMOTH, NULLBRINGER, THE WARDEN, GIGAS).

## Progression
Endless. `startWave(n)` raises pedestrian density (cap 26) and Titan stats. Score from hits (×combo bonus), launchers, and Titan kills.

## Future vision
See `todo.md`. Headline ideas: selectable characters with unique movesets (reuse the portal's anime roster), grab-and-throw, juggle-launched-enemies-midair, destructible buildings, finisher cutscene on big launches, local co-op.

# Test Plan

No automated tests yet (vanilla browser game). `node --check` on the
three JS files is the CI-lite gate; manual smoke test below.

## Smoke checklist (run after any change)

1. **Sign-in**: new name → **technique picker** overlay (Megumi /
   Sukuna / Todo) → choosing one starts the game; existing name
   resumes straight in with its saved technique; "Continue" slot chips
   work; first click also unlocks audio.
2. **World**: terrain has hills; player grounded walking up/down;
   3rd-person camera follows; pointer lock on click; ESC pauses
   (Resume / Save & Quit).
3. **Town**: 9 houses are solid (no walk-through); the three are
   **human NPCs** (board clerk+notice board / smith+anvil / crossed-arm
   contact) that idle, spin a marker, and turn to face you; `E` prompt
   in range opens the right overlay; HP slowly heals in town; no curses
   spawn in town.
4. **Techniques** (test each kit): **Sukuna** Z slash volley cuts a
   line, X Cleave wide arc + knockback; **Todo** Z Black Flash blinks
   forward + black→red flash/detonation, X Boulder Kick rolls + blasts;
   **Megumi** Z Divine Dogs spawns 2 hounds that hunt curses ~10 s then
   fade, X Nue lightning-strikes nearest curse. All spend CE (blocked
   when low), shake the camera, and play SFX.
5. **Combat**: LMB melee kills nearby curses; CE regens; dash (Space)
   moves + i-frames; hits drain HP; HP 0 → respawn at town (curses +
   hounds cleared).
6. **Quests / grade chain**: accept Cleansing at the board → kills
   count → completes; Contact gates the **Grade Exam** by
   `examReqLevel(grade)` + cleansing; beating the exam boss promotes
   one grade and re-opens for the next, all the way to **Special
   Grade**; boss + rewards scale with grade.
7. **Progression**: XP bar fills, level-up restores HP/CE + SFX/toast;
   smith purchases deduct gold and apply permanently.
8. **Save**: reload, sign in same name → level/grade/gold/quests/
   technique persist. Save & Quit → sign-in with progress kept (curses
   + hounds despawned).

## Known-risk areas

- Camera clipping terrain on steep hills (clamped, watch for jitter)
  and camera-shake offset on slopes.
- Curse director / exam-boss balance vs. grade scaling.
- Ally hounds use straight-line seek (no wall/house avoidance).
- localStorage quota / disabled storage (adapter logs and degrades).
- Many short-lived FX use per-effect `requestAnimationFrame` — fine at
  MVP scale; pool if curse/FX counts climb.

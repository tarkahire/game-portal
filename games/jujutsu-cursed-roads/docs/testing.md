# Test Plan

No automated tests yet (vanilla browser game). `node --check` on the
three JS files is the CI-lite gate; manual smoke test below.

## Smoke checklist (run after any change)

1. **Sign-in**: new name → game starts immediately (no technique
   picker); existing name resumes straight in; "Continue" slot chips
   work; first click also unlocks audio.
2. **World**: terrain has hills; player grounded walking up/down;
   3rd-person camera follows; pointer lock on click; ESC pauses
   (Resume / Save & Quit).
3. **Town**: 9 houses are solid (no walk-through); the three are
   **human NPCs** (board clerk+notice board / smith+anvil / crossed-arm
   contact) that idle, spin a marker, and turn to face you; `E` prompt
   in range opens the right overlay; HP slowly heals in town; no curses
   spawn in town.
4. **Combat**: LMB melee kills nearby curses (front-cone, ~3 m reach);
   dash (Space) moves + brief i-frames; hits drain HP; HP 0 → respawn
   at town (curses cleared). Z and X do nothing — techniques were
   removed and the keys are unbound.
5. **Quests / grade chain**: accept Cleansing at the board → kills
   count → completes; Contact gates the **Grade Exam** by
   `examReqLevel(grade)` + cleansing; beating the exam boss promotes
   one grade and re-opens for the next, all the way to **Special
   Grade**; boss + rewards scale with grade.
6. **Progression**: XP bar fills, level-up restores HP + SFX/toast;
   smith Whetstone purchase deducts gold and applies permanently
   (no CE upgrade — removed).
7. **Save**: reload, sign in same name → level/grade/gold/quests
   persist. Save & Quit → sign-in with progress kept (curses
   despawned). HUD shows no CE bar.

## Known-risk areas

- Camera clipping terrain on steep hills (clamped, watch for jitter).
- Curse director / exam-boss balance vs. grade scaling — combat is
  now melee-only, so high grades may feel harder than before.
- localStorage quota / disabled storage (adapter logs and degrades).
- Many short-lived FX use per-effect `requestAnimationFrame` — fine at
  MVP scale; pool if curse/FX counts climb.

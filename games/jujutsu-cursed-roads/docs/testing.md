# Test Plan

No automated tests yet (vanilla browser game). `node --check` on the
three JS files is the CI-lite gate; manual smoke test below.

## Smoke checklist (run after any change)

1. **Sign-in**: enter a name → game starts; existing name resumes;
   "Continue" slot chips appear and work.
2. **World**: terrain has hills; player is grounded walking up/down;
   camera follows; pointer lock on click; ESC pauses.
3. **Town**: 9 houses are solid (can't walk through / into); board,
   smith, contact show the `E` prompt in range and open overlays; HP
   slowly heals inside the town radius; no curses spawn in town.
4. **Combat**: LMB melee kills nearby curses; Z costs CE and fires a
   projectile with small AoE; CE regens; dash (Space) moves + i-frames;
   taking hits drains HP; HP 0 → respawn at town.
5. **Quests**: accept `exorcism1` at the board → kills count → completes
   → XP/gold paid; contact unlocks `exam_g3` at Lv.4 + cleansing done →
   boss spawns → killing it promotes Grade 4 → Grade 3.
6. **Progression**: XP bar fills, level up restores HP/CE + toast;
   smith purchases deduct gold and apply permanently.
7. **Save**: reload page, sign in same name → level/grade/gold/quests
   persist. Save & Quit returns to sign-in with progress kept.

## Known-risk areas

- Camera clipping terrain on steep hills (clamped, watch for jitter).
- Curse director spawn balance vs. grade scaling.
- localStorage quota / disabled storage (adapter logs and degrades).

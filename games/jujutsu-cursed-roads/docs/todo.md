# TODO / Roadmap

## MVP — DONE (first playable, 2026-05-19)
- [x] Three.js shell, sky/fog, lighting
- [x] Hilly analytic heightmap terrain + props (trees/rocks)
- [x] Town: 9 non-enterable houses (solid), board / smith / contact, safe radius + town heal
- [x] 3rd-person player, mouse-look (pointer lock), WASD, sprint, dash i-frames
- [x] Combat: M1 melee, Z cursed-technique projectile (CE cost), CE regen
- [x] Curse spirits + spawn director (grade-scaled), boss curse, AI chase/attack
- [x] Quests: exorcism + Grade Exam, mission board / contact overlays
- [x] Progression: XP/levels, grade climb (G4→G3), smith gold upgrades
- [x] Name sign-in + localStorage autosave via save adapter
- [x] HUD: HP/CE/XP/grade/gold, mission tracker, minimap, toasts, pause
- [x] Portal card + thumbnail

## NEXT (polish)
- [ ] Sound (hit, technique, curse death, level-up)
- [ ] Death penalty option (lose gold / no full heal) — currently gentle
- [ ] Better player + curse models / animations
- [ ] Save player position + time-of-day

## CONTENT
- [ ] More grade exams (G3→G2→G1→Special) + bigger bosses
- [ ] More cursed techniques (port more from dungeon-crawler-3d kits) + technique select/swap
- [ ] More cursed tools at the smith, with movesets
- [ ] Veiled zones (dome + gating + named curses)
- [ ] Escort / Veil-clear / Investigation quest types
- [ ] More towns + fast-travel between discovered boards

## SYSTEMS
- [ ] Skill tree (`src/progression/`) replacing auto stat scaling
- [ ] Domain Expansion ultimate + Binding Vows
- [ ] Supabase save adapter (real accounts, Resend magic-link) — drop-in
- [ ] Day/night curse surges

## OPEN DESIGN QUESTIONS
- [ ] Faithful JJK naming vs. legally-distinct
- [ ] Procedural vs. authored map as content grows
- [ ] Combat-heavy vs. exploration-heavy pacing tuning

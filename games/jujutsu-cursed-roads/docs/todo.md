# TODO / Roadmap

## MVP — DONE (first playable, 2026-05-19)
- [x] Three.js shell, sky/fog, lighting
- [x] Hilly analytic heightmap terrain + props (trees/rocks)
- [x] Town: 9 non-enterable houses (solid), board / smith / contact, safe radius + town heal
- [x] 3rd-person player, mouse-look (pointer lock), WASD, sprint, dash i-frames
- [x] Combat: M1 melee (~380 ms cd, front-cone)
- [x] Curse spirits + spawn director (grade-scaled), boss curse, AI chase/attack
- [x] Quests: exorcism + Grade Exam, mission board / contact overlays
- [x] Progression: XP/levels, grade climb (G4→G3), smith gold upgrades
- [x] Name sign-in + localStorage autosave via save adapter
- [x] HUD: HP / XP / grade / gold, mission tracker, minimap, toasts, pause
- [x] Portal card + thumbnail

## UPDATE 1 — DONE (2026-05-19)
- [x] Sound (hit, curse death, hurt, level-up, boss, UI) — WebAudio, no assets
- [x] Full grade-exam chain G4→Special (level-gated, scaling bosses/rewards)

## UPDATE 2 — DONE (2026-05-19)
- [x] Town poles replaced with human NPCs (role clothing/props, idle + face-player)

## CURSED-TECHNIQUE REMOVAL — DONE (2026-05-21)
- [x] Strip all 3 cursed techniques (Megumi / Sukuna / Todo), Z/X bindings,
      CE bar + regen + smith CE upgrade, sign-in technique picker, and the
      heavier VFX kit (explosions / shockwaves / slash arcs / vortex / camera
      shake / projectiles / shadow-hound allies). Combat is now M1 + dash.

## NEXT (polish)
- [ ] Death penalty option (lose gold / no full heal) — currently gentle
- [ ] Better player + curse models / animations
- [ ] Save player position + time-of-day
- [ ] Re-introduce cursed techniques with a fresh dispatcher (only if asked)

## CONTENT
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

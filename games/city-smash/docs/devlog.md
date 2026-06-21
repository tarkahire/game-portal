# City Smash — Dev Log

## 2026-06-21 — MVP scaffold
Built from scratch on user request: "fight NPCs in a giant city with punches that send them flying, full combos, and massive scary bosses that spawn."

Shipped:
- Three.js scene: procedural neon city (tower grid, street lines, star dome, boundary walls), moonlit + hemisphere lighting, fog.
- `buildHumanoid()` stylized figure reused for player / pedestrians / Titans.
- Third-person pointer-locked camera with yaw/pitch, follow lerp, shake.
- Player controller: camera-relative WASD, sprint, dash (i-frames), ground slam (F).
- 4-hit combo punch system with launcher on the 4th hit; front-cone hit detection.
- Hand-rolled ragdoll knockback (launched → bounce/skid → down → fade) — the core "send them flying" feel.
- Spawn director: escalating waves, pedestrian density scaling, one scaling **Titan** boss per wave with telegraphed ground slams.
- Juice: hitstop, cam punch/shake, screen flash, impact rings, shockwaves, spark bursts, floating combo counter, banner announcements.
- HUD: health bar, kills/wave/score, combo counter, boss health bar, slam cooldown.
- Title + game-over screens; registered as a portal card (💥).

Decisions:
- No physics engine — knockback is intentionally arcade, tuned for spectacle over realism.
- Single character for the MVP; multi-character roster deferred (see todo).
- `node --check` passes; logic reviewed. Manual in-browser playtest still recommended.

Known rough edges (see todo): down-state lay-flat pose is approximate; no pause menu (ESC only releases mouse); no audio yet; bosses don't path around buildings.

## 2026-06-21 — First-person + visible fists
User feedback: "can't really see anything; want first person and to see your fists." Converted from third-person to **first-person**:
- Camera sits at eye height (2.55m), look direction driven by yaw/pitch, pitch range widened to ±1.1 rad, FOV 75, head-bob while moving.
- Player body mesh hidden; added a **first-person fist viewmodel** (two sleeved fists as children of the camera) that idle-sways while walking and thrusts forward on the matching combo punch (R/L alternate per hit).
- Player now always faces the look direction (punches go where you aim).
- Brightened the scene (hemisphere 1.15, moon 1.9, lighter bg, fog pushed to 90–260) so the city actually reads.

# City Smash — TODO

## Next session priorities
- [ ] **Audio** — punch impacts, launcher whoosh, Titan footsteps/roar, slam boom, music (WebAudio, like jujutsu-cursed-roads).
- [ ] **Playtest pass** — tune knockback magnitudes, combo window, Titan damage/cadence after real play.
- [ ] **Pause menu** — ESC should open a proper pause overlay (currently only releases the mouse).

## Combat depth
- [ ] Grab + throw (hold to grab a nearby NPC, fling them as a projectile that knocks down others).
- [ ] Air juggling — re-hit a launched enemy mid-flight to keep the combo and bounce them higher.
- [ ] Finisher cam — brief slow-mo / cutscene on a big launcher or Titan kill.
- [ ] Player hit reactions / brief stun when slammed.

## Content
- [ ] **Multiple characters** with unique movesets — reuse the portal's anime roster (`dungeon-crawler-3d/src/classes/definitions.js`) and a character-select screen.
- [ ] More Titan archetypes with distinct attacks (charge, projectile, summon adds), not just scaled slammers.
- [ ] Titan pathfinding around buildings (currently walks straight at player).
- [ ] Power-ups dropped by Titans (heal, rage mode, score multiplier).

## Polish / tech
- [ ] Better ragdoll down-pose (proper lay-flat orientation).
- [ ] Destructible / dentable buildings on big impacts.
- [ ] Performance: distance-cull limb animation for far NPCs (mirror dungeon-crawler-3d's 12-tile cull).
- [ ] Mobile/touch controls or at least a "needs keyboard+mouse" notice.
- [ ] Optional local co-op (2nd player), matching the portal's couch-co-op games.

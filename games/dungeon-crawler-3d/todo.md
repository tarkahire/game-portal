# Dungeon Crawler 3D — TODO

## Online Co-op (next major work)
- [ ] **Sync enemies** between host and clients — currently each device runs its own AI/spawn so kills don't match
- [ ] **Sync projectiles + ability effects** so combat is shared
- [ ] **Sync HP damage** events so you can revive teammates / share boss damage
- [ ] **Sync floor transitions** — first device to advance currently leaves others behind
- [ ] **Reconnect mid-game** if a peer drops
- [ ] Show remote player class label more prominently when nearby

## Performance
- [x] Skip enemy animation/billboarding for distant enemies (>12 tiles)
- [ ] Object-pool projectiles, particles, slash trails (started — slash + spark pools exist, particles partial)
- [ ] Dispose of geometries/materials properly when enemies die / floor changes
- [ ] Profile and reduce draw calls — many small meshes per enemy now (tendrils, fur tufts)
- [ ] Consider instanced mesh for fur tufts on multiple wolves at once
- [ ] LOD for far enemies/wolves (swap to simpler mesh past N tiles)

## Bug Fixes
- [ ] Test Horohoro Fist Slam (Z) — verify jump animation + ice spike eruption + freeze VFX + damage
- [ ] Test fist slam at room edges to ensure spikes don't clip walls
- [ ] Verify oversoul stays attached during teleport / dash
- [ ] Confirm wall-collision-blocked dog teleport falls back gracefully if no walkable tile near player

## Polish
- [ ] Sound effects (currently silent) — at least M1 hit, ability cast, enemy death
- [ ] Add screen-space vignette when low HP
- [ ] Boss intro splash — show boss name + portrait briefly when entering boss room
- [ ] Better death/respawn UX — show "Respawning on Floor X" instead of instant teleport

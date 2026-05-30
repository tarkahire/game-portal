# Todo

Prioritized — top is what to tackle next.

## Next (MVP polish)

- [ ] **Camera-aim beam** — currently beam direction = HumanoidRootPart LookVector, which is whatever direction the character is *facing* (a beat behind the camera). Should use camera lookvector instead so the beam goes where you're looking.
- [ ] **Match-aware enemy targeting** — `AbilityHandler.getEnemyOf` returns "any other player in the game". Fine for 1v1, broken for free-for-all. Should look up the caster's current match from `MatchManager` and target their opponent specifically.
- [ ] **Server-side cooldown sync** — server fires nothing back when it accepts a cast. Add a `CastAccepted` remote so the client knows the cast actually went through (helps when server has stricter cooldown).
- [ ] **Lobby spawn** — confirm SpawnLocation is on the lobby floor. Add a SpawnLocation part at (0, 2, 0) explicitly in `Arena.server.lua` if Studio's default ends up elsewhere.
- [ ] **Dead during animation** — if you die during the win banner you stay dead until lobby return. Force-respawn on lobby teleport.

## Combat depth

- [ ] **Sword M1** — 3-hit melee combo, 4 dmg per hit, ~270 ms between hits. Just a fist for now; visual sword later. Closes the no-ability gap and gives close-range pressure.
- [ ] **Block** — hold a key to take 70% reduced damage but can't move/cast. Like the JJK game's F.
- [ ] **Dash** — Space-double-tap or Shift, 0.4s i-frames, 18-stud distance. Crucial for mobility play.

## Characters

- [ ] **Character select** — title screen before lobby with character cards. For now we have 1 character; design the UI so adding more is a card append + Characters.lua entry.
- [ ] **Add Sukuna** (Q Dismantle cone, X Cleaves, R Malevolent Shrine domain, F dash). 150 HP, melee-focused.
- [ ] **Add Toji** (Heavenly Restriction passive: no abilities, 2× M1 damage, 200 HP).

## Persistence / progression

- [ ] **Win/loss tracking** per player via `DataStoreService`. Show their record on the queue button.
- [ ] **ELO rating** — simple 1v1 ELO with K=32. Match players within 200 ELO.
- [ ] **Currency drop on win** — earn shards, spend on character unlocks.

## Polish

- [ ] **Sound effects** — beam whoosh, shockwave bass, blink puff. Roblox audio asset IDs.
- [ ] **Hit feedback** — brief red screen flash + camera shake on taking damage.
- [ ] **Low-HP vignette** — red edge glow under 30% HP.
- [ ] **Match countdown** — 3-2-1 before the arena round starts.

## Bigger ideas

- [ ] **Free-for-all mode** — alternative queue type for 4-8 player FFA on a larger arena. Reuses ability code, needs match-aware targeting (above).
- [ ] **Battle royale** — port the storm logic from `games/anime-battle-royale`.
- [ ] **Mobile touch controls** — on-screen Q/E/R/F buttons + virtual joystick.
- [ ] **Custom character meshes** — instead of standard Roblox blocky character, build the anime characters from parts like dungeon-crawler-3d does in Three.js.

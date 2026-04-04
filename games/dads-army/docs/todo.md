# Feature Tracker — Dad's Army

Status key: `[ ]` planned | `[~]` in progress | `[x]` done

---

## Phase 0: Documentation & Scaffolding

- [x] Create directory structure (src/, docs/, assets/)
- [x] Create CLAUDE.md master reference (<200 lines)
- [x] Create core reference docs (setup.md, todo.md, bug.md)
- [x] Create testing docs (test.md, agent.md)
- [x] Create all game system docs (16 files)
- [x] Create vision & process docs (future-vision.md, development-log.md, architecture.md)
- [x] Initial commit and push

---

## Phase 1: MVP — "The Foundation"

### Infrastructure
- [ ] Supabase project creation and auth config (email + Google OAuth)
- [ ] Database schema — core tables (game_servers, players)
- [ ] Database schema — map tables (tiles, tile_adjacency)
- [ ] Database schema — city/field tables (cities, buildings, resource_fields, city_resources)
- [ ] Database schema — military tables (armies, army_units, training_queue)
- [ ] RLS policies for all tables
- [ ] pg_cron tick function (building completion, training completion, resource materialization)
- [ ] Server seed script (999-hex European theater map)

### Frontend — Auth & Navigation
- [ ] index.html entry point with Supabase SDK
- [ ] Login/register screen (email/password only)
- [ ] Server select screen (list available servers, player count)
- [ ] Alignment picker (7 nations with descriptions and bonuses)
- [ ] Scene manager (state machine for switching between screens)

### Frontend — Hex Map
- [ ] Hex grid math (cube/axial coordinates, adjacency, distance)
- [ ] Canvas hex renderer with terrain textures
- [ ] Pan/zoom controls (mouse drag + scroll wheel)
- [ ] Tile selection (click to select, info panel)
- [ ] Tile ownership coloring (player colors on claimed tiles)
- [ ] Minimap overlay
- [ ] Map data loading from Supabase

### Resource Fields
- [x] Claim unclaimed resource tiles
- [x] Build extraction infrastructure on claimed tiles
- [ ] Production rate calculation (base rate * infrastructure level * tech bonuses)
- [ ] Depletion mechanic (gradual reserve reduction per tick)
- [ ] Soil quality for farmland (degradation + fallow recovery)
- [x] Resource display on tile info panel (type, reserves remaining, yield, extraction intensity)
- [x] Extraction intensity toggle (sustainable vs intensive)

### City Building
- [x] Build city on disused land tiles
- [x] Build city on depleted resource tiles (below 20% reserves, with land quality penalties)
- [x] Land quality stat affecting construction costs and building effectiveness
- [x] Building slot system (slots unlock with city level)
- [x] 8-10 core building types with construction queues
- [x] Building upgrade system (level up existing buildings)
- [x] City resource display (stored resources, production rates, storage capacity)

### Supply Lines
- [x] Road construction between tiles
- [x] Resource transport along roads (field → city)
- [x] Supply line visualization on map
- [x] Supply disruption when roads are cut

### Military
- [x] 3 unit types for MVP (infantry, armor, artillery)
- [x] Training queue (select unit type, quantity, view completion timer)
- [x] Army formation (group units into named armies)
- [x] Army movement (select destination, pathfinding, march with ETA)
- [x] Field battle resolution (attack vs defense with terrain modifiers)
- [x] City battle resolution (siege mechanics, fortification bonus)
- [x] War damage to tiles (combat degrades resource yield)
- [x] Battle reports (outcome, casualties, damage dealt)

### Resources (MVP set)
- [ ] Oil — powers future mechanized units (stored for Phase 2)
- [ ] Steel (Iron + Coal combined for MVP simplicity)
- [ ] Food — army upkeep, population sustenance
- [ ] Manpower — train units, construction labor
- [ ] Money — universal currency

### Portal Integration
- [x] Add Dad's Army card to portal index.html
- [x] Create thumbnail for assets/thumbnails/

---

## Phase 2: Strategic Depth

- [ ] Full resource set (Aluminum, Rubber, Copper, Tungsten, Ammunition)
- [ ] Production chains (Iron+Coal→Steel, Bauxite→Aluminum, Oil→Fuel)
- [ ] Research/tech tree UI and mechanics
- [ ] Geological survey (hidden resource discovery)
- [ ] Advanced multi-round combat (category effectiveness matrix)
- [ ] Naval warfare (6 ship types, sea zones, convoys)
- [ ] Air warfare (5 aircraft types, airfields, range, bombing)
- [ ] Alliances and diplomacy (4 tiers, betrayal)
- [ ] Fog of war + fog of resources

---

## Phase 3: War Economy

- [ ] Supply chain system (roads, railways, sea routes, capacity)
- [ ] Troop stranding mechanic
- [ ] Debt & banking (NPC loans, player lending, bankruptcy)
- [ ] Trade routes + embargoes
- [ ] Intelligence system (scouting, code breaking, deception)
- [ ] Structural engineering (bridges, railways, fortifications)
- [ ] Quality vs quantity research paths
- [ ] Standalone structures outside cities

---

## Phase 4: Endgame & Polish

- [ ] Server lifecycle tuning (depletion rates, pacing)
- [ ] Multiple victory conditions
- [ ] Coalition mechanic
- [ ] Scorched earth tactics
- [ ] Field-to-city conversion
- [ ] Leaderboard + scoring
- [ ] Tutorial + new player experience
- [ ] UI/UX polish, animations, sound
- [ ] Mobile responsiveness
- [ ] Pay-to-play monetization implementation

---

## Future Integrations (Optional, No Phase Assigned)

- [ ] **Google OAuth sign-in** — Add "Sign in with Google" as an alternative login method. Requires: Google Cloud Console OAuth credentials, enable Google provider in Supabase, uncomment Google button in index.html/main.js/AuthManager.js. See setup.md for full steps.
- [ ] **Stripe integration** — Premium subscriptions and server entry fees for monetization
- [ ] **Custom SMTP via Resend** — Re-enable email confirmations with reliable delivery. User has a Resend account. Configure in Supabase Dashboard → Project Settings → Auth → SMTP Settings. Add `emailRedirectTo` option to AuthManager.signUp(). Currently disabled for dev convenience.
- [ ] **Responsive design** — Improve UI/UX across different screen sizes and devices. Resource bar, side panels, action bar, and minimap need dynamic sizing. Touch controls for mobile. Breakpoints for tablet/phone.

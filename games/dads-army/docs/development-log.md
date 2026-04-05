# Development Log — Dad's Army

A chronological record of what was built, decisions made (and why), problems encountered, solutions found, and lessons learned. This journal exists so that building v2 (or a new game) can benefit from everything learned in v1.

---

## 2026-04-05 — Economy Rebalance v2

### What happened
- Major economy rebalance addressing the rare resource gate problem
- Players couldn't build Tank Factories without rubber, creating a chicken-and-egg progression wall
- Added 4 new early-game units (Militia, Scout Car, Infantry Gun, Armored Truck) requiring only basic resources
- Removed rare resource requirements from Level 1-2 buildings (Tank Factory, Shipyard, Munitions Factory)
- Added starting stockpiles of all 13 resource types per doctrine, balanced by doctrine strength
- Added synthetic research paths for tungsten, copper, bauxite, and advanced fuel
- Designed and implemented the Engineer Field Discovery system (stage 2/3 hidden resources on all tiles)
- Fixed broken RLS policies on buildings, city_resources, and training_queue tables (c.owner_id→c.player_id)
- Added doctrine-specific tank images for all 7 alignments (Tiger, Sherman, T-34, Churchill, Chi-Ha, M13/40, Char B1)

### Key decisions
- Weaker doctrines (Japan, Italy) get MORE starting rare resources to compensate
- USA (strongest late-game) gets the LEAST rare starting resources
- Stage 2 discovery (3 hours, 20+ engineers) finds moderate resources; stage 3 (12 hours, 60+ engineers) finds rare resources
- Engineers committed to discovery are vulnerable — army can't march during discovery
- Discovered resources are tile properties, not player-specific — any controller sees them
- Success rates scale with engineer count (70-90% for stage 2, 40-70% for stage 3)

### Lessons learned
- RLS policy bugs are silent killers — queries return empty results instead of errors
- The cities table column rename (owner_id→player_id) in migration 016 was only partially applied
- Building costs need careful balancing between accessibility and strategic depth

---

## 2026-04-03 — Project Kickoff

### What happened
- Created the Dad's Army game concept: persistent WW2 strategy game with depleting resource fields, 999-hex map, 45-day server cycles
- Established the full project documentation framework (Phase 0)
- Chose Supabase as the backend (user has a paid account)
- Chose vanilla JS + Canvas for frontend (consistent with rest of game portal)

### Key decisions made

**1. Resource depletion as core mechanic**
Why: Most persistent strategy games (Supremacy 1914, Tribal Wars, Travian) have infinite resources, which means they need artificial win conditions. Depleting resources creates natural server progression — the world itself is the timer. Players who manage resources sustainably outlast those who don't. This emerged from researching Factorio's ore patch depletion and Anno's fertility systems.

**2. Field battles vs City battles — dual combat dynamic**
Why: Separating resource control from city control creates strategic depth. Players must decide: attack the fortified city, or raid the exposed resource fields? Weaker players can harass stronger ones through guerrilla field raids. This also means war damages the very things you're fighting over (resource fields), creating a genuine dilemma.

**3. Cities on depleted resource tiles**
Why: As fields deplete, the map evolves. Exhausted fields can become city sites (with quality penalties). This prevents dead tiles accumulating and keeps the map dynamic. Land quality penalties ensure pristine disused land remains premium.

**4. 999 hex tiles (not provinces)**
Why: Province-based maps (like Supremacy 1914) work at 100-200 provinces but 999 provinces would be too dense. Hex grid gives granularity for individual resource fields, standalone structures, and tactical positioning.

**5. 45-day server max**
Why: Persistent strategy games often die slowly as dominant players grind out remaining opponents. A hard time limit ensures every server has a conclusion. 45 days is long enough for deep strategy but short enough to stay exciting.

**6. WW2 only (for now)**
Why: Trying to build a multi-era system from day 1 would explode scope. WW2 gives the richest set of mechanics (land, sea, air, intel, economy). Future eras noted in future-vision.md for later.

**7. Pay-to-play, not pay-to-win**
Why: Competitive integrity is the game's core value proposition. Players must trust that skill and strategy determine outcomes. Revenue from subscriptions and cosmetics, never gameplay advantages.

**8. Supabase over custom backend**
Why: pg_cron handles game ticks, PostgreSQL is ideal for relational game data, built-in auth saves months, Realtime subscriptions for live updates. If we outgrow it, we can migrate (it's standard Postgres). User already has a paid account.

**9. Comprehensive documentation before code**
Why: A game this complex needs clear design docs as source of truth. Every system (resources, combat, naval, air, intelligence, diplomacy, economy, fortifications, etc.) gets its own detailed doc. This prevents scope creep, enables consistent implementation, and allows future developers (or AI agents) to understand the system without reading all the code.

### Lessons (early)
- The research phase (WW2 resources, game mechanics from existing games) was invaluable. Real historical constraints (Germany's oil crisis, Japan's rubber dependency, USSR's food crisis) directly inspired game mechanics.
- Nation alignments based on real military doctrines feel authentic and create genuinely different playstyles.
- The troop stranding mechanic (supply cut → attrition cascade) adds strategic depth that most browser strategy games lack.

---

## 2026-04-04 — Supabase Setup & First Login

### What happened
- Completed full Supabase infrastructure setup: 28 tables, RLS policies, 13+ RPC functions, pg_cron game tick, seed data
- Generated 999-hex European Theater map with terrain and resource distribution
- Achieved first successful user registration and login
- Server list loads showing "European Theater #1"

### Bugs encountered and fixed (9 bugs — see bug.md for full details)

**BUG-001: SQL Editor silent failures** — Supabase SQL Editor stops executing after the first statement in multi-statement pastes without showing errors. Lesson: always run statements individually.

**BUG-002 & BUG-003: Column name mismatches (owner_id vs player_id)** — The biggest issue of the day. Schema files used `player_id` on cities/armies/resource_fields, but RLS policies and RPC functions used `owner_id`. Root cause: schema, policies, and functions were generated by separate AI agents that assumed different column names. Required rewriting all RLS policies and all 13+ functions. Lesson: when generating related SQL files in parallel, establish a column naming convention document FIRST and give it to all agents.

**BUG-004: Hex spiral direction vectors** — The tile generation used hex neighbor directions instead of ring walk directions, producing scattered tiles instead of a compact hexagonal grid. Adjacency count was 1286 instead of expected ~2800. After fix: 2886. Lesson: hex math is subtle — ring walking uses a different direction set than neighbor lookup. Always verify adjacency counts after map generation.

**BUG-005: Seed data column mismatches** — Same root cause as BUG-002/003. Seed INSERT statements referenced columns that didn't match the deployed schema. Required creating fixed seed files.

**BUG-006: Chat copy-paste injects \r characters** — Copying SQL with JSON from chat embeds invisible carriage returns that break PostgreSQL JSON parsing. Lesson: for any SQL containing JSON strings, write to local files and copy from editor, never from chat.

**BUG-007: Supabase credentials in wrong location** — User placed real credentials in the `if` warning check instead of the `const` declarations. Lesson: make credential placeholders more obvious, or use environment variable patterns.

**BUG-008: Query references non-existent column** — `getActiveServers()` queried for `player_count` which is computed, not stored. Also had wrong status filter values. Lesson: verify queries against actual schema before deploying.

### Lessons learned

1. **Agent-generated SQL needs a shared column convention**: When multiple AI agents generate related SQL (schema, policies, functions, seeds), column name mismatches are almost guaranteed. Solution: generate a column reference sheet first, share it with all agents.

2. **Run SQL one statement at a time in Supabase**: The SQL Editor silently fails on multi-statement batches. Don't trust "Success" if you pasted multiple statements.

3. **Verify map generation with adjacency counts**: A hex grid with N tiles should have approximately 3N edges (minus boundary effects). If adjacency is significantly lower, the generation has a bug.

4. **Don't copy SQL with JSON from chat**: Write to files instead. Chat formatting injects invisible characters that break JSON parsing.

5. **Schema-first development works**: Despite the column naming issues, having the full schema deployed before functions meant we could test and fix incrementally. The schema was the source of truth.

### Current state
- Supabase fully operational: auth, database, RLS, functions, cron, seed data
- Login and registration working
- Server list displaying "European Theater #1"
- Next: alignment selection, then hex map renderer

---

## 2026-04-04 (continued) — Hex Map + Tile Interaction

### What was built
- **Hex map renderer**: HexGrid.js (math), HexCamera.js (pan/zoom), HexRenderer.js (Canvas rendering)
- **999 hex tiles** rendered with terrain colors, resource dots, ownership borders, labels
- **Pan and zoom**: mouse drag to pan, scroll wheel to zoom, camera follows player territory
- **Tile selection**: click any hex to see info panel (terrain, owner, resource, reserves, land quality)
- **Minimap**: bottom-right overview of full map with gold viewport rectangle
- **Resource bar**: top bar showing player's capital city resources
- **Tile action buttons**: Claim Tile, Develop Resource, Build City — context-sensitive based on tile state
- **Auto-documentation system**: doc-map.json, doc-audit.sh, Stop hook, project-playbook.md

### Bugs fixed (BUG-010 through BUG-018)
- BUG-010: sort_order column doesn't exist on definition tables
- BUG-011: align.key should be align.id — Confirm & Deploy button did nothing
- BUG-012/013/014: More column name mismatches in tile/city/resource queries
- BUG-015: Player ID type mismatch — owned tiles showed as "Enemy"
- BUG-016: Build City showing on tiles that already have cities (Number type cast fix)
- BUG-017: Farmland not detected as resource (terrain_type fallback needed)
- BUG-018: Mountains incorrectly allowed city building (terrain whitelist added)

### Lessons learned
1. **Screenshot debugging is invaluable**: Screenshots 5-8 from the user immediately revealed button logic issues that console logs wouldn't catch. Always ask for screenshots of UI problems.
2. **Data type awareness**: Supabase returns INTs as numbers but Set comparison needs explicit `Number()` casts when mixing with JSON data. Never assume types match across query boundaries.
3. **Terrain vs resource distinction**: Farmland is both a terrain type AND a resource type. The seed data doesn't always set both consistently. Need fallback logic to handle both cases.
4. **Whitelist > blacklist for terrain rules**: Instead of "not water and not mountain", use a whitelist of city-buildable terrains. Easier to maintain and catches edge cases.

### Current state
- Full hex map rendering with 999 tiles, pan/zoom, tile selection
- Tile action buttons working (Claim, Develop, Build City)
- Next: city management panel, building construction, unit training

---

## 2026-04-04 (continued) — Extraction Intensity + Visual Feedback

### What was built
- **Extraction intensity selector**: Tile info panel now shows infrastructure level, production rate, status, and a 3-button intensity selector (Sustainable 0.7x / Normal 1.0x / Intensive 1.5x) for developed resource fields. Intensive is disabled below infrastructure level 3. Wires up to `set_extraction_intensity` RPC.
- **Owned tile visual feedback**: Hex map now renders a semi-transparent color tint over owned tiles — gold for the current player, player colors for enemies. Tiles are clearly distinguishable as owned vs unclaimed.
- **City markers**: Tiles with cities now show a small gold house icon on the hex, visible at moderate zoom levels and above.
- **Resource field info in panel**: Developed tiles show infrastructure level, field status (productive/declining/exhausted), and production rate per tick.

### Bugs found & fixed
- **BUG-019**: `set_extraction_intensity` RPC references `v_field.owner_id` but resource_fields table uses `player_id` — same root cause as BUG-002/003. SQL fix file created (`011_fix_extraction_intensity.sql`), needs to be run in Supabase.
- **BUG-020**: `isLand` variable was referenced in `showTileInfo` but never defined, causing ReferenceError when clicking unclaimed tiles. Added the missing declaration.

### Queries added
- `getResourceFieldForTile(tileId, serverId)` — fetch resource field record for a tile
- `setExtractionIntensity(fieldId, intensity)` — call RPC to change extraction mode

### Current state
- Tile interaction is now **complete** (claim, develop, build city, extraction intensity, visual feedback)
- Next: city management panel (building slots, construction queue, resource production)

---

## 2026-04-04 (continued) — City Management Panel

### What was built
- **City panel UI**: Click a city tile → "View City" button → opens full city management panel showing city name, level, capital status, resource stockpiles with production rates, and building slot grid.
- **Building slots**: Shows all slots for the city level (3/5/8/12/16 per level 1-5). Occupied slots show building name, level, category. Under-construction slots show ETA countdown. Empty slots have dashed "Build" buttons.
- **Build picker**: Clicking an empty slot opens a categorized building picker (military, production, economy, research, defense, infrastructure) showing all 22 building types from building_defs with costs and build times.
- **Building upgrades**: Completed buildings show an "Upgrade to Lv X" button with resource costs. Calls the upgrade_building RPC.
- **Construction via game tick**: Buildings start at level 0 (constructing), complete_buildings tick function levels them up when construction_completes_at passes.

### Queries added/fixed
- Fixed `getCityBuildings`: wrong table name (`city_buildings` → `buildings`) and 3 wrong column names (BUG-022)
- Added `upgradeBuilding` query calling the upgrade_building RPC

### SQL fixes created (012_fix_building_functions.sql)
- `build_building`: owner_id → player_id, parse costs from JSONB, parse build time from JSONB, match by id not name, fix slot counts
- `upgrade_building`: same fixes
- `complete_buildings`: owner_id → player_id

### Current state
- City management is **complete** (building slots, construction, upgrades, resource display)
- Next: military system (train units, form armies, march to destination)

---

## 2026-04-04 (continued) — Military System

### What was built
- **Training UI**: City panel now shows training queue with ETA countdown. "Train Units" button opens a picker showing all available units filtered by the city's military buildings (barracks→infantry/artillery, tank factory→armor). Select unit type, enter quantity, units begin training.
- **Army management panel**: "View Armies" button in city panel opens army panel showing garrison units, field armies at this city, and other armies elsewhere. Shows unit composition (type, quantity, HP%).
- **Form army**: "Form Field Army" button creates a named field army from all garrison units at the city.
- **March orders**: "March" button on field armies enters destination selection mode. Click any land tile → "March Army Here" button sends the army marching via BFS pathfinding with ETA.
- **Army sprites on map**: Non-garrison armies render as shield icons on the hex map — gold for your armies, red for enemies. Marching armies show an arrow indicator. Multiple armies on the same tile are offset.
- **17 unit types seeded**: 5 infantry (riflemen, MG, mortar, engineers, paratroopers), 5 armor (light/medium/heavy tank, armored car, halftrack), 7 artillery types, all with full stats, costs, and prerequisites.

### SQL fixes created (013_fix_military_functions.sql)
- `train_units`: owner_id→player_id, training_cost→train_cost, training_time_ticks→train_time, match by id
- `form_army`: owner_id→player_id, INSERT uses player_id, hp_percent/experience column names
- `march_army`: owner_id→player_id, destination_tile_id→destination_tile, unit_defs join by id
- `complete_training`: owner_id→player_id for cities and armies

### Current state
- Military system is **complete** (train, form, march, map sprites)
- Next: combat resolution (field battles, city battles, battle reports)

---

## 2026-04-04 (continued) — Combat System

### What was built
- **Server-side combat engine** (resolve_combat): Deterministic multi-round combat with category effectiveness matrix (infantry/armor/artillery rock-paper-scissors), terrain modifiers (forest +20% def, mountain +40% def, river crossing -20% atk), city defense bonus (+50%), fortification bonuses, morale system (rout when morale drops to 0), diminishing attack power as HP depletes.
- **Army arrival resolution** (resolve_army_arrivals): When a marching army arrives at its destination, checks if the tile is hostile. If so, triggers combat. If friendly/unclaimed, the army simply arrives.
- **War damage**: Combat inflicts war damage on the tile (5-25 per battle), permanently reducing land quality. Discourages fighting repeatedly over the same land.
- **Battle reports**: Full battle report stored with army snapshots, round-by-round HP/morale data, modifiers applied, war damage caused. Both attacker and defender get notifications.
- **Battle reports panel**: "Battles" button in action bar opens a panel listing all recent battles with color-coded results (win/loss/draw). Click to expand detailed view showing army compositions, round-by-round HP and morale tracking.
- **Combat predictor**: Client-side JS implementation of the same combat algorithm. Shows predicted outcome (Likely Victory / Probable Victory / Pyrrhic Victory / Uncertain / Defeat) when selecting a march destination on an enemy tile. Currently predicts vs undefended (defender garrison is fog-of-war hidden).
- **Experience system**: Surviving units gain +10 XP per battle.

### SQL fixes (014_fix_combat_functions.sql)
- `resolve_army_arrivals`: owner_id→player_id, destination_tile_id→destination_tile
- `resolve_combat`: all column fixes + battle_reports INSERT rewritten to match actual table schema (result, attacker_army_snapshot, defender_army_snapshot, modifiers_applied, attacker_losses, defender_losses, war_damage_caused)

### Current state
- Combat system is **complete** (resolution, reports, predictor, war damage, XP)
- Next: supply & roads, then portal integration to finish Phase 1

---

## 2026-04-04 (continued) — Supply, Roads & Portal Integration — PHASE 1 COMPLETE

### What was built
- **Road building**: "Road" button in action bar enters road build mode. Click first owned tile (start), then adjacent owned tile (end) to build a road (50 money, 10 steel). Roads halve movement cost and extend supply range from 10 to 15 hexes.
- **Road visualization**: Dashed tan lines drawn between adjacent road-connected tiles on the hex map.
- **Supply range overlay**: "Supply" button toggles a green tint overlay showing all tiles within supply range of your cities (10 hexes without roads, 15 with roads).
- **Supply chain processing**: Server-side tick function checks army supply status based on hex distance to nearest friendly city, with road bonus. Armies lose supply progressively: supplied → low → critical → desperate → collapsed.
- **Portal integration**: Dad's Army card added to portal index.html with description and tags (Strategy, Multiplayer, Persistent, WW2).

### SQL fixes (015_fix_supply_functions.sql)
- `process_supply_chains`: owner_id→player_id, supply_status values matched to schema CHECK constraint
- `degrade_fortifications`: owner_id→player_id

### Phase 1 MVP — COMPLETE
All planned MVP features are now built:
- Auth (login/register)
- 999-hex map (renderer, pan/zoom, minimap, tile selection)
- Tile interaction (claim, develop, build city, extraction intensity)
- City management (building slots, construction, upgrades, resource display)
- Military (training, garrison, form army, march orders, map sprites)
- Combat (multi-round resolution, battle reports, combat predictor, war damage, XP)
- Supply & Roads (road building, visualization, supply range overlay, supply chain tick)
- Portal integration (game card on landing page)

### Next: Phase 2 — Strategic Depth
Full resource set, production chains, research tree, naval/air warfare, alliances/diplomacy, fog of war.

---

## 2026-04-04 (continued) — Phase 1.5: Fog of War

### What was built
- **Server-side fog of war**: `get_visible_tiles` RPC computes vision from cities (2-hex), armies (1-2 hex based on unit type), and owned tiles (1-hex). Returns all 999 tiles with `fog_state` (visible/stale/unexplored). Sensitive data (owner, resources, fortifications) is NULLed on non-visible tiles. Previously explored tiles show terrain but marked stale.
- **`get_visible_armies` RPC**: Only returns enemy armies within the player's vision range. Your own armies always visible.
- **`explore_on_arrival` function**: When armies move to a tile, all tiles within their vision range are marked as explored for the player.
- **`vision_range` column**: Added to unit_defs. Armored cars get 2-hex vision, all others 1-hex.
- **Fog overlay in renderer**: Unexplored tiles rendered with dark overlay (88% opacity). Stale tiles rendered with dim overlay (55% opacity). Visible tiles render normally.
- **Minimap fog**: Unexplored tiles dark, stale tiles dimmed, visible tiles full color.
- **Tile info fog**: Unexplored tiles show "Unexplored territory. Send scouts to reveal." Stale tiles show warning "info may be outdated" and no action buttons. Only visible tiles allow interaction.

### Key decisions
- **Hybrid approach**: All 999 tiles are sent to client (needed for map shape) but sensitive columns stripped server-side. This prevents data-mining while keeping rendering simple.
- **Vision sources**: Cities (2), troops (1-2), owned tiles (1). Players start seeing only ~15-20 tiles out of 999.
- **Stale state preserved**: Previously explored tiles remember terrain and last-known owner. Encourages scouting to update information.

### Current state
- Fog of war is **complete**
- Next: troop-based territory control (remove click-to-claim)

---

## 2026-04-04 (continued) — Fish, City Upgrades, Warehouse, Slot Alignment

### Investigation findings
- **Fish**: Database CHECK constraint blocked 'fish' resource type entirely. Fish tiles were seeded but couldn't be stored.
- **City upgrades**: No upgrade_city RPC or UI existed. Cities were permanently level 1 with 3 slots.
- **Warehouse**: storage_capacity effect defined but never applied. All cities stuck at default 500.
- **Slot mismatch**: SQL used 3/5/7/9/12 but docs specified 3/5/8/12/16. Aligned to docs.
- **Research**: Full system missing (no start_research RPC, effects not applied). Deferred to Phase 2.

### What was fixed
- ALTER tiles constraint to allow 'fish' and 'uranium' resource types
- develop_resource_field now handles fish (8.0/tick) and uranium (1.0/tick) base rates
- City upgrade RPC: costs from cities.md (1000/200/100 for Lv2 up to 20000/3000/800 for Lv5)
- Upgrade City button in city panel showing cost and resulting slot count
- City level increases storage capacity (500→1000→2000→4000→8000 per level)
- Warehouse building effects now applied: +500/+1200/+2500 storage per level
- materialize_resources resets and recalculates storage_capacity each cycle
- build_building slot counts aligned to 3/5/8/12/16

---

## 2026-04-04 (continued) — UI Improvements: Tooltips, Commander Screen, Collapsible Panels

### What was built
- **Resource tooltips**: Hovering any resource in the top bar shows a styled tooltip with full name, amount/storage capacity, production rate, and per-city breakdown. Resources now cached across all player cities for accurate totals.
- **Commander Screen**: Full statistics dashboard overlay accessible via "Commander" button. 6 tabs: Overview (territory/army/battle stats), Cities (table of all cities), Resources (all 12 with amounts/rates/storage bars), Military (units by category, army list, garrison), Research (tech tree status), Battles (win/loss/draw stats + history).
- **Collapsible sections**: City panel sections (Resources, Buildings, Training, Garrison) now expand/collapse on click with smooth animation. State persists across panel refreshes via sessionStorage.
- **Code extraction**: Started populating `src/ui/` directory — CollapsibleSection.js, ResourceTooltip.js, CommanderScreen.js. Reduces main.js bloat.

### Architecture decisions
- Extracted UI components to separate modules in src/ui/ (first step toward breaking up main.js)
- Resource data now aggregated across all cities, not just the capital
- Commander Screen uses full-screen overlay (not side panel) for dashboard-width content
- Collapsible state stored in sessionStorage (persists within tab, resets on new session)

---

## 2026-04-04 (continued) — Resource Function Fixes & RLS Cleanup

### Bugs fixed (BUG-032 through BUG-043)
Continued cleanup of owner_id→player_id mismatches and type errors across resource and military functions:

- **BUG-032**: deduct_player_resource used owner_id and REAL instead of DOUBLE PRECISION
- **BUG-033**: get_player_resource_total used owner_id
- **BUG-034**: materialize_resources v_effect_val was REAL — crashed on non-numeric building effects (e.g., 'enables' JSON arrays)
- **BUG-035**: materialize_resources only ran every 5th minute — production rates stayed at 0
- **BUG-036**: Farmland resource type mapped to 'farmland' not 'food' in city_resources
- **BUG-037**: Fish resource type blocked by tiles CHECK constraint
- **BUG-038**: City tiles showed as 'claimed' (50% yield) instead of 'occupied'
- **BUG-039**: Missing resource types (aluminum, rubber, tungsten) in city_resources CHECK constraint
- **BUG-040**: No city upgrade RPC or UI existed — cities stuck at level 1
- **BUG-041**: Warehouse storage_capacity effect never applied
- **BUG-042**: build_building SQL had wrong slot counts (3/5/7/9/12 → 3/5/8/12/16)
- **BUG-043**: armies and army_units RLS had no policies — all reads blocked

### Lessons learned
1. **RLS "no policy" is silent denial**: When RLS is enabled but no policies exist, all queries return empty results with no error. This is especially insidious because the data exists and the query is correct — you just can't see it. Always verify RLS policies exist after enabling RLS on a table.
2. **Type precision matters in PostgreSQL**: REAL vs DOUBLE PRECISION mismatch in function signatures causes hard failures. Always match the column's declared type exactly.
3. **Non-numeric JSONB values need guards**: Building effects contain both numeric values (e.g., storage_capacity: 500) and non-numeric values (e.g., enables: ["infantry"]). Any function iterating over effects must check for numeric types before casting.
4. **pg_cron tick alignment**: A function scheduled to run every minute but with an internal "only run on ticks divisible by 5" guard will silently skip most runs. Verify that scheduled functions actually execute by checking resource amounts after a few tick cycles.

### Current state
- All 43 bugs fixed (BUG-001 through BUG-043)
- Phase 1.5 in progress: fog of war, tile control, fish/uranium, city upgrades, warehouse, resource functions, RLS all done
- Next: troop-based territory control, resource development rework, research tree UI

---

## 2026-04-04 (continued) — Army Management Overhaul

### What was built
- **Selective unit picker**: "Form Field Army" now opens a picker with +/- quantity controls per unit type. Player chooses exactly which units and how many to include. Shows unit name, category, ATK/DEF stats, and available quantity.
- **Army detail view**: Each army in the panel now shows full unit composition (type, quantity, HP%). No longer just a total count.
- **Army action buttons**: Idle armies show March, Fortify, Return to Garrison, Disband. Fortified armies show Unfortify, Return to Garrison, Disband. Marching armies show status only.
- **Fortify stance**: New `fortify_army` RPC sets army to 'fortified' status. +20% defense bonus noted for combat integration. `unfortify_army` returns to idle.
- **Return to garrison**: New `garrison_army` RPC dissolves field army and transfers all units back to city garrison. Requires army to be on a player-owned city tile.
- **Disband army**: New `disband_army` RPC permanently destroys army and all units. Requires confirmation.
- **Status colors**: idle=green, marching=gold, fortified=blue with shield emoji, fighting=red.

### SQL: 027_army_actions.sql (6 statements)
- Added 'fortified' to armies status CHECK constraint
- fortify_army, unfortify_army, garrison_army, disband_army RPCs
- Note: fortified defense bonus integration in resolve_combat deferred

### Deferred to next iteration
- Army split (divide into two)
- Army merge (combine two on same tile)
- Patrol mode with waypoints
- Player-ordered retreat

---

## 2026-04-04 (continued) — Visual Overhaul Phase 1: Map Rendering + Typography

### What was built
- **TextureManager** (`src/map/TextureManager.js`, ~370 lines): Procedurally generates terrain textures on offscreen canvases — 13 terrain types x 4 variants = 52 cached textures. Each terrain type has unique pattern: forest=canopy dots, mountain=jagged lines, farmland=plowed rows, water=wave arcs, desert=stipple dots. Also generates parchment paper overlay texture, noise grain, and 10 resource silhouette icons (oil derrick, pickaxe, wheat, fish, etc.).
- **10-Layer Rendering Pipeline** (HexRenderer rewrite, ~480 lines): Complete rewrite of the render method into a layered system: textured terrain (clip+drawImage), terrain edge blending (gradient fades between different terrain types), paper overlay (parchment multiply blend), selective borders (only at ownership boundaries, not every hex), elevation shadows (mountains/forests cast SE shadows), animated road dashes, textured fog of war (noise grain on unexplored tiles), resource silhouette icons, NATO-style rectangular army counters (blue=friendly, red=hostile, with X for infantry), vignette post-processing.
- **Typography Upgrade**: Google Fonts "Oswald" (military headings) + "Special Elite" (typewriter) loaded. Applied to all headings, panel headers, collapsible titles, action buttons, commander tabs.
- **CSS Panel Reskin**: Panel headers get olive gradient backgrounds. Buttons get sharp 2px corners with text shadows. "CLASSIFIED" watermark on side panels (very subtle). Commander tabs use Oswald font.

### Key visual changes
- Flat colored hexes → textured terrain with patterns
- Borders on every hex → borders only at ownership boundaries
- Colored dots for resources → silhouette icon sprites (oil derrick, pickaxe, wheat, etc.)
- Shield-shaped army counters → NATO rectangular counters with type icons
- System fonts → Oswald headings + Special Elite body
- Flat fog of war → noise-textured fog
- No post-processing → vignette + paper overlay
- Round buttons → sharp military 2px corners

---

## 2026-04-05 — Visual Overhaul Phases 2-3: Cities, Counters, Dossier UI, CityScene

### Phase 2
- Zoom-dependent city rendering (dot→silhouette→detailed buildings with walls/tower/flag)
- City name+level banner with dark background
- NATO army counters with shadow depth, double borders, army name labels
- Health bars below counters
- Status indicators: ▶ marching, ◆ fortified
- Terrain labels only on empty tiles at very high zoom
- Resource labels at higher zoom threshold
- Minimap click-to-pan

### Phase 3A — CSS Dossier Reskin
- Side panels: gradient backgrounds, khaki borders, deeper shadows
- Tile info rows: Special Elite typewriter font, Oswald uppercase labels
- Action buttons: olive gradients, sharp 2px corners, letter spacing
- Commander overlay: inner shadow, olive-accented stat cards, khaki table headers
- Login/server/alignment screens: matching dossier aesthetic
- Panel rows: Oswald labels, Special Elite values

### Phase 3B — CityScene Full-Screen Overlay
- New src/scenes/CityScene.js (~350 lines)
- Full-screen overlay replacing 340px side panel for city management
- Two-column layout: resources+garrison (left), buildings+training (right)
- City upgrade card with cost display
- Collapsible sections (Resources, Garrison, Buildings, Training)
- Build picker and train picker sub-views
- Live construction countdown timers
- ESC key and click-outside to close

---

*More entries will be added as development progresses.*

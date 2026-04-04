# Bug Tracker — Dad's Army

Severity: `CRITICAL` (game-breaking) | `HIGH` (major feature broken) | `MEDIUM` (incorrect behavior) | `LOW` (cosmetic/minor)

Status: `OPEN` | `IN PROGRESS` | `FIXED` | `WONTFIX`

---

## Template

```
### BUG-XXX: [Short description]
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Status**: OPEN
- **Reported**: YYYY-MM-DD
- **Fixed**: —
- **Steps to reproduce**:
  1. ...
  2. ...
  3. ...
- **Expected behavior**: ...
- **Actual behavior**: ...
- **Fix notes**: ...
```

---

## Open Bugs

*(No open bugs)*

---

## Fixed Bugs

### BUG-043: armies and army_units RLS had no policies — all reads blocked
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Load game → army queries return empty arrays despite armies existing in the database
- **Expected behavior**: Players can read their own armies and army_units
- **Actual behavior**: RLS was enabled on armies and army_units tables but no policies were created, so all SELECT/INSERT/UPDATE/DELETE operations were silently blocked
- **Fix notes**: Added SELECT/INSERT/UPDATE/DELETE policies for both armies and army_units tables, scoped to player_id ownership.

### BUG-042: build_building SQL had wrong slot counts (3/5/7/9/12 instead of 3/5/8/12/16)
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: City levels 1-5 allow 3/5/8/12/16 building slots per CLAUDE.md spec
- **Actual behavior**: build_building function used 3/5/7/9/12 slot limits
- **Fix notes**: Aligned slot counts in build_building SQL to match documented values (3/5/8/12/16).

### BUG-041: Warehouse storage_capacity effect never applied
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: Warehouse buildings increase city storage capacity (+500/+1200/+2500 per level)
- **Actual behavior**: storage_capacity effect was defined in building_defs but never read or applied by materialize_resources. All cities stuck at default 500 storage.
- **Fix notes**: Updated materialize_resources to reset and recalculate storage_capacity each cycle, applying base capacity per city level plus warehouse building effects.

### BUG-040: No city upgrade RPC or UI existed — cities stuck at level 1
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: Players can upgrade cities from level 1 to 5, unlocking more building slots and storage
- **Actual behavior**: No upgrade_city RPC existed and no UI button was available. All cities permanently level 1 with 3 slots.
- **Fix notes**: Created upgrade_city RPC with costs from cities.md (1000/200/100 for Lv2 up to 20000/3000/800 for Lv5). Added "Upgrade City" button to city panel showing cost and resulting slot count. City level now increases base storage capacity (500/1000/2000/4000/8000).

### BUG-039: Missing resource types (aluminum, rubber, tungsten) in city_resources
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: city_resources table supports all resource types including aluminum, rubber, tungsten
- **Actual behavior**: CHECK constraint on city_resources.resource_type did not include aluminum, rubber, or tungsten
- **Fix notes**: ALTER TABLE to expand CHECK constraint to include all required resource types.

### BUG-038: City tiles showed as 'claimed' (50% yield) instead of 'occupied'
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: Tiles with cities should be at 'occupied' control level (75% yield) or higher
- **Actual behavior**: City tiles had control_level = 'claimed' giving only 50% yield
- **Fix notes**: Updated tile control logic so city tiles are set to 'occupied' control level at minimum.

### BUG-037: fish resource type blocked by tiles CHECK constraint
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Fish tiles seeded but resource_type couldn't be stored
- **Expected behavior**: tiles table accepts 'fish' as a valid resource_type
- **Actual behavior**: CHECK constraint on tiles.resource_type did not include 'fish', blocking all fish tile storage
- **Fix notes**: ALTER TABLE to expand CHECK constraint to include 'fish' and 'uranium'. Also updated develop_resource_field to handle fish (8.0/tick) and uranium (1.0/tick) base rates.

### BUG-036: farmland resource type mapped to 'farmland' not 'food' in city_resources
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: Farmland tiles produce 'food' resource type in city_resources
- **Actual behavior**: Farmland resource type was mapped as 'farmland' in city_resources instead of 'food'
- **Fix notes**: Fixed resource type mapping so farmland terrain produces 'food' in city_resources.

### BUG-035: materialize_resources only ran every 5th minute — production rates stayed at 0
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: materialize_resources runs every game tick, updating production rates and resource amounts
- **Actual behavior**: pg_cron schedule was set to every 5 minutes but the function only executed on ticks divisible by 5, meaning resources never accumulated and production_rate stayed at 0
- **Fix notes**: Fixed tick scheduling so materialize_resources runs and updates resources on every tick cycle.

### BUG-034: materialize_resources v_effect_val was REAL — crashed on non-numeric building effects
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: materialize_resources processes all building effects including non-numeric ones (e.g., 'enables' arrays)
- **Actual behavior**: v_effect_val declared as REAL caused a crash when encountering non-numeric building effects like JSON arrays for 'enables' keys
- **Fix notes**: Changed v_effect_val handling to skip non-numeric effect values instead of trying to cast them to REAL.

### BUG-033: get_player_resource_total used owner_id
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: Function queries cities by player_id
- **Actual behavior**: get_player_resource_total referenced owner_id which doesn't exist on cities table
- **Fix notes**: Changed owner_id to player_id. Same root cause as BUG-002/003.

### BUG-032: deduct_player_resource used owner_id + wrong type signature (REAL instead of DOUBLE PRECISION)
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Expected behavior**: Function deducts resources from player's cities using player_id and correct numeric type
- **Actual behavior**: deduct_player_resource referenced owner_id (doesn't exist on cities) and used REAL type instead of DOUBLE PRECISION, causing type mismatch errors
- **Fix notes**: Changed owner_id to player_id and REAL to DOUBLE PRECISION in function signature.

### BUG-031: Cities RLS policies reference owner_id instead of player_id
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Fix notes**: All 4 cities policies (SELECT/INSERT/UPDATE/DELETE) use owner_id. Fixed in `sql/016_critical_fixes.sql` statement 3.

### BUG-030: join_server creates capital city with owner_id instead of player_id — city never created
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Join a server → enter game → console shows "0 cities"
- **Expected behavior**: Capital city created with starting resources
- **Actual behavior**: INSERT into cities uses `owner_id` (doesn't exist), silently fails. Player and tiles created but no city. All city-dependent features broken: no city markers, no resource bar, no building, no training, no armies.
- **Fix notes**: Same root cause as BUG-002/003 but in the join_server function. Also affects build_city RPC and all cities RLS policies. **Fix file**: `sql/016_critical_fixes.sql` — run ALL 4 statements.

### BUG-029: armies.is_garrison column missing — causes 400 on every armies query
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Load game → console shows `column armies.is_garrison does not exist`
- **Actual behavior**: getAllArmies fails with 400, cascading to affect city loading and all downstream features
- **Fix notes**: Column was noted in BUG-002 as needing ALTER TABLE but was never run. **Fix file**: `sql/016_critical_fixes.sql` statement 1.

### BUG-028: process_supply_chains and degrade_fortifications use owner_id instead of player_id
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Fix notes**: **Fix file**: `sql/015_fix_supply_functions.sql`.

### BUG-027: getPlayerBattleReports uses wrong column names
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Fix notes**: Changed to use player_id lookup, correct column names (result, occurred_at, attacker/defender_army_snapshot, etc.).

### BUG-026: resolve_combat and resolve_army_arrivals have column mismatches + battle_reports INSERT wrong schema
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Actual behavior**: owner_id→player_id, ud.name→ud.id, avg_hp_percent→hp_percent, destination_tile_id→destination_tile, experience_level→experience. Battle report INSERT used columns that don't exist on the table.
- **Fix notes**: **Fix file**: `sql/014_fix_combat_functions.sql`.

### BUG-025: panel-section-title CSS rule was empty (missing body and closing brace)
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Fix notes**: Restored the missing CSS properties for .panel-section-title.

### BUG-024: getPlayerArmies query uses owner_id and wrong army_units columns
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Fix notes**: Changed owner_id→player_id (via player lookup), unit_def_key→unit_def, health→hp_percent. Added getTrainingQueue and getAllArmies queries.

### BUG-023: Military RPCs (train_units, form_army, march_army, complete_training) have column mismatches
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Call any military RPC
- **Actual behavior**: Multiple crashes: owner_id→player_id, training_cost→train_cost, training_time_ticks→train_time, avg_hp_percent→hp_percent, experience_level→experience, destination_tile_id→destination_tile, unit_defs matched by name instead of id
- **Fix notes**: Same root cause as BUG-002/003/019/021. **Fix file**: `sql/013_fix_military_functions.sql`.

### BUG-022: getCityBuildings query references wrong table and column names
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Open city panel → buildings query fails
- **Expected behavior**: City buildings loaded
- **Actual behavior**: Query uses `city_buildings` (table is `buildings`), `building_def_key` (column is `building_def`), `is_upgrading` (column is `is_constructing`), `upgrade_finishes_at` (column is `construction_completes_at`)
- **Fix notes**: Same root cause as BUG-008/012/013. Corrected all column names in queries.js.

### BUG-021: build_building / upgrade_building / complete_buildings RPCs have multiple column mismatches
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Call build_building or upgrade_building RPC
- **Expected behavior**: Building created/upgraded
- **Actual behavior**: Multiple crashes due to:
  1. `c.owner_id` → should be `c.player_id` (all three functions)
  2. `v_def.cost_money` / `v_def.cost_steel` → don't exist, should parse from `costs_per_level` JSONB
  3. `v_def.build_time_ticks` → doesn't exist, should parse from `build_time_per_level` JSONB
  4. Building def matched by `name` instead of `id`
  5. Slot counts didn't match CLAUDE.md spec (was 3/5/7/9/12, should be 3/5/8/12/16)
- **Fix notes**: Same root cause as BUG-002/003/019 — functions generated with assumed column names. **Fix file**: `sql/012_fix_building_functions.sql`.

### BUG-020: isLand variable undefined in showTileInfo — crashes on unclaimed tile click
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Click an unclaimed land tile on the map
- **Expected behavior**: Tile info panel shows with "Claim Tile" button
- **Actual behavior**: ReferenceError: `isLand is not defined` — the variable was used in the claim button condition but never declared
- **Fix notes**: Added `const isLand = !isWater;` to the showTileInfo function.

### BUG-019: set_extraction_intensity RPC references wrong column name
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Call set_extraction_intensity RPC
  2. Error: `record "v_field" has no field "owner_id"`
- **Expected behavior**: Intensity changes successfully
- **Actual behavior**: Function crashes because it references `v_field.owner_id` but resource_fields table uses `player_id`
- **Fix notes**: Same root cause as BUG-002/003 — schema uses `player_id`, function code uses `owner_id`. **Fix file**: `sql/011_fix_extraction_intensity.sql` — run in Supabase SQL Editor.

### BUG-001: SQL migrations fail silently — Supabase SQL Editor stops after first statement
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Copy entire 002_core_tables.sql (multiple CREATE TABLE statements) into Supabase SQL Editor
  2. Click Run
  3. Only the first table (game_servers) is created, remaining tables silently skipped
- **Expected behavior**: All 6 tables created
- **Actual behavior**: Only game_servers created. No error shown for subsequent statements.
- **Fix notes**: Supabase SQL Editor can silently stop executing after the first statement in multi-statement pastes. Root cause: the `REFERENCES auth.users` on the players table may have caused an issue that wasn't surfaced. **Resolution**: Run each CREATE TABLE statement individually, not as a batch. All future SQL migrations should be pasted one statement at a time.

### BUG-002: RLS policies reference wrong column name — `owner_id` vs `player_id`
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Run 008_rls_policies.sql in Supabase SQL Editor
  2. Error: `column cities.owner_id does not exist`
- **Expected behavior**: RLS policies created for all tables
- **Actual behavior**: Policies fail because schema uses `player_id` on cities, armies, resource_fields, standalone_structures — but policies referenced `owner_id`
- **Fix notes**: The SQL schema (002-007) and RLS policies (008) were generated by separate agents with inconsistent column naming. The schema uses `player_id` for player ownership on cities/armies/resource_fields/standalone_structures, while tiles correctly uses `owner_id`. **Resolution**: Rewrote all RLS policies to use correct column names. Also added `is_garrison BOOLEAN` column to armies table which the functions require but wasn't in the original schema.

### BUG-003: RPC functions reference wrong column names — multiple mismatches
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Run 009_functions.sql in Supabase SQL Editor
  2. Multiple errors on column references
- **Expected behavior**: All 13+ functions created
- **Actual behavior**: Functions fail due to column name mismatches between schema and function code
- **Fix notes**: Mismatches found and fixed:
  - `cities.owner_id` → `cities.player_id`
  - `armies.owner_id` → `armies.player_id`
  - `armies.destination_tile_id` → `armies.destination_tile`
  - `armies.is_garrison` — column didn't exist, added via ALTER TABLE
  - `army_units.avg_hp_percent` → `army_units.hp_percent`
  - `army_units.experience_level` → `army_units.experience`
  - `resource_fields.owner_id` → `resource_fields.player_id`
  - `resource_fields.resource_type` — column doesn't exist on resource_fields (get from tiles)
  - `building_defs` — functions tried to access `cost_money`/`cost_steel` individual columns but schema uses `costs_per_level` JSONB array. Rewrote to parse JSONB.
  - `unit_defs.training_cost` → `unit_defs.train_cost`
  - `unit_defs.training_time_ticks` → `unit_defs.train_time`
  - `notifications.type` → `notifications.notification_type`
  - **Resolution**: Rewrote all 13+ functions with corrected column names. Functions provided in 14 groups for individual pasting.

### BUG-004: Hex spiral uses wrong direction vectors — tiles scattered instead of compact grid
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Run seed_server.sql to generate 999 hex tiles
  2. Run adjacency generation
  3. Check tile_adjacency count — returns ~1286 instead of expected ~2800
- **Expected behavior**: 999 tiles in a compact hexagonal spiral with ~2700-2800 adjacency edges
- **Actual behavior**: 999 tiles generated at scattered positions. Only 1286 adjacency edges (about half expected), meaning many tiles lack proper neighbors.
- **Fix notes**: The hex spiral generation used `dir_q = [1, 1, 0, -1, -1, 0]` and `dir_r = [0, -1, -1, 0, 1, 1]` — these are the 6 hex **neighbor** directions, not the **ring walk** directions. Ring walk requires a different sequence that traces around each ring: `dir_q = [1, 0, -1, -1, 0, 1]` and `dir_r = [0, 1, 1, 0, -1, -1]` (SE, S, SW, NW, N, NE). **Resolution**: Corrected direction vectors in seed_server_v2.sql. After fix: 999 tiles, 2886 adjacency edges.

### BUG-005: Seed data column name mismatches — seed INSERT doesn't match schema
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Run seed_definitions.sql in Supabase SQL Editor
  2. Multiple column-not-found errors
- **Expected behavior**: All seed data inserted (alignments, buildings, units, research)
- **Actual behavior**: INSERT fails due to column mismatches
- **Fix notes**: Mismatches between seed INSERT columns and actual schema:
  - `building_defs`: INSERT referenced `placement_rules` which didn't exist → added column via ALTER TABLE
  - `unit_defs`: INSERT used `cost` (schema: `train_cost`), `special` (schema: `special_abilities`), `required_building`/`required_research` (schema: `prerequisites`). → Rewrote INSERT with correct columns.
  - `tiles` INSERT: used `resource_reserve` (schema: `resource_reserves_total` + `resource_reserves_remaining`), `tile_index` (doesn't exist, should use `id`). → Rewrote INSERT.
  - `tile_adjacency` INSERT: used `tile_id`/`neighbor_tile_id`/`direction` (schema: `tile_a`/`tile_b`, no `direction`). → Rewrote INSERT.
  - Terrain CHECK constraint: seed used `farmland`, `marsh`, `disused` which weren't in the original CHECK. → ALTER TABLE to expand CHECK.
  - Resource CHECK constraint: seed used `fish`, `uranium` which weren't in original CHECK. → ALTER TABLE to expand CHECK.
  - **Root cause**: Schema files and seed files were generated by separate AI agents with different column naming assumptions.
  - **Resolution**: Created fixed seed files (seed_definitions_fixed.sql, seed_buildings_fixed.sql, seed_units_fixed.sql, seed_research_fixed.sql, seed_server_v2.sql) with correct column names.

### BUG-006: JSON paste from chat injects carriage return characters (0x0d)
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Copy SQL with JSON strings from chat conversation
  2. Paste into Supabase SQL Editor
  3. Error: `invalid input syntax for type json... Character with value 0x0d must be escaped`
- **Expected behavior**: JSON strings accepted
- **Actual behavior**: Invisible `\r` (carriage return) characters from chat copy-paste break JSON parsing
- **Fix notes**: Chat messages contain `\r\n` line endings. When JSON string values span the copy boundary, invisible `\r` chars get embedded in the JSON. Supabase/PostgreSQL rejects these. **Resolution**: Write SQL to local files instead of pasting from chat. User opens files in their editor (which handles line endings correctly) and copies from there.

### BUG-007: Supabase credentials left as placeholders after agent commit
- **Severity**: CRITICAL
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. User updates supabaseClient.js with real credentials
  2. Agent commits and pushes code changes
  3. Deployed version still has placeholder `'YOUR_SUPABASE_URL'`
- **Expected behavior**: Real credentials persist through commits
- **Actual behavior**: User had placed credentials in the `if` condition check (line 9) instead of the const declarations (lines 6-7). The const values remained as placeholders.
- **Fix notes**: The user edited the wrong lines — the credentials need to be on the `const` declarations, not in the warning `if` check. **Resolution**: Moved credentials to the correct lines and removed the warning check (no longer needed once real credentials are set).

### BUG-008: Server list query references non-existent `player_count` column
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Log in successfully
  2. Server list screen loads
  3. Console error: `column game_servers.player_count does not exist`
  4. No servers displayed
- **Expected behavior**: Server list shows "European Theater #1"
- **Actual behavior**: 400 error from Supabase, empty server list
- **Fix notes**: The `getActiveServers()` query in queries.js selected `player_count` which is a computed value (COUNT of players), not a stored column on `game_servers`. Also, the status filter used `['active', 'upcoming', 'full']` but our server statuses are `['lobby', 'active', 'paused', 'ended']`. **Resolution**: Removed `player_count` from SELECT, updated status filter to `['lobby', 'active']`, updated main.js server card template to remove player_count reference.

### BUG-016: Build City button shows on capital tile that already has a city
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Click your capital tile — "Build City" button appears even though a city exists
- **Expected behavior**: No Build City button on tiles with existing cities
- **Actual behavior**: _hasCity flag failed due to type mismatch (INT vs Number in Set comparison)
- **Fix notes**: Cast both `city.tile_id` and `tile.id` to `Number()` before Set comparison.

### BUG-017: Farmland tiles show Build City instead of Develop Resource
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Click a farmland tile you own — shows "Build City" not "Develop Resource"
- **Expected behavior**: Farmland detected as resource tile, showing Develop Resource button
- **Actual behavior**: Some farmland tiles have `terrain_type = 'farmland'` but `resource_type = NULL`. The hasResource check only looked at resource_type, missing terrain-based resources. Also NULL reserves caused the Develop button check to fail.
- **Fix notes**: Added fallback: `hasResource = !!tile.resource_type || tile.terrain_type === 'farmland'`. Handle NULL reserves as 0. Show "Undeveloped" for tiles with no reserve data.

### BUG-018: Mountain tiles show Build City button
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Click a mountain tile you own — "Build City" appears
- **Expected behavior**: Mountains should not allow city building
- **Actual behavior**: Mountain is `terrain_type !== 'water'` so `isLand` was true, and no resource → canBuildCity was true
- **Fix notes**: Added `isMountain` check and `cityBuildableTerrain` whitelist. Only plains, disused, farmland, forest, desert, marsh allow city building.

### BUG-015: Owned tiles show as "Enemy" — player ID type mismatch
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Join a server and enter the game
  2. Click on one of your gold-bordered starting tiles
  3. Info panel shows Owner: "Enemy" instead of "You"
  4. No action buttons (Claim/Develop/Build) appear on owned tiles
- **Expected behavior**: Owner shows "You", action buttons for Develop Resource or Build City appear
- **Actual behavior**: Owner shows "Enemy", no actions available
- **Fix notes**: Two code paths pass `data.player` to the game scene differently. `getPlayerOnServer` returns a full player object `{id: "uuid", ...}` for returning players, but `joinServer` RPC returns just a UUID string `"uuid"` for new players. The game scene stored whichever it got as `currentPlayerRecord` and compared it against `tile.owner_id` (always a string). When the player object was passed, `"uuid" === {id: "uuid"}` is always false. **Resolution**: Extract the ID with `typeof playerRaw === 'object' ? playerRaw.id : playerRaw` to always get a string.

### BUG-012: getServerTiles query uses wrong column names
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Game scene loads, tiles query fires
- **Expected behavior**: 999 tiles loaded
- **Actual behavior**: Query references `terrain`, `resource_level`, `has_road`, `has_city` which don't exist
- **Fix notes**: Changed to `terrain_type`, `resource_reserves_total`, `resource_reserves_remaining`, `infrastructure_road`, etc. Same root cause as BUG-008/010 — queries generated with assumed column names.

### BUG-013: getPlayerCities uses `owner_id` and non-existent columns
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Game scene loads, cities query fires
- **Expected behavior**: Player's cities loaded
- **Actual behavior**: Query uses `owner_id` (should be `player_id`) and selects `population`, `morale` which don't exist on cities table
- **Fix notes**: Fixed to use `player_id`, look up player record first, select actual columns (level, is_capital, land_quality_at_founding).

### BUG-014: getCityResources uses `capacity` instead of `storage_capacity`
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**: Resource bar tries to load
- **Expected behavior**: Resource amounts displayed
- **Actual behavior**: Column `capacity` doesn't exist
- **Fix notes**: Changed to `storage_capacity`.

### BUG-011: Confirm & Deploy button does nothing — `align.key` should be `align.id`
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Log in, click server, select an alignment
  2. Click "Confirm & Deploy"
  3. Nothing happens — no error in console, no screen transition
- **Expected behavior**: Player joins server, transitions to game screen
- **Actual behavior**: Button click silently returns because `selectedAlignment` is `undefined`
- **Fix notes**: The alignment card code used `align.key` to set `selectedAlignment` and `card.dataset.alignment`, but the alignment_defs table column is `id` not `key`. So `align.key` evaluates to `undefined`, and the click handler's guard clause `if (!selectedAlignment || ...)` exits early. Also removed reference to `align.bonus_text` which doesn't exist. **Resolution**: Changed `align.key` to `align.id` in both the dataset and click handler.

### BUG-010: Alignment/definition queries reference non-existent `sort_order` column
- **Severity**: HIGH
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Log in and click on a server
  2. Console error: `column alignment_defs.sort_order does not exist`
  3. Alignment picker fails to load
- **Expected behavior**: 7 nation alignments displayed for selection
- **Actual behavior**: 400 error, empty alignment screen
- **Fix notes**: Four queries in queries.js (getAlignmentDefs, getBuildingDefs, getUnitDefs, getResearchDefs) all used `.order('sort_order', ...)` but none of the definition tables have a `sort_order` column. **Resolution**: Changed all four to `.order('name', ...)` which exists on all definition tables.

### BUG-009: Login screen elements not visible — overflow clipping
- **Severity**: MEDIUM
- **Status**: FIXED
- **Reported**: 2026-04-04
- **Fixed**: 2026-04-04
- **Steps to reproduce**:
  1. Open game URL in browser
  2. Login screen title visible but form inputs/buttons may be clipped on smaller viewports
- **Expected behavior**: Full login form visible with email, password, Log In button, and Register link
- **Actual behavior**: Form elements potentially clipped below viewport edge due to `overflow: hidden` on body
- **Fix notes**: Added `overflow-y: auto` to `.screen.active` and `.login-container` with `max-height: 90vh` to allow scrolling if content exceeds viewport. **Resolution**: CSS updated in style.css.

# Agent Testing Playbook — Dad's Army

This document provides step-by-step instructions for an AI agent to autonomously test every game feature. The agent should follow these procedures exactly, verifying expected outcomes at each step.

**Referenced by**: [test.md](test.md)

---

## Prerequisites

Before testing, the agent must:
1. Have access to the game URL (local or staging)
2. Have two test accounts created (Agent_Player1, Agent_Player2)
3. Have a fresh test server seeded with the European theater map
4. Understand the game mechanics as documented in the system docs (see CLAUDE.md for links)

---

## Test Procedures

### TP-001: Authentication Flow

**Mechanic**: Players must create an account and log in to access the game. Auth uses Supabase (email/password + Google OAuth).

**Steps**:
1. Navigate to the game URL → **EXPECT**: Login screen displayed with email/password fields and Google sign-in button
2. Click "Register" with email `test_agent_1@test.com`, password `TestAgent1!` → **EXPECT**: Account created, redirect to server select screen
3. Click logout → **EXPECT**: Return to login screen
4. Log back in with same credentials → **EXPECT**: Server select screen, previous session data preserved
5. Open a new browser tab, navigate to game URL → **EXPECT**: Already logged in (session cookie/token)
6. Try registering with same email → **EXPECT**: Error "Email already registered"
7. Try logging in with wrong password → **EXPECT**: Error message, no access granted

**Stress**: Rapidly log in/out 10 times → **EXPECT**: No errors, no session leaks

---

### TP-002: Server Selection & Alignment

**Mechanic**: Players choose a game server and a nation alignment. Each server has a player count and status. Alignments provide different starting bonuses.

**Steps**:
1. From server select screen → **EXPECT**: List of available servers with name, player count, day number, status
2. Select a server → **EXPECT**: Alignment picker appears showing 7 nations (Germany, UK, USA, USSR, Japan, Italy, France)
3. Each alignment card → **EXPECT**: Shows passive bonus, unique mechanic, starting bias description
4. Select "UK" alignment → **EXPECT**: Player created on server, redirect to world map
5. Check database: `players` table → **EXPECT**: New row with correct user_id, server_id, alignment='uk'
6. Log in as Agent_Player2, join same server, select "Germany" → **EXPECT**: Both players visible on server

**Stress**: Try joining a server you're already on → **EXPECT**: Error or redirect to existing game

---

### TP-003: Hex Map Navigation

**Mechanic**: The game map is a 999-hex grid rendered on HTML5 Canvas. Players can pan (drag), zoom (scroll), and click to select tiles. Each tile has a terrain type, resource type, and ownership.

**Steps**:
1. After joining server → **EXPECT**: World map displayed with 999 hex tiles, terrain textures visible
2. Mouse drag → **EXPECT**: Map pans smoothly in drag direction, no jitter
3. Scroll wheel up → **EXPECT**: Zoom in, hexes get larger, more detail visible
4. Scroll wheel down → **EXPECT**: Zoom out, more hexes visible, less detail
5. Click on a hex tile → **EXPECT**: Tile selected (highlighted border), info panel appears showing: terrain type, resource type (if any), owner, reserves (if resource), coordinates
6. Click on water tile → **EXPECT**: Info shows "Water" terrain, no buildable options
7. Click on mountain tile → **EXPECT**: Info shows "Mountain" terrain, defensive bonus noted
8. Click on resource tile (e.g., Iron Mine) → **EXPECT**: Shows resource type, total reserves, current yield, extraction status
9. Click on disused land → **EXPECT**: Shows "Disused Land", option to build city (if unclaimed)
10. Zoom fully out → **EXPECT**: All 999 tiles visible, performance stays above 30fps
11. Zoom fully in → **EXPECT**: Individual tile details visible, sprites clear

**Stress**: Rapidly pan across entire map while zoomed in → **EXPECT**: No rendering glitches, smooth 60fps

---

### TP-004: Resource Field Claiming & Development

**Mechanic**: Players claim unclaimed resource tiles and build extraction infrastructure. Fields produce resources at a rate determined by infrastructure level. Fields deplete over time, with reserves gradually reducing.

**Steps**:
1. Find an unclaimed Iron Mine tile near starting position → **EXPECT**: Tile shows "Unclaimed" in info panel
2. Click "Claim" → **EXPECT**: Tile ownership changes to player, color updates on map
3. Click "Build Extraction" → **EXPECT**: Construction begins, timer displayed
4. Wait for construction tick → **EXPECT**: Extraction infrastructure built, production rate > 0
5. Check city resources after several ticks → **EXPECT**: Iron (or Steel for MVP) increasing at expected rate
6. Check tile reserves → **EXPECT**: Total reserves decreasing each tick
7. Toggle extraction to "Intensive" → **EXPECT**: Production rate increases, depletion rate increases
8. Toggle back to "Sustainable" → **EXPECT**: Production rate decreases, depletion rate decreases
9. Monitor tile over many ticks until reserves < 50% → **EXPECT**: Tile status changes to "Declining", visible UI indicator
10. Continue until reserves = 0% → **EXPECT**: Tile status "Exhausted", production = 0

**Farmland specific**:
11. Claim a Farmland tile → **EXPECT**: Shows soil quality (starts at 100%)
12. Let it produce food for several ticks → **EXPECT**: Soil quality slowly decreasing
13. Set field to "Fallow" → **EXPECT**: Production stops, soil quality slowly recovering
14. Resume farming → **EXPECT**: Production resumes at rate proportional to current soil quality

---

### TP-005: City Building

**Mechanic**: Cities can be built on disused land (100% quality) or depleted resource tiles (<20% reserves, with quality penalties). Cities have building slots that unlock with level. Buildings have construction queues.

**Steps**:
1. Find a disused land tile → **EXPECT**: "Build City" option available
2. Click "Build City", enter name "TestCity1" → **EXPECT**: City created, city view opens
3. City view → **EXPECT**: Shows building slots (based on city level 1), resource bars, construction menu
4. Open building menu → **EXPECT**: Lists available buildings with costs, build times, descriptions
5. Build a "Barracks" → **EXPECT**: Construction starts, timer shown, resources deducted
6. Wait for tick → **EXPECT**: Barracks completed, slot occupied, building icon visible
7. Build a second building (e.g., Steel Mill) → **EXPECT**: Second slot occupied after completion

**Depleted field city test**:
8. Find an exhausted resource tile (reserves = 0%) → **EXPECT**: "Build City" option available
9. Build city on it → **EXPECT**: City created with land quality < 100%, UI shows quality penalty
10. Compare building costs to TestCity1 → **EXPECT**: Same building costs MORE on degraded land
11. Compare building output → **EXPECT**: Buildings produce LESS on degraded land

**Rejection test**:
12. Click "Build City" on a resource tile with >20% reserves → **EXPECT**: Error "Land still productive, cannot build city"
13. Click "Build City" on a water tile → **EXPECT**: No option available
14. Click "Build City" on an enemy-owned tile → **EXPECT**: No option available

---

### TP-006: Supply Lines

**Mechanic**: Resources must be transported from fields to cities via roads. Roads are built between adjacent tiles. Cutting a road disrupts supply.

**Steps**:
1. Build a road from a resource field to a city (click road tool, select tiles) → **EXPECT**: Road appears on map connecting tiles
2. After several ticks → **EXPECT**: City receives resources from the connected field
3. Check city resource income → **EXPECT**: Shows production from the connected field
4. Destroy the road (or simulate enemy cutting it) → **EXPECT**: Road removed from map
5. After next tick → **EXPECT**: City no longer receives resources from that field
6. Rebuild road → **EXPECT**: Resource flow resumes

---

### TP-007: Military — Training & Army Formation

**Mechanic**: Units are trained at military buildings (Barracks for infantry, etc.). Training takes time. Trained units join the city garrison. Players form armies by grouping units.

**Steps**:
1. With a Barracks built, open training menu → **EXPECT**: Shows available unit types (Infantry for MVP), costs, train time
2. Queue 10 Infantry → **EXPECT**: Resources deducted, training timer starts
3. Wait for training tick → **EXPECT**: 10 Infantry added to city garrison
4. Open Army panel → **EXPECT**: Shows garrison units available
5. Create new army "Strike Force Alpha" → **EXPECT**: Army created, appears in army list
6. Add 5 Infantry to the army → **EXPECT**: 5 Infantry move from garrison to army
7. Army details → **EXPECT**: Shows composition (5x Infantry), total attack/defense stats

---

### TP-008: Army Movement & Pathfinding

**Mechanic**: Armies move across the hex map. Movement uses pathfinding (Dijkstra) with terrain-based movement costs. March takes real time with an ETA.

**Steps**:
1. Select army on map → **EXPECT**: Army highlighted, movement UI activated
2. Click destination tile (3 tiles away, clear terrain) → **EXPECT**: Path shown on map (highlighted hexes), ETA displayed
3. Click destination on mountain tile → **EXPECT**: Path shown but ETA longer (higher movement cost)
4. Confirm march → **EXPECT**: Army begins moving, status changes to "Marching", position updates per tick
5. During march, click army → **EXPECT**: Shows current position, destination, ETA
6. Wait for arrival → **EXPECT**: Army reaches destination tile, status changes to "Idle"
7. March to an unreachable tile (across water with no bridge) → **EXPECT**: Error "No valid path"

---

### TP-009: Combat — Field Battle

**Mechanic**: When an army arrives at an enemy-owned resource field, combat is triggered. Combat is resolved deterministically (attack vs defense with modifiers). The field may sustain war damage.

**Steps**:
1. As Agent_Player1, march army to Agent_Player2's resource field → **EXPECT**: Army arrives, combat triggered
2. After tick → **EXPECT**: Battle report generated showing: attacker army, defender garrison, terrain modifier, result, casualties
3. If attacker wins → **EXPECT**: Tile ownership changes to Player1, surviving army remains
4. Check tile war_damage_level → **EXPECT**: Value > 0 (combat damaged the field)
5. Check tile yield → **EXPECT**: Reduced from pre-battle yield (war damage penalty)
6. Read battle report details → **EXPECT**: Round-by-round breakdown, casualty numbers per unit type

**Undefended field**:
7. March army to enemy field with no garrison → **EXPECT**: Tile captured without combat, no war damage

---

### TP-010: Combat — City Battle

**Mechanic**: City battles use siege mechanics. Cities have base defense + fortifications. Cities are harder to take than fields. Capturing intact is more valuable than destroying.

**Steps**:
1. As Player1, march large army to Player2's city → **EXPECT**: Combat triggered with city defense bonus
2. Battle report → **EXPECT**: Defender has significant defense bonus from city + any fortifications
3. If attacker wins → **EXPECT**: City captured intact (owner changes), buildings preserved
4. If attacker loses → **EXPECT**: Attacker army damaged/destroyed, city remains with defender

**Siege with fortifications**:
5. Player2 builds Walls in city → **EXPECT**: City defense bonus increases
6. Repeat attack → **EXPECT**: Higher defender bonus in battle report, harder to capture

---

### TP-011: Combat — War Damage to Land

**Mechanic**: Battles on resource tiles damage the land, permanently reducing yield. Heavy fighting causes more damage. This creates the strategic dilemma of fighting over fields.

**Steps**:
1. Note a resource field's current yield (e.g., 100 Iron/tick)
2. Fight a small battle on it (few units) → **EXPECT**: Small war damage increase, minor yield reduction
3. Note new yield (e.g., 95 Iron/tick)
4. Fight a large battle on same tile (many units, artillery) → **EXPECT**: Larger war damage increase, significant yield reduction
5. Note new yield (e.g., 70 Iron/tick)
6. Check if war damage is permanent → **EXPECT**: Yield does not recover naturally (or recovers very slowly with engineering investment)

---

### TP-012: Persistence & Multiplayer

**Mechanic**: All game state is stored in Supabase. Players see each other's territories and armies on the shared map.

**Steps**:
1. As Player1, build a city and claim resources → **EXPECT**: State saved
2. Log out Player1 → **EXPECT**: Clean logout
3. Log back in Player1 → **EXPECT**: All cities, fields, armies, resources exactly as left
4. As Player2, view the map → **EXPECT**: Player1's cities and claimed tiles visible with Player1's color
5. Player1 marches army → **EXPECT**: Player2 sees army movement on their map (via Realtime subscription)
6. Both players perform actions simultaneously → **EXPECT**: No conflicts, both state changes persist correctly

---

## Stress Testing Procedures

### ST-001: Map Performance
1. Render full 999-hex map at minimum zoom → Measure FPS (target: >30fps)
2. Pan rapidly across map at max zoom → Measure FPS (target: >50fps)
3. Toggle between hex tiles rapidly (click different tiles) → No UI lag

### ST-002: Game Tick Load
1. Seed server with 50 players, each with 5 cities, 10 resource fields, 5 armies
2. Trigger game tick → Measure execution time (target: <30 seconds)
3. Verify all completions (buildings, training, research) processed correctly
4. Verify all army arrivals resolved correctly

### ST-003: Concurrent Access
1. Open 10 browser tabs, each logged in as a different player on same server
2. All 10 perform actions simultaneously (build, train, march)
3. Verify no database conflicts, all state changes persist
4. Verify Realtime updates reach all tabs

### ST-004: Edge Cases
1. Army at map boundary trying to move off-map → Error handled
2. Build on tile being simultaneously claimed by another player → One succeeds, one gets error
3. Zero resources, try to build/train → Error "Insufficient resources"
4. Combat where both armies are destroyed → Tile becomes unclaimed
5. Server at max players, new player tries to join → Error "Server full"

---

## Test Coverage Matrix

Update this matrix as features are built and tested:

| Feature | Unit | Integration | Gameplay | Stress | Status |
|---------|------|-------------|----------|--------|--------|
| Auth | — | TP-001 | TP-001 | TP-001 | Not started |
| Server join | — | TP-002 | TP-002 | — | Not started |
| Hex map | TP-003 | TP-003 | TP-003 | ST-001 | Not started |
| Resource fields | TP-004 | TP-004 | TP-004 | — | Not started |
| Cities | TP-005 | TP-005 | TP-005 | — | Not started |
| Supply lines | TP-006 | TP-006 | TP-006 | — | Not started |
| Military training | TP-007 | TP-007 | TP-007 | — | Not started |
| Army movement | TP-008 | TP-008 | TP-008 | — | Not started |
| Field combat | TP-009 | TP-009 | TP-009 | ST-002 | Not started |
| City combat | TP-010 | TP-010 | TP-010 | — | Not started |
| War damage | TP-011 | TP-011 | TP-011 | — | Not started |
| Persistence | — | TP-012 | TP-012 | ST-003 | Not started |

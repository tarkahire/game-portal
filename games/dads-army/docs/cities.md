# City System

This document is the source of truth for city placement, levels, building types, construction, capital mechanics, and defense in Dad's Army. All formulas, costs, and balance values defined here are authoritative.

---

## Table of Contents

1. [City Placement Rules](#city-placement-rules)
2. [Land Quality](#land-quality)
3. [City Levels](#city-levels)
4. [Building Types](#building-types)
5. [Construction Queue](#construction-queue)
6. [Capital City](#capital-city)
7. [City Defense](#city-defense)
8. [Edge Cases & Interactions](#edge-cases--interactions)

---

## City Placement Rules

### Where Cities Can Be Built

Cities can only be placed on:

1. **Disused Land tiles** -- land_quality 100%. Ideal locations.
2. **Depleted resource tiles** -- tiles with `remaining_reserves < total_reserves * 0.20` (less than 20% reserves remaining). Must demolish existing infrastructure first (instant, 25% material refund).
3. **Urban/Ruins tiles** -- after scavenging (converts to Disused Land, 100% quality).
4. **Forest tiles** -- forest is cleared during city construction. Grants a one-time -20% construction cost bonus for the initial city placement. After clearing, tile is treated as Disused Land (100% quality).

### Where Cities Cannot Be Built

- Water tiles (Deep or Coastal)
- Mountain tiles
- Active resource tiles (>20% reserves remaining)
- River tiles (too flood-prone)
- Tiles already containing another city
- Tiles currently in combat

### Placement Constraints

- **Minimum spacing**: Cities must be at least 3 hexes apart (hex distance). This prevents stacking and ensures resource tiles between cities remain useful.
- **Maximum cities per player**: No hard cap, but each city consumes Manpower for its garrison and Money for upkeep. Practical limit is 5-8 cities for most players.
- **Starting city**: Each player begins with 1 Level 1 city placed at their spawn location (pre-assigned at server start to ensure fair distribution).

### City Founding Cost

| Resource | Amount |
|----------|--------|
| Money | 500 |
| Steel | 100 |
| Manpower | 50 |
| Build Time | 12 ticks (1 hour) |

The above costs are then modified by land quality (see below).

---

## Land Quality

Land quality is a persistent property of the tile that affects every aspect of city construction and operation.

### Land Quality Values by Tile State

| Tile State | Land Quality Range | Typical Value |
|-----------|-------------------|---------------|
| Disused Land (never exploited) | 100% | 100% |
| Cleared Forest | 100% | 100% |
| Scavenged Urban/Ruins | 100% | 100% |
| Depleted Farmland | 70-80% | 75% |
| Depleted Rubber Plantation | 65-75% | 70% |
| Depleted Copper Mine | 45-60% | 52% |
| Depleted Iron Mine | 40-60% | 50% |
| Depleted Coal Mine | 35-55% | 45% |
| Depleted Oil Field | 45-60% | 52% |
| Depleted Bauxite Mine | 40-55% | 47% |
| Depleted Tungsten Mine | 30-50% | 40% |
| War-Scarred Land | 20-50% | Varies with war_damage |

### Land Quality Effects

#### 1. Construction Cost Multiplier

```
construction_cost_multiplier = 2.0 - (land_quality / 100)
```

| Land Quality | Cost Multiplier | City Founding Cost (Money) |
|-------------|----------------|---------------------------|
| 100% | 1.0x | 500 |
| 80% | 1.2x | 600 |
| 60% | 1.4x | 700 |
| 40% | 1.6x | 800 |
| 20% | 1.8x | 900 |

This multiplier applies to ALL construction in the city: city founding, city upgrades, and all building construction (Money, Steel, and build time are all multiplied).

#### 2. Building Max Level Cap

```
max_building_level = ceil(5 * (land_quality / 100))
```

| Land Quality | Max Building Level |
|-------------|-------------------|
| 100% | 5 |
| 81-100% | 5 |
| 61-80% | 4 |
| 41-60% | 3 |
| 21-40% | 2 |
| 1-20% | 1 |

This means a city built on 40% quality land can never have buildings higher than level 2. This is a permanent, irrecoverable limitation.

#### 3. Building Output Modifier

```
effective_output = base_output * (land_quality / 100)
```

A Steel Mill on 60% quality land produces 60% of its rated output at any level.

#### 4. Land Quality Is Permanent

Land quality cannot be improved. War damage can further reduce it, but nothing increases it. City placement is a permanent strategic decision.

#### War Damage Reduction

When combat occurs on or adjacent to a city tile:

```
new_land_quality = land_quality * (1 - war_damage / 200)
```

Where `war_damage` is from combat.md. Maximum war_damage of 100 reduces land quality by 50%.

---

## City Levels

Cities grow through 5 levels, each unlocking more building slots and improving base capabilities.

| City Level | Building Slots | Base Storage (per resource) | Manpower Generation (per tick) | Money Upkeep (per tick) | Upgrade Cost (Money / Steel / Manpower) | Upgrade Time |
|-----------|---------------|---------------------------|-------------------------------|------------------------|----------------------------------------|-------------|
| 1 | 3 | 500 | 2 | 2 | -- (starting level) | -- |
| 2 | 5 | 1,000 | 4 | 4 | 1,000 / 200 / 100 | 24 ticks (2 hours) |
| 3 | 8 | 2,000 | 6 | 7 | 3,000 / 500 / 200 | 72 ticks (6 hours) |
| 4 | 12 | 4,000 | 10 | 12 | 8,000 / 1,200 / 400 | 144 ticks (12 hours) |
| 5 | 16 | 8,000 | 15 | 20 | 20,000 / 3,000 / 800 | 288 ticks (24 hours) |

### Level-Up Requirements

In addition to resource costs, city upgrades require:

- **Level 2**: No special requirement.
- **Level 3**: Must have at least 1 military building and 1 production building.
- **Level 4**: Must have a Research Lab. Must control at least 3 resource tiles connected to this city.
- **Level 5**: Must have Engineering Corps HQ. Must control at least 5 resource tiles connected to this city.

All costs are subject to the `construction_cost_multiplier` from land quality.

### Building Slots

Each building occupies exactly 1 slot. A Level 3 city with 8 slots can have 8 buildings total. Choosing which buildings to place is a core strategic decision.

Buildings can be demolished to free a slot (instant, no refund). The demolished building is lost entirely.

---

## Building Types

All buildings are organized by category. Each entry includes: costs per level, build time per level, production/effect per level, prerequisites, and upkeep.

**Cost notation**: Money / Steel / Special. Build time in ticks. All costs subject to land quality multiplier.

### Military Buildings

#### Barracks

Trains infantry units. Foundation of any army.

| Level | Cost (M/S) | Build Time | Training Speed | Unit Types Available | Upkeep (M/tick) |
|-------|-----------|------------|---------------|---------------------|-----------------|
| 1 | 200 / 30 | 6 ticks | 1 infantry / 4 ticks | Basic Infantry | 1 |
| 2 | 400 / 60 | 12 ticks | 1 infantry / 3 ticks | + Mechanized Infantry | 2 |
| 3 | 800 / 120 | 24 ticks | 1 infantry / 2 ticks | + Elite Infantry | 3 |
| 4 | 1,600 / 240 | 48 ticks | 2 infantry / 2 ticks | + Paratroopers | 5 |
| 5 | 3,200 / 480 | 96 ticks | 2 infantry / 1 tick | + Commando | 8 |

Prerequisites: None.
Training cost per unit: see unit roster (separate document, Phase 2).

#### Tank Factory

Trains armored units. Requires steady steel and rubber supply.

| Level | Cost (M/S/Rubber) | Build Time | Training Speed | Unit Types Available | Upkeep (M/tick) |
|-------|-------------------|------------|---------------|---------------------|-----------------|
| 1 | 500 / 100 / 20 | 12 ticks | 1 light tank / 8 ticks | Light Tank | 2 |
| 2 | 1,000 / 200 / 40 | 24 ticks | 1 tank / 6 ticks | + Medium Tank | 4 |
| 3 | 2,000 / 400 / 80 | 48 ticks | 1 tank / 4 ticks | + Heavy Tank | 6 |
| 4 | 4,000 / 800 / 160 | 96 ticks | 2 tanks / 4 ticks | + Self-Propelled Gun | 10 |
| 5 | 8,000 / 1,600 / 320 | 192 ticks | 2 tanks / 2 ticks | + Super-Heavy Tank | 15 |

Prerequisites: Steel Mill (level 1+) in same city or connected city.

#### Shipyard (Coastal Only)

Builds naval units. Can only be placed in a city adjacent to coastal/water tiles.

| Level | Cost (M/S) | Build Time | Training Speed | Unit Types Available | Upkeep (M/tick) |
|-------|-----------|------------|---------------|---------------------|-----------------|
| 1 | 600 / 150 | 18 ticks | 1 ship / 12 ticks | Patrol Boat | 3 |
| 2 | 1,200 / 300 | 36 ticks | 1 ship / 10 ticks | + Destroyer | 5 |
| 3 | 2,500 / 600 | 72 ticks | 1 ship / 8 ticks | + Cruiser, Submarine | 8 |
| 4 | 5,000 / 1,200 | 144 ticks | 1 ship / 6 ticks | + Battleship | 12 |
| 5 | 10,000 / 2,500 | 288 ticks | 2 ships / 6 ticks | + Aircraft Carrier | 18 |

Prerequisites: City must be adjacent to a coastal or water tile. Port building (level 1+) required.

#### Airfield

Stations aircraft and determines operational range.

| Level | Cost (M/S/Aluminum) | Build Time | Capacity | Air Range (hexes) | Unit Types Available | Upkeep (M/tick) |
|-------|---------------------|------------|---------|------------------|---------------------|-----------------|
| 1 | 400 / 80 / 20 | 12 ticks | 3 aircraft | 8 | Fighter | 2 |
| 2 | 800 / 160 / 40 | 24 ticks | 6 aircraft | 12 | + Bomber | 4 |
| 3 | 1,600 / 320 / 80 | 48 ticks | 10 aircraft | 16 | + Heavy Bomber | 7 |
| 4 | 3,200 / 640 / 160 | 96 ticks | 15 aircraft | 20 | + Strategic Bomber | 11 |
| 5 | 6,400 / 1,280 / 320 | 192 ticks | 20 aircraft | 25 | + Jet Fighter (research-gated) | 16 |

Prerequisites: Aluminum Smelter (level 1+) in same city or connected city.
Air range: aircraft can operate this many hexes from their home Airfield.

---

### Production Buildings

#### Steel Mill

Converts iron + coal into steel.

| Level | Cost (M/S) | Build Time | Input / Cycle | Output / Cycle | Upkeep (M/tick) |
|-------|-----------|------------|--------------|---------------|-----------------|
| 1 | 300 / 0 | 8 ticks | 4 Iron + 3 Coal | 5 Steel | 1 |
| 2 | 600 / 50 | 16 ticks | 8 Iron + 6 Coal | 11 Steel | 2 |
| 3 | 1,200 / 100 | 32 ticks | 12 Iron + 9 Coal | 18 Steel | 3 |
| 4 | 2,400 / 200 | 64 ticks | 16 Iron + 12 Coal | 26 Steel | 5 |
| 5 | 4,800 / 400 | 128 ticks | 20 Iron + 15 Coal | 35 Steel | 8 |

Prerequisites: None. (Level 1 Steel Mill uses no steel to build -- bootstrapping.)

#### Oil Refinery

Converts crude oil into fuel.

| Level | Cost (M/S) | Build Time | Input / Cycle | Output / Cycle | Upkeep (M/tick) |
|-------|-----------|------------|--------------|---------------|-----------------|
| 1 | 400 / 60 | 10 ticks | 5 Crude Oil | 4 Fuel | 2 |
| 2 | 800 / 120 | 20 ticks | 10 Crude Oil | 9 Fuel | 3 |
| 3 | 1,600 / 240 | 40 ticks | 15 Crude Oil | 14 Fuel | 5 |
| 4 | 3,200 / 480 | 80 ticks | 20 Crude Oil | 20 Fuel | 8 |
| 5 | 6,400 / 960 | 160 ticks | 25 Crude Oil | 27 Fuel | 12 |

Prerequisites: None.

#### Munitions Factory

Converts copper + chemicals into ammunition.

| Level | Cost (M/S) | Build Time | Input / Cycle | Output / Cycle | Upkeep (M/tick) |
|-------|-----------|------------|--------------|---------------|-----------------|
| 1 | 350 / 50 | 8 ticks | 3 Copper + 2 Chemicals | 10 Ammo | 1 |
| 2 | 700 / 100 | 16 ticks | 6 Copper + 4 Chemicals | 22 Ammo | 2 |
| 3 | 1,400 / 200 | 32 ticks | 9 Copper + 6 Chemicals | 36 Ammo | 4 |
| 4 | 2,800 / 400 | 64 ticks | 12 Copper + 8 Chemicals | 52 Ammo | 6 |
| 5 | 5,600 / 800 | 128 ticks | 15 Copper + 10 Chemicals | 70 Ammo | 9 |

Prerequisites: Chemical Plant (level 1+) in same city or connected city.

#### Chemical Plant

Produces fertilizer OR chemicals (guns vs butter).

| Level | Cost (M/S) | Build Time | Input / Cycle | Output / Cycle (single mode) | Upkeep (M/tick) |
|-------|-----------|------------|--------------|------------------------------|-----------------|
| 1 | 300 / 40 | 8 ticks | 3 Coal | 4 Fertilizer OR 4 Chemicals | 1 |
| 2 | 600 / 80 | 16 ticks | 6 Coal | 9 Fert OR 9 Chem | 2 |
| 3 | 1,200 / 160 | 32 ticks | 9 Coal | 15 Fert OR 15 Chem | 3 |
| 4 | 2,400 / 320 | 64 ticks | 12 Coal | 22 Fert OR 22 Chem | 5 |
| 5 | 4,800 / 640 | 128 ticks | 15 Coal | 30 Fert OR 30 Chem | 8 |

Prerequisites: None.
Special: Production slider for Fertilizer vs Chemical allocation. See resources.md for split efficiency penalty.

#### Synthetic Fuel Plant (Research-Gated)

Converts coal into fuel. Emergency fuel source for oil-poor players.

| Level | Cost (M/S) | Build Time | Input / Cycle | Output / Cycle | Upkeep (M/tick) |
|-------|-----------|------------|--------------|---------------|-----------------|
| 1 | 600 / 100 | 16 ticks | 8 Coal | 2 Fuel | 3 |
| 2 | 1,200 / 200 | 32 ticks | 15 Coal | 5 Fuel | 5 |
| 3 | 2,400 / 400 | 64 ticks | 22 Coal | 9 Fuel | 8 |
| 4 | 4,800 / 800 | 128 ticks | 28 Coal | 14 Fuel | 12 |
| 5 | 9,600 / 1,600 | 256 ticks | 34 Coal | 20 Fuel | 16 |

Prerequisites: "Coal Liquefaction" research completed. Research Lab (level 2+).

#### Synthetic Rubber Plant (Research-Gated)

Converts oil into rubber. Removes geographic dependency on plantations.

| Level | Cost (M/S) | Build Time | Input / Cycle | Output / Cycle | Upkeep (M/tick) |
|-------|-----------|------------|--------------|---------------|-----------------|
| 1 | 500 / 80 | 12 ticks | 3 Fuel + 2 Coal | 2 Rubber | 2 |
| 2 | 1,000 / 160 | 24 ticks | 6 Fuel + 4 Coal | 5 Rubber | 4 |
| 3 | 2,000 / 320 | 48 ticks | 9 Fuel + 6 Coal | 9 Rubber | 6 |
| 4 | 4,000 / 640 | 96 ticks | 12 Fuel + 8 Coal | 14 Rubber | 9 |
| 5 | 8,000 / 1,280 | 192 ticks | 15 Fuel + 10 Coal | 20 Rubber | 13 |

Prerequisites: "Synthetic Rubber" research completed. Research Lab (level 2+).

#### Aluminum Smelter

Converts bauxite into aluminum. Requires power.

| Level | Cost (M/S) | Build Time | Input / Cycle | Power Cost / Cycle | Output / Cycle | Upkeep (M/tick) |
|-------|-----------|------------|--------------|-------------------|---------------|-----------------|
| 1 | 400 / 70 | 10 ticks | 6 Bauxite | 2 Coal OR 1 Fuel | 3 Aluminum | 2 |
| 2 | 800 / 140 | 20 ticks | 12 Bauxite | 4 Coal OR 2 Fuel | 7 Aluminum | 3 |
| 3 | 1,600 / 280 | 40 ticks | 18 Bauxite | 6 Coal OR 3 Fuel | 12 Aluminum | 5 |
| 4 | 3,200 / 560 | 80 ticks | 24 Bauxite | 8 Coal OR 4 Fuel | 18 Aluminum | 8 |
| 5 | 6,400 / 1,120 | 160 ticks | 30 Bauxite | 10 Coal OR 5 Fuel | 25 Aluminum | 12 |

Prerequisites: None. Without power, operates at 25% output.

#### Farm Enhancement

Boosts food production of farmland tiles within range. Does not produce food directly.

| Level | Cost (M/S) | Build Time | Boost Range (hexes) | Yield Bonus | Upkeep (M/tick) |
|-------|-----------|------------|-------------------|-------------|-----------------|
| 1 | 200 / 20 | 6 ticks | 3 | +10% | 1 |
| 2 | 400 / 40 | 12 ticks | 3 | +20% | 1 |
| 3 | 800 / 80 | 24 ticks | 4 | +30% | 2 |
| 4 | 1,600 / 160 | 48 ticks | 4 | +40% | 3 |
| 5 | 3,200 / 320 | 96 ticks | 5 | +50% | 4 |

Prerequisites: None.
Special: Multiple Farm Enhancements from different cities do NOT stack on the same farm tile. Only the highest bonus applies.

---

### Economy Buildings

#### Tax Office

Generates money from the city's economic activity.

| Level | Cost (M/S) | Build Time | Money Generation / Tick | Upkeep |
|-------|-----------|------------|------------------------|--------|
| 1 | 150 / 10 | 4 ticks | 5 | 0 |
| 2 | 300 / 20 | 8 ticks | 12 | 0 |
| 3 | 600 / 40 | 16 ticks | 22 | 0 |
| 4 | 1,200 / 80 | 32 ticks | 35 | 0 |
| 5 | 2,400 / 160 | 64 ticks | 50 | 0 |

Prerequisites: None. No upkeep (it generates money, not costs it).

#### Trade Post

Enables resource trading with other players and generates passive trade income.

| Level | Cost (M/S) | Build Time | Trade Tax Reduction | Trade Income / Tick | Max Simultaneous Trades | Upkeep (M/tick) |
|-------|-----------|------------|--------------------|--------------------|------------------------|-----------------|
| 1 | 250 / 30 | 6 ticks | -0% (5% base tax) | 2 | 2 | 1 |
| 2 | 500 / 60 | 12 ticks | -1% (4% tax) | 4 | 4 | 2 |
| 3 | 1,000 / 120 | 24 ticks | -2% (3% tax) | 8 | 8 | 3 |
| 4 | 2,000 / 240 | 48 ticks | -3% (2% tax) | 14 | 12 | 5 |
| 5 | 4,000 / 480 | 96 ticks | -4% (1% tax) | 22 | Unlimited | 8 |

Prerequisites: None. Trade income represents abstract economic activity.

#### Bank

Enables loans (borrow money now, repay with interest later) and generates interest income.

| Level | Cost (M/S) | Build Time | Loan Capacity | Interest Rate (per game-day) | Interest Income / Tick | Upkeep (M/tick) |
|-------|-----------|------------|--------------|-----------------------------|-----------------------|-----------------|
| 1 | 300 / 20 | 8 ticks | 2,000 | 5% | 3 | 1 |
| 2 | 600 / 40 | 16 ticks | 5,000 | 4% | 6 | 2 |
| 3 | 1,200 / 80 | 32 ticks | 10,000 | 3% | 12 | 3 |
| 4 | 2,400 / 160 | 64 ticks | 20,000 | 2.5% | 20 | 5 |
| 5 | 4,800 / 320 | 128 ticks | 50,000 | 2% | 30 | 8 |

Prerequisites: Tax Office (level 1+) in same city.
Loan mechanic: Player can borrow up to Loan Capacity. Interest accrues per game-day (1 real day). Unpaid loans after 3 game-days trigger penalty: -10% all production until repaid.

#### Warehouse

Increases storage capacity for all resource types in this city.

| Level | Cost (M/S) | Build Time | Additional Storage (per resource type) | Upkeep (M/tick) |
|-------|-----------|------------|---------------------------------------|-----------------|
| 1 | 150 / 20 | 4 ticks | +500 | 0 |
| 2 | 300 / 40 | 8 ticks | +1,200 | 1 |
| 3 | 600 / 80 | 16 ticks | +2,500 | 1 |
| 4 | 1,200 / 160 | 32 ticks | +5,000 | 2 |
| 5 | 2,400 / 320 | 64 ticks | +10,000 | 3 |

Prerequisites: None. Stacks with city base storage.

---

### Research Buildings

#### Research Lab

Enables technology research. Research speed scales with level.

| Level | Cost (M/S) | Build Time | Research Speed (points/tick) | Techs Unlocked | Upkeep (M/tick) |
|-------|-----------|------------|-----------------------------|--------------------|-----------------|
| 1 | 400 / 50 | 10 ticks | 1 | Basic techs | 2 |
| 2 | 800 / 100 | 20 ticks | 2.5 | + Intermediate techs | 4 |
| 3 | 1,600 / 200 | 40 ticks | 5 | + Advanced techs | 7 |
| 4 | 3,200 / 400 | 80 ticks | 9 | + Elite techs | 11 |
| 5 | 6,400 / 800 | 160 ticks | 15 | + Secret weapons | 16 |

Prerequisites: None.
Multiple Research Labs across different cities stack research speed (additive).

#### Intelligence Center

Enables espionage, code-breaking, and geological surveys. Extends scouting range.

| Level | Cost (M/S) | Build Time | Scouting Range Bonus | Capabilities | Upkeep (M/tick) |
|-------|-----------|------------|---------------------|-------------|-----------------|
| 1 | 300 / 40 | 8 ticks | +1 hex | Basic scouting | 2 |
| 2 | 600 / 80 | 16 ticks | +2 hexes | + Geological Survey | 3 |
| 3 | 1,200 / 160 | 32 ticks | +3 hexes | + Code Breaking (see enemy movement) | 5 |
| 4 | 2,400 / 320 | 64 ticks | +4 hexes | + Sabotage missions | 8 |
| 5 | 4,800 / 640 | 128 ticks | +5 hexes | + Strategic deception | 12 |

Prerequisites: None.
Scouting range bonus applies to all units and buildings in the same city.

#### Engineering Corps HQ

Enables advanced construction projects: parallel building, bridges, tunnels, advanced fortifications.

| Level | Cost (M/S) | Build Time | Parallel Build Slots | Capabilities | Upkeep (M/tick) |
|-------|-----------|------------|---------------------|-------------|-----------------|
| 1 | 500 / 80 | 12 ticks | +1 (total 2) | Bridge building | 3 |
| 2 | 1,000 / 160 | 24 ticks | +1 (total 3) | + Road speed x2 | 5 |
| 3 | 2,000 / 320 | 48 ticks | +2 (total 4) | + Mountain tunnel | 8 |
| 4 | 4,000 / 640 | 96 ticks | +2 (total 5) | + Rail building speed x2 | 12 |
| 5 | 8,000 / 1,280 | 192 ticks | +3 (total 6) | + Rapid fortification | 16 |

Prerequisites: Research Lab (level 1+).
Parallel build slots: allows this city to construct multiple buildings simultaneously.

---

### Defense Buildings

#### Walls

Basic city defense. Increases defense value and slows enemy assault.

| Level | Cost (M/S) | Build Time | Defense Bonus | Assault Slowdown | Upkeep (M/tick) |
|-------|-----------|------------|--------------|-----------------|-----------------|
| 1 | 200 / 50 | 6 ticks | +50 | +1 combat round | 0 |
| 2 | 400 / 100 | 12 ticks | +100 | +1 combat round | 1 |
| 3 | 800 / 200 | 24 ticks | +175 | +2 combat rounds | 1 |
| 4 | 1,600 / 400 | 48 ticks | +275 | +2 combat rounds | 2 |
| 5 | 3,200 / 800 | 96 ticks | +400 | +3 combat rounds | 3 |

Prerequisites: None.
Assault slowdown: forces additional combat rounds before the city can be captured, giving defenders more time to deal damage.

#### Bunker

Advanced fortification. Resistant to bombardment (artillery and air attacks deal reduced damage).

| Level | Cost (M/S) | Build Time | Defense Bonus | Bombardment Resistance | Garrison Capacity | Upkeep (M/tick) |
|-------|-----------|------------|--------------|----------------------|-------------------|-----------------|
| 1 | 400 / 100 | 12 ticks | +100 | 20% | +100 troops | 1 |
| 2 | 800 / 200 | 24 ticks | +200 | 30% | +200 troops | 2 |
| 3 | 1,600 / 400 | 48 ticks | +350 | 40% | +350 troops | 4 |
| 4 | 3,200 / 800 | 96 ticks | +550 | 50% | +500 troops | 6 |
| 5 | 6,400 / 1,600 | 192 ticks | +800 | 60% | +750 troops | 9 |

Prerequisites: Walls (level 2+).
Bombardment resistance: artillery and air attacks deal this % less damage to units garrisoned in the bunker.

#### Fortress

Maximum defensive structure. Represents a heavily fortified military complex.

| Level | Cost (M/S) | Build Time | Defense Bonus | Garrison Capacity | Counter-Attack Bonus | Upkeep (M/tick) |
|-------|-----------|------------|--------------|-------------------|---------------------|-----------------|
| 1 | 800 / 200 | 24 ticks | +200 | +200 troops | +10% | 3 |
| 2 | 1,600 / 400 | 48 ticks | +400 | +400 troops | +15% | 5 |
| 3 | 3,200 / 800 | 96 ticks | +650 | +700 troops | +20% | 8 |
| 4 | 6,400 / 1,600 | 192 ticks | +950 | +1,000 troops | +25% | 12 |
| 5 | 12,800 / 3,200 | 384 ticks | +1,300 | +1,500 troops | +30% | 18 |

Prerequisites: Bunker (level 2+), Engineering Corps HQ (level 1+).
Counter-attack bonus: garrison troops deal this % more damage when defending.

#### Anti-Aircraft Battery

Defends against air attacks. Shoots down enemy aircraft during bombing runs.

| Level | Cost (M/S) | Build Time | AA Defense Value | Shoot-Down Chance (per aircraft) | Range (hexes) | Upkeep (M/tick) |
|-------|-----------|------------|-----------------|-------------------------------|--------------|-----------------|
| 1 | 300 / 60 | 8 ticks | 50 | 5% | 1 (city only) | 1 |
| 2 | 600 / 120 | 16 ticks | 100 | 10% | 2 | 2 |
| 3 | 1,200 / 240 | 32 ticks | 175 | 15% | 2 | 4 |
| 4 | 2,400 / 480 | 64 ticks | 275 | 20% | 3 | 6 |
| 5 | 4,800 / 960 | 128 ticks | 400 | 25% | 3 | 9 |

Prerequisites: None.
Shoot-down chance is rolled per attacking aircraft per bombing run. Destroyed aircraft are permanently lost.

#### Coastal Battery (Coastal Only)

Defends against naval bombardment and amphibious assault.

| Level | Cost (M/S) | Build Time | Naval Defense Value | Damage to Ships / Round | Range (hexes into water) | Upkeep (M/tick) |
|-------|-----------|------------|--------------------|-----------------------|-------------------------|-----------------|
| 1 | 350 / 80 | 10 ticks | 75 | 50 | 2 | 1 |
| 2 | 700 / 160 | 20 ticks | 150 | 100 | 3 | 2 |
| 3 | 1,400 / 320 | 40 ticks | 250 | 175 | 3 | 4 |
| 4 | 2,800 / 640 | 80 ticks | 375 | 275 | 4 | 6 |
| 5 | 5,600 / 1,280 | 160 ticks | 525 | 400 | 5 | 9 |

Prerequisites: City must be adjacent to coastal/water tile.

---

### Infrastructure Buildings

#### Road Depot

Enables road construction from this city. Roads halve movement cost on any terrain.

| Level | Cost (M/S) | Build Time | Road Build Speed | Road Build Range (from city) | Upkeep (M/tick) |
|-------|-----------|------------|-----------------|----------------------------|-----------------|
| 1 | 200 / 30 | 6 ticks | 1 hex / 3 ticks | 5 hexes | 1 |
| 2 | 400 / 60 | 12 ticks | 1 hex / 2 ticks | 8 hexes | 1 |
| 3 | 800 / 120 | 24 ticks | 2 hex / 2 ticks | 12 hexes | 2 |
| 4 | 1,600 / 240 | 48 ticks | 2 hex / 1 tick | 15 hexes | 3 |
| 5 | 3,200 / 480 | 96 ticks | 3 hex / 1 tick | 20 hexes | 4 |

Prerequisites: None. Road cost per hex: 50 Money + 10 Steel.

#### Rail Station

Enables rail connections. Fastest land transport. Units must board at a station and disembark at a station.

| Level | Cost (M/S) | Build Time | Rail Build Speed | Transport Capacity / Tick | Upkeep (M/tick) |
|-------|-----------|------------|-----------------|--------------------------|-----------------|
| 1 | 500 / 100 | 12 ticks | 1 hex / 8 ticks | 50 troops | 2 |
| 2 | 1,000 / 200 | 24 ticks | 1 hex / 6 ticks | 100 troops | 4 |
| 3 | 2,000 / 400 | 48 ticks | 1 hex / 4 ticks | 200 troops | 6 |
| 4 | 4,000 / 800 | 96 ticks | 2 hex / 4 ticks | 400 troops | 9 |
| 5 | 8,000 / 1,600 | 192 ticks | 2 hex / 2 ticks | 800 troops | 13 |

Prerequisites: Road Depot (level 1+). Road must exist on hex before rail can be laid.
Rail cost per hex: 200 Money + 50 Steel.

#### Port (Coastal Only)

Enables naval operations: ship docking, supply by sea, amphibious embarkation.

| Level | Cost (M/S) | Build Time | Ship Capacity | Supply Range (sea hexes) | Upkeep (M/tick) |
|-------|-----------|------------|--------------|-------------------------|-----------------|
| 1 | 400 / 80 | 10 ticks | 3 ships | 5 | 2 |
| 2 | 800 / 160 | 20 ticks | 6 ships | 8 | 3 |
| 3 | 1,600 / 320 | 40 ticks | 10 ships | 12 | 5 |
| 4 | 3,200 / 640 | 80 ticks | 15 ships | 16 | 8 |
| 5 | 6,400 / 1,280 | 160 ticks | 20 ships | 20 | 12 |

Prerequisites: City must be adjacent to coastal/water tile.

---

## Construction Queue

### Default Behavior

Each city has a single construction queue. Only **one** building can be constructed (or upgraded) at a time.

### Parallel Construction

The Engineering Corps HQ building unlocks parallel construction slots:

```
total_parallel_slots = 1 + engineering_corps_bonus
```

See Engineering Corps HQ table for bonus per level. At Engineering Corps HQ level 5, a city can build 6 buildings simultaneously.

### Queue Mechanics

- Buildings are added to the queue and processed in order (or in parallel if slots allow).
- Each building in progress shows: name, current level -> target level, % complete, ETA.
- Construction can be cancelled at any time for a 50% resource refund of remaining work.
- City upgrade (leveling up) occupies 1 construction slot and cannot be parallelized with other construction in the same city.
- If a city is under attack (combat occurring on city tile), construction speed is halved.

### Construction Time Formula

```
actual_build_time = base_build_time * construction_cost_multiplier * combat_slowdown
```

Where:
- `base_build_time` = from building table
- `construction_cost_multiplier` = from land quality (2.0 - land_quality/100)
- `combat_slowdown` = 2.0 if city is in combat, 1.0 otherwise

---

## Capital City

### Designation

- Each player has exactly one capital city, designated at game start (their first city).
- The capital can be relocated to another city via a special action: costs 1,000 Money, takes 24 ticks (2 hours), during which BOTH cities operate at -50% efficiency.

### Capital Bonuses

| Bonus | Value |
|-------|-------|
| Money generation | +50% from all economy buildings in capital |
| Research speed | +25% from Research Labs in capital |
| Manpower generation | +25% |
| Morale aura | All units within 5 hexes of capital get +10 morale |
| Vision range | +2 hexes for all units/buildings in capital |

### Capital Loss

If an enemy captures the capital city:

| Effect | Duration |
|--------|----------|
| All units suffer -15 morale immediately | Until new capital designated |
| Money income reduced by 25% globally | Until new capital designated |
| Research speed reduced by 25% globally | Until new capital designated |
| Diplomatic reputation loss | Permanent for that server cycle |

The player must designate a new capital within 24 ticks or one is auto-assigned (highest level city). The old capital's bonuses transfer to the new one after the relocation period.

---

## City Defense

### Total Defense Value

```
total_defense = base_defense + wall_defense + bunker_defense + fortress_defense + garrison_defense + terrain_bonus
```

Where:
- `base_defense` = city_level * 50 (Level 1 = 50, Level 5 = 250)
- `wall_defense` = from Walls table (0 to 400)
- `bunker_defense` = from Bunker table (0 to 800)
- `fortress_defense` = from Fortress table (0 to 1,300)
- `garrison_defense` = sum of all garrisoned unit defense values
- `terrain_bonus` = if city is on a hill/elevated terrain, +10% total defense

### Maximum Theoretical Defense

A Level 5 city with Level 5 Walls + Level 5 Bunker + Level 5 Fortress + full garrison:
```
250 + 400 + 800 + 1,300 + garrison = 2,750 + garrison
```

This represents a near-impregnable fortress requiring massive force or siege tactics to overcome.

### City Battle Modifier

When combat occurs at a city tile, the city defense modifier applies:

```
city_defense_modifier = 1.0 + 0.50 (base city bonus)
                      + wall_level * 0.04 (Walls: 0-20%)
                      + bunker_level * 0.08 (Bunker: 0-40%)
                      + fortress_level * 0.12 (Fortress: 0-60%)
```

Maximum city defense modifier: 1.0 + 0.50 + 0.20 + 0.40 + 0.60 = **2.70** (defenders deal/resist 2.7x)

This stacks with terrain modifiers from map.md. A city on forest terrain with max fortifications would have 2.70 * 1.20 = 3.24x effective defense.

### Garrison

- Units stationed in a city are "garrisoned."
- Garrisoned units benefit from bunker bombardment resistance.
- Garrisoned units benefit from fortress counter-attack bonus.
- Garrison capacity = base (city_level * 100) + bunker_garrison + fortress_garrison.
- Units exceeding garrison capacity are treated as "field units" on the city tile (no bunker/fortress bonuses, but still get city defense modifier).

### Siege Mechanics

If an attacker does not wish to assault directly:

- **Siege**: Attacker surrounds city (controls all 6 adjacent hexes). City loses supply.
- **Siege effects**: After 12 ticks of siege, city production drops by 50%. After 24 ticks, food consumption doubles (starvation). After 48 ticks, garrison morale drops 5/tick.
- **Breaking siege**: If any adjacent hex is retaken by the defender or an ally, siege is broken.
- **Siege warfare**: Attacker can bombard with artillery during siege without assaulting. Bombardment damages buildings (random building loses 1 level per 24 ticks of bombardment).

---

## Edge Cases & Interactions

### City on Former Resource Tile

- A city built on a depleted resource tile cannot re-extract that resource. The tile's resource identity is permanently changed to "city."
- If the resource tile was only partially depleted (<20% reserves remaining, meeting the placement threshold), the remaining reserves are lost when the city is built.

### City Destruction

- Cities cannot be completely destroyed by combat. They can be captured (ownership changes) but the buildings remain.
- The conqueror inherits all buildings at their current level.
- Exception: Scorched earth -- the defending player can destroy their own city before capture. This demolishes all buildings (they are lost, not transferred). The tile becomes Disused Land with war_damage applied to land quality.

### Multiple Cities Sharing Resources

- Multiple cities can draw from the same resource tile's production (if within supply range).
- Production is NOT split -- each processing building draws independently from the raw resource supply.
- If total processing capacity exceeds raw resource production, buildings operate at reduced efficiency (proportional to available input vs. total demand).

### City Capture During Construction

- If a city is captured while buildings are under construction, construction progress is lost.
- The partially built building is removed. Resources spent are not refunded.
- The capturing player starts with only the completed buildings.

### Manpower and Food Interaction

- City manpower generation depends on food availability:
  - Food stockpile > 50% capacity: +25% manpower generation
  - Food stockpile 10-50%: normal manpower generation
  - Food stockpile < 10%: -50% manpower generation
  - Food stockpile = 0: -90% manpower generation (near-zero recruitment)

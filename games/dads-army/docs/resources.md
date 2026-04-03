# Resource System

This document is the source of truth for all resource types, production chains, extraction mechanics, depletion, storage, and upkeep in Dad's Army. All formulas and balance values defined here are authoritative.

---

## Table of Contents

1. [Resource Tiers](#resource-tiers)
2. [Production Chains](#production-chains)
3. [Extraction Mechanics](#extraction-mechanics)
4. [Depletion System](#depletion-system)
5. [Extraction Intensity](#extraction-intensity)
6. [Field Lifecycle](#field-lifecycle)
7. [Soil Quality (Farmland)](#soil-quality-farmland)
8. [Fertilizer Dilemma](#fertilizer-dilemma)
9. [Land Quality](#land-quality)
10. [Lazy Evaluation & Server Sync](#lazy-evaluation--server-sync)
11. [Storage Caps](#storage-caps)
12. [Resource Upkeep](#resource-upkeep)
13. [Edge Cases & Interactions](#edge-cases--interactions)

---

## Resource Tiers

### Tier 1 -- War-Deciding Resources

These resources directly determine military capability. Running out of any Tier 1 resource cripples a player's war effort within days.

| Resource | Raw Source | Processed Form | Primary Use |
|----------|-----------|----------------|-------------|
| Oil | Oil Field tile | Fuel (via Refinery) | Mechanized units, aircraft, naval, synthetic rubber |
| Steel | Iron + Coal tiles | Steel (via Steel Mill) | Tanks, ships, fortifications, buildings |
| Aluminum | Bauxite tile | Aluminum (via Aluminum Smelter) | Aircraft, advanced vehicles, electronics |
| Rubber | Rubber Plantation tile OR Synthetic Rubber Plant | Rubber | Tires, seals, vehicle components |

### Tier 2 -- Critical Resources

Essential for sustained operations but individually less decisive than Tier 1.

| Resource | Source | Primary Use |
|----------|--------|-------------|
| Food | Farmland tiles | Troop sustenance, civilian population, morale |
| Copper | Copper tile | Ammunition production, electronics |
| Tungsten | Tungsten tile (very rare) | Armor-piercing ammunition, advanced armor plating |
| Ammunition | Manufactured (Copper + Chemical Plant + Munitions Factory) | All combat, consumed per battle |
| Money | Tax Offices, Trade Posts, Banks | Construction, unit training, upkeep, diplomacy |
| Manpower | Cities (passive generation based on population and food) | Unit recruitment, construction labor |

### Base Production Rates (per tick, infrastructure level 1)

A tick is 5 real-time minutes (see [Lazy Evaluation](#lazy-evaluation--server-sync)).

| Raw Resource | Base Rate (units/tick) |
|---|---|
| Iron | 10 |
| Coal | 8 |
| Oil (crude) | 6 |
| Bauxite | 5 |
| Rubber (plantation) | 4 |
| Copper | 7 |
| Tungsten | 2 |
| Farmland (food) | 12 |

---

## Production Chains

Each chain shows: raw input(s) -> processing building -> output, with conversion ratios and processing time.

### Iron + Coal -> Steel Mill -> Steel

```
Inputs:   4 Iron + 3 Coal per cycle
Building: Steel Mill (city building, see cities.md)
Output:   5 Steel per cycle
Cycle:    1 tick (5 minutes)
Power:    None required
Notes:    Steel Mill level determines throughput multiplier (level N = Nx throughput)
```

### Bauxite -> Aluminum Smelter -> Aluminum

```
Inputs:   6 Bauxite per cycle
Building: Aluminum Smelter (city building)
Output:   3 Aluminum per cycle
Cycle:    1 tick
Power:    Requires power source (Oil Refinery fuel or Coal)
          Power cost: 2 Coal OR 1 Fuel per cycle
Notes:    Without power, smelter operates at 25% efficiency.
          Aluminum is the bottleneck resource for aircraft production.
```

### Oil Field -> Refinery -> Fuel

```
Inputs:   5 Crude Oil per cycle
Building: Oil Refinery (city building)
Output:   4 Fuel per cycle
Cycle:    1 tick
Power:    Self-powered (consumes 1 Crude Oil internally, accounted for in ratio)
Notes:    Crude Oil has no direct military use -- it MUST be refined.
          Refinery level determines throughput multiplier.
```

### Rubber Plantation -> Rubber (Direct)

```
Inputs:   Rubber Plantation tile with infrastructure
Building: None required (extracted directly)
Output:   4 Rubber per tick (at infrastructure level 1)
Notes:    Rubber plantations are geographically scarce (tropical zones only).
          This is the simple path -- no processing building needed.
```

### Oil + Research -> Synthetic Rubber Plant -> Rubber (Alternate)

```
Inputs:   3 Fuel + 2 Coal per cycle
Building: Synthetic Rubber Plant (city building, research-gated)
Research: "Synthetic Rubber" tech required (see research system)
Output:   2 Rubber per cycle
Cycle:    1 tick
Notes:    Less efficient than plantations but available to players without
          tropical territory. Strategic importance: removes geographic dependency.
```

### Copper + Chemical Plant -> Munitions Factory -> Ammunition

```
Step 1:   Chemical Plant produces Chemicals
          Input: 3 Coal per cycle -> 4 Chemicals per cycle

Step 2:   Munitions Factory combines
          Input: 3 Copper + 2 Chemicals per cycle
          Output: 10 Ammunition per cycle
          Cycle: 1 tick

Notes:    Chemical Plant output is shared with fertilizer production
          (see Fertilizer Dilemma). Ammunition is consumed in combat,
          not per-tick upkeep.
```

### Farmland -> Food (Direct)

```
Inputs:   Farmland tile with infrastructure
Building: None required for base production
Output:   12 Food per tick (at infrastructure level 1, 100% soil quality)
Effective output: base_rate * infrastructure_level * soil_quality * fertilizer_bonus
Notes:    Farm Enhancement building in a nearby city boosts yield.
          Soil quality degrades over time (see Soil Quality section).
```

### Chemical Plant -> Fertilizer OR Explosives (Guns vs Butter)

```
Mode A -- Fertilizer:
  Input:  3 Coal per cycle
  Output: 4 Fertilizer per cycle
  Effect: Each Fertilizer unit boosts food output of one farm tile by +15% for 1 game-day

Mode B -- Explosives/Chemicals:
  Input:  3 Coal per cycle
  Output: 4 Chemicals per cycle
  Effect: Fed into Munitions Factory for ammunition production

Capacity split: A Chemical Plant can split production (e.g., 60% fertilizer / 40% chemicals)
                but total output is reduced by 10% when split (inefficiency penalty).
                Formula: total_output = base_output * 0.9 when split, allocated proportionally.

Full capacity in one mode: 100% efficiency, no penalty.
```

### Coal -> Synthetic Fuel Plant -> Fuel (Alternate)

```
Inputs:   8 Coal per cycle
Building: Synthetic Fuel Plant (city building, research-gated)
Research: "Coal Liquefaction" tech required
Output:   2 Fuel per cycle
Cycle:    1 tick
Notes:    Very inefficient compared to oil refineries. Emergency measure
          for coal-rich, oil-poor players. Historically accurate
          (Germany's Bergius process).
```

---

## Extraction Mechanics

### Infrastructure on Resource Tiles

To extract a raw resource, a player must:

1. Own the hex tile containing the resource
2. Build extraction infrastructure on the tile (not a city building -- this is tile-level)
3. The tile must be within supply range of one of the player's cities (max 5 hex distance without road, 10 with road)

### Infrastructure Levels

| Level | Cost (Money) | Cost (Steel) | Build Time | Production Multiplier | Max Intensity |
|-------|-------------|-------------|------------|----------------------|---------------|
| 1 | 100 | 10 | 2 ticks (10 min) | 1.0x | Normal |
| 2 | 250 | 25 | 6 ticks (30 min) | 1.8x | Normal |
| 3 | 500 | 50 | 18 ticks (90 min) | 2.5x | Intensive |
| 4 | 1000 | 100 | 36 ticks (3 hours) | 3.2x | Intensive |
| 5 | 2000 | 200 | 72 ticks (6 hours) | 4.0x | Intensive |

Infrastructure level directly multiplies the base extraction rate.

### Supply Range

- A resource tile must be within supply range of a city to produce.
- Base supply range: 5 hexes (shortest path, Dijkstra on hex grid).
- Road connection extends supply range to 10 hexes.
- Rail connection extends supply range to 15 hexes.
- If a resource tile loses supply connection (e.g., enemy cuts the road), production drops to 0 until reconnected. Stored resources on the tile remain but cannot be transported.

---

## Depletion System

Every resource tile (except farmland, which uses soil quality instead) has a finite `total_reserves` value set at map generation. Extraction permanently removes from this pool.

### Core Formula

```
extraction_per_tick = base_rate * infrastructure_level * intensity_multiplier * tech_bonus
```

Where:
- `base_rate` = resource-specific base (see table above)
- `infrastructure_level` = 1-5 (integer, not the production multiplier -- use the multiplier from the table)
- `intensity_multiplier` = 0.7 (Sustainable), 1.0 (Normal), 1.5 (Intensive)
- `tech_bonus` = 1.0 base, increased by research (e.g., "Improved Mining" gives 1.15)

**Corrected formula using production multiplier:**

```
extraction_per_tick = base_rate * production_multiplier(infrastructure_level) * intensity_multiplier * tech_bonus
```

Example: Iron tile, infrastructure level 3, Normal intensity, no tech bonus:
```
extraction_per_tick = 10 * 2.5 * 1.0 * 1.0 = 25 Iron per tick
```

### Remaining Reserves

```
remaining_reserves = total_reserves - cumulative_extraction
```

Where `cumulative_extraction` is the running sum of all `extraction_per_tick` values since the tile was first exploited.

### Typical Total Reserves by Resource

| Resource | Reserves Range | Average | Approx. Ticks at Level 3 Normal |
|----------|---------------|---------|-------------------------------|
| Iron | 8,000 - 15,000 | 11,000 | ~440 ticks (~36 hours) |
| Coal | 10,000 - 20,000 | 14,000 | ~700 ticks (~58 hours) |
| Oil | 5,000 - 12,000 | 8,000 | ~533 ticks (~44 hours) |
| Bauxite | 4,000 - 8,000 | 6,000 | ~480 ticks (~40 hours) |
| Copper | 6,000 - 12,000 | 9,000 | ~514 ticks (~43 hours) |
| Tungsten | 1,000 - 3,000 | 2,000 | ~400 ticks (~33 hours) |

Rubber plantations do not deplete (biological regrowth) but are subject to soil quality degradation at half the rate of farmland.

### Declining Output

When a tile drops below 50% of its `total_reserves`, it enters the Declining stage. Output is progressively reduced:

```
if remaining_reserves < total_reserves * 0.50:
    decline_factor = remaining_reserves / (total_reserves * 0.50)
    effective_extraction = extraction_per_tick * decline_factor
```

This means at 25% reserves remaining, output is halved. At 10% reserves, output is 20% of normal.

---

## Extraction Intensity

Players choose an intensity level per resource tile. This can be changed at any time (takes effect next tick).

| Intensity | Multiplier | Depletion Rate | Infrastructure Damage | Unlock |
|-----------|-----------|----------------|----------------------|--------|
| Sustainable | 0.7x | 0.7x base depletion | None | Always |
| Normal | 1.0x | 1.0x base depletion | None | Always |
| Intensive | 1.5x | 1.8x base depletion (penalty) | 1% chance/tick of infrastructure losing 1 level | Infrastructure level 3+ |

### Intensive Mode Details

- Depletion penalty: Intensive extracts 1.5x resources but depletes reserves at 1.8x rate (20% waste).
- Infrastructure damage: Each tick at Intensive, there is a 1% chance the infrastructure level decreases by 1. Repairing costs 50% of the upgrade cost and takes 50% of the build time.
- Intensive mode is unavailable at infrastructure levels 1 and 2 (equipment too fragile).
- Strategic use: sprint-extract a contested resource before the enemy can take it, or when reserves are already low and efficiency no longer matters.

---

## Field Lifecycle

Every resource tile progresses through these stages:

### Stage 1: Undiscovered

- Tile exists on map but resource type/quantity is unknown.
- Surface resources (farmland, visible mines) skip this stage.
- Underground resources require geological survey to discover.
- Survey: Intelligence Center building + Geological Survey research. Survey unit deployed to tile, takes 6 ticks to complete. Reveals resource type and approximate reserves (within +/- 20%).

### Stage 2: Raw

- Resource is known but no infrastructure built.
- Tile shows resource icon on map.
- No production occurs.

### Stage 3: Productive

- Infrastructure built (level 1-5).
- Full extraction according to formulas above.
- Remains in this stage while `remaining_reserves >= total_reserves * 0.50`.

### Stage 4: Declining

- Triggered when `remaining_reserves < total_reserves * 0.50`.
- Output progressively decreases (see decline formula above).
- Visual indicator on map: tile icon dims/changes color.
- Player receives notification: "[Resource] field at (q, r) is declining."
- Remains in this stage while `remaining_reserves > 0`.

### Stage 5: Exhausted

- `remaining_reserves = 0`. No further extraction possible.
- Infrastructure remains on tile but produces nothing.
- Player receives notification: "[Resource] field at (q, r) is exhausted."
- Tile type changes to "Depleted [Resource]" for land quality purposes.

### Stage 6: Repurposed / Converted

- Exhausted tile can be converted to city land.
- Infrastructure must be demolished first (instant, refunds 25% of materials).
- Land quality is reduced (see Land Quality section).
- Alternatively, tile can be left as-is (no benefit, no cost).

---

## Soil Quality (Farmland)

Farmland tiles use soil quality instead of reserves. Soil quality is renewable but requires management.

### Core Mechanics

```
Initial soil quality: 100%
Degradation while farming: -2% per game-week (1 game-week = 1 real-time day)
Recovery while fallow: +1% per game-week
Crop rotation bonus: degradation halved to -1% per game-week
Fertilizer bonus: +15% yield (does not affect degradation rate)
```

### Yield Formula

```
food_per_tick = base_food_rate * infrastructure_level_multiplier * (soil_quality / 100) * fertilizer_bonus * tech_bonus
```

Where:
- `base_food_rate` = 12
- `infrastructure_level_multiplier` = from infrastructure table
- `soil_quality` = 0-100 (percentage)
- `fertilizer_bonus` = 1.0 (no fertilizer) or 1.15 (fertilized)
- `tech_bonus` = 1.0 base, upgradeable via Agricultural research

### Soil Quality Floor

- Soil quality cannot drop below 10% (land is never truly barren).
- At 10% soil quality, food output is 10% of maximum -- barely worth farming.
- Recommended rotation: farm for 3 game-weeks, fallow for 2 game-weeks. Net quality change: -6% + 2% = -4% over 5 game-weeks (slow decline). True sustainability requires crop rotation research.

### Crop Rotation

- Unlocked via "Crop Rotation" research (basic agricultural tech).
- Effect: degradation rate halved from -2%/game-week to -1%/game-week.
- With crop rotation + fallow cycling: farm 4 game-weeks (-4%), fallow 4 game-weeks (+4%) = net 0%. Fully sustainable.

### Farm Enhancement Building

- City building (see cities.md) that boosts all farm tiles within 3 hex radius.
- Level 1: +10% yield. Level 2: +20% yield. Level 3: +30% yield.
- Stacks with fertilizer bonus (multiplicative): `total_bonus = farm_enhancement_bonus * fertilizer_bonus`.
- Example: Level 2 Farm Enhancement + Fertilizer = 1.20 * 1.15 = 1.38x yield.

---

## Fertilizer Dilemma

The Chemical Plant is the key "guns vs butter" decision point.

### Chemical Plant Allocation

Each Chemical Plant has a production slider: Fertilizer <---> Chemicals.

| Allocation | Fertilizer Output | Chemical Output | Efficiency |
|-----------|------------------|----------------|------------|
| 100% Fertilizer | 4/cycle | 0/cycle | 100% |
| 75% Fertilizer / 25% Chemicals | 2.7/cycle | 0.9/cycle | 90% |
| 50% / 50% | 1.8/cycle | 1.8/cycle | 90% |
| 25% Fertilizer / 75% Chemicals | 0.9/cycle | 2.7/cycle | 90% |
| 100% Chemicals | 0/cycle | 4/cycle | 100% |

The 10% efficiency penalty on split production creates a real cost to hedging. Players who commit fully to one mode get better total output.

### Strategic Implications

- Early game: Fertilizer favored (build food stockpiles, no combat yet).
- Mid game: Tension increases (need ammo but also need food for growing army).
- Late game: Usually chemicals (food stockpiles built, combat is constant).
- Players with abundant farmland can afford more chemicals. Players with scarce farmland must invest in fertilizer or trade for food.

---

## Land Quality

Land quality is a persistent property of each tile that affects city building potential.

### Land Quality Values

| Tile State | Land Quality | Notes |
|-----------|-------------|-------|
| Disused land (never exploited) | 100% | Ideal for city building |
| Depleted farmland | 70-80% | Soil is tired but land is flat and cleared |
| Depleted rubber plantation | 65-75% | Similar to farmland |
| Depleted copper/iron mine | 40-60% | Terrain scarred by mining, unstable ground |
| Depleted coal mine | 35-55% | Subsidence risk, polluted |
| Depleted oil field | 45-60% | Contaminated soil, requires cleanup |
| Depleted tungsten mine | 30-50% | Deep mining leaves worst scars |
| War-scarred land | 20-50% | Depends on war_damage value (see combat.md) |

### Land Quality Effects on City Building

```
construction_cost_multiplier = 2.0 - (land_quality / 100)
```

| Land Quality | Cost Multiplier | Example (base cost 1000) |
|-------------|----------------|-------------------------|
| 100% | 1.0x | 1,000 |
| 80% | 1.2x | 1,200 |
| 60% | 1.4x | 1,400 |
| 40% | 1.6x | 1,600 |
| 20% | 1.8x | 1,800 |

Additional effects:
- **Building max level cap**: `max_level = ceil(5 * (land_quality / 100))`. At 100% quality, max level 5. At 40% quality, max level 2.
- **Building output modifier**: All building outputs multiplied by `land_quality / 100`. A Steel Mill on 60% quality land produces 60% of its rated output.
- **Repair**: Land quality cannot be improved once set. War damage can further reduce it, but nothing restores it. Choose city locations wisely.

---

## Lazy Evaluation & Server Sync

Resource calculations use lazy evaluation for efficiency. With 20-50 players and hundreds of resource tiles, constant calculation would be wasteful.

### Client-Side Projection

```
current_amount = stored_amount + (production_rate * ticks_since_last_collection)
```

Where:
- `stored_amount` = last server-confirmed value
- `production_rate` = net rate (production minus upkeep) per tick
- `ticks_since_last_collection` = floor((now - last_server_sync) / tick_duration)
- `tick_duration` = 5 minutes (300 seconds)

The client displays this projected value in the UI. It may be slightly inaccurate due to events the client doesn't know about (e.g., enemy raid on a supply line).

### Server Materialization

Every 5 minutes (1 tick), the server runs:

1. Calculate actual production for each resource tile (applying all modifiers).
2. Calculate actual consumption (upkeep, construction in progress, unit training).
3. Update `stored_amount` = old_stored + production - consumption.
4. Clamp to storage caps (excess is lost).
5. Clamp to floor of 0 (cannot go negative; see Resource Upkeep for consequences).
6. Write to Supabase `player_resources` table.
7. Broadcast updated values to connected clients via Supabase Realtime.

### Conflict Resolution

If a client-side action (e.g., start building) requires resources, the server validates:
1. Check `stored_amount` at time of request.
2. If sufficient, deduct and proceed.
3. If insufficient, reject the action and sync the client.

This prevents exploits from client-side projection drift.

---

## Storage Caps

Each city has storage capacity. Total player storage = sum of all city storage caps.

### Base Storage per City

| City Level | Base Storage (per resource type) |
|-----------|-------------------------------|
| 1 | 500 |
| 2 | 1,000 |
| 3 | 2,000 |
| 4 | 4,000 |
| 5 | 8,000 |

### Warehouse Building

Each Warehouse level in a city adds to that city's storage:

| Warehouse Level | Additional Storage (per resource type) |
|----------------|--------------------------------------|
| 1 | +500 |
| 2 | +1,200 |
| 3 | +2,500 |
| 4 | +5,000 |
| 5 | +10,000 |

### Storage Overflow

- When storage is full, excess production is **lost** (not banked, not queued).
- The client UI shows a warning icon when any resource is above 90% capacity.
- Players must expand storage, spend resources, or trade to avoid waste.
- Strategic note: storage limits prevent infinite hoarding and force active play.

### Per-Resource Storage

Storage caps apply **per resource type per city**. A Level 3 city with a Level 2 Warehouse has 2,000 + 1,200 = 3,200 storage for Iron, AND 3,200 for Coal, AND 3,200 for Oil, etc. Each resource type has its own independent cap.

---

## Resource Upkeep

Military units and buildings consume resources every tick. If resources run out, severe penalties apply.

### Military Unit Upkeep (per tick)

| Unit Type | Food | Fuel | Money | Ammunition (per battle only) |
|-----------|------|------|-------|------------------------------|
| Infantry (per 100 men) | 3 | 0 | 1 | 5 per combat round |
| Mechanized Infantry | 3 | 2 | 2 | 8 per combat round |
| Light Tank | 1 | 3 | 3 | 10 per combat round |
| Heavy Tank | 1 | 5 | 5 | 15 per combat round |
| Artillery | 1 | 1 | 2 | 20 per combat round |
| Fighter Aircraft | 0 | 4 | 4 | 12 per combat round |
| Bomber Aircraft | 0 | 6 | 5 | 25 per combat round |

### Zero-Resource Consequences (Attrition)

When a resource hits 0, consequences escalate over time:

**Food = 0:**
| Duration | Effect |
|----------|--------|
| 1-6 ticks (5-30 min) | -5% combat effectiveness |
| 7-24 ticks (35 min - 2 hours) | -15% combat effectiveness, -10 morale/tick |
| 25+ ticks (2+ hours) | -30% combat effectiveness, -20 morale/tick, units lose 1% HP/tick (starvation) |

**Fuel = 0:**
| Duration | Effect |
|----------|--------|
| Immediate | Mechanized units cannot move (infantry unaffected) |
| 12+ ticks | Aircraft grounded, tanks immobilized |
| 24+ ticks | Mechanized units start losing 1% HP/tick (maintenance failure) |

**Money = 0:**
| Duration | Effect |
|----------|--------|
| Immediate | Cannot initiate construction, training, or research |
| 12+ ticks | -10 morale/tick (troops unpaid) |
| 48+ ticks | Desertion: 1% of manpower lost per tick |

**Ammunition = 0 (during combat):**
| Effect |
|--------|
| Units deal 25% of normal damage (bayonets, improvised weapons) |
| Morale drops 2x faster |

### Building Upkeep

Most buildings have a small Money upkeep per tick. If Money hits 0, buildings continue to function but at -20% efficiency after 12 ticks. See cities.md for per-building upkeep costs.

---

## Edge Cases & Interactions

### Captured Resource Tiles

- When a player captures an enemy's resource tile, existing infrastructure remains at its current level.
- Production switches to the new owner on the next tick.
- The capturing player can choose to demolish infrastructure (instant) for 25% material refund.
- Cumulative depletion carries over -- capturing a depleted tile gives you a depleted tile.

### Contested Tiles

- A resource tile in an active combat zone produces 0 resources.
- Combat damage to the tile further reduces its long-term value (see combat.md war_damage).

### Trade

- Resources can be traded between players via Trade Post buildings.
- Trade is instant (Supabase transaction).
- No trade routes or caravans -- abstracted for simplicity.
- Trade taxes: 5% of traded resources lost to tax (configurable per server).

### Scorched Earth

- A player can destroy their own resource infrastructure (instant action).
- This sets infrastructure level to 0 and adds 10 war_damage to the tile.
- Strategic: deny resources to an advancing enemy.
- See combat.md for full scorched earth mechanics.

### Multiple Resource Tiles

- Some rare tiles may contain two resources (e.g., Iron + Coal on same tile).
- Both can be extracted simultaneously but share infrastructure level.
- Each resource depletes independently from its own reserves.
- Extraction rate for each is 75% of normal (shared infrastructure penalty).

### Manpower Generation

- Manpower is generated passively by cities based on city level.
- Base manpower per tick: city_level * 2.
- Food availability modifier: if food stockpile > 50% of capacity, +25% manpower. If food < 10%, -50% manpower.
- Manpower does not have a raw resource tile. It represents population willing to serve.
- Manpower is consumed when training units and when constructing buildings (labor force).

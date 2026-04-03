# Standalone Structures System

Source-of-truth design document for all structures that can be built on any owned land tile outside of cities. Covers construction, stats, capture mechanics, and interactions with other systems in Dad's Army.

---

## Overview

Standalone structures extend a player's operational reach beyond their cities. Unlike city buildings (which are protected by city fortifications and garrison), standalone structures are built on open map tiles and are inherently more vulnerable. They are essential for logistics, air operations, intelligence, and front-line support.

Key design principle: structures trade vulnerability for flexibility. A Standalone Factory can process resources closer to the front line, but it can be bombed. A Supply Depot extends army range, but it can be raided. Players must defend their structures or accept the risk of losing them.

---

## Construction Requirements

All standalone structures require:
1. **Resources**: steel, manpower, and sometimes specialized resources (oil, copper).
2. **Builder**: either Engineer units on the target tile, or a nearby city (within 5 hexes) with an Engineering Corps HQ building.
3. **Tile ownership**: the tile must be owned by the player (or an ally with construction permission granted via diplomacy).
4. **Tile capacity**: maximum 3 structures per tile (roads and railways do not count toward this limit as they are between-tile infrastructure).

### Land Quality Cost Multiplier

Degraded land increases construction costs. All structure costs are modified by:

```
adjusted_cost = base_cost * (2.0 - land_quality / 100)
```

Where `land_quality` ranges from 0 (fully degraded) to 100 (pristine).

| Land Quality | Cost Multiplier | Example: Supply Depot (base 80 steel) |
|---|---|---|
| 100 (pristine) | 1.0x | 80 steel |
| 75 | 1.25x | 100 steel |
| 50 | 1.5x | 120 steel |
| 25 | 1.75x | 140 steel |
| 0 (devastated) | 2.0x | 160 steel |

---

## Structure List

### Small Airstrip

| Property | Value |
|---|---|
| Cost | 100 steel, 50 manpower |
| Build Time | 4 ticks |
| HP | 200 |
| Capacity | 5 aircraft (Fighters and Recon Planes only; no Bombers or Transport Planes) |
| Function | Extends air operational range. Aircraft stationed here can sortie to hexes within their flight range centered on this airstrip rather than a city airfield. |
| Special | Can be bombed — when HP reaches 0, the strip is "cratered" and non-functional. Cratered airstrips can be repaired in 2 ticks by Engineers or 4 ticks via city repair. Aircraft on a cratered airstrip cannot take off (stranded until repaired). |
| Prerequisites | Aeronautics research (Phase 2) |

**Tactical use**: place airstrips near the front line to extend fighter cover and recon range. Keep them behind your fortified line — they are fragile and high-value targets.

### Refueling Station

| Property | Value |
|---|---|
| Cost | 80 steel, 30 oil |
| Build Time | 3 ticks |
| HP | 150 |
| Fuel Storage | 500 units of fuel (oil) |
| Function | Extends vehicle operational range by +3 hexes from this point. Armor units and motorized infantry passing through can refuel, preventing the "out of fuel" status that immobilizes vehicles. |
| Special | Explodes when destroyed: deals 20 damage to all units on the tile (friendly and enemy). Oil storage is flammable. |
| Prerequisites | Motor Pool in any city |

**Mechanics**: vehicles (Armor category, Half-Tracks, Armored Cars) have an operational range of 15 hexes from their last refueling point (city or Refueling Station). Beyond this range, they consume double oil upkeep. Beyond 20 hexes, they are immobilized until refueled. Refueling Stations reset the range counter.

### Standalone Factory

| Property | Value |
|---|---|
| Cost | 200 steel, 100 manpower |
| Build Time | 8 ticks |
| HP | 300 |
| Output | 60% of a city factory's production rate |
| Function | Processes raw resources from adjacent resource fields without transporting them to a city first. Can produce basic military equipment (munitions, processed steel). |
| Special | Prime bombing target — enemy will prioritize these. Cannot train units (only cities can). Requires 10 manpower upkeep/tick to operate (workers). If supply is cut, production halts. |
| Prerequisites | Industrial Logistics research |

**Resource processing**: a Standalone Factory on a tile adjacent to an Iron field converts raw iron to steel at 60% of a city factory's rate. This is useful when the resource field is far from any city — the factory processes on-site and the finished goods are transported (lighter load, same value).

### Bridge

| Property | Value |
|---|---|
| Cost | 60 steel, 30 manpower |
| Build Time | 3 ticks |
| HP | 150 |
| Function | Enables river crossing without the standard river-crossing penalty (-25% attack, 2x movement cost). |
| Special | Between-tile structure: connects two specific hexes across a river. Does NOT count toward per-tile structure limit. Can be destroyed by bombing, artillery, or demolition (Engineers can demolish a bridge in 1 tick). Destroyed bridges can be rebuilt. |
| Prerequisites | None (basic construction) |

**Strategic importance**: bridges are critical chokepoints. Destroying a bridge behind an advancing enemy army can strand them (see `supply-lines.md`). Defending a bridge is often easier than defending open terrain — funnel the enemy.

### Road

| Property | Value |
|---|---|
| Cost | 10 steel, 5 manpower per hex segment |
| Build Time | 1 tick per segment |
| HP | 50 per segment |
| Function | +100% movement speed (halves movement cost). Enables supply transport between cities and armies. |
| Special | Between-tile structure: does NOT count toward per-tile structure limit. Easily repaired (1 tick, 5 steel). Can be destroyed by any attack, bombing, or sabotage. Destroyed road segments block supply flow until repaired. |
| Prerequisites | None |

**Supply chain role**: roads are the backbone of supply logistics. Without roads, supply range is severely limited (5 hexes instead of 10). Every front-line push should be accompanied by road construction. See `supply-lines.md`.

### Railway

| Property | Value |
|---|---|
| Cost | 40 steel, 20 manpower per hex segment |
| Build Time | 3 ticks per segment |
| HP | 100 per segment |
| Function | +300% movement speed (quarters movement cost). High-capacity supply transport (500 resources/tick vs road's 100). |
| Special | Between-tile structure: does NOT count toward per-tile structure limit. Prime bombing target — enemy will target railways to cut supply. Repair: 2 ticks, 20 steel per segment. Requires rolling stock (trains) to function — a railway without trains is just tracks. Train units are auto-generated when railway connects two cities. |
| Prerequisites | Industrial Logistics research |

**Gauge compatibility**: railways built by different players are NOT automatically compatible. Capturing enemy railways requires 2 ticks of "gauge conversion" by Engineers before your trains can use them. This prevents instant exploitation of captured rail networks.

### Communications Tower

| Property | Value |
|---|---|
| Cost | 50 steel, 20 copper |
| Build Time | 3 ticks |
| HP | 100 |
| Function | +3 hex vision range centered on this tile. Enables coordination bonus: +5% attack for all friendly units within 2 hexes. Required for advanced intelligence operations (espionage, intercepts). |
| Special | Fragile but high-value. Destroying enemy comms towers reduces their vision and disables coordination bonuses. Can be upgraded in a city to a Radio HQ for server-wide communication benefits. |
| Prerequisites | Radio Technology research |

**Coordination bonus**: the +5% attack bonus represents improved tactical coordination via radio communication. It stacks with other bonuses (veterancy, terrain) but does NOT stack with multiple Comms Towers (only the closest one applies).

### Supply Depot

| Property | Value |
|---|---|
| Cost | 80 steel, 40 manpower |
| Build Time | 4 ticks |
| HP | 250 |
| Storage | 2000 units of mixed resources |
| Function | Extends supply range for armies by +5 hexes from this depot's position. Acts as a forward supply cache — resources are transported here from cities, then distributed to nearby armies. |
| Special | Must be connected to a city via road or railway to receive resources. If the connection is cut, the depot operates on stored reserves until depleted. Can be captured by enemy (they gain the stored resources). |
| Prerequisites | None |

**Supply chain role**: Supply Depots are relay points. An army 18 hexes from the nearest city is normally out of supply range (10 hexes via road). But with a Supply Depot 8 hexes from the city, the depot extends range by +5, covering out to 13 hexes from the depot (8 + 5 = 13 from city? No — 8 hexes to depot, then +5 from depot = army can be 5 hexes beyond the depot, so 13 hexes from city total). For deep pushes, chain multiple depots.

### Radar Station

| Property | Value |
|---|---|
| Cost | 100 steel, 30 copper |
| Build Time | 5 ticks |
| HP | 150 |
| Function | Detects incoming air attacks 2 ticks before they arrive (early warning). Reveals all aircraft within 5-hex radius. |
| Special | Critical for air defense — without radar, AA guns only fire when aircraft are directly overhead. With radar, AA can prepare and fire at maximum effectiveness. Radar also detects enemy Recon Planes, denying them stealth. |
| Prerequisites | Radio Technology research + Radar research |

**Early warning system**: when a Radar Station detects incoming bombers, all AA batteries and fighter squadrons within the radar's coverage area receive a 2-tick advance warning. Fighters can scramble to intercept. AA batteries get +25% accuracy bonus (prepared fire vs surprised fire).

### Field Hospital

| Property | Value |
|---|---|
| Cost | 60 steel, 30 manpower |
| Build Time | 3 ticks |
| HP | 200 |
| Function | All friendly units within 2 hexes heal at 2x the normal rate. Reduces casualty rate by 10% in battles within 2 hexes (more wounded survive as injured rather than killed). |
| Special | Stacks with city Hospital healing bonuses. Protected by Geneva Convention — enemy can destroy it, but doing so provides a morale boost to the victim's units (+5% attack for 5 ticks, "avenge the hospital" effect). Does not count as a military target for bombing missions (bombers must be explicitly ordered to target it). |
| Prerequisites | Medical Research (Lv1) |

**Healing mechanics**: the 2x healing rate means units near a Field Hospital heal at 2% HP/tick (same as a city with Lv1 Hospital). If ALSO within range of a city hospital, bonuses stack: 2% (field) + 2% (city Lv1) = 4% HP/tick. See `military.md` for full healing table.

### Port (Small)

| Property | Value |
|---|---|
| Cost | 150 steel, 50 manpower |
| Build Time | 6 ticks |
| HP | 300 |
| Capacity | Destroyers, Transport Ships, Submarines, Minesweepers (no Cruisers or Battleships — those require a city Port building) |
| Function | Enables naval operations from coastal tiles without a city. Docks small naval vessels. Enables naval supply routes from this point. |
| Special | Coastal tiles only. Can be upgraded to a full Port only by founding/expanding a city to this tile. Vulnerable to naval bombardment and air attack. |
| Prerequisites | Shipbuilding research (Phase 2) |

**Naval logistics**: a Small Port acts as an endpoint for sea supply routes. Resources can be shipped from a city Port to a Small Port and then distributed overland. This enables supply of armies in territories accessible primarily by sea.

---

## Construction Priority & Queue

Unlike city buildings (which use the city's construction queue), standalone structures are built by Engineer units or remote city construction.

### Engineer Construction
- Engineers on the target tile begin construction immediately.
- Multiple Engineer stacks on the same tile reduce build time:
  ```
  adjusted_build_time = ceil(base_build_time / number_of_engineer_stacks)
  ```
  Minimum build time: 1 tick regardless of Engineer count.
- Engineers cannot fight while constructing. If attacked during construction, construction is paused and Engineers defend at 50% effectiveness (distracted).

### Remote City Construction
- A city with an Engineering Corps HQ can build structures on any owned tile within 5 hexes.
- Remote construction takes 1.5x the base build time (logistics overhead).
- Remote construction uses the city's construction queue (competes with city buildings).
- Only one remote construction project per city at a time.

---

## Capture & Destruction

### Capture
When a tile changes ownership (via combat or diplomacy), all structures on the tile transfer to the new owner.

- Captured structures can be used immediately by the new owner (exception: railways require 2 ticks of gauge conversion).
- The previous owner receives a notification: "[Structure] at [hex] has been captured."
- Captured Supply Depots grant their stored resources to the captor.

### Scorched Earth
The tile owner can destroy their own structures instantly (no cost, no delay) to deny them to an advancing enemy. This is the "scorched earth" option.

- Scorched earth destroys the structure completely (0 HP, removed from map).
- Scorched earth degrades land quality by 10 points per structure destroyed (representing environmental damage from demolition).
- Players must explicitly order scorched earth — it does not happen automatically during retreat.

### Repair
Damaged structures (HP > 0 but below max) can be repaired:
- **Engineer repair**: 5% max HP per tick. Cost: 25% of original build cost per 50% HP restored.
- **City remote repair**: 2% max HP per tick, structure must be within 5 hexes of a city with Engineering Corps HQ. Same cost as Engineer repair.
- Structures at 0 HP are destroyed and must be fully rebuilt.

---

## Research Unlocks

Some structures require specific research to build. Without the prerequisite research, the structure does not appear in the build menu.

| Structure | Required Research |
|---|---|
| Small Airstrip | Aeronautics |
| Railway | Industrial Logistics |
| Standalone Factory | Industrial Logistics |
| Communications Tower | Radio Technology |
| Radar Station | Radio Technology + Radar |
| Field Hospital | Medical Research (Lv1) |
| Port (Small) | Shipbuilding |
| Road | None |
| Bridge | None |
| Refueling Station | None (requires Motor Pool building in any city) |
| Supply Depot | None |

---

## Per-Tile Limits

Maximum structures per tile: **3**.

Exceptions that do NOT count toward this limit:
- Roads (between-tile)
- Railways (between-tile)
- Bridges (between-tile)
- Minefields (area denial, tracked separately; see `fortifications.md`)
- Barbed Wire (area denial, tracked separately)

If a tile already has 3 structures and a player attempts to build a 4th, the build order is rejected with the message: "Tile structure limit reached (3/3). Demolish an existing structure to build here."

Field fortifications (Foxholes, Trenches, Sandbag Walls, Small Bunkers, Observation Posts) count as structures for this limit. A tile with Trenches + Supply Depot + Communications Tower is at capacity.

---

## Edge Cases & Interactions

### Structure + Combat
- Structures do not fight. They provide passive bonuses (vision, healing, supply range) but do not fire at enemies.
- Exception: AA batteries and Coastal Guns (covered in `fortifications.md`) are combat-capable structures.
- Structures on a tile where combat occurs take collateral damage: 10% of their max HP per battle tick. Fragile structures (Comms Tower, Observation Post) can be destroyed incidentally during battles.

### Structure + Supply
- Structures with upkeep (Standalone Factory: 10 manpower/tick) consume from the nearest connected city's stockpile.
- If supply is cut to a structure, it ceases to function but does not degrade (structures don't starve — they just go offline).
- Supply Depots that lose their city connection operate on stored reserves. When reserves hit 0, the depot goes offline (still exists, still capturable, but provides no supply extension).

### Structure + Air
- All structures can be bombed. Bombers deal their ground attack value per bombing run.
- Radar Stations provide early warning, giving AA a preparation bonus.
- Small Airstrips can be cratered, stranding aircraft. Repair priority should be high.

### Structure + Diplomacy
- Allies can share structure benefits if military access is granted. An ally's Supply Depot extends supply range for your armies too.
- If an ally revokes military access, your structures on their territory are NOT destroyed — but you lose access until access is regranted or you recapture the territory.
- Structures on neutral territory (if somehow possible) provide no benefits to anyone.

### Multiple Structures of Same Type
- A tile cannot have two structures of the same type. Each structure on a tile must be unique.
- Multiple Supply Depots across different tiles DO stack their range extensions (a chain of depots can extend supply very far from a city).
- Multiple Comms Towers do NOT stack their coordination bonus (only closest applies). They DO each provide their own +3 vision range (useful for broad coverage).

### Destruction Notification
- When any structure is destroyed (by enemy or self), the owner receives a notification with the structure type, location, and cause of destruction.
- Alliance members receive the notification if alliance notification sharing is enabled.

# Supply Chain & Troop Stranding

Source-of-truth design document for the resource supply chain, army supply mechanics, troop stranding cascade, and supply line interdiction strategy in Dad's Army.

---

## Overview

Supply is the lifeblood of warfare. Every army needs food, munitions, oil, and steel flowing from resource fields through cities to the front line. The supply system models this flow along infrastructure (roads, railways, sea routes) and creates one of the game's most important strategic dimensions: logistics.

The core tension: projecting military power far from your cities requires long supply lines. Long supply lines are vulnerable. An enemy who cuts your supply line can defeat your army without ever fighting it directly. This is historically accurate (Stalingrad, North Africa, the Atlantic convoys) and is designed to be a first-class strategy, not a niche exploit.

---

## Supply Chain Architecture

The supply chain has two distinct flows:

### Flow 1: Resources (Fields to Cities)
```
Resource Field --> [road/rail/sea] --> City Storage
```
- Resources are extracted from fields each tick (see resource system docs).
- Extracted resources must be transported to a city for storage and use.
- Transport requires an unbroken route of friendly/allied tiles with infrastructure connecting the field to the city.
- Resources travel along the cheapest available route (road preferred over rail for short distances; rail preferred for long distances due to higher capacity).

### Flow 2: Supply (Cities to Armies)
```
City Storage --> [road/rail/sea/air] --> Supply Depot (optional relay) --> Army
```
- Armies consume upkeep resources every tick (see `military.md` for per-unit upkeep).
- These resources are drawn from the nearest connected friendly city's stockpile.
- "Connected" means an unbroken route of friendly/allied tiles with infrastructure.
- Supply Depots act as relay points, extending supply range.

---

## Supply Route Types

### Road

| Property | Value |
|---|---|
| Capacity | 100 resources/tick |
| Speed | 1x (base speed) |
| Supply Range | 10 hexes from city to army |
| Cost to Build | 10 steel, 5 manpower per hex segment |
| Build Time | 1 tick per segment |
| HP | 50 per segment |
| Repair Time | 1 tick per segment |
| Vulnerability | Low-value target individually, but many segments to protect. Raiding parties (fast cavalry/armored cars) can cut roads behind the front line. |

Roads are the default supply infrastructure. Cheap, fast to build, and flexible. Every player should be building roads to connect their cities and extend toward the front line. The weakness is low capacity — a single road can only support a few armies before becoming a bottleneck.

**Capacity bottleneck**: if total army upkeep along a road exceeds 100 resources/tick, armies further from the city receive reduced supply (proportional allocation). Armies closest to the city are prioritized.

### Railway

| Property | Value |
|---|---|
| Capacity | 500 resources/tick |
| Speed | 3x (resources arrive 3x faster) |
| Supply Range | 20 hexes from city to army |
| Cost to Build | 40 steel, 20 manpower per hex segment |
| Build Time | 3 ticks per segment |
| HP | 100 per segment |
| Repair Time | 2 ticks per segment |
| Vulnerability | High-value target. A single bombed rail segment cuts the entire line. Enemy will prioritize railway bombing. |

Railways are the backbone of large-scale logistics. Their high capacity (5x road) makes them essential for supporting major offensives with multiple armies. However, they are expensive, slow to build, and vulnerable to strategic bombing.

**Rolling stock**: railways require trains to function. Trains are automatically generated when a railway connects two cities (or a city and a Supply Depot). If the railway is cut, trains on the disconnected segment are stranded until the line is repaired.

**Gauge conversion**: captured enemy railways require 2 ticks of Engineer work per segment to convert to your gauge before your trains can use them.

### Sea Route

| Property | Value |
|---|---|
| Capacity | 1000 resources/tick |
| Speed | 2x |
| Supply Range | Unlimited (as long as ports are available at both ends) |
| Requirements | Friendly Port at origin, friendly Port (or Small Port) at destination. Must control all sea zones along the route (no enemy naval dominance). |
| Vulnerability | Submarine interdiction (Phase 2). Enemy fleet can blockade ports. |

Sea routes have the highest capacity and unlimited range, making them critical for cross-map logistics and island/coastal territory supply. However, they require significant naval investment to protect.

**Sea zone control**: a sea zone is "controlled" if no enemy warships are present, or if your naval forces outnumber the enemy's in that zone. Contested sea zones allow supply convoys to pass but with a chance of interception (see Convoy System below).

### Air Supply

| Property | Value |
|---|---|
| Capacity | 50 resources/tick per Transport Plane |
| Speed | Instant (delivered same tick) |
| Supply Range | Limited by Transport Plane range (typically 10-15 hexes from airfield) |
| Requirements | Transport Plane + Airfield (city or Small Airstrip) at origin. Air superiority over the drop zone (or accept losses to enemy fighters). |
| Cost | Very high — Transport Planes cost oil upkeep, and 50 resources/tick is minimal compared to road/rail. |

Air supply is the option of last resort. It is expensive, low-capacity, and risky (Transport Planes can be shot down). Its value lies in reaching places that ground/sea supply cannot — specifically, stranded armies that have been cut off from all other supply routes.

**Airdrop mechanics**: a Transport Plane loaded with supplies flies from its airfield to the target hex and drops supplies. If enemy fighters are in the area and you lack air superiority, the transport has a 30% chance of being intercepted (destroyed, supplies lost). AA guns along the route also fire on the transport.

---

## Supply Chain Calculation

Every tick, the server recalculates supply status for all armies. The algorithm:

### Step 1: Route Finding
For each army, find the shortest valid supply route to a friendly city:
```
1. BFS/Dijkstra from army position to nearest friendly city
2. Path must consist of:
   a. Friendly or allied tiles (military access granted)
   b. Connected by road, railway, or sea route
3. Supply Depots along the path extend the effective range
4. If multiple valid routes exist, use the one with highest remaining capacity
5. If no valid route exists → army is STRANDED
```

### Step 2: Resource Allocation
For each supplied army, deduct upkeep from the connected city's stockpile:
```
for each army in supplied_armies (sorted by distance, closest first):
    upkeep = calculate_army_upkeep(army)
    route = army.supply_route
    
    if route.remaining_capacity >= upkeep AND city.stockpile >= upkeep:
        city.stockpile -= upkeep
        route.remaining_capacity -= upkeep
        army.supply_status = 'full'
    elif city.stockpile >= upkeep * 0.5:
        // Partial supply
        city.stockpile -= upkeep * 0.5
        army.supply_status = 'low'
    else:
        army.supply_status = 'critical'  // or worse, based on duration
```

### Step 3: Stranding Check
Armies with no valid supply route enter the stranding cascade (see below).

### Resource Transport (Fields to Cities)
Each tick, resources flow from fields to connected cities:
```
for each resource_field in active_fields:
    city = find_nearest_connected_city(field)
    route = find_route(field, city)
    
    if route exists AND route.remaining_capacity > 0:
        transfer = min(field.output_per_tick, route.remaining_capacity, city.storage_remaining)
        city.stockpile += transfer
        route.remaining_capacity -= transfer
    else:
        // Resources wasted (no route or city storage full)
        field.wasted += field.output_per_tick
```

Resources beyond city storage capacity are wasted. Players should build Storage facilities in cities or establish additional cities to increase total storage.

---

## Supply Range

| Route Type | Base Range (hexes from city) | With Supply Depot (+5 each) |
|---|---|---|
| No infrastructure | 5 hexes | 10 hexes |
| Road | 10 hexes | 15, 20, 25... (chained depots) |
| Railway | 20 hexes | 25, 30, 35... (chained depots) |
| Sea | Unlimited (port to port) | N/A |
| Air | Transport Plane range (10-15 hexes) | N/A |

**No infrastructure**: armies within 5 hexes of a friendly city receive supply even without roads, but at severely reduced capacity (20 resources/tick — enough for a small garrison, not a large army).

**Chained Supply Depots**: each depot extends range by +5 hexes from its position. Depots must themselves be within supply range of a city (or another depot that is). A chain of depots can extend supply indefinitely, but each depot is a vulnerability — destroy one link and everything beyond it is cut off.

Example chain:
```
City --[10 hexes road]--> Depot A --[5 hexes]--> Depot B --[5 hexes]--> Army
Total range: 20 hexes from city
```
If Depot A is destroyed, Depot B and the Army lose supply.

---

## Troop Stranding Mechanic

The stranding mechanic is the supply system's "teeth" — the consequence for overextension or losing supply infrastructure.

### Trigger Conditions

An army becomes stranded when ALL of the following are true:
1. No valid supply route exists to any friendly city.
2. No Supply Depot within range has remaining reserves.
3. No air supply is being delivered this tick.

Specific events that can trigger stranding:
- **Infrastructure destruction**: road/rail/bridge between army and nearest city destroyed by bombing, artillery, or sabotage.
- **City capture**: the city providing supply falls to the enemy, and no alternate city is in range.
- **Diplomatic revocation**: an ally revokes military access while your troops are in their territory, severing the route that passed through allied tiles.
- **Naval interdiction**: sea route cut by enemy naval dominance in a sea zone, enemy submarine sinks the supply convoy, or enemy captures the destination port.
- **Encirclement**: enemy captures tiles surrounding the army, cutting all ground routes.

### Detection & Notification

Supply chain is recalculated every tick. The moment an army has no valid route:

1. Army status changes to `stranded`.
2. Stranding timer begins at tick 0.
3. Player receives an URGENT notification: "ARMY [name] AT [hex] HAS LOST SUPPLY! [cause]. Estimated time to critical: 3 ticks."
4. The army's icon on the map changes to show a supply warning indicator.
5. Alliance members are notified if alliance alerts are enabled.

### Stranding Cascade

The cascade is a progressive degradation that gives the player time to react, but punishes inaction severely.

#### Ticks 1-2: Low Supply

| Effect | Value |
|---|---|
| Healing | Disabled (no healing of damaged units) |
| Movement Speed | -25% |
| Attack Power | No change (full strength) |
| Defense Power | No change (full strength) |
| HP Attrition | None |
| Special Abilities | Fully functional |
| Morale | Stable |
| Notification | Warning: "Supply low. [X] ticks until critical." |

The army still fights at full strength. This grace period allows the player to react — reroute supply, repair infrastructure, or begin a fighting retreat.

#### Ticks 3-5: Critical Supply

| Effect | Value |
|---|---|
| Healing | Disabled |
| Movement Speed | -50% |
| Attack Power | -25% |
| Defense Power | No change |
| HP Attrition | 5% of max HP per tick (all stacks) |
| Special Abilities | Disabled (no special ability usage) |
| Morale | Shaken (units have 5% chance to refuse attack orders) |
| Notification | Alert: "Supply critical! Units taking attrition damage. Ammunition running low." |

The situation is dire. Units are rationing ammunition (reduced attack) and taking attrition losses from hunger, exposure, and lack of medical supplies. The player must act NOW.

#### Ticks 6-10: Desperate

| Effect | Value |
|---|---|
| Healing | Disabled |
| Movement Speed | -50% |
| Attack Power | -50% |
| Defense Power | -50% |
| HP Attrition | 10% of max HP per tick (all stacks) |
| Special Abilities | Disabled |
| Surrender Chance | 10% per tick per unit stack (stack is removed from army; enemy gains 5 of each basic resource per surrendered stack as "captured supplies") |
| Morale | Collapsing |
| Notification | Critical: "Army [name] is desperate! Units surrendering. Immediate action required." |

The army is disintegrating. Stacks are surrendering individually as morale collapses. The army's combat effectiveness is halved. Without intervention, the army is doomed.

**Surrender mechanic**: each tick, each stack in the army has a 10% independent chance of surrendering. Surrendered stacks are removed from the army permanently. The enemy player who controls the nearest tile receives a small resource bonus (representing captured equipment and POWs). Veteran stacks have reduced surrender chance (see `military.md` veterancy — Elite -20%, Legendary -30% off the base 10%).

#### Tick 11+: Collapse

| Effect | Value |
|---|---|
| Healing | Disabled |
| Movement Speed | -75% (barely mobile) |
| Attack Power | -75% |
| Defense Power | -75% |
| HP Attrition | 20% of max HP per tick |
| Special Abilities | Disabled |
| Surrender Chance | 25% per tick per stack |
| Morale | Broken |
| Notification | "Army [name] is collapsing. Mass surrender imminent." |

The army is effectively destroyed. At 20% HP loss per tick and 25% surrender per stack per tick, most armies will be completely eliminated within 4-5 ticks of reaching this stage. A full collapse from tick 1 to total destruction takes approximately 15-20 ticks (2.5-3.3 hours real time).

### Stranding Timer Reset

The stranding timer resets to 0 (army returns to full supply status) when:
- A valid supply route is re-established (infrastructure repaired, city recaptured, etc.)
- A successful air resupply drop reaches the army (resets timer by 3 ticks, not full reset)
- The army moves to a tile within supply range of a friendly city

Partial reset (air resupply):
```
new_timer = max(0, current_timer - 3)
```
Air resupply buys time but does not fully solve the problem. Sustained air supply (every tick) can keep an army at Low Supply indefinitely, but this requires continuous Transport Plane sorties and is extremely expensive.

---

## Escape Options for Stranded Armies

### Option 1: Fight Through

The army attacks enemy-held tiles to reopen a supply route.

- If the army can capture a tile that reconnects it to friendly infrastructure, supply is restored and the stranding timer resets.
- Risky: the army is fighting at reduced effectiveness (depending on cascade stage).
- Best attempted early (ticks 1-2) when the army is still at full attack power.
- Planning: the player should identify the weakest point in the enemy's encirclement and concentrate force there.

### Option 2: Air Resupply

Transport Planes drop supplies to the stranded army.

**Requirements**:
- Transport Plane available at an airfield within range.
- Air superiority over the drop zone (or willingness to risk transport losses).
- The drop zone hex must be the army's current position.

**Mechanics**:
- Each successful drop delivers 50 resources and resets the stranding timer by 3 ticks.
- Interception risk: if enemy fighters patrol the area and you lack air superiority, 30% chance per drop that the Transport Plane is shot down (supplies lost, plane destroyed).
- Enemy AA guns along the flight path fire on the transport (cumulative damage, can destroy the plane before it reaches the drop zone).
- Multiple transports can drop in the same tick (each is resolved independently).

**Limitations**:
- Air resupply capacity is low (50 resources/tick per plane). A large army's upkeep may exceed what air supply can provide — the timer won't reset faster than it advances.
- Transport Planes are expensive and limited. Losing them to interception is costly.
- Air resupply is a stopgap, not a solution. The player must still restore ground/sea supply or evacuate.

### Option 3: Naval Evacuation

If the stranded army is on a coastal tile and the player controls the adjacent sea zone, Transport Ships can evacuate the army.

**Requirements**:
- Army must be on a coastal tile (land hex adjacent to water).
- Player must control the adjacent sea zone (no enemy naval dominance).
- Transport Ship(s) must be available at a port within range.

**Mechanics**:
- Each Transport Ship can carry 1 army (up to 200 units).
- Evacuation takes 1 tick to load.
- Evacuated troops return to the nearest friendly port city.
- **Heavy equipment penalty**: only Infantry units are evacuated. All Armor and Artillery units are left behind (destroyed). This represents the inability to load heavy vehicles onto ships under emergency conditions.
- Evacuated infantry arrive at 50% HP (exhaustion, disorganization from the retreat).
- Veteran status is preserved — an Elite Riflemen stack evacuated at 50% HP is still Elite. This makes evacuation worthwhile for veteran units.

**Historical parallel**: Dunkirk. The evacuation saves the manpower but loses the equipment. The player must rebuild their armor and artillery from scratch, but preserves experienced infantry.

### Option 4: Negotiate

A diplomatic action to request safe passage from the enemy.

**Requirements**:
- Diplomatic channel must be open with the enemy controlling the route.
- Enemy player must be online (or have set auto-diplomacy rules).

**Mechanics**:
- The stranded player sends a "Request Safe Passage" diplomatic message specifying the army and the desired retreat path.
- The enemy can:
  - **Accept**: the stranded army is granted a 3-tick window of safe passage along the specified route. During this window, neither side can attack the other on those tiles. The retreating army moves at normal speed (no stranding penalties during retreat).
  - **Refuse**: no effect. The stranding cascade continues.
  - **Counter-offer**: the enemy can demand resources, territory, or other concessions in exchange for safe passage (standard diplomatic negotiation).
- Safe passage is binding — violating it (attacking during the window) incurs a diplomatic reputation penalty (-20 reputation, visible to all players).

---

## Supply Line Visualization

Supply lines are rendered on the map for the owning player (and allies with shared intelligence).

### Visual Indicators

| Color | Meaning |
|---|---|
| **Green** (solid line) | Healthy supply route. Full capacity, no threats detected. |
| **Yellow** (dashed line) | Threatened. Route passes within 3 hexes of an enemy army or through a contested area. Still functional but at risk. |
| **Orange** (dashed line) | Partially damaged. One or more segments at <50% HP. Reduced capacity. |
| **Red** (dotted line) | Cut. Route is severed — no supply flowing. Immediate repair needed. |
| **No line** | No supply route exists. Army is stranded. |

### Additional UI Elements
- **Army supply icon**: a small icon next to each army showing its supply status (green checkmark, yellow warning, red X).
- **Supply range overlay**: toggle that shows the maximum supply range from all cities and depots as a colored overlay on the map.
- **Capacity indicator**: hovering over a supply route shows current usage vs maximum capacity (e.g., "78/100 resources/tick via road").
- **Threat indicator**: hovering over a yellow route shows the source of the threat (e.g., "Enemy army at hex [X] within 2 hexes of route").

---

## Cutting Supply Lines as Strategy

Interdicting enemy supply is one of the most powerful strategies in the game. Instead of attacking a strong enemy army head-on, a player can destroy the infrastructure behind it and let attrition do the work.

### Methods of Interdiction

#### 1. Bridge Destruction
- Destroy a key bridge using bombers, artillery, or Engineer demolition.
- If the bridge is the only river crossing on a supply route, all supply beyond it is cut.
- Cheap and devastating. Bridge HP is only 150 — a single bombing run can destroy it.
- Repair takes 3 ticks and requires Engineers or city remote construction.

#### 2. Railway Bombing
- Strategic bombers target railway segments.
- A single destroyed segment cuts the entire rail line.
- Particularly effective against long rail supply lines — the enemy must identify which segment was hit and dispatch Engineers to repair it.
- Repeated bombing of the same rail segment prevents repair (the enemy must establish fighter patrols to protect the repair crews).

#### 3. Road Raiding
- Fast units (Armored Cars, Light Tanks) break through the front line and raid supply roads behind the enemy.
- Destroy road segments, then retreat before the enemy can respond.
- Less decisive than bridge/rail destruction (roads are cheap to repair, 1 tick) but forces the enemy to divert forces to rear-area security.

#### 4. Submarine Interdiction (Phase 2)
- Submarines interdict enemy sea supply routes by attacking convoys.
- Each submarine attack has a chance to sink convoy ships (destroying the resources they carry).
- Wolf pack tactics: multiple submarines in the same sea zone have a cumulative interception chance.
- Counter: Destroyer escorts protect convoys. Depth charges destroy submarines.

#### 5. Port Blockade (Phase 2)
- A naval fleet positioned in the sea zone adjacent to an enemy port prevents all sea supply through that port.
- The blockading fleet must maintain position (cannot move without breaking the blockade).
- Counter: the enemy must defeat the blockading fleet or find an alternate port.

#### 6. Encirclement
- The ultimate supply interdiction: capture all tiles surrounding an enemy army, cutting every possible route.
- Requires significant military superiority to execute (you need enough forces to encircle AND defend the encirclement).
- The encircled army is doomed unless it can break out or be resupplied by air.
- Historical parallel: Stalingrad (6th Army encircled, air supply insufficient, eventual surrender).

### Strategic Considerations
- **Don't attack strength directly**: if an enemy has a heavily fortified position with a strong army, don't assault it. Cut its supply line and wait. The army will weaken over 10-15 ticks without you losing a single unit.
- **Defend your own supply lines**: patrol your roads and railways. Station Armored Car units along supply routes to detect and intercept raiders. Build Comms Towers for vision coverage. Establish fighter patrols over critical railway junctions.
- **Redundancy**: build multiple supply routes to critical armies. If one road is cut, supply can reroute via another. This costs more resources but provides resilience.
- **Forward depots**: Supply Depots with stored resources provide a buffer. Even if the route to the depot is cut, the depot's reserves keep the army supplied for several ticks while you repair.

---

## Convoy System (Phase 3)

In Phase 3, sea supply transport becomes more granular with the convoy system.

### Convoy Mechanics
- Resources transported by sea are loaded onto Convoy ships (auto-generated when sea route is established).
- Convoys travel along the sea route at 2x speed (same as sea route base speed).
- Each convoy carries 200 resources per trip.
- Convoys are visible on the map (to both sides if detected).

### Submarine Interception
- Submarines in a sea zone through which a convoy passes have a chance to intercept:
  ```
  interception_chance = 15% * number_of_submarines (max 75%)
  ```
- If intercepted, the submarine attacks the convoy:
  - Unescorted convoy: 80% chance of sinking (resources lost).
  - Escorted convoy (destroyer present): submarine must fight the escort first. If the submarine survives, 40% chance of sinking the convoy.
- Sunk convoys: all carried resources are lost. The convoy ship is destroyed (must be replaced).

### Escort Mechanics
- Destroyers can be assigned to escort convoys.
- Each Destroyer reduces interception effectiveness:
  ```
  adjusted_interception = base_interception * (1 - 0.2 * number_of_destroyers)  // min 5%
  ```
- Destroyers engage intercepting submarines in combat (depth charges vs torpedoes).

### Anti-Submarine Warfare
- Destroyers: depth charges, effective at close range.
- Recon Planes: can detect submerged submarines in a 4-hex radius, revealing them to friendly naval forces.
- Sonar research: increases submarine detection range for all destroyers by +1 hex.
- Submarine detection is probabilistic: each tick, a destroyer has a `30% + (10% * sonar_level)` chance of detecting a submarine in an adjacent hex.

---

## Edge Cases & Interactions

### Multiple Supply Routes
- An army with access to multiple supply routes uses the one with highest remaining capacity.
- If the primary route is cut, the army automatically switches to the secondary route (no player action needed, no interruption in supply).
- The rerouting happens in the same tick as the route loss — no gap in supply unless ALL routes are cut simultaneously.

### Allied Supply
- Armies can draw supply through allied territory if military access is granted.
- Allied cities can supply your armies (the allied player's resources are used, unless a "supply sharing" agreement specifies otherwise).
- If an ally revokes military access, supply routes through their territory are immediately cut. Any armies depending on those routes become stranded.
- This makes alliance management critical. A sudden betrayal (revoking access) can strand multiple armies.

### Overextension Warning
- When an army moves beyond 80% of its maximum supply range, the player receives a warning: "Army [name] approaching supply limit. Consider building a Supply Depot."
- At 100% range, the army is at the edge — any disruption will strand it.
- Beyond 100% range, the army immediately enters Low Supply status even if the route is intact (the route is too long for reliable supply).

### Resource Priority
- When multiple armies draw from the same city and the city's stockpile is insufficient:
  - Priority 1: Garrison (city's own defense).
  - Priority 2: Armies sorted by distance (closest first).
  - Priority 3: Structure upkeep (factories, etc.).
- Players can manually override priority (assign specific armies as "high priority" — they draw first regardless of distance).

### Supply During Combat
- Supply continues to flow during combat (armies fighting at a city still receive supply from that city).
- However, if the supply route passes through a tile where combat is occurring, capacity is halved (logistics disruption from nearby fighting).
- If the tile with the supply route on it is captured by the enemy mid-tick, supply is cut from the next tick onward.

### Weather Effects (if implemented)
- **Mud season**: road capacity reduced by 50%. Railway unaffected.
- **Winter**: all supply consumption increased by 25% (troops need more food and fuel). Sea routes may freeze in northern hexes (blocked entirely).
- **Storms**: sea routes capacity halved. Convoy interception chance increased by 10% (storms scatter escorts).

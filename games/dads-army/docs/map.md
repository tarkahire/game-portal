# Map System

This document is the source of truth for the hex grid map, coordinate systems, terrain types, resource distribution, fog of war, pathfinding, and rendering in Dad's Army. All formulas and balance values defined here are authoritative.

---

## Table of Contents

1. [Hex Grid Overview](#hex-grid-overview)
2. [Coordinate Systems](#coordinate-systems)
3. [Hex Math](#hex-math)
4. [Tile Types & Distribution](#tile-types--distribution)
5. [Terrain Effects](#terrain-effects)
6. [Resource Distribution](#resource-distribution)
7. [Fog of War](#fog-of-war)
8. [Fog of Resources](#fog-of-resources)
9. [Map Seeding & Storage](#map-seeding--storage)
10. [Pathfinding](#pathfinding)
11. [Map Rendering](#map-rendering)
12. [Edge Cases & Interactions](#edge-cases--interactions)

---

## Hex Grid Overview

- The map consists of exactly **999 hexagonal tiles**.
- The map represents a stylized European theater of WW2.
- Hex orientation: **flat-top** (pointy sides on left and right).
- Each hex is a discrete game tile with a single terrain type, optional resource, owner, and state.
- The map is fixed per server -- generated once at server creation and does not change shape (terrain can be modified by war damage and construction, but tile positions are permanent).

### Map Shape

The 999 tiles are arranged in an irregular shape roughly resembling Western/Central Europe extending to Eastern Europe and North Africa. This is NOT a regular hexagonal grid -- it is a custom shape stored as a list of valid (q, r) coordinates.

Approximate dimensions: ~40 hexes wide, ~30 hexes tall (varies due to irregular coastline).

---

## Coordinate Systems

### Axial Coordinates (Storage & Primary Reference)

Every tile is identified by an **(q, r)** axial coordinate pair.

```
q = column (increases east/right)
r = row (increases southeast/down-right)
```

Axial coordinates are used for:
- Database storage (Supabase `tiles` table primary key)
- API communication
- All game logic calculations
- Player-facing display (e.g., "Tile (12, -5)")

### Cube Coordinates (Distance & Algorithms)

For distance calculation and certain algorithms, axial coordinates are converted to cube coordinates **(x, y, z)** where `x + y + z = 0`.

```
Axial to Cube:
  x = q
  z = r
  y = -x - z = -q - r

Cube to Axial:
  q = x
  r = z
```

### Offset Coordinates (Not Used)

Offset coordinates are NOT used in this game. All references use axial or cube.

---

## Hex Math

### Distance Between Two Hexes

Using cube coordinates:

```
distance(a, b) = max(abs(a.x - b.x), abs(a.y - b.y), abs(a.z - b.z))
```

Or equivalently:

```
distance(a, b) = (abs(a.x - b.x) + abs(a.y - b.y) + abs(a.z - b.z)) / 2
```

Using axial coordinates directly:

```
distance(a, b) = (abs(a.q - b.q) + abs(a.q + a.r - b.q - b.r) + abs(a.r - b.r)) / 2
```

### Neighbor Directions

For flat-top hexes, the 6 neighbors of tile (q, r) are:

| Direction | Delta (dq, dr) |
|-----------|----------------|
| East | (+1, 0) |
| West | (-1, 0) |
| Northeast | (+1, -1) |
| Northwest | (0, -1) |
| Southeast | (0, +1) |
| Southwest | (-1, +1) |

### Pixel Conversion (for Rendering)

Axial to pixel (flat-top hex, origin at top-left of map):

```
pixel_x = hex_size * (3/2 * q)
pixel_y = hex_size * (sqrt(3)/2 * q + sqrt(3) * r)
```

Where `hex_size` is the distance from center to corner (outer radius).

Pixel to axial (for mouse click detection):

```
q = (2/3 * pixel_x) / hex_size
r = (-1/3 * pixel_x + sqrt(3)/3 * pixel_y) / hex_size
```

Then round to nearest hex using cube rounding:

```
function cube_round(x, y, z):
    rx = round(x)
    ry = round(y)
    rz = round(z)

    x_diff = abs(rx - x)
    y_diff = abs(ry - y)
    z_diff = abs(rz - z)

    if x_diff > y_diff and x_diff > z_diff:
        rx = -ry - rz
    elif y_diff > z_diff:
        ry = -rx - rz
    else:
        rz = -rx - ry

    return (rx, ry, rz)
```

### Line Drawing (for Line of Sight)

To find all hexes on the line between two hexes:

```
function hex_line(a, b):
    n = distance(a, b)
    results = []
    for i in 0..n:
        t = i / max(n, 1)
        x = lerp(a.x, b.x, t)
        y = lerp(a.y, b.y, t)
        z = lerp(a.z, b.z, t)
        results.append(cube_round(x, y, z))
    return results
```

Add a small epsilon nudge (1e-6) to the start point to break ties consistently.

### Hex Ring & Spiral

Ring of radius N around center:

```
function hex_ring(center, radius):
    results = []
    hex = center + direction[4] * radius  // start at southwest
    for each direction (0..5):
        for 0..radius:
            results.append(hex)
            hex = hex.neighbor(direction)
    return results
```

Spiral (all hexes within radius N):

```
function hex_spiral(center, radius):
    results = [center]
    for r in 1..radius:
        results.extend(hex_ring(center, r))
    return results
```

---

## Tile Types & Distribution

Total: 999 tiles. Approximate distribution (exact counts vary per map seed):

| Tile Type | Approx. Count | Percentage | Description |
|-----------|--------------|-----------|-------------|
| Resource Fields | ~200 | ~20% | Tiles containing extractable resources |
| Disused Land | ~150 | ~15% | Empty buildable land, suitable for cities |
| Water (Deep Sea) | ~130 | ~13% | Open ocean, naval only, impassable by land |
| Water (Coastal) | ~70 | ~7% | Shallow water adjacent to land, naval + interaction |
| Forest | ~150 | ~15% | Wooded terrain, defensive bonus, movement penalty |
| Mountain | ~100 | ~10% | High terrain, strong defense, vehicle-impassable |
| Plains | ~100 | ~10% | Open flat terrain, no modifiers |
| River | ~50 | ~5% | River hexes (traversable with crossing penalty) |
| Urban/Ruins | ~30 | ~3% | Pre-existing towns, scavengeable, defensive bonus |
| Special | ~19 | ~2% | Unique locations (capital sites, strategic points) |

### Resource Field Breakdown (~200 tiles)

| Resource Type | Approx. Count | Rarity |
|---------------|--------------|--------|
| Farmland | ~60 | Common |
| Iron | ~30 | Common |
| Coal | ~35 | Common |
| Oil | ~20 | Uncommon |
| Copper | ~20 | Uncommon |
| Bauxite | ~15 | Uncommon |
| Rubber Plantation | ~10 | Rare |
| Tungsten | ~5 | Very Rare |
| Multi-resource | ~5 | Very Rare |

---

## Terrain Effects

### Movement Costs

Base movement cost is 1.0 per hex for Plains. Other terrain types modify this:

| Terrain | Movement Cost | Vehicle Passable | Notes |
|---------|--------------|-----------------|-------|
| Plains | 1.0 | Yes | Default, no modifiers |
| Forest | 1.5 | Yes (slow) | +50% movement cost |
| Mountain | 3.0 | No (without road) | Impassable for vehicles unless road built |
| Water (Deep) | N/A (naval only) | No | Land units cannot enter |
| Water (Coastal) | N/A (naval) / 2.0 (amphibious) | Amphibious only | Special amphibious units can enter |
| River | 1.5 | Yes | Crossing penalty applies to combat as well |
| Urban/Ruins | 1.2 | Yes | Slightly rough terrain |
| Disused Land | 1.0 | Yes | Same as plains |
| Resource Field | 1.0 | Yes | Same as plains (infrastructure does not impede) |
| Road (any terrain) | 0.5 | Yes | Road overrides base terrain cost |
| Rail (any terrain) | 0.25 | Yes (rail units) | Fastest transport, requires Rail Station |

### Combat Modifiers

Defensive bonuses apply to the **defending** army on that tile. Attacker penalties apply to the **attacking** army.

| Terrain | Defender Defense Bonus | Attacker Penalty | Special |
|---------|----------------------|-----------------|---------|
| Plains | +0% | None | -- |
| Forest | +20% | None | Concealment: -10% attacker accuracy |
| Mountain | +40% | -30% armor effectiveness | Vehicles cannot attack without road |
| River (crossing) | -- | -20% attack power | Only applies when attacker crosses river into defender tile |
| Urban/Ruins | +30% | None | Artillery 50% less effective (rubble absorbs) |
| Coastal | +10% | None | Naval bombardment possible |
| Fortified (Walls+) | See cities.md | See cities.md | Stacks with terrain bonus |

### Terrain Interactions with Buildings

- **Mountains**: Cannot build cities. Can build observation posts (vision bonus), mountain roads (expensive), and tunnels (research-gated).
- **Forests**: Can build cities (land is cleared, loses forest bonus). Logging provides one-time wood resource (not tracked as ongoing resource -- purely construction material bonus of -20% building cost for that city).
- **Water**: Cannot build on. Coastal tiles adjacent to water can have Port, Coastal Battery, Shipyard.
- **Rivers**: Can be bridged. Bridge building requires Engineering Corps HQ research. Bridged rivers lose crossing penalty.

---

## Resource Distribution

Resources are deliberately distributed unevenly to create strategic tension and encourage conflict/trade.

### Geographic Concentration

| Resource | Geographic Pattern | Real-World Analogy |
|----------|-------------------|-------------------|
| Oil | Concentrated in 2-3 clusters, southeast region | Caucasus, Romania (Ploesti) |
| Iron | Spread across northern/central industrial regions | Ruhr, Sweden, Ukraine |
| Coal | Co-located with iron in industrial regions, plus scattered | Ruhr, Silesia, Donbass |
| Bauxite | Southern Mediterranean region, 2-3 small clusters | Hungary, Yugoslavia, France |
| Rubber | Far southeast, 1-2 clusters only | Southeast Asian imports (abstracted) |
| Copper | Central/eastern scattered | Yugoslavia, Turkey |
| Tungsten | 1-3 single tiles, widely separated | Portugal, China (abstracted) |
| Farmland | Temperate central band, river valleys | Ukraine breadbasket, France, Poland |

### Design Principles

1. **No player can be self-sufficient**: No starting position has all resources within easy reach. Trade or conquest is required.
2. **Oil is king**: Oil clusters are deliberately placed in contested areas to force conflict.
3. **Tungsten is the super-rare tiebreaker**: Only 3-5 tiles on the entire map. Whoever controls tungsten has armor-piercing advantage.
4. **Farmland is widespread but not universal**: Most players can feed themselves, but large armies require breadbasket control.
5. **Rubber bottleneck**: Very limited plantation tiles force investment in Synthetic Rubber research or tropical conquest.

### Hidden Resources

Some tiles have underground resources not visible on initial exploration. See [Fog of Resources](#fog-of-resources) for discovery mechanics.

| Resource | Chance of Hidden Deposit | Terrain Types |
|----------|------------------------|---------------|
| Iron | 8% per mountain/hill tile | Mountain, Forest |
| Coal | 6% per plains/forest tile | Plains, Forest |
| Oil | 4% per plains/coastal tile | Plains, Coastal, Desert |
| Tungsten | 1% per mountain tile | Mountain only |

---

## Fog of War

Fog of war limits player knowledge, creating uncertainty and rewarding scouting.

### Vision Mechanics

Each unit and building has a vision range (in hex distance):

| Source | Vision Range (hexes) |
|--------|---------------------|
| Infantry unit | 2 |
| Mechanized unit | 3 |
| Scout unit | 5 |
| Aircraft (in flight) | 6 |
| City (any level) | 3 |
| Observation Post (mountain) | 7 |
| Intelligence Center (building) | +2 to all units in city |
| Radar Station (research-gated) | 8 (detects aircraft only) |

### Fog States

Each tile, for each player, is in one of three states:

| State | What Player Sees | Condition |
|-------|-----------------|-----------|
| **Unexplored** | Terrain type only (no ownership, no units, no resources, no buildings) | Never been in vision range |
| **Explored (Fog)** | Terrain + last-known state (ownership, buildings as of last sight) | Previously seen but not currently in vision range |
| **Visible** | Full real-time information (units, buildings, ownership, resource details) | Currently within vision range of a friendly unit/building |

### Vision Blocking

- **Mountains block line of sight**: A mountain hex between the viewer and a target hex blocks vision beyond it (unless viewer is on a mountain or aircraft).
- **Forests reduce vision**: Units inside forests have -1 vision range. Units looking into forests have -1 effective range for those tiles.
- **Height advantage**: Units on mountains gain +2 vision range (stacks with Observation Post).

### Vision Calculation

For each player, each tick:

1. Collect all friendly units and buildings with vision.
2. For each source, calculate visible hexes using `hex_spiral(source_position, vision_range)`.
3. For each hex in the spiral, check line of sight (no blocking mountain between source and target, adjusted for height).
4. Mark all visible hexes as "Visible" state.
5. All previously Visible hexes not in new Visible set transition to "Explored (Fog)", retaining last-seen state.
6. Store in Supabase `player_vision` table as a set of (player_id, q, r, state, last_seen_tick).

### Performance Note

Vision recalculation is expensive. Server computes incrementally -- only recalculating when units move or are created/destroyed. Client maintains a local vision cache and updates on Supabase Realtime events.

---

## Fog of Resources

An additional layer of fog specifically for resource information.

### Surface Resources (Always Visible)

These resources are visible as soon as the tile is explored (enters Explored or Visible state):
- Farmland (crops are visible)
- Rubber Plantations (trees are visible)
- Surface Iron (visible mine-worthy deposits)
- Surface Coal (visible outcroppings)

Surface resources show: resource type and approximate size (Small / Medium / Large -- no exact number).

### Underground Resources (Survey Required)

These resources are hidden until a geological survey is performed:
- Deep Iron deposits
- Oil reserves
- Bauxite deposits
- Tungsten veins
- Deep Coal seams

### Geological Survey Process

1. **Prerequisite**: Intelligence Center (level 2+) and "Geological Survey" research.
2. **Deploy Survey Unit**: Trained at Intelligence Center, costs 50 Money + 20 Manpower.
3. **Survey Execution**: Survey Unit moves to target tile. Takes 6 ticks (30 minutes) to complete survey.
4. **Survey Result**: Reveals whether a hidden resource exists, its type, and approximate reserves (+/- 20% accuracy).
5. **Survey Unit**: Can be reused. One survey at a time per unit.
6. **Vulnerability**: Survey Unit is a non-combat unit. If enemy unit enters tile during survey, survey is canceled and unit captured.

### Resource Information Levels

| Level | What Player Knows | How to Achieve |
|-------|------------------|----------------|
| Unknown | Nothing | Tile unexplored |
| Terrain Known | Terrain type, surface resource presence | Explore tile (vision) |
| Surface Assessed | Resource type + rough size (S/M/L) | Explore tile (automatic) |
| Surveyed | Resource type + approximate reserves (+/-20%) | Geological Survey |
| Fully Known | Exact reserves, depletion rate, infrastructure details | Own the tile with infrastructure |

---

## Map Seeding & Storage

### Map Generation

The 999-tile map is pre-generated and stored in Supabase. Each server instance uses the same base map (the European theater layout is hand-designed, not procedurally generated).

### Variation Between Servers

While the tile positions and terrain are fixed, resource placement has controlled randomness:
- Resource type per tile is seeded from a distribution table (see Resource Distribution).
- `total_reserves` per resource tile is randomized within the ranges specified in resources.md.
- Hidden resource deposits are randomized per server seed.
- The server seed is stored in the `servers` table and used for all random resource placement.

### Map Data Schema (Supabase)

**Table: `tiles`**

```
{
  "q": integer,              // axial coordinate
  "r": integer,              // axial coordinate
  "terrain": string,         // "plains", "forest", "mountain", "water_deep", "water_coastal",
                             // "river", "urban_ruins", "disused_land", "resource_field", "special"
  "resource_type": string?,  // null or "iron", "coal", "oil", "bauxite", "rubber", "copper",
                             // "tungsten", "farmland"
  "resource_hidden": string?, // null or hidden resource type (revealed by survey)
  "total_reserves": integer?, // total extractable amount (null for farmland, uses soil_quality)
  "remaining_reserves": integer?, // current remaining
  "soil_quality": float?,    // 0.0 - 1.0 for farmland tiles
  "land_quality": float,     // 0.0 - 1.0, affects city building
  "war_damage": float,       // 0.0 - 100.0, accumulated combat damage
  "owner_id": uuid?,         // null (unowned) or player UUID
  "infrastructure_level": integer, // 0-5
  "intensity": string,       // "sustainable", "normal", "intensive"
  "has_road": boolean,
  "has_rail": boolean,
  "has_bridge": boolean,     // for river tiles
  "adjacency": integer[]     // array of neighbor tile IDs (precomputed)
}
```

**Table: `tile_buildings`**

```
{
  "tile_id": integer,        // foreign key to tiles
  "building_type": string,
  "building_level": integer,
  "construction_progress": float, // 0.0 - 1.0
  "is_active": boolean
}
```

### Map JSON Export

For initial client load, the full map (terrain + public info) is served as a single JSON blob:

```json
{
  "server_id": "uuid",
  "map_version": 1,
  "hex_size": 32,
  "tiles": [
    {"q": 0, "r": 0, "terrain": "plains", "land_quality": 1.0},
    {"q": 1, "r": 0, "terrain": "forest", "land_quality": 1.0},
    ...
  ]
}
```

Resource details, ownership, and buildings are sent separately per player's fog of war state.

---

## Pathfinding

### Algorithm: Dijkstra on Hex Adjacency Graph

Movement uses Dijkstra's shortest path algorithm on the hex grid, with weighted edges based on terrain movement cost.

### Movement Cost Table

| Terrain | Base Cost | With Road | With Rail |
|---------|----------|-----------|-----------|
| Plains | 1.0 | 0.5 | 0.25 |
| Forest | 1.5 | 0.5 | 0.25 |
| Mountain | 3.0 (infantry only) | 1.0 | 0.25 |
| River | 1.5 | 0.5 (bridge) | 0.25 (bridge) |
| Urban/Ruins | 1.2 | 0.5 | 0.25 |
| Disused Land | 1.0 | 0.5 | 0.25 |
| Resource Field | 1.0 | 0.5 | 0.25 |
| Coastal | 2.0 (amphibious) | 1.0 | N/A |
| Water (Deep) | Impassable | N/A | N/A |

### Unit Movement Speeds

Each unit type has a movement point budget per tick:

| Unit Type | Movement Points / Tick | Notes |
|-----------|----------------------|-------|
| Infantry | 2.0 | Slow but traverses all land terrain |
| Mechanized Infantry | 4.0 | Cannot cross mountains without road |
| Light Tank | 3.5 | Cannot cross mountains without road |
| Heavy Tank | 2.5 | Cannot cross mountains without road |
| Artillery | 1.5 | Slowest, cannot cross mountains without road |
| Scout | 5.0 | Fastest land unit |
| Naval (all) | 4.0 | Water tiles only |
| Aircraft | 8.0 | Ignores terrain (straight-line hex distance) |

### Pathfinding Implementation

```
function find_path(start, end, unit_type):
    // Standard Dijkstra with priority queue
    open = PriorityQueue()
    open.push(start, 0)
    came_from = {}
    cost_so_far = {start: 0}

    while not open.empty():
        current = open.pop()
        if current == end:
            break

        for neighbor in get_neighbors(current):
            if not is_passable(neighbor, unit_type):
                continue
            move_cost = get_movement_cost(neighbor.terrain, unit_type, neighbor.has_road)
            new_cost = cost_so_far[current] + move_cost
            if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                cost_so_far[neighbor] = new_cost
                priority = new_cost
                open.push(neighbor, priority)
                came_from[neighbor] = current

    return reconstruct_path(came_from, start, end)
```

### Movement Execution

- Player issues a move order: unit moves along calculated path.
- Per tick, the unit expends its movement points traveling along the path.
- If movement points are exhausted mid-path, the unit stops and resumes next tick.
- ETA displayed on client: `total_path_cost / movement_points_per_tick` ticks.
- Movement can be cancelled or rerouted at any time (unit stops at current hex).

### Fog of War & Pathfinding

- Pathfinding only uses terrain the player has explored.
- If the path goes through unexplored tiles, it assumes default cost for the visible terrain type.
- If a unit encounters an impassable tile it didn't know about (e.g., hidden mountain pass blocked), it stops and the player is notified.

### Roads and Rail

- **Roads**: Built by units deployed from a Road Depot building. Cost: 50 Money + 10 Steel per hex. Build time: 2 ticks per hex. Roads halve movement cost on any terrain.
- **Rail**: Built by units deployed from a Rail Station building. Cost: 200 Money + 50 Steel per hex. Build time: 6 ticks per hex. Prerequisite: road must exist on the hex first. Rail provides fastest transport (0.25 cost) but units must start/end at Rail Stations.
- **Bridges**: Built on river hexes. Cost: 150 Money + 30 Steel. Build time: 4 ticks. Removes river crossing penalty for combat and movement.
- Roads, rail, and bridges can be destroyed (by owner via scorched earth, or by bombing). Destroyed infrastructure must be rebuilt from scratch.

---

## Map Rendering

### Technology

- HTML5 Canvas (2D context), consistent with the rest of the game portal's tech stack.
- No WebGL required. All rendering is 2D sprite-based.

### Hex Rendering

Each hex is rendered as a flat-top hexagon with terrain-specific textures or colors:

| Terrain | Base Color | Texture/Pattern |
|---------|-----------|----------------|
| Plains | #8FBC8F (dark sea green) | Light grass pattern |
| Forest | #228B22 (forest green) | Tree canopy sprites |
| Mountain | #808080 (gray) | Rocky peak sprites |
| Water (Deep) | #000080 (navy) | Wave animation |
| Water (Coastal) | #4169E1 (royal blue) | Lighter wave animation |
| River | #4682B4 (steel blue) | Flowing water line |
| Urban/Ruins | #A0522D (sienna) | Building silhouettes |
| Disused Land | #D2B48C (tan) | Bare earth |
| Resource Field | Varies by resource | Resource-specific icon overlay |

### Layer System

Rendered back-to-front:

1. **Base terrain** -- hex fills with terrain color/texture
2. **Roads/Rail** -- line overlays connecting hex centers
3. **Resource icons** -- small icon in hex center (pickaxe for mines, oil derrick for oil, wheat for farmland, etc.)
4. **Infrastructure** -- small building sprites on resource tiles (scaled by infrastructure level)
5. **City sprites** -- larger building cluster sprites for city tiles (scaled by city level)
6. **Unit sprites** -- military unit icons with player color, troop count badge
7. **Ownership overlay** -- semi-transparent player color fill (alpha 0.15) on owned tiles
8. **Fog of war overlay** -- dark overlay (alpha 0.6) on explored-but-not-visible tiles, black (alpha 0.9) on unexplored tiles
9. **UI elements** -- selection highlight, movement path preview, combat indicators
10. **HUD** -- resource bars, minimap, unit info panel (rendered outside canvas or as overlay)

### Zoom Levels

| Zoom Level | Hex Size (px) | Detail | Use Case |
|-----------|--------------|--------|----------|
| 1 (Overview) | 8 | Colors only, no icons | Full map strategic view |
| 2 (Region) | 16 | Terrain colors + resource icons | Regional planning |
| 3 (Default) | 32 | Full detail: textures, buildings, units | Standard gameplay |
| 4 (Close) | 64 | High detail: unit counts, HP bars, building levels | Tactical combat view |
| 5 (Maximum) | 96 | Maximum detail, individual unit sprites | Inspection/screenshot |

### Minimap

- Always visible in corner of screen (configurable position).
- Shows full 999-tile map at zoom level 1 equivalent.
- Player's viewport indicated by rectangle overlay.
- Click-to-navigate: clicking minimap moves viewport.
- Shows fog of war (explored areas lit, unexplored dark).

### Performance Considerations

- Only render tiles within the current viewport (culling).
- Cache rendered terrain tiles as offscreen canvas (terrain doesn't change often).
- Dirty flag system: only re-render tiles whose state has changed.
- Target: 60 FPS at default zoom on mid-range hardware.
- Estimated max visible tiles at default zoom (1920x1080 viewport, 32px hex): ~600 tiles. Well within Canvas 2D performance.

---

## Edge Cases & Interactions

### Map Boundaries

- Tiles at the edge of the map have fewer than 6 neighbors.
- The adjacency list in the database handles this -- edge tiles simply list fewer neighbors.
- No wrapping: the map does not wrap around. Edge tiles are hard boundaries.
- Water tiles along the map edge represent open ocean. Naval units reaching the edge cannot go further.

### Tile Ownership Changes

- Ownership changes when an army successfully captures a tile (see combat.md).
- Unowned tiles (no player): can be claimed by moving a unit onto them (no combat required).
- Owned tiles: require combat to capture (or diplomatic transfer).
- When ownership changes, all fog-of-war data for the previous owner remains unchanged (they still see the tile as "Explored" with last-known state from when they lost it).

### River Mechanics

- River tiles are traversable land tiles with a crossing penalty.
- The river "flows" between hexes: a river tile has a flow direction that determines which adjacent hexes incur the crossing penalty.
- Bridging a river tile removes the crossing penalty for all armies crossing it (including enemies who capture the bridge).
- Bridges can be destroyed: costs the defender 1 tick of preparation (see combat.md scorched earth).

### Urban/Ruins Scavenging

- Urban/Ruins tiles contain one-time scavengeable resources.
- When a player first occupies an Urban/Ruins tile, they receive a random resource bonus: 100-500 of a random resource (Food, Steel, Copper, or Ammunition).
- The tile then converts to "Disused Land" (100% land quality) after scavenging.
- Scavenging is automatic on first occupation. Cannot be repeated.

### Simultaneous Discovery

- If two players survey the same hidden resource tile on the same tick, both receive the survey result. Neither gains exclusive knowledge.
- The tile's resource becomes public knowledge to both players simultaneously.

### Destroyed Tiles

- Heavy bombing or scorched earth can reduce a tile's land quality but cannot destroy the tile itself.
- A tile always exists, even at 0% land quality (though building on it would be prohibitively expensive and nearly useless).
- Maximum war_damage is 100 (see combat.md). At war_damage 100, land_quality formula: `land_quality = base_land_quality * (1 - war_damage/200)`, so maximum permanent quality reduction is 50%.

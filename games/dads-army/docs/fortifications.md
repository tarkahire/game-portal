# Fortification System

Source-of-truth design document for all fortification types, construction, defense bonuses, destruction methods, and maintenance mechanics in Dad's Army.

---

## Overview

Fortifications are defensive structures that increase the combat effectiveness of defending units. They are categorized by where they can be built: Field (any land tile), City (within city boundaries), or Coastal (coastline tiles). Fortifications are a core part of the defensive meta and create a meaningful attacker/defender asymmetry — dug-in defenders are far more costly to dislodge than to maintain.

---

## Location Tiers

| Tier | Where Built | Built By | Notes |
|---|---|---|---|
| **Field** | Any owned land tile | Engineer units, or purchased from nearby city (within 5 hexes) | Relatively cheap, low HP, crucial for front-line defense |
| **City** | Within a city's building slots | City construction queue (like any building) | Expensive, high HP, permanent until destroyed |
| **Coastal** | Coastline tiles (land hex adjacent to water hex) | Engineer units or city construction | Specialized anti-naval/amphibious defense |

---

## Field Fortifications

Field fortifications can be built on any owned land tile. They require either Engineer units on the tile or resource expenditure from a city within 5 hexes.

### Foxholes

| Property | Value |
|---|---|
| Cost | 10 manpower, 5 steel |
| Build Time | 1 tick |
| Defense Bonus | +10% to all defending units on tile |
| HP | 50 |
| Special | Quick to build. First line of defense. Destroyed easily by artillery. |

### Trenches

| Property | Value |
|---|---|
| Cost | 30 manpower, 15 steel |
| Build Time | 2 ticks |
| Defense Bonus | +20% to all defending units on tile |
| HP | 100 |
| Special | Provides partial cover from artillery: -25% damage from indirect fire to units in trenches. Semi-permanent. |

### Sandbag Walls

| Property | Value |
|---|---|
| Cost | 20 manpower, 10 steel |
| Build Time | 1 tick |
| Defense Bonus | +15% to all defending units on tile |
| HP | 75 |
| Special | Directional: defense bonus only applies against attacks from the facing direction (chosen at build time). Can be rotated by Engineers (1 tick). |

### Barbed Wire

| Property | Value |
|---|---|
| Cost | 10 steel |
| Build Time | 1 tick |
| Defense Bonus | None (area denial, not direct defense) |
| HP | 30 |
| Special | Slows attacker movement by 50% when entering this tile. Must be cleared by Engineers (takes 1 tick) or destroyed by artillery/armor (takes damage like a structure). Infantry attacking through barbed wire suffer -10% attack. |

### Small Bunker

| Property | Value |
|---|---|
| Cost | 50 manpower, 40 steel |
| Build Time | 4 ticks |
| Defense Bonus | +30% to all defending units on tile |
| HP | 200 |
| Special | Artillery Resistant: takes only 50% damage from indirect fire (artillery, rocket barrages). Provides full cover for up to 2 unit stacks. Additional stacks on the tile only get +10% defense (overflow). |

### Observation Post

| Property | Value |
|---|---|
| Cost | 15 manpower |
| Build Time | 1 tick |
| Defense Bonus | None |
| HP | 30 |
| Special | Grants +2 tile vision range centered on this hex. Reveals enemy army composition (not just presence) within 1 hex. Fragile — priority target for enemy recon denial. |

### Minefields

| Property | Value |
|---|---|
| Cost | 20 steel, 10 munitions |
| Build Time | 2 ticks (Engineers required) |
| Defense Bonus | None (area denial) |
| HP | N/A (mines are triggered, not attacked directly) |
| Special | See dedicated Minefield section below. |

---

## City Fortifications

City fortifications are built as city buildings occupying building slots. They are permanent, high-HP structures that make cities extremely difficult to capture by direct assault.

### Walls

| Level | Cost | Build Time | Defense Bonus | HP | Special |
|---|---|---|---|---|---|
| 1 | 100 steel, 50 manpower | 6 ticks | +20% city defense | 500 | Basic stone/concrete walls. Slows attacker entry into city hex. |
| 2 | 200 steel, 100 manpower | 10 ticks | +35% city defense | 800 | Reinforced walls. Attackers take 5% attrition damage per tick when assaulting. |
| 3 | 400 steel, 200 manpower | 16 ticks | +50% city defense | 1200 | Fortified walls with firing positions. Garrison gets +10% attack when defending behind Lv3 walls. |

Upgrading: each level must be built sequentially. Upgrade cost is the difference between levels (not cumulative). Upgrade preserves existing HP (remaining HP carries over, new max HP applies).

### Bunker

| Level | Cost | Build Time | Defense Bonus | HP | Special |
|---|---|---|---|---|---|
| 1 | 80 steel, 40 manpower | 5 ticks | +15% city defense | 300 | Bombardment Resistant: -30% damage from artillery and strategic bombing. |
| 2 | 160 steel, 80 manpower | 8 ticks | +30% city defense | 600 | Bombardment Resistant: -50% damage. Can shelter 3 unit stacks from bombing entirely. |
| 3 | 320 steel, 160 manpower | 12 ticks | +45% city defense | 1000 | Bombardment Resistant: -70% damage. Shelters 5 unit stacks. Command bunker: city continues producing even under siege at 50% rate. |

### Fortress

| Level | Cost | Build Time | Defense Bonus | HP | Special |
|---|---|---|---|---|---|
| 1 | 200 steel, 100 manpower, 50 stone | 12 ticks | +30% city defense | 800 | Increases garrison capacity by +100 units. |
| 2 | 500 steel, 250 manpower, 150 stone | 20 ticks | +60% city defense | 1500 | Increases garrison capacity by +250 units. Fortress guns: garrison deals +15% attack damage. Intimidation: attacking armies have 5% chance to rout per battle tick. |

### Anti-Aircraft Battery

| Level | Cost | Build Time | HP | Damage | Coverage |
|---|---|---|---|---|---|
| 1 | 60 steel, 30 munitions | 4 ticks | 200 | 5 damage per enemy aircraft per mission | City tile only |
| 2 | 120 steel, 60 munitions | 6 ticks | 350 | 10 damage per enemy aircraft per mission | City tile + adjacent hexes (1 hex radius) |
| 3 | 250 steel, 120 munitions | 10 ticks | 500 | 20 damage per enemy aircraft per mission | City tile + 2-hex radius. Reduces bombing accuracy by 40%. |

Anti-Aircraft damage is applied to each individual aircraft participating in a bombing mission or air attack over the covered area. An AA Battery Lv3 facing a 10-bomber raid deals 20 * 10 = 200 total damage distributed across the attacking aircraft.

### Anti-Tank Emplacement

| Property | Value |
|---|---|
| Cost | 80 steel, 40 munitions, 20 manpower |
| Build Time | 5 ticks |
| Defense Bonus | +50% defense specifically vs armor attacks |
| HP | 300 |
| Special | Only effective against Armor category units. No bonus vs infantry or artillery. Stacks with other fortification bonuses. |

---

## Coastal Fortifications

Coastal fortifications are built on land hexes that are adjacent to at least one water hex. They defend against naval and amphibious threats.

### Sea Mines

| Property | Value |
|---|---|
| Cost | 30 steel, 15 munitions |
| Build Time | 2 ticks (Engineers required; or placed by Minesweeper in reverse role) |
| Placement | Adjacent water hex (not on the land tile itself) |
| Damage | 50 damage per ship entering the mined hex |
| HP | N/A (mines are hidden objects) |
| Special | Invisible to enemy until triggered or detected by Recon Plane / Minesweeper within 2-hex detection radius. Each minefield has 5 charges (hits 5 ships, then depleted). Can be swept by Minesweepers (2 ticks to clear). |

### Concrete Amphibious Wall

| Property | Value |
|---|---|
| Cost | 100 steel, 50 manpower |
| Build Time | 6 ticks |
| Defense Bonus | +60% defense specifically vs amphibious landing attacks |
| HP | 400 |
| Special | Amphibious attackers already suffer a base -30% attack penalty when landing. With this wall, the total effective penalty is -30% attack + facing 60% boosted defenders. Devastating for attackers. Does NOT affect land-based attacks. |

### Coastal Gun Battery

| Level | Cost | Build Time | HP | Damage | Range |
|---|---|---|---|---|---|
| 1 | 80 steel, 40 munitions, 20 manpower | 5 ticks | 300 | 30 damage per enemy ship per tick | Adjacent sea hexes (1 hex into water) |
| 2 | 180 steel, 90 munitions, 40 manpower | 8 ticks | 500 | 60 damage per enemy ship per tick | 2 hexes into water |

Coastal Gun Batteries fire automatically at any enemy naval unit within range each tick. They are immobile — cannot reposition. Priority targeting: Transport Ships > Submarines (if detected) > Destroyers > larger ships.

### Coastal AA

| Property | Value |
|---|---|
| Cost | 60 steel, 30 munitions |
| Build Time | 4 ticks |
| HP | 200 |
| Damage | 10 per aircraft per mission |
| Coverage | Coast tile + 1 adjacent hex (land or sea) |
| Special | Protects coastal installations from naval air strikes. Stacks with city AA if the coastal tile is adjacent to a city. |

---

## Destroying Fortifications

Fortifications are not invincible. The attacker has multiple methods to reduce or eliminate them, each with trade-offs.

### Method 1: Artillery Bombardment

Best against: Field fortifications, Walls, exposed structures.

- Artillery units with Indirect Fire can target fortifications from range.
- Howitzers deal +50% damage vs fortifications (Siege ability).
- Damage per tick = `artillery_attack * quantity * (1 + siege_bonus) - fortification_damage_reduction`
- Bunkers reduce incoming artillery damage by their Bombardment Resistant percentage.
- Rocket Artillery can suppress an area but is inaccurate (20% miss chance).

Example: 5 Howitzers (attack 35, Siege +50%) vs Lv1 Walls (HP 500, no damage reduction):
```
damage_per_tick = 5 * 35 * 1.5 = 262.5
ticks_to_destroy = ceil(500 / 262.5) = 2 ticks
```

Example: 5 Howitzers vs Lv2 Bunker (HP 600, -50% artillery damage):
```
damage_per_tick = 5 * 35 * 1.5 * 0.5 = 131.25
ticks_to_destroy = ceil(600 / 131.25) = 5 ticks
```

### Method 2: Strategic Bombing (Phase 2)

Best against: Bunkers, concrete fortifications, Coastal Gun Batteries.

- Requires Bombers and air superiority over the target.
- Bomber attack vs buildings = 35 per bomber.
- Bunker Bombardment Resistant applies (reduces bombing damage by the same percentage as artillery).
- AA batteries fire back, damaging bombers.
- Multiple bombing runs required for high-HP targets.

### Method 3: Engineer Assault

Best against: Walls (breach), Minefields (clear), Barbed Wire (cut).

- Engineers have +50% damage vs walls (Breach ability).
- Engineers can clear a Minefield in 2 ticks without triggering it.
- Engineers can cut Barbed Wire in 1 tick.
- Engineer assault is risky: Engineers must be on an adjacent tile and are exposed to defender fire.
- Engineers paired with infantry (combined assault) is the standard tactic.

### Method 4: Naval Bombardment (Phase 2)

Best against: Coastal fortifications, Walls of coastal cities.

- Cruisers and Battleships can bombard shore targets.
- Shore bombardment damage: Cruiser 25/tick, Battleship 50/tick per ship.
- Effective against Coastal Gun Batteries (can outrange Lv1 Coastal Guns with Battleship range).
- Coastal Guns fire back, creating a duel. Player must weigh ship losses vs fortification damage.

### Method 5: Siege

Best against: Heavily fortified cities that cannot be stormed.

- Cut all supply routes to the fortified position (see `supply-lines.md`).
- Garrisoned units begin the stranding cascade:
  - After 5 ticks without supply: garrison loses 5% HP/tick.
  - After 10 ticks: fortifications begin degrading (lose 2% HP/tick) as defenders cannibalize materials.
  - After 20 ticks: garrison morale collapses, surrender chance begins.
- Siege is slow but preserves attacker forces. Historically accurate (Siege of Sevastopol, etc.).
- Defender can attempt a breakout (attack from the city to reopen supply).

---

## Fortification Stacking

Multiple fortifications on the same tile stack their defense bonuses, but with diminishing returns.

**Stacking formula**:
```
total_defense_bonus = first_bonus + (second_bonus * 0.75) + (third_bonus * 0.5) + ...
```

Sorted from highest to lowest bonus before applying diminishing returns.

Example: Trenches (+20%) + Sandbag Walls (+15%) + Foxholes (+10%) on the same tile:
```
total = 20% + (15% * 0.75) + (10% * 0.5) = 20% + 11.25% + 5% = 36.25%
```

Maximum field fortifications per tile: 3 (excluding Barbed Wire and Minefields, which are area denial and don't count toward this limit).

City fortification bonuses stack additively (no diminishing returns) since they represent different defensive systems:
```
city_total_defense = wall_bonus + bunker_bonus + fortress_bonus + terrain_bonus
```

A fully fortified city (Lv3 Walls + Lv3 Bunker + Lv2 Fortress) has: 50% + 45% + 60% = 155% defense bonus. This is intentionally very high — storming a fully fortified city should be a terrible idea without extensive preparation.

---

## Fortification Maintenance & Degradation

Fortifications require minimal ongoing maintenance to remain effective.

### Degradation Rules
- **Garrisoned fortifications**: no degradation. Garrison troops maintain them automatically.
- **Ungarrisoned field fortifications**: lose 1% max HP per day (144 ticks). A Foxhole (50 HP) loses 0.5 HP/day, lasting ~100 days unattended (effectively permanent within a 45-day cycle).
- **Ungarrisoned city fortifications**: lose 0.5% max HP per day. Much more durable.
- **Damaged fortifications**: repair requires Engineers on-tile or resource expenditure from a nearby city.
  - Repair rate: 5% max HP per tick (Engineers present) or 2% max HP per tick (resource repair from city).
  - Repair cost: 25% of original build cost per 50% HP restored.

### Land Quality Impact

Degraded land (from resource depletion, scorched earth, or prolonged combat) affects field fortification construction:

```
adjusted_cost = base_cost * (2.0 - land_quality / 100)
adjusted_hp = base_hp * (land_quality / 100)
```

Where `land_quality` is 0-100 (100 = pristine, 0 = fully degraded).

Example: building Trenches on 50% quality land:
- Cost: 30 manpower * 1.5 = 45 manpower, 15 steel * 1.5 = 22.5 (rounded to 23) steel
- HP: 100 * 0.5 = 50 HP

This creates a strategic consideration: fighting over the same territory repeatedly degrades the land, making it harder to fortify. Fresh territory is easier to defend.

---

## Minefields (Detailed)

Minefields are a special type of field fortification that function as area denial rather than direct defense.

### Placement
- Requires Engineer units on an adjacent tile.
- Build time: 2 ticks.
- Cost: 20 steel, 10 munitions per minefield.
- One minefield per tile. Cannot stack minefields.

### Visibility
- Invisible to enemy by default.
- Revealed if: enemy Recon Plane flies over (within detection range), enemy Observation Post is within 2 hexes, or enemy Engineers are on an adjacent tile (mine detection).
- Once revealed, the enemy can see the minefield on their map permanently (until cleared and re-laid).

### Triggering
- The first enemy unit stack to enter the mined tile triggers the minefield.
- Damage: 30 flat damage to the triggering stack + 15 damage to each additional stack in the same army.
- Armor units take half minefield damage (armored hull).
- Infantry units take full damage.
- After triggering, the minefield is depleted (one-use).

### Clearing
- Engineer units can clear a revealed minefield in 2 ticks (safe, no damage taken).
- Engineers can attempt to clear an unrevealed minefield: 3 ticks, 10% chance of triggering (taking damage).
- Artillery bombardment: 3 ticks of sustained fire on a mined tile has a 60% chance of detonating the mines.
- Armor can "brute force" through (takes mine damage but clears the tile).

### Strategic Use
- Funnel enemy movement: place minefields on likely approach routes, leave one route clear (where your defenses are strongest).
- Protect flanks: minefields on open terrain force the enemy to attack your fortified positions head-on.
- Delay pursuit: lay minefields when retreating to slow enemy advance.
- Combine with Barbed Wire: wire slows them down, mines damage them. Devastating in combination.

---

## Edge Cases & Interactions

### Fortification + Combat
- Fortification defense bonus applies to the garrison/defending army's total defense calculation.
- If attackers win the battle, surviving fortifications transfer to the new owner (they now defend the tile).
- If fortifications are at 0 HP, they are destroyed and removed from the tile.

### Multiple Owners
- Fortifications belong to the tile owner. If a tile changes hands via diplomacy (not combat), fortifications transfer intact.
- Allied armies benefit from friendly fortifications on shared tiles.

### Scorched Earth
- A retreating player can destroy their own fortifications (instant, no cost) to deny them to the enemy. This is the "scorched earth" option.
- Scorched earth also degrades land quality by 20 points (see land quality impact above).

### Fortification + Supply
- Fortifications do not consume upkeep resources. They are static structures.
- However, garrisoned units within fortifications DO consume upkeep. A fortified position with no supply still withers (see siege mechanic above).

### Building During Combat
- Engineers cannot build fortifications on a tile that is currently engaged in combat.
- Engineers on an adjacent tile CAN build fortifications on their own tile while an adjacent tile is in combat (preparing secondary defensive lines).

### Weather Effects (if implemented)
- Rain: field fortification build time +50%. Foxholes and Trenches lose -5% HP per day from flooding.
- Snow: no additional build cost, but repair rate halved.
- Mud: barbed wire effectiveness increased (enemy movement slowed by additional 25%).

# Military System

Source-of-truth design document for all military units, training, army composition, movement, supply, healing, and veterancy mechanics in Dad's Army.

---

## Overview

The military system governs unit recruitment, army formation, movement, upkeep, and battlefield capabilities. Units are trained in cities, organized into armies, and projected across the 999-hex map to capture territory and destroy enemy forces. The system rewards thoughtful army composition and punishes overextension via the supply chain (see `supply-lines.md`).

Server cycle: 45 days. Tick duration: 10 minutes (6 ticks/hour, 144 ticks/day, 6480 ticks/cycle).

---

## Unit Categories

| Phase | Categories |
|-------|-----------|
| Phase 1 (Launch) | Infantry, Armor, Artillery |
| Phase 2 (Post-launch) | Air, Naval |

Phase 2 categories are unlocked server-wide at a configured day (default: day 10) or when any player researches the prerequisite technology (Aeronautics for Air, Shipbuilding for Naval).

---

## Unit Stats — Phase 1

### Infantry

| Stat | Riflemen | Machine Gun Squad | Mortar Team | Engineers | Paratroopers (Phase 2) |
|---|---|---|---|---|---|
| **Category** | Infantry | Infantry | Infantry | Infantry | Infantry |
| **Role** | Line infantry | Defensive specialist | Indirect fire | Utility / construction | Airborne assault |
| **Attack** | 10 | 8 | 12 | 6 | 12 |
| **Defense** | 8 | 14 | 5 | 7 | 6 |
| **HP** | 50 | 60 | 40 | 45 | 45 |
| **Speed** | 2 hexes/tick | 1 hex/tick | 1 hex/tick | 1 hex/tick | 2 hexes/tick (3 when airdropped) |
| **Training Cost** | 20 manpower, 10 munitions | 35 manpower, 20 munitions, 5 steel | 30 manpower, 25 munitions, 10 steel | 25 manpower, 15 steel, 5 munitions | 40 manpower, 20 munitions |
| **Training Time** | 2 ticks | 3 ticks | 3 ticks | 4 ticks | 5 ticks |
| **Upkeep** | 1 food, 1 munitions / tick | 2 food, 2 munitions / tick | 2 food, 3 munitions / tick | 1 food, 1 munitions, 1 steel / tick | 2 food, 2 munitions / tick |
| **Prerequisites** | Barracks (Lv1) | Barracks (Lv2) | Barracks (Lv2), Munitions Factory | Barracks (Lv1), Engineering Corps HQ | Barracks (Lv3), Airfield, Paratrooper Doctrine research |
| **Special Abilities** | None | Entrench: +20% defense when stationary for 1+ tick. Suppressive Fire: reduces enemy attack by 10% in the same battle. | Indirect Fire: can attack units 2 hexes away without being in the frontline. +25% damage vs fortifications. | Build/repair field structures (foxholes, trenches, bridges, roads). Clear minefields (2 ticks). Breach fortifications (+50% damage vs walls). | Airdrop: can be deployed from an airfield to any tile within air range, bypassing terrain. No heavy equipment — cannot carry armor bonuses. |

### Armor

| Stat | Light Tank | Medium Tank | Heavy Tank | Armored Car | Half-Track |
|---|---|---|---|---|---|
| **Category** | Armor | Armor | Armor | Armor | Armor |
| **Role** | Fast strike | Balanced frontline | Breakthrough / siege | Recon / skirmish | Troop transport |
| **Attack** | 25 | 40 | 60 | 15 | 10 |
| **Defense** | 15 | 30 | 50 | 10 | 12 |
| **HP** | 80 | 120 | 200 | 50 | 70 |
| **Speed** | 3 hexes/tick | 2 hexes/tick | 1 hex/tick | 4 hexes/tick | 3 hexes/tick |
| **Training Cost** | 40 steel, 20 oil, 20 manpower | 80 steel, 40 oil, 30 manpower | 200 steel, 100 oil, 50 manpower | 30 steel, 15 oil, 10 manpower | 35 steel, 15 oil, 10 manpower |
| **Training Time** | 4 ticks | 6 ticks | 10 ticks | 3 ticks | 3 ticks |
| **Upkeep** | 2 oil, 1 steel / tick | 3 oil, 1 steel / tick | 5 oil, 2 steel / tick | 1 oil / tick | 1 oil, 1 munitions / tick |
| **Prerequisites** | Tank Factory (Lv1) | Tank Factory (Lv2), Medium Armor research | Tank Factory (Lv3), Heavy Armor research | Motor Pool | Motor Pool |
| **Special Abilities** | Flanking Bonus: +15% attack when attacking from a hex adjacent to another friendly army. | Breakthrough: ignores 25% of fortification defense bonus. | Devastating Strike: +30% damage vs buildings and fortifications. Intimidation: 5% chance per battle that enemy infantry stack routs (loses a turn). | Recon: reveals enemy army composition on adjacent tiles. Fast Retreat: can disengage from battle without penalty. | Transport: carries up to 2 infantry stacks. Mounted infantry move at Half-Track speed. Light Armor: +5% defense bonus to transported infantry in battle. |

### Artillery

| Stat | Field Gun | Howitzer | Anti-Tank Gun | Anti-Aircraft Gun (Phase 2) | Rocket Artillery |
|---|---|---|---|---|---|
| **Category** | Artillery | Artillery | Artillery | Artillery | Artillery |
| **Role** | Basic indirect fire | Heavy bombardment | Anti-armor defense | Anti-air defense | Area bombardment |
| **Attack** | 20 | 35 | 40 (vs armor) / 10 (vs infantry) | 5 (vs ground) / 30 (vs air) | 25 |
| **Defense** | 5 | 5 | 8 | 6 | 4 |
| **HP** | 40 | 50 | 45 | 40 | 35 |
| **Speed** | 1 hex/tick | 0.5 hexes/tick (1 hex every 2 ticks) | 0 (immobile; must be towed by Half-Track or Engineers at 1 hex/tick) | 0 (immobile; must be towed) | 1 hex/tick |
| **Training Cost** | 30 steel, 20 munitions, 15 manpower | 60 steel, 40 munitions, 25 manpower | 40 steel, 25 munitions, 15 manpower | 50 steel, 20 munitions, 15 manpower | 70 steel, 50 munitions, 20 manpower |
| **Training Time** | 4 ticks | 6 ticks | 4 ticks | 5 ticks | 7 ticks |
| **Upkeep** | 2 munitions / tick | 4 munitions, 1 steel / tick | 2 munitions / tick | 2 munitions / tick | 5 munitions / tick |
| **Prerequisites** | Artillery Yard (Lv1) | Artillery Yard (Lv2), Heavy Artillery research | Artillery Yard (Lv1), Anti-Armor Doctrine research | Artillery Yard (Lv2), Anti-Air Doctrine research | Artillery Yard (Lv3), Rocket research |
| **Special Abilities** | Indirect Fire: attacks from 2 hexes away. Barrage: +10% damage when 3+ Field Guns target same tile. | Siege: +50% damage vs fortifications and city walls. Indirect Fire: attacks from 3 hexes away. Setup Time: cannot fire on the same tick it moves. | Ambush: +25% attack when defending. Armor Piercing: ignores 40% of armor defense stat. Cannot move independently. | Anti-Air Screen: reduces damage from enemy air strikes on this tile and adjacent tiles by 50%. Phase 2 prerequisite for full effectiveness. | Barrage: hits all enemy stacks on the target tile. Area Denial: 30% chance to damage units passing through targeted tile next tick. Inaccurate: 20% chance to miss entirely. |

---

## Quality vs Quantity Design Philosophy

The unit stat curve is intentionally sublinear relative to cost. This ensures mass-produced cheap units remain competitive against expensive elite units.

**Scaling principle**: if Unit B costs N times more than Unit A, Unit B's combat stats (attack + defense + HP) are approximately `N^0.65` times Unit A's stats.

| Comparison | Cost Ratio | Stat Ratio | Implication |
|---|---|---|---|
| Riflemen vs Heavy Tank | ~1:10 | ~1:4.5 | 10 Riflemen squads overwhelm 1 Heavy Tank in raw numbers |
| Light Tank vs Heavy Tank | ~1:5 | ~1:2.5 | 5 Light Tanks handily beat 1 Heavy Tank |
| Field Gun vs Howitzer | ~1:2 | ~1:1.6 | 2 Field Guns slightly outperform 1 Howitzer in raw damage |

This does NOT mean expensive units are bad. They have:
- Better special abilities (Devastating Strike, Siege, etc.)
- Higher individual survivability (HP pool)
- Smaller army footprint (fewer stacks to manage)
- Lower total upkeep-per-combat-power

But a player who mass-produces Riflemen and Light Tanks can absolutely compete with a player who builds Heavy Tanks, especially in the early/mid game. The research tree lets players specialize in either direction.

---

## Training Queue

Each military building has its own independent training queue.

- **Barracks**: trains Infantry units. Queue capacity: 5 units.
- **Tank Factory**: trains Armor units. Queue capacity: 3 units.
- **Artillery Yard**: trains Artillery units. Queue capacity: 3 units.

Multiple buildings of the same type in a city each have their own queue. A city with 2 Barracks can train 2 infantry units simultaneously.

**Queue mechanics**:
- Units are trained sequentially within a single building's queue.
- Training time is fixed per unit type (not affected by queue position).
- Canceling a unit in training refunds 75% of its resource cost. Canceling a queued (not yet started) unit refunds 100%.
- Training completion notification is sent to the player.
- If a city lacks resources to begin training the next queued unit, training pauses until resources are available. No automatic dequeue.

**Parallel training formula**:
```
Effective training rate = number_of_buildings * (1 unit per building per training_time ticks)
```

Example: 3 Barracks, each training Riflemen (2 ticks each) = 3 Riflemen every 2 ticks = 1.5 Riflemen/tick.

---

## Army Composition

Armies are the primary unit of movement and combat on the map.

### Structure
```
Army {
  id: uuid
  name: string
  owner_id: uuid
  position: hex_id
  stacks: [UnitStack, ...]
  status: 'idle' | 'moving' | 'engaged' | 'retreating' | 'stranded'
  supply_status: 'full' | 'low' | 'critical' | 'desperate' | 'collapse'
  current_order: Order | null
}

UnitStack {
  unit_type: string
  quantity: integer (1-999)
  avg_hp_percent: float (0.0-1.0)
  experience_level: integer (0-5)
}
```

### Army Size Limits
- Maximum stacks per army: 10
- Maximum total units per army: 500
- Minimum army size: 1 unit

### Combat Value Calculation
```
army_attack = SUM(stack.quantity * unit_base_attack * stack.avg_hp_percent * veterancy_multiplier(stack.experience_level))
army_defense = SUM(stack.quantity * unit_base_defense * stack.avg_hp_percent * veterancy_multiplier(stack.experience_level))
```

Where `veterancy_multiplier` is defined in the Veterancy section below.

### Army Actions
- **Move**: move to target hex (pathfinding, speed = slowest unit).
- **Attack**: engage enemy army or city on adjacent hex.
- **Fortify**: dig in at current position (+10% defense, stacks with fortification bonuses).
- **Split**: divide army into two armies (select which stacks go where).
- **Merge**: combine two armies on the same tile (respecting size limits).
- **Retreat**: disengage from battle (chance of failure, see combat docs).
- **Garrison**: dissolve army into city garrison.
- **Patrol**: set waypoints, army moves between them automatically.

---

## Army Movement

### Speed
Army movement speed equals the speed of the slowest unit in the army.

| Scenario | Example |
|---|---|
| Army of Riflemen (2 hex/tick) + Light Tanks (3 hex/tick) | Moves at 2 hex/tick |
| Army of Heavy Tanks (1 hex/tick) + anything | Moves at 1 hex/tick |
| Army of Armored Cars only (4 hex/tick) | Moves at 4 hex/tick |

### Terrain Modifiers
| Terrain | Movement Cost Multiplier |
|---|---|
| Plains | 1.0x |
| Forest | 1.5x |
| Hills | 1.5x |
| Mountains | 3.0x (infantry only, armor cannot enter) |
| Swamp | 2.0x (armor: 3.0x) |
| River (no bridge) | 2.0x, +25% casualty risk during crossing under fire |
| River (bridge) | 1.0x |
| Road | 0.5x (halves movement cost) |
| Railway (with rolling stock) | 0.25x |
| Urban | 1.0x |

Movement cost formula:
```
ticks_to_cross_hex = ceil(terrain_cost_multiplier / army_speed)
```

### Strategic Split
Players are encouraged to split armies by speed class for faster response:
- **Recon group**: Armored Cars (4 hex/tick) — scouts ahead
- **Fast group**: Light Tanks, Riflemen, Half-Tracks with infantry (2-3 hex/tick) — main strike
- **Heavy group**: Heavy Tanks, Howitzers, Anti-Tank Guns (0.5-1 hex/tick) — follows behind

---

## Army Supply

Armies consume upkeep resources every tick. The total upkeep is the sum of all unit upkeeps in the army.

```
army_upkeep_per_tick = SUM(stack.quantity * unit_upkeep_per_tick)
```

These resources are drawn from the nearest connected friendly city's stockpile. If the city cannot afford the upkeep, the army enters Low Supply status. See `supply-lines.md` for full supply chain mechanics and stranding cascade.

**Supply range**: armies must be within supply range of a friendly city to receive supply. Base supply range is 10 hexes via road, 20 hexes via railway. Supply Depots extend range by +5 hexes from the depot's position.

---

## Garrison

Units not assigned to any army reside in the city garrison.

- Garrison units automatically defend during city battles.
- Garrison has no movement — units stay in the city.
- Garrison units still consume upkeep (drawn from the city's own stockpile).
- Garrison capacity is determined by city size: base 100 units + 50 per Fortress level.
- Units can be moved from garrison to a new army (or existing army on the city tile) at any time.
- Garrison units benefit from city fortification defense bonuses (see `fortifications.md`).

---

## Unit Healing

Damaged units (avg_hp_percent < 1.0) heal over time when in safe locations.

| Location | Heal Rate (HP% per tick) | Cost per tick per stack |
|---|---|---|
| City with Hospital (Lv1/2/3) | 2% / 3% / 5% | 1 / 2 / 3 manpower + 1 food |
| Adjacent to Field Hospital structure | 2% (stacks with city hospital) | 1 manpower + 1 food |
| City without Hospital | 1% | 1 food |
| Field (no hospital nearby) | 0% (no healing) | N/A |

Healing mechanics:
- Healing applies to the `avg_hp_percent` of each stack.
- Healing does NOT restore destroyed units within a stack. If a stack of 50 Riflemen loses 10 in battle, 40 remain at reduced HP. Healing restores those 40 to full HP. Replacing the lost 10 requires training new Riflemen and merging.
- Healing pauses if the city is under siege or if supply is cut.
- Field Hospital structure: extends 2% healing to all friendly units within 2 hexes. Also reduces casualty rate by 10% in battles within 2 hexes.

---

## Unit Experience (Veterancy)

Units that survive combat gain experience points (XP). Veterancy provides cumulative stat bonuses, making battle-hardened units significantly more effective than raw recruits.

### XP Gain
| Event | XP Gained |
|---|---|
| Survive a battle (any) | +10 XP |
| Win a battle (on winning side) | +5 XP bonus |
| Destroy an enemy stack | +15 XP |
| Survive while stranded (per tick) | +2 XP |

### Veterancy Levels

| Level | Name | XP Required | Attack Bonus | Defense Bonus | HP Bonus | Special |
|---|---|---|---|---|---|---|
| 0 | Green | 0 | +0% | +0% | +0% | None |
| 1 | Trained | 20 | +5% | +5% | +0% | None |
| 2 | Regular | 50 | +10% | +10% | +5% | None |
| 3 | Veteran | 100 | +15% | +15% | +10% | -10% chance to rout |
| 4 | Elite | 200 | +20% | +20% | +15% | -20% chance to rout, +1 hex vision |
| 5 | Legendary | 400 | +30% | +30% | +20% | -30% chance to rout, +1 hex vision, +10% damage vs fortifications |

### Veterancy Multiplier Formula
```
veterancy_multiplier(level) = 1.0 + (attack_bonus_percent / 100)  // for attack calculations
                             = 1.0 + (defense_bonus_percent / 100) // for defense calculations
```

HP bonus applies to the unit's base HP for healing cap purposes, not to current HP.

### Veterancy Preservation
- When merging stacks of the same unit type, the resulting stack's XP is the weighted average by quantity.
- Veteran units are irreplaceable in the short term. Losing a Legendary stack is a strategic disaster.
- XP is tracked per stack, not per individual unit. Adding fresh reinforcements (new units) to an existing stack dilutes the average XP.

```
merged_xp = (stack_a.quantity * stack_a.xp + stack_b.quantity * stack_b.xp) / (stack_a.quantity + stack_b.quantity)
```

---

## Phase 2 Units (Air & Naval) — Preview

These units are not available at server start. They unlock based on server timeline or research progression.

### Air (requires Aeronautics research + Airfield building)
- **Fighter**: air superiority, dogfights enemy aircraft. Attack: 20 (air), 5 (ground strafing). Speed: 6 hexes/tick. Cost: 50 steel, 30 oil. Upkeep: 2 oil/tick.
- **Bomber**: strategic bombing of buildings, factories, supply lines. Attack: 10 (air), 35 (ground/buildings). Speed: 4 hexes/tick. Cost: 80 steel, 40 oil. Upkeep: 3 oil/tick.
- **Transport Plane**: airdrops Paratroopers, air resupply. No attack. Capacity: 1 infantry stack. Speed: 5 hexes/tick. Cost: 60 steel, 20 oil. Upkeep: 2 oil/tick.
- **Recon Plane**: reveals enemy positions in 4-hex radius. No attack. Speed: 7 hexes/tick. Cost: 30 steel, 15 oil. Upkeep: 1 oil/tick.

### Naval (requires Shipbuilding research + Port building)
- **Destroyer**: fast escort, anti-submarine. Attack: 25 (naval), 10 (shore bombardment). HP: 150. Speed: 4 sea-hexes/tick. Cost: 100 steel, 40 oil. Upkeep: 3 oil/tick.
- **Cruiser**: balanced warship. Attack: 40 (naval), 25 (shore). HP: 250. Speed: 3 sea-hexes/tick. Cost: 180 steel, 60 oil. Upkeep: 5 oil/tick.
- **Battleship**: heavy firepower. Attack: 70 (naval), 50 (shore). HP: 500. Speed: 2 sea-hexes/tick. Cost: 400 steel, 120 oil, 50 manpower. Upkeep: 8 oil/tick. Training: 15 ticks.
- **Submarine**: stealth, convoy interdiction. Attack: 35 (naval, bonus vs transports). HP: 80. Speed: 3 sea-hexes/tick. Invisible until detected. Cost: 120 steel, 30 oil. Upkeep: 2 oil/tick.
- **Transport Ship**: carries armies across sea. Capacity: 1 army (up to 200 units). No attack. HP: 100 (very vulnerable). Speed: 2 sea-hexes/tick. Cost: 60 steel, 20 oil. Upkeep: 2 oil/tick.
- **Minesweeper**: clears sea mines. Detects mines in 2-hex radius. Slow (1 sea-hex/tick). HP: 60. Cost: 40 steel, 10 oil. Upkeep: 1 oil/tick.

---

## Edge Cases & Interactions

### Training
- If a city is captured mid-training, all queued units are lost. Resources are NOT refunded.
- If a city runs out of resources mid-training, training pauses (does not cancel). Progress is preserved.
- Units trained in a city under siege cost +50% resources (scarcity premium).

### Movement
- If an army's path is blocked by a newly captured enemy tile, the army stops and awaits new orders.
- Armies cannot move through enemy-occupied tiles unless attacking.
- Two friendly armies on the same tile can swap positions in a single tick (pass-through).

### Supply
- If upkeep cannot be paid, units do not instantly die. Instead the army enters the stranding cascade (see `supply-lines.md`).
- Over-producing units without sufficient food/munitions/oil economy leads to rapid army degradation.

### Garrison
- A city with 0 garrison and 0 defending army is captured instantly by any attacking force (even 1 Rifleman).
- Garrison units cannot be ordered to retreat. They fight to the last man or until the city falls.

### Veterancy
- XP is never lost (except by stack destruction or dilution via merge).
- A Legendary Riflemen stack is objectively stronger than Green Heavy Tanks in many scenarios due to the +30% stat bonus on a cheap, numerous unit.
- This is intentional: preserving veteran units should feel meaningful and losing them should hurt.

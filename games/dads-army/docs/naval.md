# Naval Warfare

Source-of-truth design document for the Dad's Army naval warfare system. All mechanics, formulas, balance values, edge cases, and cross-system interactions are defined here.

---

## Overview

Naval warfare operates on **sea zones** rather than individual hexes. Water tiles on the 999-hex grid are grouped into named sea zones. Players build ships at ports, project power into sea zones, and contest control to enable trade, amphibious operations, and shore bombardment. The 45-day server cycle means naval dominance is a mid-to-late game investment: ships are expensive, slow to build, and devastating when massed.

---

## Sea Zones

Water hexes are grouped into named sea zones. Example zones:

| Zone Name | Approximate Size | Notes |
|-----------|-----------------|-------|
| North Atlantic | Large | Open ocean, long convoy routes |
| English Channel | Small | Narrow, contested, strait rules apply |
| Mediterranean | Large | Connects multiple land masses |
| Baltic Sea | Medium | Semi-enclosed, limited access |
| North Sea | Medium | Key trade route |
| Bay of Biscay | Medium | Submarine hunting ground |
| Norwegian Sea | Medium | Arctic convoy route |
| Black Sea | Small | Enclosed, single strait access |

The exact number and layout of sea zones is determined by the map generator. Each zone contains between 5 and 40 water hexes.

### Sea Zone Control

Control of a sea zone is determined by **naval power points** present in the zone.

**Naval power calculation per zone:**

```
zone_power(player) = SUM(ship.attack + ship.defense) for all player's ships in zone
```

**Control levels:**

| Level | Condition | Effect |
|-------|-----------|--------|
| Uncontested | Only one player/alliance has ships | Full control |
| Superiority | Power ratio >= 1.5:1 | Controller can use trade routes, transport troops; enemy convoys intercepted at 60% rate |
| Contested | Power ratio between 1:1 and 1.5:1 | Neither side has reliable use; convoys intercepted at 40% rate by both sides |
| Enemy Superiority | Power ratio <= 1:1.5 | Enemy controls; your convoys intercepted at 60% rate |
| Enemy Uncontested | No friendly ships | Enemy has full control; your convoys auto-intercepted at 90% rate |

Alliance members' naval power is pooled when calculating zone control.

---

## Naval Unit Types

### Destroyer

Fast, cheap anti-submarine specialist. The workhorse of any fleet.

| Stat | Value |
|------|-------|
| Attack | 8 |
| Defense | 6 |
| HP | 40 |
| Speed | 3 sea zones per tick |
| Range | 3 sea zones from home port |
| Cost | 150 Steel, 50 Oil, 30 Fuel |
| Build Time | 3 ticks |
| Upkeep | 5 Fuel, 3 Steel per tick |
| Prerequisites | Small Port (minimum) |

**Special abilities:**
- **Submarine Detection**: Automatically detects enemy submarines within the same sea zone. Detection range: same zone only. Detection chance: 70% per tick. If detected, the submarine loses stealth and can be targeted.
- **Convoy Escort**: When assigned to escort a convoy, reduces interception chance by 25% per destroyer (multiplicative, caps at 90% reduction with 4+ destroyers). Escorting destroyers engage intercepting submarines automatically.
- **Depth Charges**: +50% damage bonus vs submarines.

### Cruiser

Versatile multi-role warship. Good at everything, great at nothing.

| Stat | Value |
|------|-------|
| Attack | 14 |
| Defense | 12 |
| HP | 70 |
| Speed | 2 sea zones per tick |
| Range | 4 sea zones from home port |
| Cost | 300 Steel, 80 Oil, 50 Fuel |
| Build Time | 5 ticks |
| Upkeep | 8 Fuel, 5 Steel per tick |
| Prerequisites | Medium Port (minimum) |

**Special abilities:**
- **Shore Bombardment (Light)**: Can bombard coastal land hexes adjacent to the cruiser's sea zone. Deals 10 damage to structures, 8 damage to units per tick. Range: coastal hexes bordering the sea zone only.
- **Screening**: When positioned in the same zone as capital ships (battleships/carriers), provides a defensive bonus: +15% defense to all capital ships in the zone. This represents the cruiser absorbing hits and intercepting threats.
- **Anti-Aircraft**: Shoots down 10% of enemy aircraft performing missions over its sea zone per cruiser present.

### Battleship

Slow, enormously expensive, and devastating. The king of shore bombardment and surface engagements.

| Stat | Value |
|------|-------|
| Attack | 30 |
| Defense | 25 |
| HP | 150 |
| Speed | 1 sea zone per tick |
| Range | 4 sea zones from home port |
| Cost | 600 Steel, 150 Oil, 100 Fuel, 50 Chromium |
| Build Time | 10 ticks |
| Upkeep | 15 Fuel, 10 Steel per tick |
| Prerequisites | Large Port |

**Special abilities:**
- **Shore Bombardment (Heavy)**: Bombards coastal land hexes adjacent to the battleship's sea zone. Deals 25 damage to structures, 20 damage to units per tick. Can target specific buildings (factory, fortification, port). Devastating for softening defenses before amphibious landing.
- **Capital Ship**: Classified as a capital ship. Vulnerable to submarine torpedo attacks (+40% damage taken from submarines). Benefits from cruiser screening bonus.
- **Armored Belt**: Reduces damage from destroyers and cruisers by 20%.

**Vulnerabilities:**
- Submarines deal 1.4x damage to battleships (torpedo bonus).
- Aircraft deal 1.3x damage to battleships (bombing bonus).
- Without escort (destroyers/cruisers), battleships are sitting ducks for submarine wolf packs.

### Aircraft Carrier

The most expensive naval unit. Projects air power across the ocean.

| Stat | Value |
|------|-------|
| Attack | 5 (self-defense guns only) |
| Defense | 10 |
| HP | 100 |
| Speed | 2 sea zones per tick |
| Range | 5 sea zones from home port |
| Cost | 800 Steel, 200 Oil, 150 Fuel, 80 Rubber |
| Build Time | 12 ticks |
| Upkeep | 20 Fuel, 12 Steel per tick |
| Prerequisites | Large Port, Paved Airfield in same city (for aircraft production) |

**Special abilities:**
- **Carrier Air Wing**: Carries up to 8 aircraft (fighters and/or tactical bombers only; no strategic bombers, no transport planes, no recon). These aircraft can perform missions from the carrier's current sea zone as if it were an airfield. Effective air range extends from the carrier's position.
- **Air Detection**: Aircraft on patrol from the carrier detect submarines in a 2-sea-zone radius (40% chance per tick, stacks with destroyer detection).
- **Capital Ship**: Classified as a capital ship. Vulnerable to submarine torpedo attacks (+40% damage taken from submarines).

**Vulnerabilities:**
- Extremely fragile without escort. If caught without screening ships, enemy surface combatants destroy carriers quickly.
- Submarines deal 1.4x damage (torpedo bonus).
- If the carrier is sunk, all aircraft on board are lost.
- Carrier aircraft cannot rearm/repair at sea; they must return to a land airfield for repairs if damaged. Rearming (restocking ammunition/bombs) happens automatically each tick while on the carrier.

### Submarine

Stealth raider. Invisible until detected. The bane of convoys and unescorted capital ships.

| Stat | Value |
|------|-------|
| Attack | 18 (torpedo) |
| Defense | 4 |
| HP | 30 |
| Speed | 2 sea zones per tick |
| Range | 6 sea zones from home port |
| Cost | 200 Steel, 60 Oil, 40 Fuel |
| Build Time | 4 ticks |
| Upkeep | 6 Fuel, 2 Steel per tick |
| Prerequisites | Small Port (minimum), Submarine Pen research |

**Special abilities:**
- **Stealth**: Invisible to all enemies by default. Cannot be targeted until detected. Detection sources: Destroyers (70% per tick, same zone), Carrier aircraft on patrol (40% per tick, 2-zone radius), Reconnaissance aircraft flying over the zone (60% per mission), Radar Stations on adjacent coastal hexes (30% per tick).
- **Torpedo Attack**: +40% damage bonus vs capital ships (battleships, carriers). Torpedoes are the submarine's primary weapon.
- **Convoy Raiding**: Can be assigned to raid convoys in a sea zone. Each submarine intercepts convoys at a 25% chance per tick (reduced by escort destroyers). Successful interception destroys 1 convoy load of resources.
- **Wolf Pack**: When 3+ submarines operate in the same zone, convoy interception chance increases to 35% per submarine (wolf pack bonus). Also gains +10% attack when engaging surface ships as a group.
- **Dive**: After being detected, a submarine can attempt to dive and re-enter stealth. Costs 1 tick of inaction. Success chance: 50% base, -10% per destroyer in zone (minimum 10%).

**Vulnerabilities:**
- Extremely low defense and HP. If detected, destroyers shred them.
- Cannot attack while stealthed and simultaneously remain stealthed; attacking reveals position for 1 tick.
- Depth charges from destroyers deal 1.5x damage to submarines.

### Transport Ship

Unarmed troop carrier. Essential for amphibious operations.

| Stat | Value |
|------|-------|
| Attack | 0 |
| Defense | 2 |
| HP | 20 |
| Speed | 2 sea zones per tick |
| Range | 3 sea zones from home port |
| Cost | 80 Steel, 20 Oil, 15 Fuel |
| Build Time | 2 ticks |
| Upkeep | 3 Fuel, 1 Steel per tick |
| Prerequisites | Small Port (minimum) |

**Special abilities:**
- **Troop Capacity**: Carries up to 3 ground unit stacks (infantry, tanks, artillery, etc.). Units are loaded at a friendly port hex and unloaded at a coastal hex or friendly port.
- **Supply Capacity**: Alternatively, carries 200 units of mixed resources instead of troops. Used for overseas supply.

**Vulnerabilities:**
- No combat capability whatsoever. If engaged by any warship or aircraft, transports are destroyed rapidly.
- If a transport is sunk while carrying troops, all embarked units are lost.
- Must be escorted. A transport without escort in a contested or enemy-controlled sea zone is automatically intercepted and sunk within 1 tick.

---

## Port Requirements

Ships are built at and operate from ports. Port level determines which ships can be built and repaired there.

| Port Level | Build Cost | Build Time | Ships Supported | Repair Rate | Capacity |
|------------|-----------|------------|-----------------|-------------|----------|
| Small Port | 100 Steel, 50 Wood | 3 ticks | Destroyer, Transport, Submarine | 5 HP/tick | 6 ships |
| Medium Port | 250 Steel, 100 Wood, 30 Concrete | 6 ticks | All Small + Cruiser | 10 HP/tick | 12 ships |
| Large Port | 500 Steel, 200 Wood, 100 Concrete, 50 Chromium | 10 ticks | All ship types | 20 HP/tick | 20 ships |

**Port rules:**
- A port must be built on a coastal hex (land hex adjacent to at least one water hex).
- Only one port per city. Upgrading replaces the previous tier.
- Ships in port are repaired at the port's repair rate each tick, distributed evenly across damaged ships (most damaged first if repair points are insufficient for all).
- Ships in port can be attacked by shore bombardment from enemy ships, strategic bombing from aircraft, or ground assault if the city is captured.
- If a port is destroyed (reduced to 0 HP), all ships currently docked are stranded (see Stranding below). Ships at sea are unaffected but lose their home port.
- Port capacity limits how many ships can be docked simultaneously. Ships beyond capacity must remain at sea (and will take attrition if beyond range of any friendly port).

---

## Naval Range and Attrition

Ships operate within a range measured in sea zones from their home port (the port they were built at or last docked at).

**Range by ship type:**

| Ship Type | Range (sea zones) |
|-----------|-------------------|
| Destroyer | 3 |
| Cruiser | 4 |
| Battleship | 4 |
| Aircraft Carrier | 5 |
| Submarine | 6 |
| Transport Ship | 3 |

**Attrition mechanic:**
- A ship operating beyond its range takes **5% of max HP as attrition damage per tick**.
- Attrition is checked at the end of each tick.
- Attrition damage cannot be repaired at sea; the ship must return to a friendly port.
- A ship at 0 HP from attrition is sunk (crew lost, no salvage).

**Changing home port:**
- A ship can dock at any friendly port (own or allied) to change its home port. This takes 1 tick (the ship is "in port" and cannot act).
- Once re-based, the ship's range is now measured from the new port.
- If using an allied port, the ally must grant port access (diplomacy setting). Port access can be revoked at any time, with a 2-tick grace period for ships to depart.

---

## Naval Combat Resolution

Naval combat occurs when hostile fleets occupy the same sea zone. Combat is resolved similarly to land combat but with naval-specific modifiers.

### Combat Sequence (per tick)

1. **Detection Phase**: Submarines are checked for detection. Undetected subs do not participate in the main battle but may perform torpedo attacks (see below).
2. **Engagement Phase**: All detected ships in the zone engage. Each ship targets an enemy ship based on targeting priority (see below).
3. **Damage Phase**: Damage is calculated and applied simultaneously.
4. **Retreat Check**: After damage, players may order a retreat. Retreating ships move 1 zone toward the nearest friendly port. Retreating ships take a parting shot (50% of enemy fleet's attack as bonus damage, applied once).

### Targeting Priority

Ships prioritize targets based on their role:

| Attacker | Priority 1 | Priority 2 | Priority 3 |
|----------|-----------|-----------|-----------|
| Destroyer | Submarine | Transport | Cruiser |
| Cruiser | Destroyer | Cruiser | Battleship |
| Battleship | Cruiser | Battleship | Destroyer |
| Carrier (self-defense) | Destroyer | Submarine | Transport |
| Submarine (detected) | Carrier | Battleship | Transport |
| Submarine (stealth torpedo) | Transport (convoy) | Carrier | Battleship |

### Damage Formula

```
raw_damage = attacker.attack * (1 + bonus_modifiers) * random(0.85, 1.15)
mitigation = defender.defense * (1 + defense_modifiers)
final_damage = max(1, raw_damage - mitigation)
```

**Bonus modifiers (additive):**
- Rock-paper-scissors bonus: +40% (destroyer vs sub, sub vs capital, etc.)
- Wolf pack bonus: +10% (3+ subs attacking together)
- Cruiser screening: +15% defense to capital ships
- Battleship armored belt: reduces incoming destroyer/cruiser damage by 20%

### Rock-Paper-Scissors Dynamics

The core naval balance triangle:

```
Destroyers --> counter --> Submarines
Submarines --> counter --> Capital Ships (Battleships, Carriers)
Capital Ships --> counter --> Destroyers and Cruisers
```

- **Destroyers vs Submarines**: Destroyers detect subs (breaking stealth) and deal 1.5x damage with depth charges. Submarines deal only 0.5x damage to destroyers (torpedoes are less effective against small, fast ships).
- **Submarines vs Capital Ships**: Submarines deal 1.4x damage to battleships and carriers via torpedoes. Capital ships deal only 0.7x damage to submarines (hard to hit a submerged target with main guns).
- **Capital Ships vs Destroyers/Cruisers**: Battleships deal 1.3x damage to destroyers and cruisers (overwhelming firepower). Destroyers deal only 0.6x damage to battleships (guns too small).

### Carrier Air Combat at Sea

Carrier-based aircraft engage before surface combat:

1. Carrier launches fighters to intercept enemy aircraft (if any).
2. Carrier launches tactical bombers against enemy ships.
3. Carrier aircraft damage is applied before surface engagement phase.
4. Carrier aircraft return to carrier after strikes (1 strike per tick).
5. If the carrier is sunk mid-tick, aircraft in the air must divert to a friendly airfield within range or are lost.

---

## Convoy System

Resources traded between allied players or transported to overseas territories move as **convoys** through sea zones.

### Convoy Mechanics

- A convoy is created when a trade route is established between two ports.
- The convoy follows the shortest sea-zone path between the two ports.
- Convoys move at 2 sea zones per tick (same as transport ships).
- Each convoy carries up to 100 units of a single resource type per trip.
- Convoys are abstract (not individual ship units) but can be escorted by assigning destroyers to the trade route.

### Convoy Interception

Submarines in a sea zone along the convoy route can intercept convoys:

```
base_interception_chance = 25% per submarine per tick (35% in wolf pack)
escort_reduction = 25% per escort destroyer (multiplicative)
final_interception_chance = base_chance * (1 - escort_reduction)^num_escorts

Example: 2 subs (wolf pack, so 35% each), 2 escort destroyers
Per sub: 35% * (1 - 0.25)^2 = 35% * 0.5625 = 19.7%
Chance at least one sub intercepts: 1 - (1 - 0.197)^2 = 35.5%
```

- Successful interception destroys the convoy's cargo for that trip. The convoy route continues but the resources are lost.
- Escort destroyers automatically engage intercepting submarines (combat resolves as normal naval combat).
- If all escorts are sunk, subsequent convoys on that route have no escort until new destroyers are assigned.

### Convoy Route Disruption

If an enemy achieves **Uncontested** control of a sea zone on your convoy route, the route is blocked entirely. Resources do not flow until the zone is contested or recaptured.

---

## Amphibious Landings

Amphibious landings allow ground units to assault enemy-held coastal hexes from the sea.

### Requirements

1. **Transport ships** loaded with ground units in the sea zone adjacent to the target coastal hex.
2. **Naval superiority** (at minimum) in the target sea zone. Without it, transports are intercepted and sunk before landing.
3. **Ideally air superiority** over the target hex. Not strictly required but without it, landing forces take heavy casualties from enemy air attacks.

### Landing Sequence

1. **Bombardment Phase** (optional): If you have battleships/cruisers in the zone, they bombard the target coastal hex for 1 tick before landing. This damages defenders and fortifications.
2. **Landing Phase**: Transport ships unload ground units onto the target hex. This takes 1 tick. During this tick, landing units have:
   - **-40% combat effectiveness** (attack and defense both reduced by 40%).
   - Units cannot retreat on the landing tick; they must fight or die.
3. **Combat Phase**: Normal land combat resolves between landing units and defenders, with the -40% penalty applied to attackers.
4. **Beachhead Phase**: If the landing force survives and holds the hex for **3 consecutive ticks**, the hex becomes a **Temporary Port** (equivalent to Small Port). This allows follow-up forces to land without the -40% penalty and provides a docking point for ships.

### Landing Penalties and Modifiers

| Condition | Modifier |
|-----------|----------|
| Base landing penalty | -40% attack and defense |
| Pre-landing bombardment (1 tick) | Reduces defender HP/fortification before combat |
| Air superiority over target | -10% penalty reduction (landing penalty becomes -30%) |
| Air supremacy over target | -20% penalty reduction (landing penalty becomes -20%) |
| Defender has coastal fortifications | +25% defense bonus for defender |
| Defender has coastal gun batteries | Batteries fire on transports during landing (see Coastal Interaction) |

### Edge Cases

- **Contested sea zone landing**: If the sea zone is only Contested (not Superiority), landing can still be attempted but transports have a 30% chance of being intercepted and sunk before reaching shore, per tick of transit through the contested zone.
- **Multiple landing hexes**: A player can land on multiple adjacent coastal hexes simultaneously if they have enough transports. Each hex is a separate combat.
- **Retreating from a beachhead**: If the landing force is pushed off the hex before 3 ticks, the beachhead is lost and must be re-established.
- **Landing on an undefended hex**: No combat penalty applies (there is no combat). The hex is simply captured. Beachhead timer still applies for the temporary port.

---

## Coastal Interaction

### Coastal Gun Batteries

Coastal gun batteries are defensive structures built on coastal land hexes.

| Level | Cost | Build Time | Damage to Ships | Range |
|-------|------|-----------|-----------------|-------|
| Level 1 | 50 Steel, 30 Concrete | 2 ticks | 8 per tick | Adjacent sea zone only |
| Level 2 | 100 Steel, 60 Concrete | 3 ticks | 15 per tick | Adjacent sea zone only |
| Level 3 | 200 Steel, 100 Concrete | 5 ticks | 25 per tick | Adjacent sea zone + 1 neighboring zone |

- Coastal guns fire automatically on enemy ships in range each tick.
- Damage is distributed evenly across all enemy ships in the zone (most damaged ship targeted first if damage is enough to sink).
- Coastal guns can be destroyed by shore bombardment from battleships/cruisers or strategic bombing from aircraft. They have HP: 50/100/150 by level.
- Coastal guns fire on transports during amphibious landings: each battery deals its damage to a random transport. A destroyed transport loses all embarked troops.

### Shore Bombardment

Ships with bombardment capability (cruisers, battleships) can bombard coastal land hexes adjacent to their sea zone.

**Bombardment rules:**
- Bombardment is a mission that takes 1 tick. The bombarding ship cannot move or participate in naval combat during that tick.
- Bombardment damages structures and units on the target hex.
- Bombardment accuracy is not perfect: 70% of damage hits the intended target, 30% is "collateral" spread across other structures/units on the hex.
- Fortifications reduce bombardment damage by their fortification bonus (e.g., Level 3 fortification reduces incoming bombardment damage by 30%).

### Strait Control

Certain narrow water passages (straits) can be blocked by controlling land on both sides.

**Strait rules:**
- A strait is defined as a sea zone connection where the two adjacent land masses are within 2 hexes of each other.
- If a single player or alliance controls land hexes on **both sides** of a strait, they can choose to **block passage**. Enemy ships cannot transit through the strait.
- Blocking a strait requires coastal gun batteries on at least one side.
- A blocked strait can be forced: the transiting fleet takes damage from coastal guns and must fight through. The blocking player gets a free round of coastal gun fire before the fleet enters the zone.
- Strait examples: Channel narrows, Bosphorus, Gibraltar (map-dependent).

---

## Allied Port Dependency and Stranding

### Using Allied Ports

- Players can dock at allied ports if port access is granted via diplomacy.
- Docking at an allied port changes the ship's home port, extending its operational range.
- Allied port access can be revoked at any time, but ships get a **2-tick grace period** to depart.

### Stranding Mechanic

If an allied port that your ships depend on is **captured by an enemy** or **port access is revoked**:

1. All your ships docked at that port are **immediately stranded**.
2. Stranded ships have 2 ticks to reach another friendly port within their range.
3. If no friendly port is within range, stranded ships take **5% max HP attrition per tick** (same as out-of-range attrition) until they reach a port or are sunk.
4. Stranded ships can still fight but cannot repair.

**Edge cases:**
- If an ally's port is destroyed (reduced to 0 HP by bombing/ground assault), your docked ships become stranded immediately (no grace period).
- If your only port is captured and you have ships at sea, those ships are stranded. They will slowly die to attrition unless you recapture a port or build a new one.
- Ships stranded at an enemy-captured port are **captured by the enemy** (enemy gains the ships at 50% HP). This only applies to ships that were docked when the port was captured and failed to depart during the grace period.

---

## Interactions with Other Systems

### Naval + Air (see air.md)
- Carrier-based aircraft extend air power to sea zones.
- Land-based aircraft can perform missions over sea zones within their range (e.g., reconnaissance aircraft scouting for submarines, tactical bombers attacking enemy fleets, strategic bombers targeting enemy ports).
- Anti-aircraft from cruisers and carrier fighters contest enemy air missions over sea zones.
- Air superiority over a sea zone is calculated the same as over land tiles, using carrier aircraft + land-based aircraft within range.

### Naval + Intelligence (see intelligence.md)
- Reconnaissance aircraft and radar stations can detect enemy fleets and submarine positions.
- Code breaking can reveal enemy naval orders (fleet movements, convoy routes).
- Deception can create fake fleet markers on the map.

### Naval + Ground Combat
- Shore bombardment softens defenders before ground assault.
- Amphibious landings deliver ground units to enemy territory.
- Capturing enemy ports removes their naval capability in that area.
- Coastal gun batteries bridge the land-sea divide.

### Naval + Economy
- Convoys are the lifeline for overseas resource trade.
- Ship construction requires significant industrial output (steel, oil, fuel, chromium, rubber).
- Ship upkeep is a continuous drain on fuel and steel.
- Blockading enemy trade routes via sea zone control is a powerful economic warfare strategy.
- Port destruction via bombardment or strategic bombing cripples enemy naval production and trade.

---

## Balance Notes

- The 45-day cycle means a battleship (10-tick build time) represents a major commitment. With ~45 ticks in a cycle, building a battleship consumes roughly 22% of the game's duration in production alone.
- Submarines are deliberately cheap and fast to build (4 ticks) to allow weaker players to contest naval dominance asymmetrically. A wolf pack of 4 subs (16 ticks total, spread across time) can threaten a battleship that took 10 ticks.
- Carriers are the most expensive unit in the entire game (not just naval). They are a late-game power projection tool, not a core combat unit.
- Transport ships are intentionally fragile and cheap. Losing transports full of troops should be devastating and is the primary risk of amphibious operations.
- The 20-50 player count means sea zone control is often contested by alliances rather than individuals. A lone player rarely has the economy to field a balanced fleet.
- Destroyers are the backbone of any fleet. They are cheap, fast, and necessary (anti-sub, escort). A fleet without destroyers is blind to submarines.

# Air Warfare

Source-of-truth design document for the Dad's Army air warfare system. All mechanics, formulas, balance values, edge cases, and cross-system interactions are defined here.

---

## Overview

Air warfare operates on a **mission-based** model. Aircraft are stationed at airfields and fly missions to target hexes within range. They do not permanently occupy hexes; they sortie out, execute a mission, and return to base. Air power is a force multiplier for ground and naval combat, and strategic bombing provides a unique way to cripple enemy infrastructure without ground assault. The 45-day server cycle rewards players who invest in airfields and aircraft mid-game to gain decisive advantages.

---

## Air Unit Types

### Fighter

Air superiority specialist. Fast, maneuverable, essential for contesting the skies.

| Stat | Value |
|------|-------|
| Attack (air-to-air) | 12 |
| Attack (air-to-ground) | 4 |
| Defense | 8 |
| HP | 35 |
| Speed | 4 hexes per tick (mission speed, not relevant for range) |
| Range | 4 hexes from base airfield |
| Cost | 80 Steel, 40 Oil, 20 Rubber |
| Build Time | 2 ticks |
| Upkeep | 4 Fuel, 2 Oil per tick |
| Prerequisites | Grass Strip (minimum airfield) |

**Special abilities:**
- **Interception**: Fighters on Air Superiority Patrol automatically intercept enemy aircraft performing missions in their patrol zone. Each fighter gets one interception attempt per tick.
- **Escort**: Fighters can be assigned to escort bombers on a mission. Escorting fighters engage enemy interceptors before they reach the bombers.
- **Dogfight Priority**: In air-to-air combat, fighters always target enemy fighters first, then bombers, then other aircraft.

### Tactical Bomber

Ground attack specialist. Moderate damage to units and structures on a target hex.

| Stat | Value |
|------|-------|
| Attack (air-to-air) | 3 |
| Attack (air-to-ground) | 16 |
| Defense | 6 |
| HP | 45 |
| Speed | 3 hexes per tick |
| Range | 5 hexes from base airfield |
| Cost | 120 Steel, 60 Oil, 30 Rubber |
| Build Time | 3 ticks |
| Upkeep | 6 Fuel, 3 Oil per tick |
| Prerequisites | Grass Strip (minimum airfield) |

**Special abilities:**
- **Ground Attack**: Deals damage directly to ground units and light structures on the target hex. Damage is split evenly across all enemy units on the hex unless a specific target is designated.
- **Close Air Support**: When performing a ground attack mission on a hex where friendly ground units are in combat, provides a +15% attack bonus to friendly ground units (in addition to dealing direct damage to enemies).
- **Anti-Ship**: Can perform ground attack missions on sea zones. Deals air-to-ground damage to enemy ships. Effective against transports and submarines (if detected), less effective against armored warships.

### Strategic Bomber

Infrastructure destruction specialist. Heavy damage to buildings, factories, ports, railways, and airfields. The blunt instrument of air war.

| Stat | Value |
|------|-------|
| Attack (air-to-air) | 2 |
| Attack (air-to-ground) | 30 |
| Defense | 10 |
| HP | 60 |
| Speed | 2 hexes per tick |
| Range | 8 hexes from base airfield |
| Cost | 250 Steel, 100 Oil, 60 Rubber, 30 Aluminum |
| Build Time | 5 ticks |
| Upkeep | 10 Fuel, 5 Oil per tick |
| Prerequisites | Paved Airfield (minimum) |

**Special abilities:**
- **Strategic Bombing**: Targets a specific building or infrastructure on the target hex. Damage is applied to that building, reducing its HP and output. See Strategic Bombing section below.
- **Carpet Bombing**: Alternative mission mode. Instead of targeting a specific building, deals reduced damage (50% of air-to-ground attack) spread across all structures and units on the hex. Less efficient but useful when the exact target is unknown.
- **Slow and Vulnerable**: Strategic bombers are priority targets for enemy fighters. They suffer a -30% defense penalty when intercepted by fighters (representing their inability to evade).

### Transport Plane

Paradrop and resupply specialist. No combat capability.

| Stat | Value |
|------|-------|
| Attack (air-to-air) | 0 |
| Attack (air-to-ground) | 0 |
| Defense | 3 |
| HP | 25 |
| Speed | 3 hexes per tick |
| Range | 6 hexes from base airfield |
| Cost | 60 Steel, 30 Oil, 20 Rubber |
| Build Time | 2 ticks |
| Upkeep | 4 Fuel, 2 Oil per tick |
| Prerequisites | Paved Airfield (minimum) |

**Special abilities:**
- **Paradrop**: Drops paratroop units (specially trained infantry) onto a target hex. See Paradrop section below.
- **Supply Drop**: Drops supplies (up to 50 resource units) onto a target hex. Supplies are available to any friendly unit on the hex. Used to resupply cut-off forces.
- **No Combat**: Transport planes cannot attack. If intercepted, they can only rely on escort fighters or their own defense stat (representing evasive maneuvers and defensive gunners).

### Reconnaissance Aircraft

Fog-of-war reveal specialist. Fast, fragile, essential for intelligence gathering.

| Stat | Value |
|------|-------|
| Attack (air-to-air) | 1 |
| Attack (air-to-ground) | 0 |
| Defense | 4 |
| HP | 20 |
| Speed | 5 hexes per tick |
| Range | 7 hexes from base airfield |
| Cost | 50 Steel, 25 Oil, 15 Rubber |
| Build Time | 1 tick |
| Upkeep | 3 Fuel, 1 Oil per tick |
| Prerequisites | Grass Strip (minimum airfield) |

**Special abilities:**
- **Reconnaissance Mission**: Reveals all tiles in a **3-hex radius** around the target point. Revealed information includes: terrain, structures, enemy units (type and approximate count), resource fields. Fog returns 2 ticks after the recon mission (unless another source maintains vision).
- **Naval Reconnaissance**: Can perform recon over sea zones. Detects enemy fleets and reveals fleet composition. Also detects submarines with a 60% chance per mission (see naval.md).
- **High Speed**: Fastest aircraft type. Recon aircraft have a +20% evasion bonus when intercepted (representing speed advantage). Evasion means the interception fails and the recon aircraft completes its mission.
- **Fragile**: Lowest HP of any aircraft. If interception succeeds, recon aircraft are quickly shot down.

---

## Airfield Requirements

All aircraft must be stationed at an airfield. Airfield tier determines capacity and which aircraft types can be based there.

| Airfield Tier | Build Cost | Build Time | Capacity | Aircraft Types | Repair Rate | Notes |
|--------------|-----------|------------|----------|---------------|-------------|-------|
| Grass Strip | 30 Wood, 20 Fuel | 1 tick | 5 | Fighter, Recon | 3 HP/tick | Can be built on any flat land hex. Standalone structure (not tied to city). |
| Paved Airfield | 100 Steel, 50 Concrete, 30 Fuel | 3 ticks | 15 | All types | 8 HP/tick | Requires a city or town on the hex (or adjacent). |
| Air Base | 250 Steel, 120 Concrete, 60 Fuel, 30 Aluminum | 6 ticks | 30 | All types | 15 HP/tick | Requires a city. Includes built-in AA defense (equivalent to Level 2 AA gun). |

**Airfield rules:**
- A hex can have at most one airfield.
- Airfields can be upgraded in place (Grass Strip -> Paved -> Air Base). Upgrade cost is the difference between tiers. Upgrade time is the new tier's build time minus 1 tick.
- Aircraft in excess of capacity must be relocated to another airfield. If no space is available, excess aircraft are grounded (cannot fly missions) but are not destroyed.
- Airfield HP: Grass Strip 30 HP, Paved Airfield 80 HP, Air Base 150 HP. If reduced to 0 HP, the airfield is destroyed. All grounded aircraft on a destroyed airfield are captured/destroyed (see Base Destruction below).
- Airfields can be repaired. Repair cost: 20% of build cost per 25% HP restored. Repair time: 1 tick per 25% HP.
- Air Base includes Level 2 AA defense (see Anti-Aircraft section). This is in addition to any standalone AA gun on the hex.

### Carrier as Floating Airfield

Aircraft carriers (see naval.md) function as mobile airfields at sea:
- Capacity: 8 aircraft (fighters and tactical bombers only).
- Aircraft range is measured from the carrier's current sea zone position.
- Carriers do not repair aircraft. Damaged aircraft must fly to a land-based airfield for repairs.
- If the carrier moves, embarked aircraft move with it. Aircraft on a mission return to the carrier's new position (if within range) or must divert.

---

## Air Range Mechanic

Aircraft perform missions within range of their base airfield. Range is measured in hexes (straight-line distance on the hex grid).

**Key rules:**
- Aircraft fly to the target, execute their mission, and return to base **within the same tick**. They do not "sit" on the target hex between ticks.
- If the base airfield is **destroyed or captured** while aircraft are on a mission, the aircraft must divert to another friendly airfield within their remaining range (measured from current position). If no friendly airfield is within range, the aircraft **crash and are lost** (fuel exhaustion).
- "Remaining range" for diversion = aircraft's full range minus distance already traveled from the destroyed base to the target. This means aircraft on distant missions are more likely to be lost if their base is destroyed.
- Aircraft staged at an allied airfield (see Allied Airfield Dependency) use that airfield as their base for range calculation purposes.

**Range extension:**
- There is no in-flight refueling or range extension mechanic. Range is a hard limit.
- The only ways to extend effective range are: build forward airfields closer to the target, stage aircraft at allied airfields, or use aircraft carriers at sea.

---

## Mission Types

### Air Superiority Patrol

Fighters are assigned to patrol a hex or group of hexes (up to 2-hex radius from the patrol center). Patrolling fighters automatically intercept enemy aircraft performing missions in the patrol zone.

**Mechanics:**
- Each patrolling fighter can intercept one enemy aircraft group per tick.
- Interception triggers air-to-air combat (see Air-to-Air Combat below).
- Patrol missions are ongoing until cancelled. Fighters on patrol consume upkeep each tick.
- Multiple fighter groups can patrol overlapping areas. Each group gets its own interception attempt.

### Ground Attack

Tactical bombers (and fighters in a ground attack role, at reduced effectiveness) attack enemy ground units and light structures on a target hex.

**Mechanics:**
- Damage dealt = air-to-ground attack * number of aircraft * accuracy modifier.
- Accuracy modifier for ground attack: 60% base, +10% if air superiority, +20% if air supremacy.
- Damage is distributed across enemy units on the hex (evenly, or targeting a specific unit stack if designated).
- Close Air Support bonus: +15% attack to friendly ground units in combat on the target hex.
- Fighters performing ground attack use their air-to-ground stat (4), which is much lower than tactical bombers (16).

### Strategic Bombing

Strategic bombers target a specific building or infrastructure on a target hex.

**Mechanics (detailed in Strategic Bombing section below):**
- Requires designating a specific target building.
- Accuracy is probabilistic and tech-dependent.
- Damage reduces building HP and output.

### Transport Mission (Paradrop / Supply Drop)

Transport planes deliver paratroopers or supplies to a target hex.

**Mechanics:**
- Paradrop: detailed in Paradrop section below.
- Supply Drop: 50 resource units delivered to the target hex. Available to friendly units immediately. If no friendly units are present, supplies sit on the hex for 3 ticks before despawning (enemy can capture them by moving a unit onto the hex).

### Reconnaissance Mission

Reconnaissance aircraft reveal fog of war around a target point.

**Mechanics:**
- Reveals all hexes in a 3-hex radius around the target point.
- Revealed information: terrain type, structures (type and level), enemy units (type and approximate count: "few" = 1-3, "several" = 4-7, "many" = 8+), resource fields (type and development status).
- Fog returns 2 ticks after the mission unless another vision source maintains it.
- Recon aircraft over sea zones also detect enemy fleets and have a 60% chance to detect submarines.

---

## Air Superiority

Air superiority is calculated per hex (for ground combat bonuses) and per sea zone (for naval interactions). It determines who controls the sky and provides significant combat modifiers.

### Calculation

Air superiority is determined by the ratio of friendly fighter power to enemy fighter power in a given area.

```
fighter_power(player, area) = SUM(fighter.attack_air * fighter.HP / fighter.max_HP) for all player's fighters operating in the area
```

"Operating in the area" means: fighters on Air Superiority Patrol covering the hex/zone, fighters escorting a mission to the hex/zone, or carrier-based fighters in the sea zone.

### Superiority Levels

| Level | Condition | Ground Combat Bonus | Bomber Effect | Enemy Bomber Effect |
|-------|-----------|-------------------|---------------|-------------------|
| Air Supremacy | Friendly:Enemy ratio > 2:1 | +20% attack to friendly ground units | Bombers operate at full effectiveness | Enemy bombers suffer -50% accuracy, -30% damage, 40% interception rate |
| Air Superiority | Ratio > 1.5:1 | +10% attack to friendly ground units | Bombers operate at 85% effectiveness | Enemy bombers suffer -25% accuracy, 25% interception rate |
| Contested | Ratio between 1:1.5 and 1.5:1 | No bonus | Bombers operate at 70% effectiveness | Both sides: 15% interception rate |
| Enemy Air Superiority | Ratio < 1:1.5 | -10% attack to friendly ground units | Your bombers: -25% accuracy, 25% interception rate | Enemy bombers at 85% effectiveness |
| Enemy Air Supremacy | Ratio < 1:2 | -20% attack to friendly ground units | Your bombers: -50% accuracy, 40% interception rate | Enemy bombers at full effectiveness |

**Interception rate** = chance that each enemy bomber/transport on a mission through the area is intercepted and forced into air-to-air combat with a patrolling fighter before completing its mission.

### Air-to-Air Combat

When interception occurs, air-to-air combat resolves:

```
damage_dealt = attacker.attack_air * (1 + modifiers) * random(0.85, 1.15)
damage_mitigated = defender.defense * (1 + defense_modifiers)
final_damage = max(1, damage_dealt - damage_mitigated)
```

**Modifiers:**
- Fighter vs bomber: +20% attack bonus (fighters are designed to kill bombers).
- Fighter vs fighter: no bonus (even matchup).
- Strategic bomber defense penalty: -30% defense when intercepted by fighters.
- Recon evasion bonus: +20% effective defense (evasive maneuvers, only applies to recon aircraft).
- Escort fighters engage interceptors first: if bombers have escort fighters, the escort fights the interceptor. Bombers only engage if escorts are destroyed or outnumbered.

**Combat sequence:**
1. Escort fighters (if any) engage intercepting fighters. Air-to-air combat resolves.
2. Surviving interceptors engage bombers/transports. Air-to-air combat resolves.
3. Surviving bombers proceed to complete their mission (with possible reduced numbers).
4. All aircraft return to base. Destroyed aircraft are removed.

---

## Strategic Bombing

Strategic bombing is the primary mechanism for destroying enemy infrastructure without ground assault.

### Valid Targets

Any building or infrastructure on the target hex:
- Factory (reduces production output)
- Port (reduces ship capacity/repair rate, can strand ships)
- Railway (disrupts supply lines)
- Bridge (blocks ground movement across river hexes)
- Airfield (damages/destroys airfield, can trap aircraft)
- Fortification (reduces defensive bonus)
- Resource Extraction (mine, oil well, etc. - reduces resource output)
- Anti-Aircraft Gun (eliminates AA defense)
- Radar Station (eliminates radar detection)
- City Center (reduces city population/output, controversial target)

### Accuracy

Strategic bombing accuracy is probabilistic and improves with technology:

```
accuracy% = base_accuracy + tech_bonus + air_superiority_bonus - AA_penalty - weather_penalty
```

| Component | Value |
|-----------|-------|
| Base accuracy | 30% |
| "Improved Bombsights" research | +15% |
| "Precision Bombing" research | +25% (replaces Improved Bombsights, not additive) |
| Air Supremacy over target | +10% |
| Air Superiority over target | +5% |
| Contested air | +0% |
| Enemy Air Superiority | -10% |
| Enemy Air Supremacy | -20% |
| Per AA gun level on target hex | -5% per level |
| Bad weather (random per tick) | -10% |

**Minimum accuracy: 10%. Maximum accuracy: 70%.**

### Damage Calculation

```
if random(0, 100) <= accuracy%:
    hit = True
    damage_to_target = bomber.attack_ground * num_bombers * 0.8
else:
    hit = False
    collateral_damage = bomber.attack_ground * num_bombers * 0.2  # misses still cause some damage to the hex
```

- On a hit, damage is applied to the designated target building.
- On a miss, 20% of the potential damage is applied as collateral to random structures/units on the hex.
- Building damage reduces output proportionally: a factory at 50% HP produces at 50% output.
- Buildings can be repaired (see relevant building docs for repair costs/times).

### Repeated Bombing

- Bombing the same target repeatedly is effective but has diminishing returns as the target's HP decreases (already-damaged buildings take full damage but have less HP remaining to lose).
- A building at 0 HP is **destroyed** and must be fully rebuilt.
- Rebuilding takes the full build time of the structure.

---

## Anti-Aircraft Defenses

AA guns are the ground-based counter to air power.

### AA Gun Levels

| Level | Cost | Build Time | Damage per Mission Pass | Range |
|-------|------|-----------|------------------------|-------|
| Level 1 | 40 Steel, 20 Ammo | 1 tick | 5 per aircraft | Target hex only |
| Level 2 | 80 Steel, 40 Ammo, 10 Aluminum | 2 ticks | 10 per aircraft | Target hex + adjacent hexes |
| Level 3 | 150 Steel, 80 Ammo, 25 Aluminum | 4 ticks | 18 per aircraft | Target hex + 2-hex radius |

**AA mechanics:**
- AA damage is applied to each aircraft performing a mission over or through the AA coverage area.
- Damage per aircraft per mission pass = AA_level_damage (from table above).
- Multiple AA guns stack: if a target hex has a Level 2 AA gun and an adjacent hex also has a Level 2 AA gun covering it, aircraft take 10 + 10 = 20 damage per pass.
- AA damage is applied **before** the mission resolves. This means some aircraft may be shot down before they can drop bombs or complete their mission.
- Aircraft destroyed by AA before mission completion: their contribution to the mission is lost (e.g., if 5 bombers attack and 2 are shot down by AA, only 3 bombers' worth of damage is dealt).
- Air Base tier airfield includes a built-in Level 2 AA gun that defends the airfield hex.

### AA vs Aircraft Types

| Aircraft Type | AA Damage Modifier | Notes |
|--------------|-------------------|-------|
| Fighter | x0.7 | Fast and evasive, harder to hit |
| Tactical Bomber | x1.0 | Standard |
| Strategic Bomber | x1.3 | Large, slow target |
| Transport Plane | x1.2 | Large, slow, no evasive capability |
| Recon Aircraft | x0.6 | Very fast, hardest to hit |

---

## Paradrop

Paradrop is a high-risk, high-reward operation for seizing undefended or lightly defended strategic targets.

### Requirements

1. Transport planes loaded with paratroop infantry (specially trained; requires "Airborne Training" research).
2. Target hex within range of the transport planes' base airfield.
3. Ideally air superiority over the drop zone (not required but strongly recommended).

### Paradrop Sequence

1. **Transit Phase**: Transport planes fly to the target hex. If enemy fighters are patrolling the route, interception may occur (transports are priority targets for fighters).
2. **AA Check**: If the target hex or adjacent hexes have AA guns, AA fires on the transports. Each transport destroyed = its paratroopers are killed.
   - **20% of transports shot down** if AA is present at the drop zone (Level 1). This increases to 30% for Level 2 AA and 45% for Level 3 AA.
3. **Drop Phase**: Surviving transports drop paratroopers onto the target hex.
4. **Landing Penalty**: Paratroopers land with **-30% combat effectiveness** (attack and defense). This penalty lasts for 1 tick (the landing tick).
5. **No Heavy Equipment**: Paratroopers drop with infantry weapons only. No tanks, no artillery, no vehicles. They are light infantry.
6. **Combat**: If the hex is defended, normal ground combat resolves with the -30% penalty applied to paratroopers.

### Resupply Requirement

- Paratroopers behind enemy lines have **no supply line** (they are cut off from friendly territory).
- They must be resupplied within **5 ticks** or attrition begins: -10% HP per tick to all paratroop units after 5 ticks without resupply.
- Resupply methods: supply drop from transport planes, link up with advancing friendly ground forces (establishes supply line), capture a town/city with supply stockpile.
- Each supply drop sustains the paratroopers for 3 additional ticks.

### Paradrop Edge Cases

- **Dropping on an empty hex**: No combat, no penalty (just capture the hex). Useful for seizing undefended bridges, crossroads, or airfields.
- **Dropping on a fortified hex**: Extremely risky. Paratroopers with -30% penalty vs fortified defenders often results in paratrooper destruction.
- **Dropping on an airfield**: If captured, paratroopers can use the airfield for resupply (transport planes land directly). High-value target.
- **Weather**: Bad weather reduces paradrop accuracy. 10% chance paratroopers land on an adjacent hex instead of the target hex (random adjacent hex chosen).
- **Night drop**: If the game tracks time of day (implementation TBD), night drops have 20% scatter chance but AA effectiveness is halved.

---

## Allied Airfield Dependency

### Staging at Allied Airfields

- Players can station aircraft at allied airfields if the ally grants airfield access (diplomacy setting).
- Staged aircraft use the allied airfield as their base for range calculation.
- This effectively extends a player's air reach without building forward airfields.

### Risk

- If the allied airfield is **captured or destroyed**, all staged aircraft are at risk:
  - Aircraft on the ground (not on a mission) are **captured/destroyed** immediately.
  - Aircraft currently on a mission must divert to another friendly airfield within remaining range or are lost (crash, fuel exhaustion).
- If the ally **revokes airfield access**, staged aircraft have a **2-tick grace period** to relocate to another friendly airfield. After 2 ticks, remaining aircraft are grounded and cannot fly missions until relocated.
- There is no warning when an ally is about to lose an airfield to enemy action. Players must monitor allied front lines and be prepared to evacuate aircraft.

### Edge Cases

- If you stage aircraft at an ally's airfield and that ally is eliminated from the game (all cities captured), your aircraft are immediately at risk. Standard diversion rules apply.
- If an ally's airfield is damaged (not destroyed) to the point where its capacity drops below the number of aircraft stationed there, excess aircraft (yours first, then the ally's) are grounded. Grounded aircraft cannot fly but are not destroyed unless the airfield is fully destroyed.

---

## Interactions with Other Systems

### Air + Naval (see naval.md)
- Carrier-based aircraft (fighters, tactical bombers) operate from carriers at sea, extending air coverage.
- Land-based aircraft can attack enemy ships in sea zones within range.
- Naval AA (cruisers) shoots down 10% of aircraft per cruiser per mission over the sea zone.
- Reconnaissance aircraft detect submarines (60% per mission) and reveal enemy fleet composition.
- Strategic bombers can target enemy ports (disrupting naval operations).

### Air + Ground Combat
- Air superiority provides ground combat bonuses (+/-10-20% attack).
- Close air support (tactical bombers) gives +15% attack to friendly ground units.
- Strategic bombing destroys fortifications, bridges, and railways, shaping the battlefield before ground advance.
- AA guns on the ground are the primary counter to air power.
- Paradrops insert infantry behind enemy lines.

### Air + Intelligence (see intelligence.md)
- Reconnaissance aircraft are a primary intelligence-gathering tool (3-hex radius reveal, fleet detection, submarine detection).
- Radar stations detect incoming air attacks 2 ticks early, allowing fighters to scramble.
- Code breaking may reveal enemy air mission orders (where bombers are headed), allowing preemptive fighter deployment.

### Air + Economy
- Aircraft production requires Steel, Oil, Rubber, Aluminum (strategic bomber).
- Aircraft upkeep is a continuous drain on Fuel and Oil.
- Strategic bombing of enemy factories and resource extraction sites is a direct economic attack.
- Airfield construction competes with other infrastructure for resources and build queue.
- Destroying enemy railways via strategic bombing disrupts their supply network, indirectly crippling their economy.

---

## Balance Notes

- Fighters are cheap (2-tick build) and essential. Every player needs fighters. A player without fighters is vulnerable to unopposed bombing.
- Strategic bombers are expensive (5-tick build, high upkeep) but can win games by crippling enemy industry. The 30-70% accuracy range ensures bombing is impactful but not deterministic. A single bombing run might miss entirely.
- AA guns are the affordable counter to air power. Even a modest AA defense forces the enemy to commit more bombers or accept losses. The stacking mechanic rewards dense AA networks around critical infrastructure.
- Recon aircraft are the cheapest unit (1-tick build) and provide enormous intelligence value. They should be a first-build priority for every player.
- Transport planes and paradrops are niche but game-changing. Capturing an undefended enemy airfield or port behind the lines can turn a stalemate into a rout.
- The air range mechanic (4-8 hexes depending on type) means forward airfields are critical. Players who advance on the ground can build forward airfields to extend air reach, creating a positive feedback loop. Conversely, strategic bombing of enemy airfields pushes their air coverage back.
- In a 20-50 player game, air power is often the decisive factor in alliance wars. Coordinated bombing campaigns by multiple players can overwhelm even strong AA defenses.

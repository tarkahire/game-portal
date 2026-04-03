# Combat System

This document is the source of truth for all combat mechanics in Dad's Army, including field battles, city battles, damage resolution, morale, war damage, battle reports, and related systems. All formulas and balance values defined here are authoritative.

---

## Table of Contents

1. [Combat Overview](#combat-overview)
2. [Battle Types](#battle-types)
3. [Combat Trigger](#combat-trigger)
4. [Deterministic Resolution](#deterministic-resolution)
5. [Multi-Round System](#multi-round-system)
6. [Category Effectiveness Matrix](#category-effectiveness-matrix)
7. [Terrain Modifiers](#terrain-modifiers)
8. [City Defense Modifier](#city-defense-modifier)
9. [War Damage to Land](#war-damage-to-land)
10. [Morale System](#morale-system)
11. [Ammunition Consumption](#ammunition-consumption)
12. [Battle Reports](#battle-reports)
13. [Combat Predictor](#combat-predictor)
14. [Scorched Earth](#scorched-earth)
15. [Simultaneous Arrival](#simultaneous-arrival)
16. [Edge Cases & Interactions](#edge-cases--interactions)

---

## Combat Overview

Combat in Dad's Army is an automatic, deterministic, multi-round resolution system. When opposing armies occupy the same tile, combat resolves over up to 10 rounds per server tick. The system rewards army composition, terrain positioning, supply lines, and fortification -- not click speed or micro-management.

### Design Principles

1. **Deterministic**: Same inputs always produce the same output. No random rolls. This allows replay, verification, and client-side prediction.
2. **Category-based rock-paper-scissors**: Infantry, Armor, and Artillery form a triangle of effectiveness. Balanced armies outperform one-dimensional armies.
3. **Terrain matters**: Choosing where to fight is as important as what you fight with.
4. **Attrition is real**: Combat damages the land and consumes resources. Pyrrhic victories are possible and common.
5. **Morale breaks before bodies**: Armies rout when morale collapses, often before total annihilation.

---

## Battle Types

### Field Battle

- Occurs on any non-city tile: resource fields, plains, forests, mountains, etc.
- Both sides fight on equal footing modified only by terrain and who is attacking vs. defending.
- The **defender** is the army that was on the tile first (or the owner of the tile). The **attacker** is the army that moved onto the tile.

### City Battle

- Occurs when an army attacks a tile containing an enemy city.
- The city's defense buildings (Walls, Bunker, Fortress, AA Battery, Coastal Battery) apply their bonuses to the defending side.
- City battles can take longer due to Wall assault slowdown (additional mandatory combat rounds).
- See [City Defense Modifier](#city-defense-modifier) for full details.

---

## Combat Trigger

### When Combat Starts

Combat is triggered when an army's movement path ends on (or passes through) a tile occupied by a hostile army or hostile city.

Specifically, on each server tick:

1. All movement orders are processed. Units advance along their paths.
2. After movement, the server checks every tile for the presence of armies from opposing players.
3. If a tile contains armies from 2+ hostile players (or an army and a hostile city), combat is queued for that tile.
4. All queued combats resolve in a single batch (order does not matter -- combats on different tiles are independent).

### Movement Through Hostile Tiles

If an army's path passes through (not ending on) a hostile-occupied tile, the army **stops** on that tile and combat begins. The army does not skip over enemies.

### No Combat Between Allies

Players who have a formal alliance (diplomatic agreement, see diplomacy system -- Phase 2) do not trigger combat. Allied armies can coexist on the same tile.

---

## Deterministic Resolution

All combat outcomes are calculated using fixed formulas with no random components.

### Why Deterministic?

1. **Reproducibility**: Any battle can be replayed from its inputs and will produce identical results.
2. **Testability**: Unit tests can verify exact outcomes.
3. **Fairness**: No player is advantaged or disadvantaged by luck.
4. **Prediction**: The client-side combat predictor can show accurate previews.
5. **Anti-cheat**: Server and client independently calculate results; mismatches indicate tampering.

### Resolution Pseudocode

```
function resolve_combat(attacker_army, defender_army, tile):
    attacker = deep_copy(attacker_army)
    defender = deep_copy(defender_army)

    terrain = tile.terrain
    city = tile.city  // null for field battles
    rounds_fought = 0
    max_rounds = 10 + wall_bonus_rounds(city)

    battle_log = []

    while rounds_fought < max_rounds:
        rounds_fought += 1
        round_result = resolve_round(attacker, defender, terrain, city, rounds_fought)
        battle_log.append(round_result)

        apply_casualties(attacker, round_result.attacker_casualties)
        apply_casualties(defender, round_result.defender_casualties)

        update_morale(attacker, round_result.attacker_casualties, attacker_army.starting_strength)
        update_morale(defender, round_result.defender_casualties, defender_army.starting_strength)

        if attacker.morale < 30:
            return BattleResult(winner="defender", battle_log, attacker, defender, "attacker_routed")
        if defender.morale < 30:
            return BattleResult(winner="attacker", battle_log, attacker, defender, "defender_routed")
        if attacker.total_units() == 0:
            return BattleResult(winner="defender", battle_log, attacker, defender, "attacker_destroyed")
        if defender.total_units() == 0:
            return BattleResult(winner="attacker", battle_log, attacker, defender, "defender_destroyed")

    // If max rounds reached without resolution, defender holds (attacker failed to take position)
    return BattleResult(winner="defender", battle_log, attacker, defender, "stalemate_defender_holds")
```

---

## Multi-Round System

Each combat consists of up to 10 rounds (plus bonus rounds from Wall assault slowdown). Each round follows the same sequence.

### Round Resolution

```
function resolve_round(attacker, defender, terrain, city, round_number):
    // Step 1: Calculate raw attack power per category
    atk_infantry_power  = attacker.infantry.count * attacker.infantry.attack_per_unit
    atk_armor_power     = attacker.armor.count * attacker.armor.attack_per_unit
    atk_artillery_power = attacker.artillery.count * attacker.artillery.attack_per_unit

    def_infantry_power  = defender.infantry.count * defender.infantry.attack_per_unit
    def_armor_power     = defender.armor.count * defender.armor.attack_per_unit
    def_artillery_power = defender.artillery.count * defender.artillery.attack_per_unit

    // Step 2: Apply category effectiveness (attacker attacking defender)
    atk_inf_vs_def = distribute_damage(atk_infantry_power, defender, "infantry")
    atk_arm_vs_def = distribute_damage(atk_armor_power, defender, "armor")
    atk_art_vs_def = distribute_damage(atk_artillery_power, defender, "artillery")

    def_inf_vs_atk = distribute_damage(def_infantry_power, attacker, "infantry")
    def_arm_vs_atk = distribute_damage(def_armor_power, attacker, "armor")
    def_art_vs_atk = distribute_damage(def_artillery_power, attacker, "artillery")

    // Step 3: Apply terrain modifiers
    atk_total_damage = (atk_inf_vs_def + atk_arm_vs_def + atk_art_vs_def) * attacker_terrain_modifier(terrain)
    def_total_damage = (def_inf_vs_atk + def_arm_vs_atk + def_art_vs_atk) * defender_terrain_modifier(terrain, city)

    // Step 4: Apply city defense modifier (if city battle)
    if city:
        def_total_damage *= city_defense_multiplier(city)
        atk_total_damage *= city_attack_penalty(city)  // Walls reduce attacker effectiveness

    // Step 5: Apply ammunition modifier
    if attacker.ammunition <= 0:
        atk_total_damage *= 0.25
    if defender.ammunition <= 0:
        def_total_damage *= 0.25

    // Step 6: Calculate casualties
    defender_casualties = calculate_casualties(atk_total_damage, defender)
    attacker_casualties = calculate_casualties(def_total_damage, attacker)

    // Step 7: Consume ammunition
    consume_ammunition(attacker)
    consume_ammunition(defender)

    return RoundResult(attacker_casualties, defender_casualties, round_details)
```

### Damage Distribution

When an attacking category deals damage, it is distributed across the defender's categories proportionally to their presence, modified by the effectiveness matrix:

```
function distribute_damage(attack_power, target_army, attack_category):
    total_target_units = target_army.infantry.count + target_army.armor.count + target_army.artillery.count
    if total_target_units == 0:
        return 0

    // Weight each target category by its unit count and the effectiveness modifier
    inf_weight = target_army.infantry.count * effectiveness(attack_category, "infantry")
    arm_weight = target_army.armor.count * effectiveness(attack_category, "armor")
    art_weight = target_army.artillery.count * effectiveness(attack_category, "artillery")

    total_weight = inf_weight + arm_weight + art_weight

    // Damage dealt to each category
    damage_to_infantry  = attack_power * (inf_weight / total_weight)
    damage_to_armor     = attack_power * (arm_weight / total_weight)
    damage_to_artillery = attack_power * (art_weight / total_weight)

    return damage_to_infantry + damage_to_armor + damage_to_artillery
```

### Casualty Calculation

```
function calculate_casualties(total_damage, army):
    // Damage is distributed proportionally across categories by HP weight
    total_hp = army.infantry.total_hp + army.armor.total_hp + army.artillery.total_hp

    infantry_damage  = total_damage * (army.infantry.total_hp / total_hp)
    armor_damage     = total_damage * (army.armor.total_hp / total_hp)
    artillery_damage = total_damage * (army.artillery.total_hp / total_hp)

    // Convert damage to unit losses
    infantry_killed  = floor(infantry_damage / infantry_hp_per_unit)
    armor_killed     = floor(armor_damage / armor_hp_per_unit)
    artillery_killed = floor(artillery_damage / artillery_hp_per_unit)

    // Remaining damage carries over as HP loss on surviving units
    infantry_hp_remainder  = infantry_damage % infantry_hp_per_unit
    armor_hp_remainder     = armor_damage % armor_hp_per_unit
    artillery_hp_remainder = artillery_damage % artillery_hp_per_unit

    return Casualties(infantry_killed, armor_killed, artillery_killed,
                      infantry_hp_remainder, armor_hp_remainder, artillery_hp_remainder)
```

### Unit HP Values

| Unit Category | HP per Unit | Attack per Unit | Defense per Unit |
|--------------|------------|----------------|-----------------|
| Infantry (per 100 men) | 100 | 20 | 15 |
| Mechanized Infantry | 150 | 30 | 20 |
| Light Tank | 200 | 40 | 30 |
| Medium Tank | 300 | 55 | 45 |
| Heavy Tank | 500 | 70 | 65 |
| Light Artillery | 80 | 50 | 5 |
| Heavy Artillery | 120 | 80 | 8 |
| Self-Propelled Gun | 250 | 65 | 35 |

---

## Category Effectiveness Matrix

The rock-paper-scissors triangle creates strategic depth in army composition.

### Effectiveness Modifiers

When category A attacks category B, damage is multiplied by the effectiveness modifier:

| Attacker \ Target | Infantry | Armor | Artillery |
|-------------------|----------|-------|-----------|
| **Infantry** | 1.00 | 0.75 (-25%) | 1.25 (+25%) |
| **Armor** | 1.25 (+25%) | 1.00 | 0.75 (-25%) |
| **Artillery** | 0.75 (-25%) | 1.25 (+25%) | 1.00 |

### Reading the Matrix

- **Infantry vs Armor**: Infantry deals 25% LESS damage to Armor (0.75x). Tanks shrug off small arms.
- **Infantry vs Artillery**: Infantry deals 25% MORE damage to Artillery (1.25x). Infantry can overrun gun positions.
- **Armor vs Infantry**: Armor deals 25% MORE damage to Infantry (1.25x). Tanks are devastating against exposed troops.
- **Armor vs Artillery**: Armor deals 25% LESS damage to Artillery (0.75x). Artillery outranges and can disable tanks.
- **Artillery vs Armor**: Artillery deals 25% MORE damage to Armor (1.25x). Concentrated fire breaks armor formations.
- **Artillery vs Infantry**: Artillery deals 25% LESS damage to Infantry (0.75x). Infantry can disperse and take cover.

### Tungsten Modifier

Units equipped with tungsten ammunition (requires Tungsten resource and Munitions Factory research upgrade) gain:
- +15% damage against Armor category specifically.
- This stacks with the base effectiveness matrix.
- Example: Artillery (1.25 base vs armor) + Tungsten (+15%) = 1.25 * 1.15 = **1.4375x** damage vs Armor.

### Balanced Army Composition

The effectiveness matrix means a balanced army (roughly equal investment in all three categories) has no critical weakness. Typical optimal compositions:

- **Balanced**: 40% Infantry, 30% Armor, 30% Artillery
- **Assault**: 25% Infantry, 45% Armor, 30% Artillery (good for attacking plains)
- **Defensive**: 50% Infantry, 15% Armor, 35% Artillery (good for holding positions)
- **Anti-armor**: 30% Infantry, 20% Armor, 50% Artillery (counters armor-heavy enemies)

---

## Terrain Modifiers

Terrain affects both attacker and defender, with defenders generally benefiting from terrain features.

### Attacker Modifiers

These multiply the attacker's total damage output:

| Terrain | Attacker Modifier | Notes |
|---------|------------------|-------|
| Plains | 1.0 | No modifier |
| Forest | 1.0 | No direct penalty, but defender gets bonus |
| Mountain | 0.7 (armor), 1.0 (others) | -30% to armor specifically (see below) |
| River crossing | 0.8 | -20% to ALL attacker damage |
| Urban/Ruins | 1.0 | No direct penalty, but defender gets bonus |
| Coastal | 1.0 | No modifier |

### Defender Modifiers

These multiply the defender's effective defense (reduces incoming damage):

| Terrain | Defender Defense Bonus | Notes |
|---------|----------------------|-------|
| Plains | +0% | No modifier |
| Forest | +20% | Concealment and cover |
| Mountain | +40% | High ground, natural fortification |
| Urban/Ruins | +30% | Building cover, rubble |
| River (defender behind river) | +0% | Benefit is via attacker penalty, not defender bonus |
| Coastal | +10% | Minor elevation advantage |

### Mountain Special Rule: Armor Penalty

When attacking a mountain tile, the attacker's Armor category specifically suffers a -30% effectiveness penalty. This is applied BEFORE the category effectiveness matrix:

```
attacker_armor_damage_on_mountain = base_armor_damage * 0.70 * effectiveness_modifier
```

Vehicles struggle in mountainous terrain. Combined with the +40% defender defense bonus, mountains are extremely difficult to assault with armor-heavy armies.

### Forest Special Rule: Concealment

In forest combat, the attacker suffers -10% accuracy (effectively -10% damage) in addition to the defender's +20% defense bonus. Total effective defender advantage in forest: approximately 1.32x.

```
forest_attacker_total_modifier = 0.90  // -10% accuracy
forest_defender_defense = 1.20          // +20% defense
effective_multiplier = 0.90 / 1.20 = 0.75  // attacker deals 75% of normal damage
```

### Stacking with City Defense

Terrain modifiers stack multiplicatively with city defense modifiers:

```
total_defender_modifier = terrain_defense_bonus * city_defense_modifier
```

Example: City on forest tile with Level 3 Walls + Level 2 Bunker:
```
terrain = 1.20 (forest)
city = 1.0 + 0.50 + (3 * 0.04) + (2 * 0.08) = 1.78
total = 1.20 * 1.78 = 2.136x effective defense
```

---

## City Defense Modifier

When combat occurs at a city tile, the city's fortifications provide significant advantages to the defender.

### Base City Bonus

All cities provide a base +50% defense bonus to the garrison:

```
base_city_modifier = 1.50
```

### Fortification Bonuses

Added to the base city modifier:

| Building | Bonus per Level | Max Bonus (Level 5) |
|----------|----------------|-------------------|
| Walls | +4% per level | +20% |
| Bunker | +8% per level | +40% |
| Fortress | +12% per level | +60% |

### City Defense Multiplier Formula

```
city_defense_multiplier = 1.0
                        + 0.50                        // base city bonus
                        + wall_level * 0.04           // Walls
                        + bunker_level * 0.08         // Bunker
                        + fortress_level * 0.12       // Fortress
```

### City Defense Multiplier Examples

| Fortifications | Multiplier |
|---------------|-----------|
| Unfortified city (no walls/bunker/fortress) | 1.50x |
| Level 3 Walls only | 1.62x |
| Level 3 Walls + Level 2 Bunker | 1.78x |
| Level 5 Walls + Level 5 Bunker + Level 5 Fortress | 2.70x |

### Assault Slowdown (Walls)

Walls force additional combat rounds before the city can fall. Even if the defender's morale breaks or army is destroyed, the attacker must fight through wall rounds:

| Wall Level | Extra Rounds |
|-----------|-------------|
| 0 | 0 |
| 1-2 | +1 |
| 3 | +2 |
| 4 | +2 |
| 5 | +3 |

During wall assault rounds, the defender still deals damage (wall-mounted weapons, garrison fire) but at 50% of normal rate. The attacker must deal cumulative damage equal to the wall's structural HP to breach:

```
wall_structural_hp = wall_level * 500
```

If the attacker cannot breach the wall within the bonus rounds, the assault fails even if the defender's army was destroyed (the walls hold independently).

### Bunker Bombardment Resistance

Garrisoned units in a bunker take reduced damage from artillery and air bombardment:

```
bombardment_damage_to_garrisoned = base_damage * (1 - bunker_resistance)
```

Where `bunker_resistance` is from the Bunker building table (20-60% at levels 1-5).

### Fortress Counter-Attack Bonus

Garrisoned units in a fortress deal bonus damage:

```
fortress_garrison_damage = base_damage * (1 + fortress_counter_attack_bonus)
```

Where `fortress_counter_attack_bonus` is 10-30% at levels 1-5.

---

## War Damage to Land

Combat permanently scars the land, reducing its long-term economic value. This creates a real cost to fighting over resource-rich territory.

### War Damage Accumulation

Each round of combat on a tile adds `war_damage`:

```
damage_per_round = (total_units_fighting / 100) * combat_intensity
```

Where:
- `total_units_fighting` = attacker.total_units + defender.total_units (sum of all individual units, not categories)
- `combat_intensity` = 1.0 for field battles, 1.5 for city battles (urban combat is more destructive), 0.5 for siege bombardment

### War Damage Cap

```
war_damage = min(war_damage + damage_per_round, 100)
```

Maximum `war_damage` is 100. This cannot be exceeded.

### Effect on Tile Yield

```
effective_yield = base_yield * (1 - war_damage / 200)
```

| War Damage | Yield Modifier | Description |
|-----------|---------------|-------------|
| 0 | 100% | Pristine |
| 10 | 95% | Light combat, minor craters |
| 25 | 87.5% | Moderate combat, infrastructure damage |
| 50 | 75% | Heavy combat, significant destruction |
| 75 | 62.5% | Severe combat, landscape scarred |
| 100 | 50% | Maximum damage, half yield permanently lost |

### War Damage and Land Quality

War damage also reduces land quality for city building purposes:

```
effective_land_quality = base_land_quality * (1 - war_damage / 200)
```

A tile with 80% base land quality and 50 war_damage:
```
effective_land_quality = 0.80 * (1 - 50/200) = 0.80 * 0.75 = 0.60 (60%)
```

### War Damage Is Permanent

War damage cannot be repaired. This is by design:
- Discourages fighting repeatedly over the same territory (diminishing returns).
- Creates strategic incentive to negotiate or avoid combat on valuable tiles.
- Reflects the real historical devastation of prolonged WW2 combat.

### War Damage to Resource Tiles

Resource tiles suffer double consequences:
1. Extraction yield is reduced by war_damage (as above).
2. If war_damage exceeds 80, infrastructure level is reduced by 1 (structures damaged by combat). This can cascade -- severe fighting can demolish infrastructure entirely.

### War Damage to Farm Tiles

Farm tiles are especially vulnerable:
- War damage reduces soil quality by `war_damage / 2` percentage points.
- Example: 100% soil quality + 40 war_damage = 80% soil quality.
- This stacks with normal soil degradation from farming.

---

## Morale System

Morale determines when an army breaks and retreats. It is the primary mechanism that ends battles.

### Starting Morale

All armies start combat with **100 morale**.

Modifiers to starting morale:

| Condition | Morale Modifier |
|-----------|----------------|
| Defending home territory | +10 |
| Near capital (within 5 hexes) | +10 |
| Outnumber enemy 2:1 or more | +10 |
| Outnumbered 2:1 or more | -10 |
| Food supply = 0 | -15 |
| Money supply = 0 (unpaid troops) | -10 |
| Recently won a battle (last 24 ticks) | +5 |
| Recently lost a battle (last 24 ticks) | -5 |
| General/commander present (Phase 2) | +5 to +20 |

Starting morale is clamped to [10, 130]. The cap of 130 prevents stacking too many bonuses.

### Morale Loss Per Round

```
morale_loss = (casualties_this_round / starting_strength) * 100
```

Where:
- `casualties_this_round` = total units lost this round (across all categories)
- `starting_strength` = total units at the start of combat (not the start of the round)

This means:
- An army of 1,000 that loses 50 units in a round suffers 5 morale loss.
- An army of 100 that loses 50 units in a round suffers 50 morale loss.

Small armies break faster proportionally, reflecting the psychological impact of heavy proportional losses.

### Morale Recovery

- Morale does NOT recover during combat.
- After combat ends, surviving armies recover morale at +5 per tick while not in combat.
- Recovery is faster in friendly territory: +8 per tick.
- Recovery is slower in hostile territory: +3 per tick.
- Morale caps at 100 outside of combat (starting bonuses do not persist after battle).

### Rout

When morale drops below **30**, the army **routs**:

1. The army immediately disengages from combat.
2. The routed army retreats toward the nearest friendly city along the shortest path.
3. During retreat, the army moves at 150% normal speed (panic flight).
4. The routed army cannot be given orders for 6 ticks (30 minutes) -- automatic retreat.
5. If the routing army is intercepted by an enemy army during retreat, combat occurs with the routing army starting at 15 morale (almost certain destruction).
6. After reaching safety (friendly city or 6 ticks elapsed), the army can be controlled again but starts at 30 morale.

### Morale and Attrition (Zero Resources)

Zero-resource attrition effects (from resources.md) apply as morale modifiers during combat:
- No food: -5 morale per round (in addition to casualty morale loss)
- No money (unpaid): -3 morale per round
- These stack and can cause routs without any enemy combat damage.

---

## Ammunition Consumption

Ammunition is consumed during combat and is a critical logistical consideration.

### Consumption Per Round

| Unit Type | Ammo Consumed per Combat Round |
|-----------|-------------------------------|
| Infantry (per 100 men) | 5 |
| Mechanized Infantry | 8 |
| Light Tank | 10 |
| Medium Tank | 12 |
| Heavy Tank | 15 |
| Light Artillery | 20 |
| Heavy Artillery | 30 |
| Self-Propelled Gun | 18 |

### Total Army Ammunition

Each army carries ammunition from its home city's stockpile. When an army is created or resupplied:

```
army_ammo = min(requested_ammo, city_ammo_stockpile)
```

Ammunition is deducted from the city stockpile and carried with the army. It is NOT production -- it is consumed inventory.

### Running Out of Ammunition

If an army's ammunition reaches 0 during combat:

```
damage_output = base_damage * 0.25
morale_loss_multiplier = 2.0
```

Units fight with bayonets, improvised weapons, and sheer desperation. Damage drops to 25% and morale loss doubles. Ammunition management is as important as army composition.

### Resupply

- Armies within supply range of a friendly city with Munitions Factory automatically resupply between combats.
- Resupply rate: 50% of army's max ammo capacity per tick, limited by city stockpile.
- Armies outside supply range cannot resupply. They fight with what they carry.

---

## Battle Reports

Every battle generates a detailed report stored in the database for review, replay, and analysis.

### Battle Report Schema (Supabase)

**Table: `battle_reports`**

```json
{
  "id": "uuid",
  "server_id": "uuid",
  "tick": integer,
  "tile_q": integer,
  "tile_r": integer,
  "tile_terrain": "string",
  "battle_type": "field" | "city",

  "attacker_id": "uuid",
  "defender_id": "uuid",

  "attacker_initial": {
    "infantry": {"count": 500, "hp_per_unit": 100, "total_hp": 50000},
    "armor": {"count": 20, "hp_per_unit": 300, "total_hp": 6000},
    "artillery": {"count": 15, "hp_per_unit": 80, "total_hp": 1200},
    "morale": 105,
    "ammunition": 2000
  },
  "defender_initial": {
    "infantry": {"count": 300, "hp_per_unit": 100, "total_hp": 30000},
    "armor": {"count": 10, "hp_per_unit": 300, "total_hp": 3000},
    "artillery": {"count": 25, "hp_per_unit": 80, "total_hp": 2000},
    "morale": 110,
    "ammunition": 1500
  },

  "modifiers": {
    "terrain_attacker": 0.80,
    "terrain_defender": 1.20,
    "city_defense": 1.78,
    "tungsten_attacker": false,
    "tungsten_defender": false
  },

  "rounds": [
    {
      "round": 1,
      "attacker_damage_dealt": 1250,
      "defender_damage_dealt": 1890,
      "attacker_casualties": {"infantry": 12, "armor": 1, "artillery": 2},
      "defender_casualties": {"infantry": 8, "armor": 0, "artillery": 1},
      "attacker_morale": 97,
      "defender_morale": 103,
      "attacker_ammo_remaining": 1850,
      "defender_ammo_remaining": 1375
    },
    {
      "round": 2,
      "..."
    }
  ],

  "result": {
    "winner": "defender",
    "reason": "attacker_routed",
    "rounds_fought": 7,
    "war_damage_inflicted": 12.5
  },

  "attacker_surviving": {
    "infantry": {"count": 380, "avg_hp": 85},
    "armor": {"count": 14, "avg_hp": 220},
    "artillery": {"count": 8, "avg_hp": 60}
  },
  "defender_surviving": {
    "infantry": {"count": 260, "avg_hp": 90},
    "armor": {"count": 10, "avg_hp": 280},
    "artillery": {"count": 22, "avg_hp": 70}
  },

  "created_at": "timestamp"
}
```

### Battle Report Access

- Both the attacker and defender can view the full battle report.
- Other players cannot view the report unless they have Intelligence Center level 3+ (Code Breaking capability) and the battle occurred within their intelligence range.
- Battle reports are retained for the full 45-day server cycle.

### Battle Replay

The client can reconstruct a visual replay of the battle from the report data:
1. Show initial army compositions side by side.
2. Animate each round: damage numbers, unit loss counters, morale bars.
3. Show final result with surviving forces.

---

## Combat Predictor

Before committing to an attack, players can preview the likely outcome using the client-side combat predictor.

### How It Works

1. The client runs the same deterministic combat resolution algorithm locally.
2. It uses the player's known information: their own army composition, visible enemy army composition, terrain, and city fortifications.
3. It does NOT know: exact enemy unit HP (assumes full HP), enemy ammunition stockpile (assumes adequate), enemy tech bonuses (assumes none beyond visible).

### Prediction Output

| Prediction | Condition |
|-----------|-----------|
| **Likely Victory** | Predicted to win with >60% of army surviving |
| **Probable Victory** | Predicted to win with 30-60% of army surviving |
| **Uncertain** | Predicted outcome too close to call (within 10% either way) |
| **Probable Defeat** | Predicted to lose with 30-60% of army surviving (enemy wins) |
| **Likely Defeat** | Predicted to lose with enemy retaining >60% of army |

### Prediction Accuracy

The predictor is accurate when:
- The player has full vision of the enemy army (Visible fog state).
- The enemy has no hidden tech bonuses.
- Neither side runs out of ammunition.

The predictor can be inaccurate when:
- Enemy army composition is based on last-seen data (Fog state) -- units may have changed.
- Enemy has tech bonuses the player doesn't know about.
- Enemy runs out of ammunition (or has tungsten ammo the player didn't detect).
- Reinforcements arrive during the battle (not modeled in predictor).

### UI Display

The predictor shows:
- Color-coded outcome (green/yellow/red)
- Estimated casualties for both sides
- Estimated rounds to resolution
- Warning icons for uncertainty factors (fog data, unknown modifiers)

---

## Scorched Earth

Defending players can destroy their own assets before the enemy captures them.

### What Can Be Scorched

| Target | Time Required | Effect |
|--------|--------------|--------|
| Resource infrastructure (on tile) | Instant | Infrastructure level set to 0, +10 war_damage to tile |
| City buildings (individual) | Instant | Building destroyed (level 0), no recovery |
| Entire city | 1 tick (5 min) | ALL buildings destroyed, city level set to 1, +20 war_damage |
| Stockpiled resources | Instant | Stored resources in city set to 0 (destroyed, not transferred) |
| Roads/Rail on tile | Instant | Road/rail removed, must be rebuilt |

### Scorched Earth Rules

1. **Ownership required**: You can only scorch your own assets.
2. **No undo**: Scorched earth is permanent. Destroyed buildings and resources are gone.
3. **War damage**: Scorching adds war_damage to the tile, reducing its long-term value for everyone (including you if you recapture it).
4. **Timing**: Individual asset destruction is instant. Full city scorched earth takes 1 tick, during which the city is vulnerable.
5. **Cannot scorch during combat**: If combat has already started on the tile, scorched earth is too late. You must scorch BEFORE the enemy army arrives.
6. **Notification**: Scorched earth generates a visible event (smoke/fire) that nearby enemies can see, even through fog of war (within 3 hexes).

### Strategic Uses

- **Deny oil to enemy**: Destroy oil infrastructure before retreat, forcing enemy to rebuild (time and resources).
- **Deny city**: Destroy all buildings in a city before it falls, so the enemy captures an empty shell.
- **Retreat and deny**: Systematic scorched earth along a retreat path, destroying roads and infrastructure.
- **Psychological**: The notification effect can deter an enemy advance (they know they're capturing worthless land).

---

## Simultaneous Arrival

Special rules for when multiple armies arrive at the same tile on the same tick.

### Case 1: Two Enemy Armies Arrive at an Unowned Tile

If two armies from different hostile players both move to an unowned tile on the same tick:

1. Neither has "defender" status. Both are treated as attackers.
2. The army that traveled fewer hexes (shorter path) is designated "defender" (arrived first conceptually).
3. If paths are equal length, the army with more total units is defender (larger force establishes position first).
4. If still tied, the player with the lower UUID is defender (deterministic tiebreaker).
5. Combat resolves normally with the designated attacker/defender.

### Case 2: Allied Armies Arrive at an Enemy Tile

If two or more allied armies arrive at an enemy-occupied tile on the same tick:

1. The allied armies **combine** into a single attacking force for combat purposes.
2. All unit categories are summed.
3. Ammunition is pooled.
4. Morale is averaged (weighted by unit count).
5. After combat, surviving units are redistributed to their original armies proportionally.

### Case 3: Reinforcements During Combat

If combat is already occurring on a tile and a new army arrives:

- **Friendly reinforcement**: Added to that side's army at the start of the next round. Does not disrupt the current round.
- **Enemy army**: Creates a new combat instance. The current battle continues, and the new arrival is queued for combat next tick.
- Reinforcements arrive with their own morale and ammunition (not averaged with the existing army until the next round starts).

### Case 4: Retreat Through Enemy

If a routing army's retreat path passes through an enemy-occupied tile:

1. The routing army is intercepted.
2. Combat triggers with the routing army as "attacker" (it's trying to push through) starting at 15 morale.
3. If the routing army's morale drops below 30 again (almost immediate given starting morale of 15), the army **surrenders**.
4. Surrendered units are destroyed (captured -- removed from game).

---

## Edge Cases & Interactions

### Combat on Resource Tiles

- Combat on a resource tile with active infrastructure damages the infrastructure.
- Per round of combat, 5% chance per round that infrastructure level decreases by 1.
- This is in addition to war_damage accumulation.
- Resource extraction drops to 0 during active combat.

### Combat and Supply Lines

- If an enemy army cuts a supply line (captures a tile between a resource/army and its city), the disconnected army/resource is immediately affected.
- Disconnected armies cannot resupply ammunition.
- Disconnected resource tiles produce 0 (resources can't be transported).

### Multi-Army Battles

- A tile can only have one active combat at a time.
- If 3+ hostile armies converge on a tile simultaneously, they are resolved in pairs: highest unit count vs second highest first, winner vs next, etc.
- Each pair resolution is a separate battle report.

### Naval Bombardment (Phase 2)

- Ships can bombard coastal tiles from adjacent water tiles.
- Bombardment uses the siege bombardment rules (0.5 combat intensity for war damage).
- Coastal Battery defends against naval bombardment (see cities.md).
- Ships cannot be targeted by land units unless the land units have Coastal Battery or specific anti-ship capability.

### Air Support (Phase 2)

- Aircraft based at Airfields can provide combat support within their range.
- Fighters provide a damage bonus to the supported side.
- Bombers deal direct damage as a separate "Air" category.
- Anti-Aircraft Battery reduces air support effectiveness.
- Air combat between opposing fighters resolves before ground support is applied.

### Morale Cascade

If a player loses multiple battles in rapid succession (within 12 ticks), a morale cascade can occur:
- Each subsequent army that engages in combat starts with an additional -5 morale penalty (stacking).
- Maximum cascade penalty: -25 (after 5 consecutive losses).
- Cascade resets after winning a battle or after 24 ticks without combat.
- This mechanic prevents a losing player from endlessly throwing small armies at a position.

### Zero-Unit Edge Case

If all units in a category are destroyed during a round:
- That category contributes 0 to damage in subsequent rounds.
- Damage targeting that category is redistributed proportionally to remaining categories.
- If ALL units on one side are destroyed, that side loses immediately regardless of morale.

### Tie-Breaking

Since the system is deterministic, true ties (both sides reach exactly 0 units or exactly 30 morale on the same round) are theoretically possible but extremely rare. In case of a tie:
- The **defender** wins (they hold the position).
- Both armies suffer their calculated casualties.
- This slight defender advantage is intentional and reflects the historical advantage of defensive positions.

# Nation Alignment System

## Overview

At game start, each player selects one of 7 nation alignments. Alignment provides **percentage bonuses** to specific playstyles — it does NOT gate content. All players can build every unit, every building, and research every technology regardless of alignment. Alignment simply makes certain strategies more efficient.

Alignments are permanent for the duration of the server. Choose based on your intended playstyle.

---

## Design Philosophy

- No alignment is strictly superior. Each rewards a different approach: aggressive, defensive, economic, intelligence, naval.
- Bonuses are tuned to be meaningful (15-30% range) without being overwhelming. A skilled player with a "wrong" alignment can still beat a mediocre player with the "right" one.
- Starting biases offset powerful passives: strong military starters have fewer resources, strong economic starters have fewer troops.
- All percentages in this document are initial balance targets. Playtesting will adjust them.

---

## Germany

**Theme:** Blitzkrieg. Rapid combined-arms strikes. Punish static defenders. Reward movement and aggression.

**Historical basis:** Bewegungskrieg (war of movement), Fall Gelb, Operation Barbarossa's opening phase.

### Passive Bonuses

| Bonus | Value | Details |
|-------|-------|---------|
| Armor movement speed | +20% | All armored unit types (Light Tank, Medium Tank, Heavy Tank, Armored Car) move 20% faster. Calculated as: `base_move * 1.20`, rounded down to nearest hex. |
| Blitzkrieg strike bonus | +15% attack | Applied when attacking any enemy unit that **did not move during the previous tick**. The target must have been stationary — if they moved even 1 hex, this bonus does not apply. Rewards aggressive play and punishes turtling. |

### Unique Ability: Combined Arms

When you have **Infantry**, **Armor**, AND **Artillery** unit stacks all within **2 hexes** of a battle (the hex being attacked), all three unit categories receive a **+15% attack bonus** for that battle.

**Mechanics:**
- The 2-hex range is measured from the battle hex, not from each other.
- Only one stack of each type is required. Multiple stacks of the same type do not increase the bonus.
- The bonus is per-battle, calculated at combat resolution time.
- "Within 2 hexes" means the unit can be on the battle hex itself, 1 hex away, or 2 hexes away.
- If any of the three types is missing, the bonus does not apply at all (it's all-or-nothing).

**Interaction with Germany's Blitzkrieg passive:** Both bonuses can stack. If you have Combined Arms active AND the target didn't move, your units get +15% (Combined Arms) + 15% (Blitzkrieg) = +30% total attack bonus. This is intentionally strong — it rewards complex positioning and punishes passive play.

### Starting Bias

| Modifier | Value |
|----------|-------|
| Extra military unit stacks | +3 (infantry, 1 armor, 1 artillery) |
| Starting resource stockpile | -20% of baseline |

---

## United Kingdom

**Theme:** Intelligence dominance. Naval superiority. See more, know more, outmaneuver the enemy.

**Historical basis:** Royal Navy supremacy, Bletchley Park codebreaking, global colonial intelligence networks.

### Passive Bonuses

| Bonus | Value | Details |
|-------|-------|---------|
| Naval defense | +15% | All naval units (Destroyer, Cruiser, Battleship, Carrier, Submarine, Transport) receive +15% defense in all combat. |
| Vision range | +1 hex | ALL units and buildings have their vision radius increased by 1 hex. Infantry that normally sees 2 hexes sees 3. Radar that covers 5 hexes covers 6. This compounds with other vision bonuses. |

### Unique Ability: Intelligence Network

UK's Intelligence Center buildings operate with significantly enhanced capabilities:

| Enhancement | Value |
|-------------|-------|
| Intelligence Center range | +50% (a Level 1 center that normally covers 3 hexes covers 4.5, rounded to 5) |
| Code-breaking speed | -30% time (a codebreaking operation that takes 10 ticks takes 7) |
| Order interception (at Level 3 Intelligence Center) | Sees enemy orders **2 ticks ahead** instead of the normal 1 tick |

**Order interception detail:** Normally, a Level 3 Intelligence Center lets you see what orders an enemy within range issued for the next tick. UK's version shows orders for the next 2 ticks — meaning you can see where enemy units will be 2 turns from now, allowing precise counter-positioning.

### Starting Bias

| Modifier | Value |
|----------|-------|
| Starting navy | 2 Destroyers, 1 Cruiser (above baseline) |
| Colonial outpost | 1 small port city placed far from your starting position (random location on the map edge). Provides income but is hard to defend. |

---

## United States of America

**Theme:** Industrial juggernaut. Outproduce everyone. Supply allies to extend your influence.

**Historical basis:** Arsenal of Democracy, Lend-Lease program, Detroit production miracle, late but overwhelming entry.

### Passive Bonuses

| Bonus | Value | Details |
|-------|-------|---------|
| Factory output | +25% | All production buildings (Factory, Munitions Plant, Vehicle Plant, Shipyard) produce 25% more output per tick. This applies to unit training speed AND resource processing. |
| Resource income | +10% | All resource extraction (mines, oil wells, farms, etc.) yields 10% more per tick. Calculated after field depletion is applied. |

### Unique Ability: Lend-Lease Master

| Enhancement | Value |
|-------------|-------|
| Resource transfer efficiency | -25% loss in transit (if tariff is 15%, it's reduced to ~11%. If no tariff via Trade Agreement, transfers are 100% efficient — zero loss.) |
| Allied production bonus | Players you supply via trade routes or gifts receive +5% production bonus on all buildings for 5 ticks after receiving resources |
| Rush production (unlocked at Economic Research Level 4) | Can instant-produce any unit at **2x normal cost**. Unit appears immediately instead of waiting training time. |

**Lend-Lease interaction with economy:** USA's ability to efficiently supply allies makes them a natural economic hub. By supplying multiple allies, the USA player extends their influence without direct military action. The +5% production bonus to recipients incentivizes other players to seek USA trade agreements.

**Rush production edge case:** Rush production still requires all necessary resources and buildings. You can't rush a Heavy Tank without a Vehicle Plant and the Heavy Armor tech. The 2x cost is calculated on the base cost (before USA's factory bonus). Rush production can be used during bankruptcy (if you somehow have the resources) — it bypasses the "new production halted" restriction.

### Starting Bias

| Modifier | Value |
|----------|-------|
| Starting resource stockpile | +50% above baseline |
| Starting military units | -30% below baseline (fewer and smaller stacks) |

---

## Soviet Union (USSR)

**Theme:** Unyielding resistance. Mass infantry. Exploit breakthroughs with deep operations.

**Historical basis:** Order No. 227 ("Not one step back"), Operation Bagration, deep battle doctrine, mass mobilization.

### Passive Bonuses

| Bonus | Value | Details |
|-------|-------|---------|
| Fight to the last | Full effectiveness until 25% HP | Normally, unit combat effectiveness scales linearly with HP (a unit at 50% HP fights at 50% effectiveness). USSR units fight at 100% effectiveness until they drop below 25% HP, then drop to 25% effectiveness. This makes USSR units extremely dangerous even when damaged. |
| Infantry training speed | +20% | All infantry unit types (Rifle Infantry, Machine Gun Team, Mortar Team, Anti-Tank Infantry) train 20% faster. |

**Fight to the last — formula:**

Normal units:
```
effectiveness = current_hp / max_hp
```

USSR units:
```
if current_hp >= max_hp * 0.25:
    effectiveness = 1.0
else:
    effectiveness = 0.25
```

This means a USSR infantry stack at 30% HP still fights as if it were at full strength. This is extremely powerful in attrition warfare — USSR units trade efficiently even when outnumbered.

### Unique Ability: Deep Battle

**Trigger:** When your forces capture an enemy city (the city hex changes from enemy control to your control).

**Effect:** All your units within **3 hexes** of the captured city receive a **free movement action** — they can immediately move their full movement range, even if they already moved this tick.

**Mechanics:**
- The free movement happens instantly upon city capture, during the same tick.
- Units can use this free movement to attack another target (enabling rapid exploitation of a breakthrough).
- The free movement does NOT grant a free attack — if the unit already attacked this tick, it can only move.
- Only triggers on city capture, not on capturing empty hexes or resource tiles.
- Triggers once per city capture. If you capture 2 cities in one tick, units in range of both get the bonus for each (potentially 2 free movements), but this is extremely rare.

### Starting Bias

| Modifier | Value |
|----------|-------|
| Extra infantry stacks | +5 above baseline |
| Starting tech level | -1 (begins 1 research tier behind in all categories) |

---

## Japan

**Theme:** Naval aviation dominance. Island fortress defense. Fighting spirit in desperate situations.

**Historical basis:** Kantai Kessen (decisive battle doctrine), Bushido warrior code, Kidou Butai carrier fleet, kamikaze.

### Passive Bonuses

| Bonus | Value | Details |
|-------|-------|---------|
| Carrier aircraft damage | +25% | Aircraft launched from carriers (not land airfields) deal 25% more damage in all combat. This applies to both air-to-air and air-to-ground/sea attacks. |
| Island/coastal defense | +30% defense | All units (land, naval, air) receive +30% defense when positioned on island hexes or coastal hexes (hexes adjacent to water). |

### Unique Ability: Banzai Doctrine

Three components:

**1. Fighting Spirit:**
- Units below **30% HP** deal **+50% bonus damage**.
- This stacks with the normal combat effectiveness scaling (which is linear for Japan — they don't get USSR's flat effectiveness).
- At 30% HP, a Japan unit normally fights at 30% effectiveness, but with +50% bonus damage, effectively fights at 45% — significantly more dangerous than expected.

**Formula:**
```
if current_hp / max_hp <= 0.30:
    damage_multiplier = (current_hp / max_hp) * 1.50
else:
    damage_multiplier = current_hp / max_hp
```

**2. Decisive Battle Speed:**
- All naval units get **+10% movement speed**.
- Calculated as `base_naval_move * 1.10`, rounded down.

**3. Kamikaze Attack:**
- Each carrier can execute **one kamikaze attack** per server (one-use ability, not per battle).
- Sacrifices one aircraft stack from the carrier.
- The sacrificed stack deals damage equal to **3x its normal attack value** to a single target (ship or ground unit stack).
- The aircraft stack is permanently destroyed after the attack.
- Kamikaze attacks cannot be intercepted by anti-air (they are too fast/determined).
- A carrier with no aircraft stacks cannot perform kamikaze.

### Starting Bias

| Modifier | Value |
|----------|-------|
| Starting navy | 1 Carrier (with aircraft), 2 Destroyers |
| Starting oil reserves | -40% below baseline |

---

## Italy

**Theme:** Mediterranean control. Trade empire. Coastal dominance in enclosed waters.

**Historical basis:** Mare Nostrum strategy, Mediterranean naval operations, North African campaign, trade-oriented colonial empire.

### Passive Bonuses

| Bonus | Value | Details |
|-------|-------|---------|
| Enclosed sea speed | +15% | Naval units receive +15% speed when in "enclosed" sea zones — defined as sea hexes that are adjacent to land on 3 or more sides (out of 6 hex edges). This represents expertise in navigating the Mediterranean, narrow straits, and coastal waters. |
| Desert/arid defense | +10% | All units receive +10% defense when on desert or arid terrain hexes. |

**Enclosed sea zone definition:**
- A sea hex has 6 edges. If 3 or more of those edges border land hexes, it qualifies as "enclosed."
- This includes straits, bays, gulfs, and narrow seas.
- Open ocean hexes (0-2 land-adjacent edges) do not qualify.

### Unique Ability: Mediterranean Network

| Enhancement | Value |
|-------------|-------|
| Port trade income | +20% | Ports you control generate 20% more income from all trade routes passing through them. |
| Coastal fortification cost | -25% | Building fortifications on coastal hexes costs 25% less resources. |
| Sea zone trade tax | Passive income | When other players' trade routes pass through sea zones you control (have naval units patrolling), you receive a small tax (5% of the shipment value) as passive income. |

**Sea zone trade tax detail:**
- "Control" means you have at least one naval combat unit in the hex.
- The 5% tax is deducted from the shipment automatically — the trading players lose 5% of the resources in transit.
- This does NOT require an embargo or hostility — it's a peacetime "toll."
- If the trading players have a Trade Agreement with you, the tax is waived.
- If multiple Italian players (rare, but possible) have ships in the same hex, only the first to arrive collects the tax.

### Starting Bias

| Modifier | Value |
|----------|-------|
| Starting navy | 2 Cruisers |
| Colonial territory | 1 North African outpost (small city in arid terrain, provides some resources) |
| Industrial base | -15% factory output (partially offsets the passive trade income) |

---

## France

**Theme:** Impregnable fortifications. Artillery dominance. Colonial manpower.

**Historical basis:** Maginot Line, superior pre-war artillery doctrine (Bataille Conduite), vast colonial empire providing troops and resources.

### Passive Bonuses

| Bonus | Value | Details |
|-------|-------|---------|
| Fortification defense | +30% | All fortification buildings (Bunker, Trench, Wall, Fortress) provide 30% more defense than their base values. A Bunker that normally gives +20% defense gives +26% for France. |
| Artillery damage | +15% | All artillery units (Field Artillery, Heavy Artillery, Rocket Artillery, Railway Gun) deal 15% more damage. |

**Fortification bonus calculation:**
```
effective_fort_defense = base_fort_defense * 1.30
```
This applies to the defense bonus granted TO units occupying the fortification, not to the fortification's own HP.

### Unique Ability: Maginot Doctrine

Three components:

**1. Double Fortification HP:**
- All fortification buildings you construct have **2x base HP**.
- A Bunker with 500 base HP has 1,000 HP when built by France.
- This makes French fortifications extremely expensive to destroy — enemies must commit significant artillery or bombers.

**2. Colonial Garrison:**
- Cities designated as "colonial" (the starting colonial city + any city more than 15 hexes from your capital) automatically produce **1 free garrison infantry unit every 5 ticks**.
- Garrison infantry are weaker than regular infantry (-20% stats) but cost no resources.
- Maximum 3 garrison infantry per colonial city (stops producing when cap is reached, resumes if garrison units are destroyed).
- Garrison infantry cannot leave the city they were produced in — they are purely defensive.

**3. Static Defense Bonus:**
- Units that have **not moved for 3 or more consecutive ticks** receive **+10% defense**.
- This bonus is lost the moment the unit moves.
- Encourages a defensive playstyle — dig in, fortify, and dare the enemy to attack.

**Formula:**
```
if ticks_since_last_move >= 3:
    defense_bonus = base_defense * 0.10
else:
    defense_bonus = 0
```

### Starting Bias

| Modifier | Value |
|----------|-------|
| Pre-built fortifications | 3 border hexes start with Level 2 Bunkers |
| Colonial resources | 1 distant colonial city providing passive resource income |
| Starting army | Moderate (baseline — no bonus or penalty) |

---

## Balance Matrix

Summary of alignment strengths by category (1-5 scale, 5 = strongest):

| Alignment | Offense | Defense | Navy | Economy | Intelligence | Early Game | Late Game |
|-----------|---------|---------|------|---------|-------------|------------|-----------|
| Germany | 5 | 2 | 2 | 2 | 2 | 5 | 3 |
| UK | 3 | 3 | 4 | 3 | 5 | 3 | 4 |
| USA | 3 | 2 | 3 | 5 | 2 | 2 | 5 |
| USSR | 4 | 4 | 1 | 2 | 2 | 4 | 4 |
| Japan | 4 | 4 | 5 | 2 | 2 | 3 | 3 |
| Italy | 2 | 3 | 3 | 4 | 2 | 3 | 4 |
| France | 2 | 5 | 2 | 3 | 2 | 4 | 3 |

### Intended Matchup Dynamics

- **Germany vs France:** Blitzkrieg vs Maginot. Germany wants to attack before France digs in. France wants to fortify and exhaust the attacker.
- **USA vs USSR:** Economic powerhouse vs military mass. USA outproduces long-term, USSR overwhelms short-term.
- **UK vs Japan:** Naval intelligence vs naval strike power. UK sees Japan coming; Japan hits harder when they arrive.
- **Italy:** The wild card — thrives by controlling trade and leveraging economic position. Wins through diplomacy and economic warfare more than direct combat.
- **Any alignment vs dominant power:** Coalition mechanic ensures no single alignment's strengths become unbeatable at scale.

### Alignment Restrictions

- Only 1 alignment per player per server. Cannot change mid-server.
- No limit on how many players can pick the same alignment on a server.
- Alignment does NOT affect diplomacy — a Germany player and a France player can be allies.
- Alignment bonuses apply to all units and buildings, even those captured from other players.

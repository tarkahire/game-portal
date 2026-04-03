# Technology Research

## Overview

Research unlocks new units, buildings, and passive bonuses across 4 main categories plus a Superweapon endgame branch. Research requires Research Lab buildings and consumes resources and time. The tech tree is designed so that players must specialize — researching everything is impossible within a single server's timeframe, forcing strategic choices.

---

## Research Mechanics

### Requirements

- **Research Lab building** must be constructed in at least one of your cities.
- Each Research Lab can only research one technology at a time.
- Higher-level Research Labs provide faster research speed.
- Some tech categories require specific prerequisite buildings (noted below).

### Research Speed Formula

```
actual_time = base_time / (sum_of_all_lab_levels)
```

**Examples:**
- Base time 10 ticks, one Level 1 lab: `10 / 1 = 10 ticks`
- Base time 10 ticks, one Level 3 lab: `10 / 3 = 3.33 → 4 ticks` (rounded up)
- Base time 10 ticks, two Level 2 labs: `10 / (2 + 2) = 2.5 → 3 ticks` (rounded up)
- Base time 10 ticks, three Level 1 labs: `10 / 3 = 3.33 → 4 ticks`

**Key implications:**
- Multiple labs stack additively (their levels are summed).
- Investing in lab quantity OR quality both work — but quality is more space-efficient.
- A Level 3 lab in 1 city = three Level 1 labs across 3 cities in terms of research speed.
- Maximum practical research speed: ~6x base (with 3 Level 2 labs = sum of 6). Anything faster requires heavy infrastructure investment.

### Research Costs

Each technology has a resource cost that must be paid upfront when research begins. If you cannot afford the cost, you cannot start the research. Resources are consumed immediately — if research is cancelled, 50% of resources are refunded.

### Research Queue

- Each Research Lab can queue up to 2 technologies (current + next).
- When the current research completes, the next in queue starts automatically if resources are available.
- If resources are insufficient when the next research would start, the queue pauses and the player is notified.

### Research and Alignment

Alignment bonuses do NOT directly affect research speed. However, alignment-specific abilities may synergize with certain tech paths (e.g., Germany's Combined Arms benefits more from Military research, UK's Intelligence Network benefits more from Intelligence research).

---

## Military Research

**Prerequisite building:** Barracks (any level) in at least one city.

Research in this category improves combat unit stats and unlocks advanced unit types.

### Tech Tree

```
[1] Small Arms Improvement
         |
[2] Armor Plating
         |
[3] Advanced Tactics ──────────────┐
         |                         |
    ┌────┴────┐              (Branch Choice)
    |         |              
[4a] Heavy    [4b] Mass
     Armor         Mobilization
    |         |
[5a] Combined [5b] Conscription
     Arms          Doctrine
     Doctrine
    |         |
[6a] Elite    [6b] Total War
     Training      Production
```

### Level 1: Small Arms Improvement

| Property | Value |
|----------|-------|
| Effect | +10% attack for all infantry unit types |
| Resource cost | 500 steel, 200 money |
| Base research time | 4 ticks |
| Prerequisites | None (start of Military tree) |

**Details:** Applies to Rifle Infantry, Machine Gun Team, Mortar Team, Anti-Tank Infantry, and any infantry variants. The bonus is permanent and applies to all infantry, existing and future.

### Level 2: Armor Plating

| Property | Value |
|----------|-------|
| Effect | +15% defense for all armored unit types |
| Resource cost | 800 steel |
| Base research time | 6 ticks |
| Prerequisites | Small Arms Improvement |

**Details:** Applies to Light Tank, Medium Tank, Heavy Tank (if unlocked), Armored Car, and Self-Propelled Gun. Stacks multiplicatively with other defense bonuses.

### Level 3: Advanced Tactics

| Property | Value |
|----------|-------|
| Effect | +10% attack for ALL unit types (infantry, armor, artillery, naval, air) |
| Resource cost | 600 steel, 400 money, 200 oil |
| Base research time | 8 ticks |
| Prerequisites | Armor Plating |

**Details:** This is the last shared node before the Quality vs Quantity branch. The +10% attack is a universal buff and represents improved officer training and tactical doctrine.

### Branch Choice: Quality vs Quantity

At Level 3 completion, the player must choose ONE branch. The other branch is permanently locked for the rest of the server. This is the single most important strategic decision in the Military tree.

#### Path A: Quality (Levels 4a, 5a, 6a)

**Philosophy:** Fewer, stronger units. Elite forces that dominate in direct combat. Higher per-unit cost, but each unit is worth 2-3 enemy units.

**Level 4a: Heavy Armor**

| Property | Value |
|----------|-------|
| Effect | Unlocks Heavy Tank unit type |
| Resource cost | 1,000 steel, 500 oil, 300 money |
| Base research time | 10 ticks |
| Prerequisites | Advanced Tactics (Path A choice) |

**Heavy Tank stats:** 2x HP, 1.5x attack, 0.7x speed compared to Medium Tank. Costs 3x as much to produce. Devastating in combat but slow and expensive.

**Level 5a: Combined Arms Doctrine**

| Property | Value |
|----------|-------|
| Effect | +20% attack bonus when multiple unit categories (infantry, armor, artillery) fight together in the same battle |
| Resource cost | 800 steel, 600 money, 400 oil |
| Base research time | 12 ticks |
| Prerequisites | Heavy Armor |

**Details:** This bonus applies when at least 2 different unit categories are in the same battle (within 1 hex of each other). 2 categories = +10%, 3 categories = +20%. Stacks with Germany's alignment-specific Combined Arms bonus (a Germany player with this tech gets +20% from tech + 15% from alignment = +35% when all three categories are present).

**Level 6a: Elite Training**

| Property | Value |
|----------|-------|
| Effect | +15% to ALL stats (attack, defense, HP, speed) for units trained AFTER this research completes |
| Resource cost | 1,200 steel, 800 money, 600 oil, 300 copper |
| Base research time | 15 ticks |
| Prerequisites | Combined Arms Doctrine |

**Details:** Only affects newly trained units. Existing units are NOT retroactively upgraded. This creates an incentive to rebuild your army with elite units — which is expensive and time-consuming, but the stat boost is enormous. Elite units are visually distinct (gold rank insignia).

#### Path B: Quantity (Levels 4b, 5b, 6b)

**Philosophy:** More units, faster. Overwhelm through numbers. Lower per-unit cost, faster replacement of losses.

**Level 4b: Mass Mobilization**

| Property | Value |
|----------|-------|
| Effect | -25% training time for all units. -15% resource cost for infantry units. |
| Resource cost | 400 steel, 300 money |
| Base research time | 10 ticks |
| Prerequisites | Advanced Tactics (Path B choice) |

**Details:** Training time reduction stacks with alignment bonuses (USSR's +20% infantry training speed + this -25% = infantry trains ~40% faster than baseline).

**Level 5b: Conscription Doctrine**

| Property | Value |
|----------|-------|
| Effect | Cities automatically generate 1 free Militia infantry stack every 8 ticks. Militia are weaker (-30% all stats vs regular infantry) but cost nothing. |
| Resource cost | 500 steel, 300 money |
| Base research time | 12 ticks |
| Prerequisites | Mass Mobilization |

**Details:** Militia stacks cap at 3 per city. They can leave the city (unlike France's colonial garrison). If destroyed, a new one generates after 8 ticks. Militia benefit from all other research bonuses (including Advanced Tactics' +10% attack).

**Level 6b: Total War Production**

| Property | Value |
|----------|-------|
| Effect | All unit production costs -30%. All unit training times -20% (stacks with Mass Mobilization). Factories can queue 3 units instead of 1. |
| Resource cost | 800 steel, 500 money, 400 oil |
| Base research time | 15 ticks |
| Prerequisites | Conscription Doctrine |

**Details:** This represents total economic mobilization for war. The combined effect of Path B Level 4-6 is: units cost ~40% less and train ~40% faster than baseline. A Quantity player fields 2-3x more units than a Quality player, but each individual unit is significantly weaker.

---

## Economic Research

**Prerequisite building:** Research Lab (any level).

Research in this category improves resource extraction, production efficiency, and infrastructure.

### Tech Tree

```
[1] Improved Mining
         |
[2] Refined Processing
         |
[3] Industrial Logistics
         |
[4] Mass Production
         |
[5] Synthetic Materials
         |
[6] Advanced Chemistry
```

Economic research is a linear chain — no branching.

### Level 1: Improved Mining

| Property | Value |
|----------|-------|
| Effect | +15% extraction rate from all mine buildings |
| Resource cost | 300 steel, 200 money |
| Base research time | 4 ticks |
| Prerequisites | None |

**Details:** Applies to Iron Mine, Copper Mine, Coal Mine, and any future mine types. The extraction rate increase also accelerates field depletion proportionally — you get more resources per tick, but the field runs out faster.

### Level 2: Refined Processing

| Property | Value |
|----------|-------|
| Effect | +10% output from all production chain buildings (Factory, Munitions Plant, Chemical Plant) |
| Resource cost | 400 steel, 300 money |
| Base research time | 6 ticks |
| Prerequisites | Improved Mining |

**Details:** Production chain buildings convert raw resources into processed goods. This bonus means the conversion is more efficient — less waste.

### Level 3: Industrial Logistics

| Property | Value |
|----------|-------|
| Effect | Unlocks Railway construction. Railways allow 2x resource transport speed and 1.5x unit movement speed along their route. |
| Resource cost | 600 steel, 400 money, 200 coal |
| Base research time | 8 ticks |
| Prerequisites | Refined Processing |

**Details:** Railways are built hex-by-hex and require flat or gently rolling terrain. They cannot be built through mountains or swamps. Enemy players can sabotage railways (destroying a segment, requiring repair). Railways are critical for late-game logistics as distances between productive fields and front lines grow.

### Level 4: Mass Production

| Property | Value |
|----------|-------|
| Effect | +25% factory output (all production buildings). -10% unit training time. |
| Resource cost | 800 steel, 500 money, 300 oil |
| Base research time | 10 ticks |
| Prerequisites | Industrial Logistics |

**Details:** The factory output bonus stacks with USA's alignment bonus (+25% from tech + 25% from USA = +50% total factory output). The training time reduction stacks with Military research bonuses.

### Level 5: Synthetic Materials

| Property | Value |
|----------|-------|
| Effect | Unlocks Synthetic Fuel Plant and Synthetic Rubber Plant buildings |
| Resource cost | 1,000 steel, 600 money, 400 oil, 200 coal |
| Base research time | 12 ticks |
| Prerequisites | Mass Production |

**Synthetic Fuel Plant:** Converts coal into oil at a 3:1 ratio (3 coal produces 1 oil). Critical for late-game when oil fields are depleted. Requires coal input — if coal is also scarce, this provides limited relief.

**Synthetic Rubber Plant:** Converts oil into rubber at a 2:1 ratio. Rubber is needed for vehicle tires, aircraft components, and some equipment.

Both buildings require significant steel and money to construct but no ongoing costs beyond raw material input.

### Level 6: Advanced Chemistry

| Property | Value |
|----------|-------|
| Effect | Chemical Plant output +50%. Removes fertilizer/munitions split penalty. |
| Resource cost | 1,200 steel, 800 money, 500 oil, 300 copper |
| Base research time | 15 ticks |
| Prerequisites | Synthetic Materials |

**Details:** Chemical Plants normally must choose between producing fertilizer (boosts farm output) OR munitions (boosts military production). Without this tech, switching production types incurs a 2-tick downtime and 20% output loss for 3 ticks. With Advanced Chemistry, Chemical Plants can produce BOTH simultaneously at full efficiency — a massive economic advantage.

---

## Engineering Research

**Prerequisite building:** Engineering Corps HQ in at least one city.

Research in this category covers geological surveying, construction, fortification, and communications.

### Tech Tree

```
[1] Basic Geology
         |
    ┌────┴────┐
[2] Advanced   [6] Seismic
    Geology        Survey
         |         (requires
[3] Structural  Advanced Geology)
    Engineering
         |
[4] Radio Technology
         |
[5] Advanced Fortification
```

### Level 1: Basic Geology

| Property | Value |
|----------|-------|
| Effect | Enables Geological Survey action. Reveals underground mineral deposits in surveyed hexes. |
| Resource cost | 200 money |
| Base research time | 4 ticks |
| Prerequisites | None |

**Details:** Without this tech, resource fields are only visible when they are on the surface (visible when you explore the hex). Basic Geology lets you survey hexes to reveal hidden underground deposits that require mining to access. Surveying takes 1 tick per hex and requires an Engineering unit to be present.

**Revealed resources:** Iron, Copper, Coal, and base minerals.

### Level 2: Advanced Geology

| Property | Value |
|----------|-------|
| Effect | Deeper geological surveys. Reveals oil deposits and tungsten deposits (not visible with Basic Geology). |
| Resource cost | 400 money, 200 steel |
| Base research time | 6 ticks |
| Prerequisites | Basic Geology |

**Details:** Oil and tungsten are the most valuable late-game resources (oil for vehicles/aircraft, tungsten for advanced weapons). These deposits are always underground and never surface-visible — they MUST be surveyed to discover.

### Level 3: Structural Engineering

| Property | Value |
|----------|-------|
| Effect | +25% HP for all fortification buildings. Unlocks Bridge construction over rivers. |
| Resource cost | 500 steel, 300 money |
| Base research time | 8 ticks |
| Prerequisites | Advanced Geology |

**Details:** Bridges allow units to cross river hexes without the normal movement penalty (rivers cost 2 movement to cross without a bridge, 1 with a bridge). Bridges can be destroyed by enemy action and must be repaired.

**Fortification HP bonus:** Stacks with France's Maginot Doctrine. A France player with Structural Engineering has fortifications with 2x HP (Maginot) * 1.25 (Structural) = 2.5x base HP.

### Level 4: Radio Technology

| Property | Value |
|----------|-------|
| Effect | Unlocks Communications Tower and Radar Station buildings |
| Resource cost | 600 steel, 400 money, 300 copper |
| Base research time | 10 ticks |
| Prerequisites | Structural Engineering |

**Communications Tower:** Extends command range by 3 hexes. Units within command range of a HQ or Comms Tower move faster (+1 hex/tick) and receive +5% morale. Units outside command range suffer -5% morale and cannot receive order changes for 1 tick (communication delay).

**Radar Station:** Reveals all air units within 5-hex radius, even through fog of war. Also provides 1-tick advance warning of incoming air attacks (enemy aircraft are detected before they reach their target). Does NOT reveal ground or naval units.

### Level 5: Advanced Fortification

| Property | Value |
|----------|-------|
| Effect | Unlocks Fortress building. Doubles Wall effectiveness. |
| Resource cost | 800 steel, 500 money, 300 concrete |
| Base research time | 12 ticks |
| Prerequisites | Radio Technology |

**Fortress:** The ultimate defensive structure. Provides +50% defense to garrisoned units, has 3x the HP of a standard Bunker, and includes built-in artillery (can fire at enemies within 2 hexes without a separate artillery unit). Only 1 Fortress per city. Very expensive to build (2,000 steel, 1,000 money, 500 concrete).

**Wall effectiveness:** Walls slow enemy movement into the hex. Base Walls reduce enemy movement by 1 hex/tick when entering. With Advanced Fortification, this becomes 2 hex/tick — effectively halving enemy approach speed.

### Level 6: Seismic Survey

| Property | Value |
|----------|-------|
| Effect | Reveals ALL resources (surface and underground) in a 3-hex radius around surveyed hex. Instant, no Engineering unit required. |
| Resource cost | 500 money, 300 copper |
| Base research time | 15 ticks |
| Prerequisites | Advanced Geology |

**Details:** This is a powerful late-game scouting tool. Instead of surveying hex-by-hex, you can blast a seismic survey that instantly reveals everything in a 3-hex radius. Each survey costs 100 money to perform (ongoing cost per use). Useful for finding the last remaining resource deposits in the endgame.

**Note:** Seismic Survey branches off Advanced Geology, NOT off the main chain. You do NOT need Structural Engineering, Radio Technology, or Advanced Fortification to research this. It's an alternative path for players who want scouting over construction.

---

## Intelligence Research

**Prerequisite building:** Intelligence Center in at least one city.

Research in this category covers espionage, counter-intelligence, deception, and code-breaking.

### Tech Tree

```
[1] Basic Codebreaking
         |
[2] Signals Analysis
         |
[3] Misinformation
         |
[4] Advanced Cryptography
         |
[5] Ultra-level Intelligence
```

### Level 1: Basic Codebreaking

| Property | Value |
|----------|-------|
| Effect | Intelligence Center Level 1 effectiveness +25% |
| Resource cost | 300 money, 100 copper |
| Base research time | 4 ticks |
| Prerequisites | None |

**Details:** "Effectiveness" means the Intelligence Center's ability to intercept enemy communications. At base, a Level 1 center has a 30% chance per tick of intercepting a piece of enemy intel (unit position, resource count, or building status) for each enemy within range. With this tech, that becomes 37.5%.

### Level 2: Signals Analysis

| Property | Value |
|----------|-------|
| Effect | Intercepted intelligence now reveals enemy army compositions (unit types and approximate stack sizes), not just positions |
| Resource cost | 500 money, 200 copper |
| Base research time | 6 ticks |
| Prerequisites | Basic Codebreaking |

**Details:** Without this tech, intelligence intercepts only reveal that "an enemy unit is at hex X." With Signals Analysis, you see "3 Infantry stacks, 1 Armor stack, 1 Artillery stack at hex X" — much more actionable intelligence.

### Level 3: Misinformation

| Property | Value |
|----------|-------|
| Effect | Unlocks Deception operations: Fake Armies and False Radio |
| Resource cost | 400 money, 200 copper, 100 steel |
| Base research time | 8 ticks |
| Prerequisites | Signals Analysis |

**Fake Armies:** Create decoy unit markers on the map that appear real to enemy intelligence. Costs 50 money per decoy per tick to maintain. Decoys are revealed if an enemy unit moves adjacent to them (they see through the deception). Up to 5 active decoys at a time.

**False Radio:** Broadcast false orders that enemy Intelligence Centers may intercept. If an enemy with Level 3+ Intelligence Center intercepts your "orders," they see the false orders instead of your real ones. Costs 100 money per use. Each use has a 60% chance of being believed and a 40% chance of being flagged as suspicious (enemy gets a "[Possibly False]" warning).

### Level 4: Advanced Cryptography

| Property | Value |
|----------|-------|
| Effect | Intelligence Center range +50%. Counter-intelligence detection +15%. |
| Resource cost | 600 money, 300 copper, 200 steel |
| Base research time | 10 ticks |
| Prerequisites | Misinformation |

**Counter-intelligence detail:** When an enemy Intelligence Center attempts to intercept your intel, your counter-intelligence has a base 20% chance of detecting the attempt and providing you with a notification ("Enemy intelligence activity detected in sector X"). With this tech, that becomes 35%. At detection, you also learn the approximate location of the enemy Intelligence Center.

**Range bonus:** Stacks with UK's Intelligence Network alignment bonus. A UK player with this tech has Intelligence Centers at +50% (alignment) + 50% (tech) = +100% range (doubled).

### Level 5: Ultra-level Intelligence

| Property | Value |
|----------|-------|
| Effect | Intercept enemy orders 2 ticks ahead (normally Intelligence Centers can only see 1 tick ahead at Level 3) |
| Resource cost | 1,000 money, 500 copper, 300 steel |
| Base research time | 15 ticks |
| Prerequisites | Advanced Cryptography |

**Details:** This is the pinnacle of the Intelligence tree. Seeing enemy orders 2 ticks ahead means you know where their units will be the tick after next — giving you time to set ambushes, evacuate threatened positions, or redirect your forces.

**Interaction with UK alignment:** UK's Intelligence Network already provides 2-tick interception at Level 3 Intelligence Center. With Ultra-level Intelligence tech, a UK player can see **3 ticks ahead** — an extraordinary advantage. This is intentional: intelligence is UK's defining strength, and this represents the asymmetric payoff of investing fully in their alignment's specialty.

**Counterplay:** False Radio (Misinformation tech) can feed false orders that pollute the intercepted data. Additionally, a player aware they are being monitored can issue no orders (letting units act on standing orders or default behavior), making interception less useful.

---

## Superweapon Branch

Superweapon technologies are endgame investments requiring multiple tech tree prerequisites. They are extremely expensive and time-consuming but can be game-changing.

### V-Rocket Program

| Property | Value |
|----------|-------|
| Prerequisites | Military Research Level 6 (either path) + Engineering Research Level 5 |
| Resource cost | 2,000 steel, 1,500 money, 1,000 oil, 500 copper |
| Base research time | 20 ticks |

**Effect:** Unlocks V-Rocket: a long-range bombardment weapon.

**V-Rocket mechanics:**
- Fired from a V-Rocket Launch Site building (must be constructed after research completes; costs 1,500 steel, 800 money).
- Range: 15 hexes from the launch site.
- Damage: destroys or heavily damages **one random building** in the target city. Does NOT target units directly.
- Accuracy: the specific building hit is random — you cannot choose which building is damaged.
- Cost per launch: 300 steel, 200 oil (represents the rocket itself).
- Cooldown: 3 ticks between launches from the same site.
- Defense: Radar Stations have a 25% chance of detecting an incoming V-Rocket, providing a 1-tick warning (enough to evacuate units from the target city, but buildings cannot be moved). Anti-air units in the target hex have a 15% chance of shooting down the rocket.

### Jet Aircraft

| Property | Value |
|----------|-------|
| Prerequisites | Military Research Level 6 (either path) + Economic Research Level 5 |
| Resource cost | 1,800 steel, 1,200 money, 800 oil, 400 copper |
| Base research time | 20 ticks |

**Effect:** Unlocks Jet Fighter unit type.

**Jet Fighter stats vs Propeller Fighter:**

| Stat | Prop Fighter | Jet Fighter | Advantage |
|------|-------------|-------------|-----------|
| Speed | 4 hexes/tick | 6 hexes/tick | +50% |
| Attack | 40 | 50 | +25% |
| Defense | 20 | 25 | +25% |
| HP | 100 | 120 | +20% |
| Production cost | 300 steel, 200 oil | 600 steel, 400 oil | 2x cost |
| Training time | 3 ticks | 5 ticks | Slower |

**Details:** Jet Fighters are dominant in air-to-air combat but extremely expensive. A player with Jets has air superiority but fewer total aircraft. Prop fighters can still be effective in numbers — 3 prop fighters vs 1 jet is a fair fight.

### Nuclear Research (Scientific Victory)

| Property | Value |
|----------|-------|
| Prerequisites | ALL four research categories at Level 6 |
| Resource cost | 5,000 steel, 5,000 money, 3,000 oil, 2,000 copper, 1,000 coal, 500 tungsten |
| Base research time | 30 ticks |

**Effect:** Completing this research triggers an **immediate Scientific Victory**. The game ends. The researching player wins.

**Details:**
- This is the most expensive and time-consuming research in the game.
- Requires ALL four Level 6 techs — meaning the player must have invested deeply in every research category.
- At 30 base ticks with a single Level 1 lab, this takes 30 ticks. With optimized labs (sum level 6), it takes 5 ticks.
- The massive resource cost means the player must have a strong economy AND haven't been drained by war.
- Other players can see Nuclear Research progress if they have Intelligence Centers in range — this creates urgency to attack the researcher before completion.
- Nuclear Research cannot be paused. Once started, it must be completed or cancelled (50% resource refund on cancellation).
- If the researching player loses all their Research Labs while Nuclear Research is in progress, research is automatically paused. It resumes when a new lab is built, from where it left off.

---

## Research Timing Summary

Total minimum ticks to complete each full tree (with one Level 1 lab):

| Tree | Total Base Ticks | Total with Level 3 Lab | Resource Cost (approximate) |
|------|-----------------|----------------------|---------------------------|
| Military (Path A) | 55 ticks | 19 ticks | ~5,000 steel, ~2,500 money, ~1,500 oil, ~300 copper |
| Military (Path B) | 55 ticks | 19 ticks | ~3,600 steel, ~1,800 money, ~600 oil |
| Economic | 55 ticks | 19 ticks | ~4,300 steel, ~2,800 money, ~1,200 oil, ~500 coal, ~300 copper |
| Engineering | 55 ticks (main chain) | 19 ticks | ~2,800 steel, ~1,800 money, ~600 copper, ~500 concrete |
| Intelligence | 43 ticks | 15 ticks | ~2,800 money, ~1,300 copper, ~600 steel |
| All 4 trees + Nuclear | 208+ ticks | ~70 ticks | Massive |

**Balance note:** Completing ALL research trees requires approximately 70 ticks with optimized labs. On a normal-speed server (1,080 total ticks over 45 days), this is ~6.5% of the server's lifetime — significant but achievable for a player who prioritizes research. The bottleneck is usually resources, not time.

---

## Edge Cases

1. **Research Lab destroyed during active research:** Research pauses. Progress is preserved. Resumes when a new lab is built. No resource loss.

2. **Multiple players research the same tech:** Each player's research is independent. There is no "racing" mechanic — both can complete the same tech.

3. **Alignment bonuses and research:** Alignment bonuses apply to the EFFECTS of research, not the research process itself. Example: USA's +25% factory output applies to Mass Production's +25% factory output bonus, making it +31.25% total for a USA player (+25% * 1.25 alignment multiplier... actually: bonuses are additive, not multiplicative. USA gets 25% from alignment + 25% from Mass Production = 50% total factory output bonus.)

4. **Branch choice regret:** Once you choose Quality or Quantity in the Military tree, the other path is permanently locked. There is no way to switch. Choose wisely.

5. **Captured Research Labs:** If you capture an enemy city with a Research Lab, you get the lab building but NOT their research progress. Your own research continues using the captured lab's level.

6. **Research and bankruptcy:** If you enter bankruptcy Stage 2 (new production halted), active research is NOT halted — it continues. However, you cannot START new research during bankruptcy. Ongoing research runs to completion.

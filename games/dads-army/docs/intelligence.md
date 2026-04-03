# Intelligence System

Source-of-truth design document for the Dad's Army intelligence system. All mechanics, formulas, balance values, edge cases, and cross-system interactions are defined here.

---

## Overview

Intelligence in Dad's Army covers five categories: **Reconnaissance**, **Geological Survey**, **Code Breaking**, **Counter-Intelligence**, and **Deception**. These systems govern what players can see, what they know about opponents, and how they can manipulate that information. In a 20-50 player game on a 999-hex grid over 45 days, fog of war is a major factor. Players who invest in intelligence gain decisive advantages; players who neglect it operate blind.

---

## Intelligence Categories

| Category | Primary Function | Key Structures/Units |
|----------|-----------------|---------------------|
| Reconnaissance | Reveal terrain, units, structures | Scout units, Recon aircraft, Comms Tower, Radar Station |
| Geological Survey | Reveal hidden resources | Engineer (Survey) unit, Research Lab |
| Code Breaking | Reveal enemy positions and orders | Intelligence Center |
| Counter-Intelligence | Detect and disrupt enemy intelligence | Intelligence Center |
| Deception | Feed false information to enemy | Intelligence Center, research |

---

## Reconnaissance

Reconnaissance is the most basic and essential intelligence function. It determines what a player can see on the map.

### Fog of War Baseline

- By default, all hexes are under fog of war (unexplored = black, previously seen but no current vision = grey/stale info, current vision = full info).
- **Stale info**: shows terrain and structures as they were when last seen. Does not show current enemy units or changes. Stale info persists indefinitely.
- **Current vision**: shows real-time terrain, structures, enemy units (type, approximate count), and resource fields. Current vision requires a vision source.

### Vision Sources

#### 1. Owned Hexes and Structures

- Every hex you own (city, town, resource tile) provides vision of itself and **adjacent hexes** (1-hex radius).
- Cities provide **2-hex radius** vision.
- This is passive and permanent as long as you control the hex.

#### 2. Scout Units

Scout units are a subtype of Infantry or a dedicated Recon Vehicle.

**Infantry Scout:**

| Stat | Value |
|------|-------|
| Attack | 3 |
| Defense | 2 |
| HP | 15 |
| Speed | 3 hexes per tick |
| Vision | 1-hex radius around current position + all hexes along movement path |
| Cost | 20 Manpower, 10 Fuel |
| Build Time | 1 tick |
| Upkeep | 1 Fuel, 1 Food per tick |
| Prerequisites | Barracks |

**Recon Vehicle:**

| Stat | Value |
|------|-------|
| Attack | 5 |
| Defense | 4 |
| HP | 25 |
| Speed | 4 hexes per tick |
| Vision | 2-hex radius around current position + all hexes along movement path |
| Cost | 40 Steel, 20 Fuel, 15 Oil |
| Build Time | 2 ticks |
| Upkeep | 3 Fuel, 1 Oil per tick |
| Prerequisites | Barracks, Motor Pool |

**Scout vision rules:**
- Vision is active only while the scout is present. Moving a scout away from a hex causes fog to return after **2 ticks** (a brief "memory" period where the hex remains revealed).
- Scouts moving along a path reveal all hexes they pass through plus their vision radius at each waypoint. This makes fast-moving recon vehicles excellent for sweeping large areas.
- Scouts in enemy territory can be detected by Counter-Intelligence (see below). Detected scouts are revealed to the enemy even if they would otherwise be hidden by fog.

#### 3. Reconnaissance Aircraft

See air.md for full stats. Summary:

- **Range**: 7 hexes from base airfield.
- **Reveal radius**: 3-hex radius around the target point.
- **Duration**: Fog returns 2 ticks after the mission.
- **Submarine detection**: 60% chance per mission over a sea zone.
- **Fragile**: Easily shot down by fighters. Fastest aircraft type (+20% evasion).

Recon aircraft are the longest-range, widest-area vision tool in the game. They are essential for scouting enemy deep territory, naval movements, and identifying strategic bombing targets.

#### 4. Communications Tower

A buildable structure that provides passive, persistent vision.

| Stat | Value |
|------|-------|
| Vision Range | +3 hex radius from tower position |
| Cost | 60 Steel, 30 Concrete, 20 Copper |
| Build Time | 2 ticks |
| HP | 40 |
| Upkeep | 2 Fuel per tick (power) |
| Prerequisites | Research Lab Level 1, "Radio Communications" research |

**Rules:**
- Provides continuous vision (not a one-time reveal). As long as the tower is standing and powered (upkeep paid), it reveals all hexes within 3 hexes.
- Vision from Comms Towers does NOT stack with other Comms Towers. Overlapping coverage simply means the same hex is revealed by two sources (no additional benefit, but redundancy if one is destroyed).
- Can be built on any owned hex (does not require a city).
- Can be destroyed by strategic bombing (1 bombing hit at accuracy usually destroys it given its low 40 HP), ground assault, or artillery bombardment.
- Comms Towers are visible to the enemy if they have vision of the hex. A visible tower is a priority bombing target.

#### 5. Radar Station

An advanced detection structure focused on air and long-range detection.

| Stat | Value |
|------|-------|
| Air Detection Range | 5-hex radius |
| Early Warning | Detects incoming air attacks 2 ticks before they arrive |
| Aircraft Reveal | Reveals all aircraft (type and count) within 5-hex radius |
| Ground Vision | 2-hex radius (lesser than Comms Tower) |
| Cost | 120 Steel, 60 Concrete, 40 Copper, 20 Aluminum |
| Build Time | 4 ticks |
| HP | 60 |
| Upkeep | 4 Fuel per tick (power) |
| Prerequisites | Research Lab Level 2, "Radar Technology" research |

**Rules:**
- **Early Warning**: When enemy aircraft enter the radar's 5-hex detection radius on a mission heading toward hexes within the radar's range, the owning player receives a notification 2 ticks before the aircraft reach their target. This allows time to scramble fighters or evacuate.
- **Aircraft Reveal**: All aircraft (friendly, enemy, neutral) within 5 hexes are revealed with type and count. This includes aircraft in transit (on missions), not just those on the ground.
- **Submarine Detection**: Radar stations on coastal hexes detect submarines in adjacent sea zones with a 30% chance per tick (see naval.md).
- Only one Radar Station per city.
- Radar Stations are high-value targets for strategic bombing and sabotage. Losing a radar station blinds a significant area.
- Radar does NOT detect ground units beyond its 2-hex ground vision. It is specialized for air/naval detection.

### Vision Interaction Table

| Source | Range | Duration | Detects Ground | Detects Air | Detects Naval | Notes |
|--------|-------|----------|---------------|-------------|---------------|-------|
| Owned hex | 1 hex (city: 2) | Permanent | Yes | No | No (coastal: adjacent sea zone) | Baseline |
| Infantry Scout | 1 hex | While present + 2 ticks | Yes | No | No | Cheap, expendable |
| Recon Vehicle | 2 hex | While present + 2 ticks | Yes | No | No | Fast, wider vision |
| Recon Aircraft | 3 hex | Mission + 2 ticks | Yes | Yes | Yes (60% sub detect) | Best coverage, fragile |
| Comms Tower | 3 hex | Permanent (while standing) | Yes | No | Coastal: adjacent zone | Passive, vulnerable |
| Radar Station | 5 hex (air), 2 hex (ground) | Permanent (while standing) | Limited (2 hex) | Yes | Yes (30% sub, coastal) | Air-focused, early warning |

---

## Geological Survey

Geological Survey reveals hidden underground resources on the map. Not all resources are visible on the surface; valuable deposits require surveying to discover.

### Resource Visibility Tiers

| Tier | Resources | Visibility |
|------|-----------|-----------|
| Surface | Wood, Stone, Fertile Soil, Water | Visible to all players without survey |
| Shallow Underground | Iron, Coal, Copper, Bauxite | Requires Basic Geological Survey |
| Deep Underground | Oil, Tungsten, Chromium, Hidden Rich Veins | Requires Advanced Geological Survey |
| Deep Scan | All resources in 3-hex radius, exact quantities | Requires Seismic Survey (endgame) |

### Survey Unit

The Survey unit is a subtype of Engineer. It performs geological surveys on individual hexes.

| Stat | Value |
|------|-------|
| Attack | 1 |
| Defense | 2 |
| HP | 15 |
| Speed | 2 hexes per tick |
| Cost | 30 Manpower, 20 Steel, 10 Fuel |
| Build Time | 2 ticks |
| Upkeep | 2 Fuel, 1 Food per tick |
| Prerequisites | Research Lab Level 2, "Geology" research completed |

**Survey process:**
1. Move the Survey unit to the target hex.
2. Issue the "Survey" order. The unit is immobilized for **2 ticks** while surveying.
3. After 2 ticks, results are revealed to the player.
4. The Survey unit can then move to the next hex and survey again.

**Survey results format:**
- Resource type (e.g., "Iron", "Oil", "Tungsten")
- Approximate reserve: **Low** (10-25% of max field), **Medium** (26-50%), **High** (51-75%), **Rich** (76-100%)
- Exact quantities are NOT revealed (except with Seismic Survey endgame tech).

### Research Requirements

| Research | Prerequisites | Research Time | Effect |
|----------|--------------|---------------|--------|
| Geology | Research Lab Level 2 | 3 ticks | Unlocks Survey unit. Reveals shallow underground resources. |
| Advanced Geology | Geology, Research Lab Level 3 | 5 ticks | Survey unit can detect deep underground resources (Oil, Tungsten, Chromium, hidden rich veins). |
| Seismic Survey | Advanced Geology, Research Lab Level 4 | 8 ticks | Survey unit reveals ALL resources in a **3-hex radius** per survey (instead of single hex). Also reveals exact quantities instead of approximate ranges. Endgame tech. |

### Survey Privacy

- **Survey results are private** to the player who conducted them. Other players cannot see your survey data.
- When a surveyed hex is **developed** (mine, oil well, extraction built), the resource type becomes **public information** (visible to anyone with vision of the hex).
- A player can survey a hex they do not own (if they can move a unit there), gaining knowledge of resources before deciding to capture/claim the hex.
- Alliance members do NOT automatically share survey data. Players must communicate results manually (via diplomacy chat or alliance messaging).

### Edge Cases

- **Surveying an already-developed hex**: Reveals the exact remaining reserves of the resource field (how much is left before depletion). This is useful because resource fields deplete over the 45-day cycle.
- **Surveying an enemy hex**: Possible if your survey unit is physically on the hex (e.g., behind enemy lines or on an unclaimed hex between territories). Results are still private to you.
- **Multiple surveys on the same hex**: Repeating a survey gives the same results unless the hex has changed (resource extracted, field depleted further). No benefit to re-surveying with the same tech level.
- **Survey unit destroyed during survey**: If the unit is killed during the 2-tick survey period, no results are obtained. The survey must be restarted with a new unit.
- **Depleting resource fields**: The 45-day cycle features resource depletion. Fields go from Rich -> High -> Medium -> Low -> Depleted over time as they are extracted. Surveys reflect current state, not original state.

---

## Code Breaking

Code Breaking allows a player to intercept and decode enemy communications, revealing their military positions and orders. This is the most powerful intelligence capability in the game.

### Requirements

- **Intelligence Center** building in a city.
- Intelligence Center must be active (has HP > 0, city is not under siege, upkeep is paid).

### Intelligence Center

| Level | Cost | Build Time | Code Breaking Range | Code Breaking Speed | Counter-Intel Detection | Max Targets |
|-------|------|-----------|--------------------|--------------------|------------------------|-------------|
| Level 1 | 100 Steel, 50 Concrete, 30 Copper | 3 ticks | 5 hexes | 3 ticks to break | 10% per tick | 1 enemy |
| Level 2 | 200 Steel, 100 Concrete, 60 Copper, 20 Aluminum | 5 ticks | 8 hexes | 5 ticks to break | 20% per tick | 2 enemies |
| Level 3 | 400 Steel, 200 Concrete, 120 Copper, 50 Aluminum | 8 ticks | 12 hexes | 8 ticks to break | 35% per tick | 3 enemies |

- **Max Targets**: How many enemy players' codes you can be actively breaking/broken at once. To target a fourth enemy at Level 3, you must abandon progress on one of the current three.
- Only one Intelligence Center per player (across all cities). If destroyed, a new one must be built from scratch. Active code-breaking progress is lost.

### Code Breaking Levels

Each enemy's codes must be broken individually. Breaking takes time and progresses through levels:

| Code Breaking Level | Time to Achieve | Intelligence Gained |
|--------------------|----------------|-------------------|
| Level 1 (Basic Intercept) | 3 ticks of continuous effort | Reveals enemy army positions (unit stacks) within range of your Intelligence Center. Updates each tick. |
| Level 2 (Detailed Intercept) | +5 ticks (8 total) | Reveals enemy army **compositions** within range (unit types, approximate counts, health status). |
| Level 3 (Order Intercept) | +8 ticks (16 total) | Intercepts enemy **movement orders**. You see where their armies are heading **1 tick before they move**. This is game-changing intelligence. |

**Time is cumulative**: Level 2 requires achieving Level 1 first (3 ticks) then an additional 5 ticks. Level 3 requires Level 2 first then an additional 8 ticks. Total: 16 ticks from start to Level 3.

**Range**: Code breaking reveals information only within range of your Intelligence Center. Range increases with Intelligence Center level (5/8/12 hexes). Enemies beyond range are not affected even if their codes are broken.

**Continuous effort**: The code-breaking timer only advances if the Intelligence Center is operational and the target is assigned. If the center is damaged, besieged, or the target is changed, the timer pauses (does not reset unless counter-intelligence intervenes).

### Code Breaking Detection and Reset

- Code breaking can be **detected** by the target's Counter-Intelligence (see below).
- When detected, the target is notified and can **re-encrypt** their codes (spending resources). This fully resets the attacker's code-breaking progress against that target to zero.
- Re-encryption cost: 30 Copper, 10 Aluminum, and 2 ticks of Intelligence Center downtime (the re-encrypting player's center is busy for 2 ticks and cannot perform other intelligence operations during this time).

### Edge Cases

- **Multiple players breaking the same enemy's codes**: Each attacker progresses independently. Breaking Player A's codes does not affect Player B's code-breaking progress against the same target.
- **Alliance sharing**: Code-breaking intelligence is NOT automatically shared with allies. You must communicate findings manually. However, an alliance can coordinate by having different members break different enemies' codes.
- **Intelligence Center destroyed**: All active code-breaking progress is lost. Must rebuild and restart.
- **Target player eliminated**: Code-breaking progress against an eliminated player is wasted. The slot frees up for a new target.
- **Range vs discovery**: You can start breaking an enemy's codes even if you do not currently have vision of any of their units within range. The code-breaking effort proceeds regardless. Once broken, you see whatever is within range (which may be nothing if the enemy has no units nearby).
- **Moving Intelligence Center**: You cannot move the building, but if the city containing it is captured and you build a new one elsewhere, the new center's range is calculated from its new position. All previous progress is lost.

---

## Counter-Intelligence

Counter-Intelligence is the defensive side of the intelligence game. It detects and disrupts enemy intelligence operations.

### Passive Detection (from Intelligence Center)

The Intelligence Center provides passive Counter-Intelligence as long as it is operational:

| Intel Center Level | Detection Chance (per tick) | Detection Range |
|-------------------|---------------------------|-----------------|
| Level 1 | 10% per tick | Detects code-breaking attempts against you |
| Level 2 | 20% per tick | Detects code-breaking + enemy scouts in your territory |
| Level 3 | 35% per tick | Detects code-breaking + scouts + deception operations against you |

**Detection chance** is rolled each tick for each active enemy intelligence operation targeting you.

### Code-Breaking Detection

- Each tick, there is a detection chance (based on your Intel Center level) to detect that a specific enemy is breaking your codes.
- Detection notification: **"Your codes have been compromised by [enemy player name]."**
- Upon detection, you have the option to:
  1. **Re-encrypt** (30 Copper, 10 Aluminum, 2 ticks downtime): Resets the enemy's code-breaking progress to zero. They must start over.
  2. **Ignore**: Save resources but the enemy continues to read your codes. Useful if you know what they know and can use it to feed false info (see Deception).
  3. **Feed false info**: Requires Deception capability (see below). Instead of re-encrypting, you deliberately allow the broken codes to remain while feeding misinformation.

### Scout Detection

At Intelligence Center Level 2+, your counter-intelligence detects enemy scout units **within your territory** (hexes you own or control):

- Detected scouts are revealed on your map, even if they would normally be hidden by fog of war.
- Detection happens automatically each tick for all enemy scouts in your territory.
- Detection chance: 100% for stationary scouts (they are always detected after 1 tick in your territory), 60% for moving scouts (detected as they pass through).
- Detected scouts can be targeted by your military units. An undetected scout in your territory is invisible to your units.

### Deception Operation Detection

At Intelligence Center Level 3, counter-intelligence can detect enemy deception operations:

- **Fake Army detection**: 25% chance per tick to identify an enemy fake army within your vision range. If detected, the fake army is marked as "Suspected Decoy" on your map.
- **Fake Radio Traffic detection**: 20% chance per tick to identify that intercepted enemy signals are false. Notification: "Intelligence suggests [enemy] radio traffic may be deceptive."
- **Double Agent detection**: If the enemy has turned one of your agents, 15% chance per tick to discover the double agent. Once discovered, you can expel or re-turn them (see Deception).

---

## Deception

Deception allows players to manipulate what enemies see and believe. It is the most advanced intelligence capability, requiring significant investment.

### Requirements

- Intelligence Center Level 3
- "Misinformation" research completed

**Misinformation Research:**

| Research | Prerequisites | Research Time | Effect |
|----------|--------------|---------------|--------|
| Misinformation | Intelligence Center Level 3, Research Lab Level 3 | 6 ticks | Unlocks all Deception operations |

### Deception Operations

#### 1. Fake Army

Create a decoy army marker on the map that appears as a real army to enemy scouts, reconnaissance aircraft, and code breakers.

| Stat | Value |
|------|-------|
| Cost to Create | 20 Steel, 10 Fuel, 5 Manpower |
| Upkeep | 3 Fuel per tick |
| Duration | Until destroyed, revealed, or cancelled |
| Limit | 3 active Fake Armies at once |

**Mechanics:**
- A Fake Army appears on the map as a normal army stack to any enemy who has vision of the hex (via scouts, recon, code breaking, etc.).
- The fake army appears as a medium-sized force (composition is chosen by the creating player from a list of plausible configurations, e.g., "5 Infantry, 2 Tanks" or "3 Artillery, 4 Infantry").
- The fake army can be given movement orders. It moves at infantry speed (2 hexes per tick) and appears to move normally on the enemy's map.
- **Revealed as fake if**:
  - An enemy unit moves within **1 hex** of the fake army (close inspection reveals the ruse).
  - An enemy attacks the fake army (combat resolves instantly: the fake army is destroyed with no casualties to the attacker, and the enemy is notified it was a decoy).
  - Enemy counter-intelligence detects it (25% chance per tick at Level 3).
- **Does not reveal as fake if**:
  - Observed only by long-range recon, code breaking, or radar. These sources cannot distinguish fake from real.
  - Observed by scouts beyond 1-hex range.

**Tactical uses:**
- Place fake armies near your front line to make the enemy think you have more forces than you do.
- Move a fake army toward an enemy position to draw their defenders away from your real attack.
- Place fake armies on undefended flanks to deter enemy attacks.

#### 2. Fake Radio Traffic

Generate false radio signals that confuse enemy code breakers.

| Stat | Value |
|------|-------|
| Cost | 10 Copper, 5 Fuel |
| Duration | 3 ticks (then expires automatically) |
| Cooldown | 2 ticks after expiration before it can be used again |
| Limit | 1 active Fake Radio Traffic operation per enemy target |

**Mechanics:**
- Targets a specific enemy player who has broken your codes (Level 1+).
- For 3 ticks, the enemy's code-breaking intelligence shows your armies at **false locations** (you choose where the false positions appear, within reason: they must be on hexes you own or adjacent to your territory).
- The enemy's code-breaking display updates to show the false positions instead of real ones.
- After 3 ticks, the false signals expire and the enemy's code breaking reverts to showing real information.
- Enemy counter-intelligence (Level 3) has a 20% chance per tick to detect the false signals, notifying the enemy that the intelligence may be unreliable.

**Restrictions:**
- Can only be used against an enemy who has broken your codes. If no enemy has broken your codes, there is no one to deceive.
- The false positions must be plausible (within your territory or front-line area). The system does not allow placing false signals on the opposite side of the map from your territory.
- You must know which enemy has broken your codes (requires your counter-intelligence to have detected them first). You cannot use Fake Radio Traffic blindly.

#### 3. Double Agent

When your counter-intelligence detects an enemy spy or code-breaking operation, you can choose to "turn" the enemy's intelligence asset instead of shutting it down.

| Stat | Value |
|------|-------|
| Cost | 30 Copper, 15 Aluminum, 10 Gold (rare resource) |
| Duration | 5 ticks before the enemy realizes |
| Success Chance | 60% (40% chance the turning attempt fails and the enemy is alerted) |
| Limit | 1 active Double Agent per enemy player |

**Mechanics:**
- **Activation**: When your counter-intelligence detects an enemy code-breaking operation, instead of re-encrypting, choose "Turn Agent."
- **Success check**: 60% chance the double agent is successfully turned. On failure (40%), the enemy is notified that you detected their operation AND that you attempted to turn their agent. They can re-encrypt on their side.
- **If successful**: For 5 ticks, the enemy's code-breaking intelligence against you shows **false information** that you control. You choose what they see (same rules as Fake Radio Traffic, but more granular: you can show false army compositions, false movement orders, false construction activity).
- **Discovery**: After 5 ticks, the enemy automatically discovers the double agent. The enemy is notified: "Your intelligence from [your name] has been compromised. Double agent detected." Their code-breaking progress against you resets to zero.
- **Counter-discovery**: Enemy counter-intelligence (Level 3) has a 15% chance per tick to discover the double agent early. If discovered early, the enemy can choose to:
  - **Expel** the double agent: ends the operation, their code-breaking resets.
  - **Re-turn** the double agent: costs them 30 Copper, 15 Aluminum, 10 Gold. 40% success. If they successfully re-turn, they gain accurate intelligence again AND you are unaware for 3 ticks (you think you are still feeding false info, but the enemy is reading the real data).

**Edge cases:**
- Double agents and Fake Radio Traffic do not stack on the same enemy. Only one form of deception at a time per target.
- If your Intelligence Center is destroyed while a double agent is active, the operation ends immediately (the double agent "goes dark"). The enemy is notified of the compromised intelligence.
- If the enemy rebuilds their Intelligence Center, a previously turned double agent is lost (new center, new codes, new personnel).

---

## Intelligence Building Summary

| Building | Level | Cost | Build Time | HP | Key Function |
|----------|-------|------|-----------|-----|-------------|
| Communications Tower | - | 60 Steel, 30 Concrete, 20 Copper | 2 ticks | 40 | +3 hex passive vision |
| Radar Station | - | 120 Steel, 60 Concrete, 40 Copper, 20 Aluminum | 4 ticks | 60 | 5-hex air detection, 2-tick early warning |
| Intelligence Center | 1 | 100 Steel, 50 Concrete, 30 Copper | 3 ticks | 80 | Code breaking (5 hex range), basic counter-intel |
| Intelligence Center | 2 | 200 Steel, 100 Concrete, 60 Copper, 20 Aluminum | 5 ticks | 120 | Code breaking (8 hex range), scout detection |
| Intelligence Center | 3 | 400 Steel, 200 Concrete, 120 Copper, 50 Aluminum | 8 ticks | 180 | Code breaking (12 hex range), deception detection |

---

## Intelligence Research Tree

| Research | Prerequisites | Time | Effect |
|----------|--------------|------|--------|
| Radio Communications | Research Lab Level 1 | 2 ticks | Unlocks Communications Tower |
| Radar Technology | Research Lab Level 2, Radio Communications | 4 ticks | Unlocks Radar Station |
| Geology | Research Lab Level 2 | 3 ticks | Unlocks Survey unit, shallow underground resource detection |
| Advanced Geology | Geology, Research Lab Level 3 | 5 ticks | Deep underground resource detection (Oil, Tungsten, Chromium) |
| Seismic Survey | Advanced Geology, Research Lab Level 4 | 8 ticks | 3-hex radius survey, exact quantities |
| Improved Bombsights | Research Lab Level 2 | 3 ticks | +15% strategic bombing accuracy |
| Precision Bombing | Improved Bombsights, Research Lab Level 3 | 5 ticks | +25% strategic bombing accuracy (replaces Improved Bombsights) |
| Misinformation | Intelligence Center Level 3, Research Lab Level 3 | 6 ticks | Unlocks all Deception operations |

---

## Interactions with Other Systems

### Intelligence + Naval (see naval.md)
- Reconnaissance aircraft detect submarines (60% per mission) and reveal fleet composition.
- Radar stations on coastal hexes detect subs (30% per tick) in adjacent sea zones.
- Code breaking can reveal enemy fleet positions, convoy routes, and naval orders.
- Fake Armies on coastal hexes may deter amphibious landings (enemy thinks the coast is defended).
- Destroying enemy radar stations via naval shore bombardment blinds their coastal detection.

### Intelligence + Air (see air.md)
- Recon aircraft are the primary wide-area intelligence tool (3-hex reveal, 7-hex range).
- Radar stations provide 2-tick early warning for incoming air attacks, allowing fighter scramble.
- Code breaking can reveal enemy bombing targets, allowing preemptive evacuation or fighter positioning.
- Strategic bombing of Intelligence Centers, Radar Stations, and Comms Towers degrades enemy intelligence.
- Deception can cause enemies to bomb fake targets (e.g., fake army draws bombers away from real forces).

### Intelligence + Ground Combat
- Scout units and Comms Towers provide the vision needed for ground maneuvers.
- Code breaking Level 3 (order intercept) reveals where enemy armies are moving 1 tick in advance, allowing ambushes and repositioning.
- Fake Armies can draw enemy forces out of position.
- Counter-intelligence detects enemy scouts in your territory, allowing interception.
- Geological Survey determines where to expand for resources, informing strategic ground objectives.

### Intelligence + Economy
- Geological Survey is the primary mechanism for discovering high-value resource deposits. Players who survey aggressively find Rich deposits before competitors.
- Intelligence buildings (especially the Intelligence Center) are expensive. The Level 3 Intelligence Center costs 400 Steel, 200 Concrete, 120 Copper, 50 Aluminum. This is a major investment.
- Upkeep costs for intelligence structures (Comms Towers, Radar, Intel Center) add up. A full intelligence network might cost 10-15 Fuel per tick in upkeep alone.
- Trade-off: resources spent on intelligence buildings are resources not spent on military units or economic infrastructure. Players must balance intel investment vs military investment.
- Depleting resource fields make geological survey increasingly important as the 45-day cycle progresses. Early-game surveys identify the best deposits; late-game surveys find remaining resources as fields deplete.

### Intelligence + Diplomacy
- Survey results are private and can be shared (or withheld) as a diplomatic bargaining chip. "I know where the Rich Oil deposit is; ally with me and I will share."
- Code-breaking intelligence can be shared with allies to coordinate attacks.
- Deception operations against an enemy are more effective when coordinated with allies (one ally creates the fake threat while the other delivers the real attack).
- Allowing an ally's scouts in your territory (or not) is a trust signal. Counter-intelligence detecting an ally's scouts in your territory might indicate the ally is spying on you.

---

## Balance Notes

- **Reconnaissance is cheap and essential.** Scout units cost almost nothing and Comms Towers are affordable. Every player should invest in basic recon. The game punishes players who operate blind.
- **Code breaking is powerful but slow.** Level 3 code breaking (order intercept) takes 16 ticks (over a third of the 45-day cycle). It is a long-term investment that pays off hugely in the late game. Enemies can counter it by investing in counter-intelligence, creating an arms race.
- **Counter-intelligence is reactive.** It only matters if enemies are actually spying on you. In a 20-50 player game, the question is not "if" but "when" someone breaks your codes. Players who neglect counter-intelligence will be blindsided.
- **Deception is niche but game-winning.** Fake Armies and Double Agents can swing battles by causing enemies to make decisions based on false information. The high resource cost (including rare Gold for double agents) limits spam.
- **Geological Survey has diminishing returns.** Early surveys are highly valuable (finding Rich deposits). Late-game surveys are less impactful as most resources are already claimed or depleted. The Seismic Survey endgame tech is powerful but arrives late.
- **Intelligence Center is a single point of failure.** Only one per player. If destroyed, all active code-breaking progress and deception operations are lost. Protecting your Intelligence Center (AA defense, fortifications, hidden placement) is critical.
- **Radar Stations are disproportionately valuable.** The 2-tick early warning for air attacks can save an entire airfield or factory complex. At 120 Steel to build, they are undercosted relative to their impact. This is intentional: radar should be common, creating a baseline of air detection that makes strategic bombing require planning rather than being a guaranteed surprise.

# Server Lifecycle & Victory

## Overview

Each Dad's Army game plays out on a single server with a fixed 45-day maximum duration. Servers progress through 5 phases driven primarily by resource depletion — the map starts resource-rich and becomes increasingly scarce, forcing conflict and resolution. Victory can be achieved early through domination, economics, or science, or is determined by composite score at day 45.

---

## Server Creation

Servers are created by admins (or automatically by the system on a schedule).

### Server Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| Server name | Any string (max 50 chars) | Auto-generated (e.g., "Theater Alpha #127") |
| Map | European theater (launch map). Future: Pacific, North Africa, Eastern Front. | European theater |
| Max players | 20 - 50 | 30 |
| Min players to start | 8 - max_players | 12 |
| Speed multiplier | 0.5x (slow), 1x (normal), 2x (fast) | 1x |
| Server type | Standard (free), Premium (requires premium subscription), Competitive (entry fee) | Standard |
| Entry fee (competitive only) | $0.99, $1.99, $2.99 | N/A |

### Speed Multiplier Effects

The speed multiplier affects ALL time-based mechanics proportionally:

| Mechanic | 0.5x | 1x | 2x |
|----------|------|-----|-----|
| Tick interval | 2 hours | 1 hour | 30 minutes |
| Server duration | 45 days | 45 days | 45 days |
| Total ticks | 540 | 1,080 | 2,160 |
| Research times | 2x longer (in ticks) | Base | 0.5x (in ticks) |
| Resource depletion | Same rate per tick | Base | Same rate per tick |
| Real-time deadlines (loans, betrayal cooldown) | Unchanged | Base | Unchanged |

**Key:** Speed multiplier means more decisions per real-time day, NOT that the server ends sooner. A 2x server still lasts 45 days but has twice as many ticks — making it more intense and demanding.

### Server Startup Sequence

1. Server is created and enters **"Lobby"** state. Visible to all eligible players.
2. Players join the lobby and select their alignment.
3. Once `min_players` have joined, a 24-hour countdown begins. More players can join during this period.
4. At countdown end (or when `max_players` is reached), the server enters **"Active"** state.
5. Players are assigned starting positions on the map (see Starting Positions below).
6. Tick 1 begins.

### Starting Positions

- Players are distributed across the map with **equal spacing** — no player starts adjacent to another.
- Minimum distance between starting positions: `map_diameter / (num_players * 0.5)` hexes, minimum 8 hexes.
- Each player starts with:
  - 1 Capital city (Level 2, pre-built with basic buildings)
  - 1 Secondary city (Level 1, empty — player chooses what to build)
  - Baseline military units (modified by alignment starting bias)
  - Baseline resource stockpile (modified by alignment starting bias)
  - 3 explored hexes in each direction from capital (7-hex radius of fog cleared)
- Starting positions are randomly assigned but guaranteed to have at least 2 resource fields within 4 hexes.

---

## The 5 Phases

Phases are NOT hard-gated events — they emerge organically from resource depletion and player behavior. The day ranges below are approximate guidelines for a normally-paced server.

### Phase 1: Expansion (Days 1-10)

**Characteristics:**
- Resources are abundant. Nearly all resource fields are untapped.
- Players explore the map, claim unoccupied hexes, and establish borders.
- First cities are built, first resource fields are developed.
- Early skirmishes over prime territory (key river crossings, mountain passes, rich resource clusters).
- Diplomacy is active: players form initial NAPs and trade agreements.

**Resource state:** ~100% of fields are productive. Extraction is just beginning.

**Strategic focus:** Land grab. Secure the best resource tiles. Establish trade routes early for economic advantage.

**Typical events:**
- Border disputes between neighbors
- First NAPs formed
- Scouting and intelligence gathering
- Infrastructure building (roads, rails between cities)

### Phase 2: Peak Production (Days 10-20)

**Characteristics:**
- Most resource fields are claimed and developed to Level 2-3.
- Resource output is at its maximum across the server.
- Players have built substantial armies and navies.
- Major wars begin — the first large-scale conflicts erupt.
- War damage starts degrading some resource fields (combat in a hex can damage the field, reducing output or accelerating depletion).

**Resource state:** ~90-95% of fields are productive. First fields at Level 3+ extraction may show early depletion signs (output begins declining).

**Strategic focus:** Military conquest. Capture enemy cities and resource fields. The player who controls the most production at this stage has a significant advantage going forward.

**Typical events:**
- Full-scale wars between neighbors or alliances
- Alliance formation and consolidation
- First betrayals (players breaking NAPs for territorial gain)
- Economic players racing through research tree

### Phase 3: Decline (Days 20-30)

**Characteristics:**
- First wave of resource fields exhaust completely. Output is noticeably declining.
- New technologies (Synthetic Materials, Advanced Chemistry) partially offset depletion for players who invested in research.
- Resource scarcity creates new conflicts — formerly peaceful players may turn aggressive as their fields dry up.
- Alliance shifts: players switch allegiances to access remaining resources.
- The "haves vs have-nots" dynamic emerges: players who control remaining productive fields are powerful; those whose fields are exhausted are desperate.

**Resource state:** ~60-70% of fields are productive. ~10-15% are fully exhausted. Remaining fields show declining output.

**Strategic focus:** Secure remaining resource fields. Pivot to synthetic production. Renegotiate alliances based on new resource geography.

**Typical events:**
- Resource wars over remaining productive fields
- Alliance restructuring
- Economic players leveraging resource monopolies
- First players risking bankruptcy from war costs + declining income
- Superweapon research begins for science-oriented players

### Phase 4: Scarcity (Days 30-40)

**Characteristics:**
- Most original resource fields are exhausted. Only a few rich deposits remain.
- Military operations are constrained by resource limits — every unit, every shell, every gallon of fuel matters.
- Small-scale, high-stakes battles replace the large-scale wars of Phase 2-3.
- These are the "Stalingrads" of the server: grinding, attritional fights over critical positions.
- Diplomatic activity intensifies — players form desperate alliances, offer lopsided deals for resources.

**Resource state:** ~30-40% of fields are productive. Many players are running on stockpiles and synthetic production.

**Strategic focus:** Conservation. Efficiency. Every decision matters. Waste nothing. Fight only when the objective is worth the cost.

**Typical events:**
- Siege warfare over the last productive resource regions
- Bankruptcy cascades for over-extended players
- Superweapon research nearing completion
- Coalition formation against dominant powers
- Desperate lend-lease agreements

### Phase 5: Resolution (Days 40-45)

**Characteristics:**
- Resources are too scarce for sustained large-scale operations.
- Players are operating on fumes — small stockpiles and trickles from the few remaining fields.
- Victory is determined by current position: territory, military strength, score.
- Final pushes: players make last-ditch offensives to secure victory conditions before day 45.
- Superweapons (V-Rockets, Jet Aircraft, Nuclear Research) may tip the balance.

**Resource state:** ~10-20% of fields are productive. Most players rely entirely on synthetic production and stockpiles.

**Strategic focus:** Win. Score maximization if victory conditions are out of reach.

**Typical events:**
- Final offensives
- Superweapon deployment
- Last-minute diplomatic deals (trading territory for score positioning)
- Server winding down

---

## Resource Depletion Pacing

### Global Calibration

The total resource reserves across the entire 999-hex map are calibrated so that:

- **~70% of all resource fields exhaust by day 35** at normal (average) extraction rates.
- **Intensive extraction** (Level 3 mines, multiple shifts, overwork) accelerates depletion by up to 40%.
- **Sustainable extraction** (Level 1 mines, conservation policies) delays depletion by up to 30%.
- **War damage** to fields accelerates depletion: each combat action in a hex with a resource field has a 15% chance of damaging the field, reducing its remaining reserves by 5%.

### Per-Field Depletion Model

Each resource field has:

```
field = {
    resource_type: "iron" | "oil" | "copper" | "coal" | etc.,
    total_reserves: <number>,      // Set at map generation. Varies by field.
    extracted_total: 0,            // Cumulative extraction over server lifetime.
    extraction_rate: <per_tick>,   // Depends on mine level + tech + alignment bonuses.
    quality: 1.0,                  // Starts at 1.0, decreases as field depletes.
}
```

**Quality degradation:**
```
quality = 1.0 - (extracted_total / total_reserves) ^ 1.5
```

As a field is depleted, its quality drops — meaning each tick of extraction yields fewer resources. This creates a curve where output is strong initially, then gradually declines, then drops sharply near exhaustion.

**Exhaustion:**
When `extracted_total >= total_reserves`, the field is exhausted. The mine building remains but produces nothing. The hex can still be controlled for territory points.

### Asymmetric Depletion

Not all fields are equal:

| Field Size | Total Reserves | Approximate Exhaustion (normal extraction) | Frequency on Map |
|------------|---------------|---------------------------------------------|-------------------|
| Small | 5,000 | Day 15-20 | 40% of fields |
| Medium | 15,000 | Day 25-30 | 35% of fields |
| Large | 40,000 | Day 35-40 | 20% of fields |
| Massive | 100,000 | Never fully exhausted (lasts beyond day 45) | 5% of fields |

The Massive fields are the most contested territory on the server — controlling one provides a resource advantage through the endgame.

---

## Victory Conditions

A player wins immediately upon achieving any of the following. If multiple players achieve conditions in the same tick, priority is: Domination > Scientific > Economic (most difficult to "tie" on Domination).

### Domination Victory

**Condition:** Control **60% of all productive (non-exhausted) resource tiles** simultaneously.

**Details:**
- Only tiles with remaining reserves count. As fields exhaust, the denominator shrinks — making 60% easier to achieve in absolute terms but harder because there are fewer fields to fight over.
- "Control" means the hex is in your territory (your color on the map). Allied hexes do NOT count.
- Checked at the end of each tick.

**Formula:**
```
domination_check = player_productive_tiles / total_productive_tiles
if domination_check >= 0.60:
    trigger_victory("Domination", player)
```

**Edge case:** If resource depletion causes the total productive tiles to drop below 10, Domination victory is disabled (too easy to achieve by accident). Score determines winner.

### Economic Victory

**Condition:** Accumulate **1,000,000 total resources produced** over the server's lifetime.

**Details:**
- This is CUMULATIVE — total resources extracted, manufactured, and traded over the entire server. Not current stockpile.
- All resource types contribute equally (1 iron = 1 oil = 1 money for this calculation).
- Tracked in the `player_stats` table in Supabase.
- Spending resources does not reduce the counter — it only goes up.

**Formula:**
```
if player.lifetime_resources_produced >= 1_000_000:
    trigger_victory("Economic", player)
```

**Balance note:** 1,000,000 is calibrated so that an economically-focused player (USA alignment, full trade network, all economic research) can potentially achieve this by day 35-40. A player not focused on economy should never accidentally reach this threshold.

### Scientific Victory

**Condition:** Complete the **"Nuclear Research"** technology (end of the tech tree).

**Details:**
- Requires ALL four research category Level 6 techs as prerequisites.
- Costs massive resources across all types.
- Takes 30 ticks of dedicated research (at base speed, with one Level 1 lab).
- Realistically achievable by day 35-40 for a player who prioritized research from the start.
- When Nuclear Research completes, that player wins immediately.

**Counterplay:** Other players can see an opponent's research progress if they have sufficient intelligence (Level 3+ Intelligence Center in range). This gives advance warning to attack the scientist before they complete the research.

### Score Victory (Day 45 Tiebreaker)

If no player achieves an instant-win condition by day 45, the player with the highest composite score wins.

**Score formula:**

```
total_score = territory_points + military_points + economic_points + research_points + alliance_bonus

territory_points = controlled_hexes * 10
                 + controlled_cities * 100
                 + controlled_productive_fields * 50

military_points = total_unit_stacks * 5
                + total_unit_hp (across all units) * 0.1
                + enemy_units_destroyed * 15
                + enemy_cities_captured * 75

economic_points = lifetime_resources_produced * 0.01
                + current_resource_stockpile * 0.005
                + trade_routes_active * 25

research_points = techs_completed * 50
                + superweapon_techs_completed * 200

alliance_bonus = alliance_members * 10 (if you are alliance leader)
               + allied_victory_contributions * 0.1 (resources sent to allies who scored well)
```

**Tiebreaker:** If two players have identical scores (extremely unlikely), the player who achieved their current territory first (earliest tick at which they reached their final hex count) wins.

---

## Anti-Stalemate Mechanics

### Asymmetric Depletion

Different fields deplete at different rates (see above). This ensures the resource map is constantly shifting — a player with secure territory today may find their fields exhausted tomorrow, forcing them to expand or negotiate.

### Escalation Tech

Late-game technologies are disproportionately powerful:
- V-Rockets can bombard cities from long range, breaking fortified positions.
- Jet Aircraft outclass all propeller aircraft, making air superiority shifts sudden.
- Nuclear Research ends the game entirely.

This ensures that passive "turtle" strategies have a limited shelf life — eventually, someone researches a counter.

### Rebellion

Undefended provinces (hexes with no military units and no adjacent military units) with **low morale** (below 30%) have a chance of rebelling each tick:

```
rebellion_chance = (30 - province_morale) * 0.01  // Max 30% chance per tick at 0 morale
```

Rebelled provinces become **neutral** — they are no longer controlled by anyone. Neutral provinces can be recaptured by any player (including the original owner) by moving military units into them.

**Morale factors for provinces:**
- Proximity to a friendly city: +10% morale per hex closer (max +50% at the city itself)
- Recent combat in the province: -10% morale per battle in the last 5 ticks
- Bankruptcy: -20% morale (global)
- Long distance from capital: -1% morale per hex beyond 10 hexes from capital

### War Exhaustion

When a player has been in an **active declared war** for more than **15 consecutive ticks** without a ceasefire:

```
war_exhaustion_penalty = (ticks_at_war - 15) * 0.5  // +0.5% morale penalty per tick beyond 15
```

This penalty applies to ALL the player's units globally. It caps at -25% morale (reached at tick 65 of continuous war).

**Resolution:** War exhaustion resets when a peace treaty is signed or the enemy is completely eliminated. A ceasefire of 3+ ticks also resets it.

---

## Server End Sequence

### Victory Declaration

1. When a victory condition is met OR day 45 is reached:
2. All combat immediately pauses.
3. Final scores are calculated.
4. The winner is announced to all players via a server-wide notification.
5. The server enters **"Ended"** state.

### Post-Game

| Feature | Duration |
|---------|----------|
| Final scoreboard | Permanently accessible |
| Battle history replay | Viewable for 30 days |
| Full server statistics | Viewable for 30 days |
| Chat remains active | 7 days (for post-game discussion) |
| Server data archived | After 30 days (removed from active queries, stored in cold storage) |

### Player Rewards

| Placement | Reputation Gain | Competitive Server Prize |
|-----------|----------------|--------------------------|
| 1st place | +10 reputation | 50% of prize pool |
| 2nd place | +5 reputation | 30% of prize pool |
| 3rd place | +3 reputation | 20% of prize pool |
| All others | +1 reputation (participation) | None |

Prize pool (competitive servers only) = entry_fee * num_players. Distributed as account credit.

### New Server Availability

- New servers open on a regular schedule (daily for Standard, weekly for Competitive).
- Players can join new servers immediately — no waiting period.
- Free tier: can only be in 1 active server at a time. Must wait for current server to end.
- Premium tier: can join up to 3 active servers simultaneously.

---

## Edge Cases

1. **Player disconnects/abandons:** If a player is inactive for 72+ hours, their territory enters "AI management" — units hold position, buildings continue operating, but no offensive actions. After 7 days of inactivity, their territory becomes neutral (all hexes rebel, units disband). Diplomatic agreements dissolve without betrayal penalty.

2. **Last player standing:** If all other players abandon/are eliminated and one player remains, they win by default (Domination — they control 100% of productive tiles by default).

3. **Server population drops below minimum:** If active players drop below 4, the server enters "Early End" mode — victory is determined by current score after a 48-hour grace period.

4. **Simultaneous victory conditions:** If Player A achieves Domination and Player B achieves Scientific Victory in the same tick, priority order applies: Domination > Scientific > Economic. Player A wins.

5. **Day 45 score tie:** Extremely unlikely given the granular scoring formula, but if it occurs, the tiebreaker is described above (earliest territory achievement).

6. **Speed multiplier and real-time deadlines:** Loan repayments, betrayal cooldowns, and other real-time deadlines are NOT affected by speed multiplier. On a 2x server, you still have 3 real-time days to repay a loan — but that's 144 ticks instead of 72.

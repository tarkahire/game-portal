# Alliance & Diplomacy System

## Overview

Dad's Army features a layered diplomacy system with 4 ascending tiers of commitment, a reputation system, betrayal mechanics, and a coalition failsafe to prevent runaway leaders. All diplomatic states are game-enforced via Supabase — not honor-system.

---

## Diplomatic Tiers

Tiers are independent but stackable. You can have a Trade Agreement without a NAP, or Military Access without a Full Alliance. However, Full Alliance automatically includes all lower tiers.

### Tier 1: Non-Aggression Pact (NAP)

**What it does:**
- Units belonging to either party **cannot attack each other**. This is hard-enforced by the server — attack commands targeting NAP partners are rejected.
- Does NOT grant vision, trade benefits, or movement rights.
- Either party can break the NAP at any time (see Betrayal Mechanics below).

**Formation:**
- Either player sends a NAP proposal via the diplomacy panel.
- Recipient has 24 hours (real-time) to accept or decline. Proposal expires if ignored.
- Both players are notified on acceptance.

**Breaking a NAP:**
- The breaking player selects "Break NAP" in the diplomacy panel.
- The NAP is dissolved **at the start of the next tick**.
- During that 1-tick window, the breaking player's units CAN attack the former partner, but the former partner's units CANNOT retaliate (attack commands against the breaker are still blocked for that tick). This is the "surprise attack" window — the Operation Barbarossa moment.
- After the surprise tick, both sides can freely attack.
- The breaker suffers all Betrayal penalties (see below).

**Cooldown:** After breaking a NAP, the breaker cannot form any new NAPs or alliances for **5 real-time days**.

### Tier 2: Trade Agreement

**What it does:**
- Resource transfers between the two players incur **no tariff** (normally, sending resources to non-trade-partners costs a 15% tariff — the resources are lost in transit).
- Enables formal **trade routes** between cities (see Economy doc for full trade route mechanics).
- Both players receive +5% passive income from Trade Post buildings while the agreement is active.
- Can exist with or without a NAP. Having a Trade Agreement does NOT prevent combat.

**Formation:**
- Proposal sent via diplomacy panel. Recipient has 24 hours to accept.
- Both players must have at least 1 Trade Post building for the agreement to activate.

**Breaking:**
- Either party can dissolve at any time. Takes effect immediately.
- Active trade routes are cancelled. Resources currently in transit are lost.
- No betrayal penalty for breaking a Trade Agreement alone (it's business, not treachery).

### Tier 3: Military Access

**What it does:**
- Units can move through the ally's territory without triggering defensive fire or trespass penalties.
- Units can use the ally's **ports** (for naval resupply and repair) and **airfields** (extending aircraft operational range).
- Units in ally territory consume supply from the ally's local supply network, not your own — this creates a dependency.

**Troop Stranding Risk:**
- If Military Access is revoked while your units are inside the former ally's territory, those units are **stranded**.
- Stranded units cannot move for 2 ticks (representing logistical confusion).
- After 2 ticks, stranded units must move toward the nearest border hex or face attrition damage (5% HP per tick).
- Ships in ally ports when access is revoked are given 1 tick to leave. If they don't leave, they are **impounded** (removed from your control, returned after 10 ticks or via negotiation).
- Aircraft at ally airfields are grounded for 1 tick, then must return to your own airfields.

**Formation:**
- Requires an existing NAP (you wouldn't let an enemy's troops through your land).
- Proposal includes optional conditions: time limit, specific regions, troop caps.

**Breaking:**
- Either party can revoke at any time. The revoking player does NOT suffer betrayal penalties (access is a privilege, not a pact).
- Stranding mechanics activate immediately.

### Tier 4: Full Alliance

**What it does (all of the above, plus):**
- **Shared vision**: you see everything your ally sees — their units, buildings, and explored territory are visible on your map.
- **Joint attacks**: when your units and ally units attack the same target in the same tick, both forces receive a +10% coordination bonus.
- **Shared war declarations**: when any alliance member declares war, all members are considered at war with the target. Members can opt out, but doing so dissolves their membership.
- **Lend-Lease**: send units (not just resources) to your ally. Lent units are controlled by the recipient but owned by the sender. If the alliance breaks, lent units return to the sender.
- **Alliance chat**: dedicated chat channel visible only to alliance members.

**Formation:**
- Requires existing NAP + Military Access between all parties.
- The proposing player becomes the **Founder** (leader).
- Alliance has a name, tag (3-5 character abbreviation shown next to player names), and optional description.
- Maximum alliance size: 8 players (to prevent one mega-alliance dominating a 20-50 player server).

**Breaking:**
- Any member can leave at any time. Betrayal penalties apply if leaving during an active war where the alliance is engaged.
- Leader can kick members (requires officer majority approval).
- Alliance dissolves if membership drops below 2.

---

## Alliance Structure

| Role | Count | Permissions |
|------|-------|-------------|
| Leader (Founder) | 1 | All permissions. Set alliance policy. Declare war on behalf of alliance. Promote/demote officers. Kick members. Manage alliance settings. |
| Officer | Up to 3 | Invite new members. Accept/reject membership applications. Manage trade and access agreements with non-alliance players on behalf of the alliance. Vote on leader actions. |
| Member | Unlimited (up to cap) | Participate in alliance chat. View shared vision. Benefit from all alliance perks. Vote in officer elections. |

**Leader Overthrow:**
- Officers can call a vote of no confidence.
- Requires **majority of officers** to vote in favor (e.g., 2 of 3).
- If the vote passes, the leader is demoted to Member and the officer who initiated the vote becomes the new Leader.
- Cooldown: overthrow vote can only be called once every 5 days.
- The overthrown leader can leave the alliance without betrayal penalty for 24 hours after being deposed.

---

## Betrayal Mechanics

Betrayal is triggered when a player:
- Breaks a NAP
- Leaves a Full Alliance during an active war
- Attacks an ally (only possible during the 1-tick surprise window after breaking NAP)

**Consequences for the betrayer:**

| Penalty | Duration | Details |
|---------|----------|---------|
| Reputation loss | Permanent (decays over time) | -30 reputation points (see Reputation System) |
| "Betrayer" tag | 10 real-time days | Visible to ALL players on the server next to your name. Cannot be hidden. |
| Morale debuff | 5 ticks | -15% morale to ALL your units. Affects combat effectiveness, movement speed, and desertion threshold. |
| Alliance cooldown | 5 real-time days | Cannot form any new NAPs, Trade Agreements, Military Access agreements, or Alliances. |

**Benefits for the betrayer:**
- 1-tick surprise attack window (NAP break only) — your units can attack the former partner who cannot retaliate.
- Strategic advantage of timing — you choose when hostilities begin.

**Design philosophy:** Betrayal should be a viable but costly strategy. The 1-tick surprise can be devastating (imagine a massed armor assault hitting an unprepared border), but the long-term penalties mean the betrayer is diplomatically isolated afterward. Other players will see the Betrayer tag and be reluctant to form agreements. The morale debuff means the betrayer's forces fight at reduced effectiveness for several ticks — so the surprise attack had better be decisive.

---

## Coalition Mechanic

**Trigger:** When any single player or formal alliance controls **more than 40%** of all hexes on the map, the Coalition option activates.

**How it works:**
1. All players NOT in the dominant player/alliance receive a notification: "Coalition Available against [Player/Alliance Name]."
2. Any eligible player can propose forming the Coalition. Others can join voluntarily — it is not mandatory.
3. Coalition is NOT a full alliance. It is a temporary, purpose-built defensive pact.

**Coalition benefits:**
- **Mutual defense bonus**: +10% combat effectiveness when fighting units belonging to the dominant power.
- **Shared vision against dominant power**: coalition members can see the dominant player's/alliance's units and territory, but NOT each other's (unless they have separate agreements).
- **Coordinated war declarations**: all coalition members are automatically at war with the dominant power. No separate declarations needed.
- **No friendly fire within coalition**: coalition members cannot attack each other while the coalition is active (similar to NAP, but automatic).

**Coalition limitations:**
- Coalition members do NOT share resources, trade routes, or military access automatically.
- Coalition dissolves when the dominant power drops below 35% map control (5% hysteresis to prevent flickering).
- Coalition members can leave at any time without betrayal penalty.
- Only one Coalition can exist per server at a time.

**Edge cases:**
- If the dominant power is an alliance, ALL members of that alliance are targets of the Coalition.
- If a Coalition member's ally is the dominant power, they must choose: leave the alliance to join the Coalition, or stay out.
- If two separate alliances both cross 40%, only the larger one triggers the Coalition. If they are equal, the one that crossed 40% first is the target.

---

## Diplomatic Actions

| Action | Requirement | Effect | Notes |
|--------|-------------|--------|-------|
| Propose NAP | None | Sends NAP proposal to target player | 24h expiry |
| Propose Trade | Both have Trade Post | Sends trade agreement proposal | 24h expiry |
| Propose Military Access | Active NAP with target | Sends military access proposal | 24h expiry |
| Propose Alliance | Active NAP + Military Access | Sends full alliance proposal | 24h expiry. Creates alliance if none exists, or invites to existing. |
| Declare War | None | Formally declares war on target | All your units can now attack them (and vice versa). Cannot declare war on a NAP partner without breaking the NAP first. |
| Request Peace | Active war with target | Sends peace proposal | Can include conditions: territory transfer, resource payment, NAP. |
| Offer Tribute | None | Send resources as a one-time goodwill gesture | No strings attached. Costs you resources. Increases reputation with the recipient. |
| Embargo | None (but requires naval capability to enforce sea routes) | Cut all trade routes with target. Block their sea trade through zones you control. | See Economy doc for enforcement details. Land trade through third-party territory is not affected unless the third party also embargoes. |

---

## Reputation System

**Score range:** 0 to 100. All players start at **50**.

**Reputation changes:**

| Event | Change | Notes |
|-------|--------|-------|
| Betray a NAP | -30 | Stacks with other betrayal penalties |
| Leave alliance during war | -20 | |
| Honor a NAP for 1 day (continuous) | +1 | Passive daily gain for being trustworthy |
| Honor a Full Alliance for 1 day | +2 | More trust = more gain |
| Complete a trade agreement successfully | +1 | Per completed trade route delivery |
| Offer Tribute | +3 | One-time per tribute action |
| Break a Trade Agreement | -5 | Minor penalty — business disputes happen |
| Win a server | +10 | Carried to future servers (see below) |

**Reputation effects:**

| Range | Label | Effects |
|-------|-------|---------|
| 0-15 | Pariah | All diplomatic proposals cost +50% resources as "good faith deposit." Other players see a red warning when you propose anything. AI-controlled neutral cities refuse trade. |
| 16-35 | Untrustworthy | Proposals cost +25% good faith deposit. Betrayer tag duration extended by 5 days. |
| 36-50 | Neutral | No bonuses or penalties. Default state. |
| 51-70 | Reliable | Proposals are 10% more likely to be seen favorably (cosmetic indicator to recipient). Trade tariffs with non-partners reduced to 10% (from 15%). |
| 71-85 | Honorable | Proposals cost no good faith deposit. Alliance members under your leadership get +5% morale. |
| 86-100 | Legendary | All of the above. Your alliance can exceed the 8-player cap by 2 (up to 10). Other players see a gold border on your name. |

**Cross-server reputation:**
- Reputation carries over between servers at a **50% rate**. If you end a server at 80 reputation, you start the next server at 65 (50 base + 50% of the 30 above base).
- This means chronic betrayers develop a lasting negative reputation, while consistently honorable players start with an advantage.
- Reputation is stored in the Supabase `user_profiles` table and updated at server end.

---

## Edge Cases & Rulings

1. **Simultaneous NAP breaks**: If both players break the NAP in the same tick, neither gets the surprise attack bonus. Both suffer betrayal penalties. The NAP is dissolved and both can attack freely next tick.

2. **Alliance war + NAP with enemy's ally**: If you have a NAP with Player B, and your alliance declares war on Player C who is in an alliance with Player B, the NAP with Player B is NOT automatically broken. You and Player B cannot attack each other. However, if Player B's alliance requires shared war declarations, Player B must either break the NAP (suffering betrayal penalties) or leave their alliance.

3. **Lend-Lease units during betrayal**: If you betray an ally and you have lent them units, those units are immediately returned to your control (teleported to your nearest city). If THEY lent YOU units, those units are frozen for 1 tick then returned to the lender.

4. **Reputation overflow/underflow**: Reputation is clamped to 0-100. Cannot go negative or above 100.

5. **Inactive players and diplomacy**: If a player is inactive for 48+ hours, their diplomatic agreements remain in force but they cannot accept new proposals. After 72 hours of inactivity, their NAPs and alliances auto-dissolve without betrayal penalty (recognized as abandonment, not betrayal).

6. **Solo players vs alliances**: Solo players with no active agreements get a +5% "lone wolf" combat bonus to partially offset the coordination advantages of alliances. This bonus is lost the moment they enter any diplomatic agreement.

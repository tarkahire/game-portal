# Debt, Banking & Trade

## Overview

The economy in Dad's Army is designed to create interdependence, leverage, and conflict. Resources are finite (fields deplete over the 45-day server), so economic management is as important as military strategy. This document covers the financial systems layered on top of the base resource model: loans, lending, bankruptcy, trade routes, embargoes, and war bonds.

For base resource types and extraction, see the main game design document.

---

## NPC Bank (System Loans)

The NPC Bank is a game system — not a player-controlled entity. Any player can borrow from it at any time, subject to limits.

### Loan Terms

| Loan # | Interest Rate (per day) | Notes |
|--------|------------------------|-------|
| 1st active loan | 5% per day | Manageable if used for productive investment |
| 2nd active loan | 10% per day | Expensive — should only be used in emergencies |
| 3rd active loan | 20% per day | Crushing — taking a 3rd loan is a desperation move |

"Active loan" means a loan that has not yet been fully repaid. If you repay your 1st loan entirely, the next loan you take is again a 1st loan at 5%.

### Maximum Loan Amount

```
max_loan = current_territory_count * 500
```

- `current_territory_count` = number of hexes you currently control.
- Resources are denominated in a composite "resource units" for loan purposes (converted from individual resource types at market rates).
- Example: a player controlling 20 hexes can borrow up to 10,000 resource units per loan.
- The max is recalculated at the time of each loan request. If you lose territory, your max drops — but existing loans are NOT recalled.

### Repayment Schedule

- Repayment is due **every 3 real-time days**.
- Each payment = (principal / total_payments) + accrued_interest.
- Total payments = loan_duration / 3 days. Default loan duration is 15 days (5 payments).
- Interest accrues daily on the remaining principal.

**Example:**
- Borrow 10,000 at 5%/day for 15 days.
- Day 3 payment: 2,000 principal + 1,500 interest (5% * 10,000 * 3 days) = 3,500.
- Day 6 payment: 2,000 principal + 1,200 interest (5% * 8,000 * 3 days) = 3,200.
- And so on, decreasing as principal is repaid.

### Early Repayment

- Players can repay loans early at any time with no penalty.
- Interest stops accruing immediately upon full repayment.

---

## Player-to-Player Lending (Lend-Lease)

Players can send resources to each other in two modes:

### Gift Mode

- One-way transfer. No repayment expected or enforced.
- Subject to tariff (15% lost in transit) unless a Trade Agreement exists between the players.
- Common uses: supporting a weaker ally, bribing a neutral player, tribute to avoid war.

### Loan Mode

- Sender specifies: amount, interest rate, repayment schedule (interval and number of payments).
- Recipient must accept the loan terms explicitly.
- Once accepted, repayment is **game-enforced** — the system automatically deducts payments from the borrower's resource stockpile on the scheduled dates.
- If the borrower cannot pay (insufficient resources), it counts as a missed payment (see Bankruptcy below).

**Player Loan Parameters:**

| Parameter | Range | Default |
|-----------|-------|---------|
| Interest rate | 0% - 50% per day | Set by lender |
| Repayment interval | 1 - 10 days | 3 days |
| Number of payments | 1 - 15 | 5 |
| Collateral (optional) | Territory hexes | None |

**Collateral:** The lender can request territory hexes as collateral. If the borrower defaults (3 consecutive missed payments), those hexes automatically transfer to the lender. The borrower must own the hexes at the time of the loan and they are "locked" — cannot be voluntarily transferred or abandoned while the loan is active.

**Economic leverage:** A player who lends heavily to multiple players effectively controls them. If a lender calls in debts or threatens to, the borrower faces bankruptcy. This creates political dynamics — economic empires can be as powerful as military ones.

---

## Bankruptcy Cascade

Bankruptcy is triggered by consecutive missed loan payments (NPC or player loans). The cascade is progressive and devastating.

### Stage 1: Warning (1st missed payment)

| Effect | Value |
|--------|-------|
| Morale penalty | -5% to all units |
| Construction speed | -20% |
| Notification | All players on the server see "[Player] has missed a loan payment" |

- The player has until the next payment date to make up the missed payment PLUS the current payment.
- If they pay both, the warning status clears.

### Stage 2: Distress (2nd consecutive missed payment)

| Effect | Value |
|--------|-------|
| Morale penalty | -15% to all units (replaces Stage 1 penalty) |
| Unit attrition | All units take 3% HP damage per tick (starvation, low supplies) |
| New production | Halted — cannot train new units or construct new buildings |
| Existing construction | Paused (timers frozen) |
| Trade routes | Incoming trade continues, but outgoing trade frozen (creditors seize exports) |

- The player can still fight with existing units, but they are weakening every tick.
- Other players see "[Player] is in financial distress" — a signal that they are vulnerable.

### Stage 3: Full Bankruptcy (3rd consecutive missed payment)

| Effect | Value |
|--------|-------|
| Unit desertion | Every tick, each unit stack has a 10% chance of disbanding entirely |
| Naval recall | All ships automatically return to nearest friendly port. They cannot sortie until bankruptcy ends. |
| Aircraft grounded | All aircraft grounded at their current airfields. Cannot fly. |
| Building decay | All buildings lose 5% HP per tick. If a building reaches 0 HP, it is destroyed. |
| Collateral seizure | Any hexes pledged as collateral transfer to the lender immediately. |
| Reputation | -10 reputation |

### Recovery from Bankruptcy

- Bankruptcy ends when your **resource balance returns to positive** — meaning your per-tick income exceeds your per-tick expenses (loan payments, unit upkeep, building maintenance).
- All outstanding loans are restructured: interest rates halved, payment intervals doubled. This is an automatic "bailout" to make recovery possible.
- Even after recovery, the effects don't instantly clear:
  - Morale penalty reduces by 5% per tick (gradual recovery).
  - Building construction resumes but at -10% speed for 10 ticks.
  - Units that deserted are permanently lost.

### Bankruptcy Edge Cases

1. **Bankrupt player is attacked:** They can still defend. Units fight at reduced morale but are not forcibly surrendered. War does not pause for bankruptcy.

2. **Bankrupt player in an alliance:** Alliance members receive a notification. The alliance leader can choose to bail out the bankrupt member (gift resources) or kick them. Bankrupt members cannot participate in shared war declarations.

3. **Multiple players bankrupt simultaneously:** Each is handled independently. If Player A owes Player B and both are bankrupt, the system prioritizes NPC bank debt over player debt.

4. **Bankruptcy during a lend-lease:** Lent units (from the Diplomacy system) are recalled to the lender if the borrower goes bankrupt at Stage 3.

---

## Trade Routes

Trade routes are the physical mechanism for resource transfer between players with a Trade Agreement.

### Establishing a Route

1. Both players must have a Trade Agreement (Tier 2 diplomacy).
2. Player A designates a source city and Player B designates a destination city.
3. The game calculates the shortest safe path between the two cities using roads, rails, or sea lanes.
4. Both players must agree to the route and the exchange terms (what resources, what rate, how often).

### Route Properties

| Property | Details |
|----------|---------|
| Path | Calculated along roads/rails (land) or sea lanes (naval). Displayed on the map as a dotted line. |
| Travel time | Proportional to distance. Base speed: 1 hex per tick (road), 2 hexes per tick (rail), 1.5 hexes per tick (sea). |
| Capacity | Each route can carry up to 1,000 resource units per shipment. Multiple routes can exist between the same cities. |
| Frequency | Set by players: every 1, 2, 3, or 5 ticks. |
| Protection | Trade convoys have no combat ability. They must be protected by military units or they are vulnerable to interception. |

### Interception

- Enemy players (anyone at war with either trade partner) can intercept trade convoys.
- A military unit occupying any hex along the trade route will automatically intercept convoys passing through.
- Intercepted convoys: resources are captured by the intercepting player (they receive 75% of the shipment; 25% is destroyed/lost).
- Interception triggers a notification to both trade partners.
- Trade routes can be rerouted to avoid intercepted hexes, but this increases travel time.

### Trade Post Bonus

- Trade Post buildings in cities increase trade income.
- Each Trade Post generates a **+5% bonus** on all trade route income passing through that city.
- A city with a Level 3 Trade Post generates +15% bonus.
- Both source and destination city Trade Posts apply (bonuses stack).

---

## Embargoes

Embargoes are economic warfare — cutting off a player's trade.

### Declaring an Embargo

- Any player can declare an embargo against any other player via the diplomacy panel.
- Effect: all your trade routes with the target are immediately severed.
- This alone is limited in impact (they just lose your trade). The real power comes from **naval enforcement**.

### Naval Enforcement

- If you control sea zones (hexes) that a target player's trade routes pass through, your naval units in those hexes will **blockade** those routes.
- Blockaded trade routes are severed — no resources pass through.
- The blockading player's naval units must physically be present in the sea hexes. Moving them away lifts the blockade.
- Multiple players can coordinate embargoes for a full economic blockade.

### Embargo Limitations

- Land trade routes through third-party territory cannot be blocked by an embargo unless the third party also declares an embargo.
- Embargoes do not affect gift/loan transfers (those are point-to-point, not route-based). However, gifts still suffer the 15% tariff if no Trade Agreement exists.
- An embargo has no direct reputation impact, but the target player will obviously consider it a hostile act.

### Counter-Embargo Strategies

- Reroute trade through different sea zones.
- Negotiate with third-party players for land transit rights.
- Build Synthetic resource buildings to reduce trade dependence.
- Military action to break the naval blockade.

---

## War Bonds

A wartime financing mechanism.

### Mechanics

- Can only be issued while you are in an **active declared war**.
- Issuing war bonds generates an immediate lump sum of resources.
- In exchange, you must repay the bond amount + interest over time (similar to NPC loans).

### War Bond Terms

| Parameter | Value |
|-----------|-------|
| Amount | Up to current_territory_count * 300 (lower limit than NPC loans) |
| Interest rate | 8% per day (fixed, regardless of how many bonds you have) |
| Repayment | Begins 5 days after issuance (grace period for wartime use) |
| Repayment schedule | Every 3 days, over 12 days (4 payments) |
| Limit | Max 2 active war bond issues at a time |

### War Bond Edge Cases

- If the war ends (peace declared) before bonds are repaid, the repayment continues. You still owe the money.
- War bonds count as loans for bankruptcy cascade purposes. Missing a war bond payment triggers the same stages as missing an NPC loan payment.
- War bonds can be issued while you already have NPC loans. However, the combined debt load makes bankruptcy more likely.
- War bonds cannot be transferred or sold to other players.

---

## Resource Market (Future Phase)

This system is planned for post-launch implementation.

### Concept

- A global marketplace visible to all players on a server.
- Players post **buy orders** (I want X resource at Y price) and **sell orders** (I have X resource, selling at Y price).
- Orders are matched automatically when a buy price meets or exceeds a sell price.
- Resources are transferred instantly upon match (no physical trade route — market abstracts logistics).
- A 5% transaction fee is deducted (goes to the "bank" — removed from the economy as a resource sink).

### Price Dynamics

- Prices fluctuate based on supply and demand across the server.
- If many players are selling iron and few are buying, iron prices drop.
- If oil fields are depleting and everyone needs oil, oil prices spike.
- Price history is visible as a chart — players can speculate and time their trades.

### Market Manipulation

- Players with large resource stockpiles can manipulate prices: buy up all of a resource to create artificial scarcity, then sell at inflated prices.
- This is intentional — economic warfare is a valid strategy.
- Counter: other players can coordinate to undercut manipulators, or use Synthetic resource buildings to reduce dependence on the market.

---

## Economic Formulas Summary

```
NPC Loan Interest:
  total_interest = principal * daily_rate * days_held
  daily_rate = 0.05 (1st loan) | 0.10 (2nd) | 0.20 (3rd)

Max NPC Loan:
  max_loan = territory_count * 500

Max War Bond:
  max_bond = territory_count * 300

Trade Route Travel Time:
  ticks = distance_in_hexes / speed
  speed = 1.0 (road) | 2.0 (rail) | 1.5 (sea)

Trade Post Bonus:
  bonus = trade_post_level * 0.05  (5% per level)
  total_bonus = source_bonus + destination_bonus

Tariff:
  tariff_rate = 0.15 (no Trade Agreement) | 0.00 (Trade Agreement active)
  resources_received = resources_sent * (1 - tariff_rate)

Bankruptcy Attrition (Stage 2):
  unit_hp_loss_per_tick = max_hp * 0.03

Bankruptcy Desertion (Stage 3):
  desertion_chance_per_unit_per_tick = 0.10

Building Decay (Stage 3):
  building_hp_loss_per_tick = max_hp * 0.05
```

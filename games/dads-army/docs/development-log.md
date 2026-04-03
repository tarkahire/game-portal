# Development Log — Dad's Army

A chronological record of what was built, decisions made (and why), problems encountered, solutions found, and lessons learned. This journal exists so that building v2 (or a new game) can benefit from everything learned in v1.

---

## 2026-04-03 — Project Kickoff

### What happened
- Created the Dad's Army game concept: persistent WW2 strategy game with depleting resource fields, 999-hex map, 45-day server cycles
- Established the full project documentation framework (Phase 0)
- Chose Supabase as the backend (user has a paid account)
- Chose vanilla JS + Canvas for frontend (consistent with rest of game portal)

### Key decisions made

**1. Resource depletion as core mechanic**
Why: Most persistent strategy games (Supremacy 1914, Tribal Wars, Travian) have infinite resources, which means they need artificial win conditions. Depleting resources creates natural server progression — the world itself is the timer. Players who manage resources sustainably outlast those who don't. This emerged from researching Factorio's ore patch depletion and Anno's fertility systems.

**2. Field battles vs City battles — dual combat dynamic**
Why: Separating resource control from city control creates strategic depth. Players must decide: attack the fortified city, or raid the exposed resource fields? Weaker players can harass stronger ones through guerrilla field raids. This also means war damages the very things you're fighting over (resource fields), creating a genuine dilemma.

**3. Cities on depleted resource tiles**
Why: As fields deplete, the map evolves. Exhausted fields can become city sites (with quality penalties). This prevents dead tiles accumulating and keeps the map dynamic. Land quality penalties ensure pristine disused land remains premium.

**4. 999 hex tiles (not provinces)**
Why: Province-based maps (like Supremacy 1914) work at 100-200 provinces but 999 provinces would be too dense. Hex grid gives granularity for individual resource fields, standalone structures, and tactical positioning.

**5. 45-day server max**
Why: Persistent strategy games often die slowly as dominant players grind out remaining opponents. A hard time limit ensures every server has a conclusion. 45 days is long enough for deep strategy but short enough to stay exciting.

**6. WW2 only (for now)**
Why: Trying to build a multi-era system from day 1 would explode scope. WW2 gives the richest set of mechanics (land, sea, air, intel, economy). Future eras noted in future-vision.md for later.

**7. Pay-to-play, not pay-to-win**
Why: Competitive integrity is the game's core value proposition. Players must trust that skill and strategy determine outcomes. Revenue from subscriptions and cosmetics, never gameplay advantages.

**8. Supabase over custom backend**
Why: pg_cron handles game ticks, PostgreSQL is ideal for relational game data, built-in auth saves months, Realtime subscriptions for live updates. If we outgrow it, we can migrate (it's standard Postgres). User already has a paid account.

**9. Comprehensive documentation before code**
Why: A game this complex needs clear design docs as source of truth. Every system (resources, combat, naval, air, intelligence, diplomacy, economy, fortifications, etc.) gets its own detailed doc. This prevents scope creep, enables consistent implementation, and allows future developers (or AI agents) to understand the system without reading all the code.

### Lessons (early)
- The research phase (WW2 resources, game mechanics from existing games) was invaluable. Real historical constraints (Germany's oil crisis, Japan's rubber dependency, USSR's food crisis) directly inspired game mechanics.
- Nation alignments based on real military doctrines feel authentic and create genuinely different playstyles.
- The troop stranding mechanic (supply cut → attrition cascade) adds strategic depth that most browser strategy games lack.

---

*More entries will be added as development progresses.*

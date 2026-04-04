# Project Playbook — How This Build Was Structured

A record of every structural decision, instruction pattern, and workflow that shaped this project. Use this as a template for future builds — it captures what worked, what was requested, and how to communicate effectively with AI agents from day one.

---

## 1. How the Project Was Initiated

### The opening request
The user started with a broad creative vision, not a technical spec:
> "I want to explore the idea of a city builder army style game, similar to age of empires, civilization and cossacks... with an online presence with a login and army building element... resource type gathering... continuous game, based on strategems, war 2 glory and supremacy 1914"

**What worked**: Naming specific reference games gave immediate context. Saying "continuous game" and "online presence with a login" set the technical direction (persistent server, auth, database) without needing to specify the tech.

**Lesson for future builds**: Start with the games/products you're inspired by + the 3-4 key differentiators. Don't start with tech specs — let the research phase inform those.

### The research phase
Before any code, three research agents ran in parallel:
1. WW2 resources and logistics (historical accuracy for game mechanics)
2. Resource field mechanics in existing games (Factorio, Travian, Anno, Civ, etc.)
3. Nation alignment, naval/air mechanics, alliances, debt systems

**What worked**: Deep research BEFORE design produced mechanics grounded in reality (Germany's oil crisis → oil as most contested resource, Factorio's depletion → field lifecycle system).

**Lesson**: Always research before designing. Give agents specific questions, not vague topics. "How does Factorio handle ore depletion?" beats "research resource systems."

---

## 2. How Scope Was Communicated

### The iterative refinement pattern
The user didn't dump all requirements at once. Instead, they built up through conversation:

1. **First pass**: Broad vision (city builder + army + resources + online)
2. **Plan presented**: Architecture, tech stack, phased development
3. **User feedback**: "WW2 must be the only theme... maps bigger, 999 spaces... resource fields need crop rotation... field battles vs city battles..."
4. **Second plan**: Incorporated all feedback
5. **More feedback**: "Cities can be built on fields past a threshold... different fortification types... standalone structures outside cities... 45-day server max... pay to play not pay to win..."
6. **Final plan**: Approved

**What worked**: Each round added specificity without losing the original vision. The user corrected course early (WW2 only, not multi-era) before code was written.

**Lesson**: Don't try to specify everything upfront. Present a plan, then refine through 2-3 feedback rounds. Each round should ADD detail, not restart.

### Key phrases that drove design
These specific user statements shaped major mechanics:

| User said | What it became |
|-----------|---------------|
| "resource fields will be really important" | Resource fields as the strategic core, separate from cities |
| "fields can be used for different things" | Field lifecycle: productive → declining → exhausted → repurposed |
| "land that starts fertile but if too much war happens, it reduces yield" | War damage mechanic (permanent yield reduction) |
| "exhausted fields will be disusable, allowing for % of successful city building" | Cities on depleted fields with land quality penalties |
| "keeping the game from becoming stale" | 45-day server cycle with depletion-driven progression |
| "pay to play, avoids pay to win model" | Cosmetics-only monetization, competitive integrity rule |
| "different types of fortifications" | Tiered fortifications: field, city, coastal with specific types (AA, AT, mines) |
| "structural abilities outside of cities" | 13 standalone structures (airstrips, depots, comms towers, etc.) |
| "if that ally has their city taken after you refuel, then your troops would not be able to return" | Troop stranding mechanic with attrition cascade |
| "debt management and borrowing" | NPC bank loans + player lending + bankruptcy cascade |

**Lesson**: Specific scenarios ("if ally's city falls, troops are stranded") produce better mechanics than abstract requirements ("add supply lines"). Paint pictures of gameplay moments.

---

## 3. Documentation-First Approach

### The documentation request
After the plan was approved, the user requested:
> "I need a full documented process throughout the whole development cycle. We need a claude.md file... setup.md... todo.md... bug.md... test.md which references agent.md... an MD file dedicated to every facet of the game... a future vision md file... the ability to document all of the process so if we wish to make a version 2, we need the ability to go back and learn."

**What was created (Phase 0, before any code)**:
- `CLAUDE.md` — Master reference (<200 lines, indexes everything)
- `setup.md` — Infrastructure setup guide
- `todo.md` — Phased feature tracker
- `bug.md` — Bug reporting template + tracker
- `test.md` + `agent.md` — Test methodology + AI agent testing playbook
- 16 game system docs (one per facet: resources, combat, cities, etc.)
- `future-vision.md` — Aesthetics, mechanics, platform roadmap
- `development-log.md` — Process journal for v2 reference
- `architecture.md` — Technical deep-dive

**What worked**: Having all docs BEFORE code meant:
- Every system had a source-of-truth reference
- Bugs could be logged against documented expectations
- Multiple agents could work in parallel with consistent terminology
- The v2 learning process started from day one

**Lesson**: For any project this complex, create the full documentation framework before writing code. The CLAUDE.md should be under 200 lines and point to everything else. Each game system gets its own doc.

---

## 4. How Agents Were Used

### Parallel research agents (3 simultaneous)
Used at project start for deep research:
1. WW2 strategic resources and logistics
2. Resource field mechanics in existing games
3. Nation alignment, naval/air, alliances, debt

**Why it worked**: Each agent had a specific research focus with concrete questions. Results were synthesized into the design plan.

### Parallel documentation agents (2-3 simultaneous)
Used to write game system docs:
- Agent 1: resources.md, map.md, cities.md, combat.md
- Agent 2: military.md, fortifications.md, structures.md, supply-lines.md
- Agent 3: naval.md, air.md, intelligence.md, diplomacy.md, economy.md, alignments.md, server-lifecycle.md, research-tree.md, monetization.md

**Why it worked**: Each agent got the full game context + specific systems to document. They worked independently and produced consistent results.

**What went wrong**: Agents used different column names for the same concepts (`owner_id` vs `player_id`), causing 5+ bugs during integration. Lesson: establish naming conventions BEFORE splitting work across agents.

### Parallel code agents (2 simultaneous)
Used for SQL schema + seed data:
- Agent 1: SQL migrations 001-007 (schema)
- Agent 2: RLS policies + RPC functions (008-009)
- Agent 3: Seed definitions + server generation

**What went wrong**: Same naming inconsistency problem. The schema agent used `player_id`, the function agent used `owner_id`, and the seed agent used `cost` instead of `train_cost`. Required significant debugging.

**Lesson for future builds**: When splitting code generation across agents, ALWAYS provide a shared data dictionary:
```
cities.player_id (NOT owner_id)
armies.player_id (NOT owner_id)
tiles.owner_id (this one IS owner_id)
unit_defs.train_cost (NOT cost)
army_units.hp_percent (NOT avg_hp_percent)
```

---

## 5. How Bugs Were Handled

### The bug documentation pattern
Every bug was logged in `bug.md` with:
- Sequential ID (BUG-001, BUG-002, ...)
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- Steps to reproduce
- Expected vs actual behavior
- Fix notes explaining root cause and resolution

### Bugs that could have been prevented

| Bug | Root cause | Prevention |
|-----|-----------|------------|
| BUG-002/003: Column name mismatches | Agents used different names | Shared data dictionary before agent work |
| BUG-004: Wrong hex spiral directions | Ring walk vs neighbor directions confused | Unit test the first ring before generating 999 tiles |
| BUG-005: Seed column mismatches | Seed agents didn't see final schema | Generate seeds AFTER schema is deployed, not in parallel |
| BUG-008: Non-existent player_count column | Query assumed computed column was stored | Verify queries against actual schema before deploying |
| BUG-010: sort_order column doesn't exist | Agent assumed ordering column | Same as above |
| BUG-011: align.key vs align.id | Frontend assumed different property name | Single source of truth for API response shapes |

**Lesson**: Most bugs came from parallel agent work with inconsistent assumptions. For future builds: generate schema first, verify it's deployed, THEN generate functions/seeds/frontend queries against the actual deployed schema.

---

## 6. How the Auto-Documentation System Was Requested

### The request
> "Write a script that auto detects and determines every chat we have, use agents to help you write the auto-script, apply after each change, to self determine where we need to document"

**What was built**:
1. `doc-map.json` — Maps code paths → documentation files (39 rules)
2. `doc-audit.sh` — Shell script that analyzes git changes and reports which docs need updating
3. CLAUDE.md — Mandatory documentation process (5 steps)
4. Stop hook — Runs audit automatically after every Claude Code response

**Lesson**: Build the documentation system EARLY (we built it after 11 bugs). If it existed from the start, it would have caught documentation gaps as they happened.

---

## 7. Structural Requests Log

A chronological record of every structural/process request the user made. Use this to inform how you set up future projects from day one.

### 2026-04-03
1. **"Create a new folder called dads-army"** — Project directory created
2. **"Explore the idea of a city builder army style game"** — Research phase initiated with 3 parallel agents
3. **Plan mode requested** — Full game design plan created with architecture, file structure, database schema, phased development
4. **"WW2 must be the only theme"** — Scope narrowed, future eras noted but not planned
5. **"Maps bigger, 999 spaces"** — Hex grid chosen over provinces for granularity
6. **"Resource fields, crop rotation, exhausted fields"** — Core depletion mechanic designed
7. **"Field battles vs city battles"** — Dual combat dynamic designed
8. **"Cities on depleted fields with penalties"** — Land quality system designed
9. **"Different fortification types"** — Tiered fortification system (field, city, coastal)
10. **"Standalone structures outside cities"** — 13 structure types designed
11. **"45-day server max"** — Server lifecycle with depletion-driven progression
12. **"Pay to play not pay to win"** — Monetization model locked down
13. **"Full documented process throughout development cycle"** — Phase 0 documentation framework created (27 files)
14. **"CLAUDE.md under 200 lines, references everything"** — Master index pattern established
15. **"agent.md for testing — agent knows how to test mechanics on its own"** — AI testing playbook created
16. **"development-log.md for v2 learning"** — Process journal pattern established

### 2026-04-04
17. **"Think of everything possible with regards to supabase setup"** — Full SQL migrations created (10 schema files + 2 seed files)
18. **"Give me the full instructions for supabase setup"** — Step-by-step setup guide provided
19. **"Provide the SQLs fully so I can copy"** — All 12 SQL files output for manual execution
20. **"Remove Google OAuth, add to todo for later"** — 8 files updated, future integration documented
21. **"Run documentation for these errors"** — Bug documentation process established (BUG-001 through BUG-011)
22. **"Run an agent to detect and test the issue"** — Agent-based debugging pattern used
23. **"Write a script that auto detects documentation needs"** — Auto-documentation system built (4 components)
24. **"Pick out all requests and structure from the start"** — This playbook created

---

## 8. Communication Patterns That Worked

### For creative direction
- Name reference games/products for instant context
- Describe gameplay moments, not abstract systems ("if ally's city falls, troops are stranded")
- Use "like X but with Y" comparisons ("like Supremacy 1914 but with depleting resources")

### For technical decisions
- Ask questions back before committing ("hex grid or provinces?", "20-50 or 100+ players?")
- Present options with trade-offs, let the user choose
- Default to the simpler option unless the user specifies otherwise

### For scope management
- Build in phases (Phase 0: docs, Phase 1: MVP, Phase 2: depth, etc.)
- "Phase 1 omits: X, Y, Z" — explicit about what's NOT included
- User can add requirements iteratively without restarting

### For quality control
- "Please run documentation for these errors" — established the bug logging habit
- "Can you verify this before I activate" — user checkpoints before irreversible actions
- Screenshot sharing for UI issues (revealed wrong URL, not a code bug)

### For process improvement
- "I want to learn from how I structured this" — meta-learning request
- "Write a script to auto-detect documentation needs" — automation of manual processes
- "Ensure we help future builds too" — thinking beyond the current project

---

## 9. Template for Future Project Kickoff

Based on everything learned, here's the ideal sequence for starting a new game/project:

### Step 1: Vision (1 conversation)
- Name 3-5 reference games/products
- Describe 3-4 key differentiators
- Describe 2-3 gameplay moments you want players to experience
- State the platform (browser, mobile, desktop)
- State the monetization model (free, premium, pay-to-play)

### Step 2: Research (parallel agents)
- Historical/domain research (if applicable)
- Competitor analysis (how do reference games handle similar mechanics?)
- Technical feasibility (what backend/stack fits?)

### Step 3: Design Plan (plan mode)
- Architecture + tech stack
- Core mechanics (detailed)
- Database schema (high-level)
- Phased development plan
- 2-3 rounds of user feedback and refinement

### Step 4: Documentation Framework (Phase 0)
- CLAUDE.md (<200 lines, indexes everything)
- setup.md, todo.md, bug.md
- test.md + agent.md (testing playbook)
- One doc per game system/facet
- future-vision.md, development-log.md, architecture.md
- doc-map.json + doc-audit.sh (auto-documentation)
- project-playbook.md (this file — for learning)

### Step 5: Data Dictionary (BEFORE splitting work)
- Table + column names locked down
- API response shapes defined
- Shared with ALL agents before parallel work begins

### Step 6: Schema First
- Deploy database schema
- Verify all tables exist
- THEN write functions against actual schema
- THEN write seed data against actual schema
- THEN write frontend queries against actual schema
- Never generate schema + functions + seeds in parallel

### Step 7: Incremental Build + Test
- Build one feature at a time
- Test immediately (don't batch)
- Log every bug in bug.md
- Update todo.md as features complete
- Run doc-audit.sh after every change
- Development-log.md entry at end of each session

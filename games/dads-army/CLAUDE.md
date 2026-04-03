# Dad's Army — Persistent WW2 Strategy Game

A persistent, online WW2 strategy game: 999-hex map, depleting resource fields, city building, army warfare, alliances, and 45-day server cycles. Players fight over resources that run out, driving natural progression toward a server conclusion.

## Tech Stack

- **Frontend**: Vanilla JS (ES modules), HTML5 Canvas (hex map), HTML/CSS (UI panels)
- **Backend**: Supabase (PostgreSQL, pg_cron, Auth, Realtime, Edge Functions)
- **Auth**: Email/password (Google OAuth deferred — see todo.md)
- **Hosting**: Vercel (static frontend), Supabase (backend)
- **No build step** — CDN dependencies only (Supabase JS SDK)

## File Structure

```
games/dads-army/
  index.html              -- Entry point
  style.css               -- All game styling
  CLAUDE.md               -- This file
  docs/                   -- All documentation (see table below)
  src/
    main.js               -- Bootstrap, auth, scene manager
    config/               -- Game definitions (resources, buildings, units, research, alignments)
    scenes/               -- UI scenes (login, map, city, army, research, diplomacy, intel)
    ui/                   -- HTML panel components
    map/                  -- Hex grid renderer, camera, fog of war
    systems/              -- Game logic (resources, combat, supply, depletion)
    api/                  -- Supabase client, queries, subscriptions
  assets/                 -- Maps, terrain textures, sprites (buildings, units, resources, UI)
```

## Documentation Index

| Doc | Purpose |
|-----|---------|
| [setup.md](docs/setup.md) | Infrastructure setup (Supabase, Vercel, env vars) |
| [todo.md](docs/todo.md) | Feature tracker with phase/status |
| [bug.md](docs/bug.md) | Bug reports and fixes |
| [test.md](docs/test.md) | Test master plan — references agent.md |
| [agent.md](docs/agent.md) | AI agent testing playbook (autonomous stress testing) |
| [architecture.md](docs/architecture.md) | Technical deep-dive (schema, ticks, RLS, Edge Functions) |
| [development-log.md](docs/development-log.md) | Process journal (decisions, lessons, for v2 reference) |
| [future-vision.md](docs/future-vision.md) | Future plans (aesthetics, mechanics, new eras, roadmap) |
| [resources.md](docs/resources.md) | Resource types, production chains, depletion, soil quality |
| [map.md](docs/map.md) | 999-hex grid, terrain, tile types, fog of war/resources |
| [cities.md](docs/cities.md) | City building, land quality, buildings, growth |
| [combat.md](docs/combat.md) | Combat resolution, field vs city battles, war damage |
| [military.md](docs/military.md) | Unit types, stats, training, army composition |
| [fortifications.md](docs/fortifications.md) | Field/city/coastal forts, AA, AT, mines, destruction |
| [structures.md](docs/structures.md) | Standalone structures (airstrips, depots, roads, rails) |
| [supply-lines.md](docs/supply-lines.md) | Supply chains, transport, stranding mechanic |
| [naval.md](docs/naval.md) | Naval units, sea zones, convoys, amphibious ops |
| [air.md](docs/air.md) | Air units, airfields, range, bombing, air superiority |
| [intelligence.md](docs/intelligence.md) | Scouting, code breaking, deception, geological surveys |
| [diplomacy.md](docs/diplomacy.md) | Alliance tiers, betrayal, coalitions, treaties |
| [economy.md](docs/economy.md) | Debt, banking, trade routes, embargoes, bankruptcy |
| [alignments.md](docs/alignments.md) | 7 nation alignments, bonuses, starting biases |
| [server-lifecycle.md](docs/server-lifecycle.md) | 45-day cycle, depletion progression, victory conditions |
| [research-tree.md](docs/research-tree.md) | Tech tree, categories, effects, quality vs quantity |
| [monetization.md](docs/monetization.md) | Pay-to-play model (NOT pay-to-win) |

## Key Rules

- **WW2 only** — future time periods noted in future-vision.md, not implemented
- **No pay-to-win** — cosmetics only, competitive integrity is non-negotiable
- **45-day server max** — all servers conclude with final scoring
- **999 hex tiles** — resource fields deplete, driving server progression
- **Cities on depleted fields** — allowed below 20% reserves, with land quality penalties
- **Hex grid** (not provinces) — granular positioning and terrain

## Current Phase

**Phase 0: Documentation & Scaffolding** — establishing docs and project structure before code.

## Conventions

- ES modules (`import`/`export`), no bundler
- camelCase for JS variables/functions, PascalCase for classes/scenes
- SQL: snake_case for tables/columns
- Commit messages: imperative mood, describe the "what" and "why"
- Update docs when mechanics change — docs are the source of truth

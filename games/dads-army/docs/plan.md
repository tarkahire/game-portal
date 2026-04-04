# Development Plan — Dad's Army

**Full design document**: See [Claude Code plan](~/.claude/plans/mellow-splashing-lightning.md) for the complete game design with all mechanics, schema, and architecture details.

**Quick reference**: See [CLAUDE.md](../CLAUDE.md) for tech stack, file structure, documentation index, and conventions.

---

## Status Overview

| Phase | Status | Summary |
|-------|--------|---------|
| Phase 0: Docs & Scaffolding | DONE | 27 docs, file structure, auto-doc system |
| Phase 1: MVP | DONE | All MVP features complete: auth, hex map, tiles, cities, military, combat, supply/roads, portal integration. |
| Phase 2: Strategic Depth | NOT STARTED | Full resources, research, naval, air, alliances, fog of war |
| Phase 3: War Economy | NOT STARTED | Supply chains, stranding, debt, trade, intelligence |
| Phase 4: Endgame & Polish | NOT STARTED | Victory conditions, coalitions, tutorial, mobile |

---

## Phase 1 — MVP Checklist

### Done
- [x] Supabase project setup (auth, schema, RLS, functions, pg_cron)
- [x] 999-hex European theater map with terrain + resources seeded
- [x] Login/register screen (email/password)
- [x] Server select screen
- [x] Alignment picker (7 nations)
- [x] Join server (RPC creates player, assigns tiles, builds capital city, seeds resources)
- [x] Hex map renderer (Canvas, terrain colors, resource dots)
- [x] Pan (mouse drag) + zoom (scroll wheel)
- [x] Tile click → info panel (terrain, resource, owner, reserves, land quality)
- [x] Minimap with viewport indicator
- [x] Resource bar (loads from capital city)
- [x] Auto-documentation system (doc-audit.sh + Stop hook)

### Next Up — Tile Interaction
- [x] Claim adjacent unclaimed tiles (click tile → "Claim" button in info panel)
- [x] Develop resource field (build extraction on owned resource tile)
- [x] Set extraction intensity (sustainable / normal / intensive)
- [x] Build city on disused land (or depleted field <20%)
- [x] Visual feedback: owned tiles glow, city markers

### Then — City Management
- [x] City view panel (buildings, slots, construction queue)
- [x] Build buildings from building_defs (barracks, steel mill, etc.)
- [x] Building construction timer + completion via game tick
- [x] Resource production display (what each building produces)
- [x] Upgrade buildings

### Then — Military
- [x] Train units (infantry, armor, artillery) at military buildings
- [x] Training queue with completion timer
- [x] Form army from garrison units
- [x] March army to destination (pathfinding, ETA display)
- [x] Army sprites on map (show moving armies)

### Then — Combat
- [x] Field battle resolution (army arrives at enemy resource tile)
- [x] City battle resolution (siege mechanics, fortification bonus)
- [x] Battle reports panel
- [x] War damage to tiles (yield reduction after combat)
- [x] Combat predictor (estimated outcome before committing)

### Then — Supply & Roads
- [x] Build roads between tiles
- [x] Resource transport along roads (field → city)
- [x] Supply line visualization on map
- [x] Basic supply range check for armies

### Portal Integration
- [x] Add Dad's Army card to portal index.html
- [x] Create thumbnail image

---

## Phase 2 — Strategic Depth (after Phase 1 complete)

- Full resource set (aluminum, rubber, copper, tungsten, ammunition)
- Production chains (iron+coal→steel, bauxite→aluminum, etc.)
- Research/tech tree with UI
- Geological survey (hidden resource discovery)
- Advanced multi-round combat with category effectiveness
- Naval warfare (6 ship types, sea zones, convoys)
- Air warfare (5 aircraft types, airfields, range, bombing)
- Alliances + diplomacy (4 tiers, betrayal)
- Fog of war + fog of resources

---

## Phase 3 — War Economy (after Phase 2)

- Supply chain system (roads, railways, sea routes, capacity limits)
- Troop stranding mechanic (supply cut → attrition cascade)
- Debt & banking (NPC loans, player lending, bankruptcy)
- Trade routes + embargoes
- Intelligence system (scouting, code breaking, deception)
- Structural engineering (bridges, railways, fortifications)
- Quality vs quantity research paths
- Standalone structures outside cities

---

## Phase 4 — Endgame & Polish (after Phase 3)

- Server lifecycle tuning (depletion rates, 45-day pacing)
- Multiple victory conditions (domination, economic, scientific, score)
- Coalition mechanic (anti-domination)
- Scorched earth tactics
- Field-to-city conversion (exhausted fields → buildable land)
- Leaderboard + end-game scoring
- Tutorial + new player experience
- UI/UX polish, animations, sound
- Mobile responsiveness
- Pay-to-play monetization (Stripe integration)

---

## Key Design Principles

1. **Resource fields are the heart** — everything revolves around controlling, extracting, and fighting over depleting resources
2. **Two combat dynamics** — field battles (resource raids) vs city battles (sieges) create strategic depth
3. **Depletion drives progression** — the map evolves as resources exhaust, naturally compressing conflict toward a conclusion
4. **No pay-to-win** — competitive integrity is non-negotiable
5. **Document everything** — docs are the source of truth, updated with every change

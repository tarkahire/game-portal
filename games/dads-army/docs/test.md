# Test Master Plan — Dad's Army

This document defines the testing methodology for Dad's Army. For the autonomous AI agent testing playbook, see [agent.md](agent.md).

---

## Testing Categories

### 1. Unit Tests
Individual function/module verification. Run in isolation.

- Hex math (coordinate conversion, adjacency, distance)
- Resource calculation (production rates, depletion, lazy evaluation)
- Combat math (attack/defense calculation, terrain modifiers, category effectiveness)
- Pathfinding (Dijkstra on hex grid, movement costs)
- Supply chain calculation (route finding, stranding detection)
- March ETA calculation

### 2. Integration Tests
Multiple systems working together via Supabase.

- Auth flow (signup → login → session persistence → logout)
- Server join flow (select server → choose alignment → player created → starting tiles assigned)
- Building construction (queue building → wait for tick → building completed → production rate updates)
- Unit training (queue units → wait for tick → units added to garrison)
- Army march (form army → set destination → march starts → tick processes arrival)
- Combat resolution (army arrives at enemy tile → combat triggered → battle report generated → tile state updated)
- Resource depletion (extract resources → reserves decrease → yield drops → field exhausts)

### 3. Gameplay Tests
End-to-end game flow testing from a player's perspective.

- **New player journey**: Register → join server → explore map → claim first tile → build city → develop resource field → train first units → march army → win first battle
- **Resource management**: Build multiple fields → manage extraction intensity → observe depletion → plan transitions
- **City building on depleted land**: Exhaust a field → verify below-threshold check → build city → verify land quality penalties
- **Supply disruption**: Build supply route → cut it (destroy road) → verify resources stop flowing → verify army supply warnings
- **Multi-player interaction**: Two players on same server → territory conflict → field battle → city siege

### 4. Stress Tests
Performance and edge case testing.

- **Map rendering**: 999 hexes rendering at 60fps with pan/zoom
- **Concurrent updates**: Multiple players modifying state simultaneously
- **Tick processing**: pg_cron handling all completions/arrivals in under 60 seconds
- **Data volume**: Server with max players, all tiles claimed, many armies marching
- **Edge cases**: Army at map edge, building on last slot, zero resources, simultaneous army arrival at same tile

---

## Test Environments

| Environment | Purpose | Supabase |
|-------------|---------|----------|
| **Local dev** | Individual feature testing | Dev project (separate from production) |
| **Staging** | Integration testing, agent testing | Staging project with test data |
| **Production** | Smoke tests only | Production project |

---

## Pass/Fail Criteria

### Functional
- All user actions produce expected state changes in the database
- UI correctly reflects current game state after every action
- Game tick processes all queued events without errors
- Combat produces consistent, reproducible results for same inputs
- Resource calculations match expected values within 0.1% tolerance

### Performance
- Map renders at 60fps on mid-range hardware (999 hexes visible)
- Page load under 3 seconds on broadband
- Supabase queries return in under 500ms
- Game tick completes in under 30 seconds (for 50-player server)

### Security
- RLS policies prevent players from accessing other players' private data
- Players cannot modify tiles they don't own
- Combat cannot be triggered manually (only via army arrival processed by server tick)
- Auth tokens expire and refresh correctly

---

## Test Execution Process

1. Before each test session, seed a fresh test server using `sql/seed_*.sql` scripts
2. Follow the test procedures in [agent.md](agent.md) for systematic coverage
3. Log results in this format:

```
## Test Run: YYYY-MM-DD
- **Environment**: Local/Staging/Production
- **Phase tested**: Phase X features
- **Total tests**: XX
- **Passed**: XX
- **Failed**: XX
- **Blocked**: XX
- **Notes**: ...
```

---

## Test Run Log

*No test runs yet — game is in Phase 0 (documentation).*

# Technical Architecture — Dad's Army

How the game works under the hood. Supabase schema, game tick logic, RLS policies, frontend architecture, and data flow.

---

## System Overview

```
┌─────────────────────────────┐
│   Browser (Frontend)         │
│   Vanilla JS + Canvas        │
│   HTML/CSS UI Panels         │
│   Supabase JS SDK (CDN)      │
└──────────┬──────────────────┘
           │ HTTPS
           ▼
┌─────────────────────────────┐
│   Supabase                   │
│   ┌───────────────────────┐ │
│   │  Auth                  │ │  ← Email/password + Google OAuth
│   ├───────────────────────┤ │
│   │  PostgreSQL Database   │ │  ← All game state
│   │  ├─ pg_cron           │ │  ← Game tick every 60s
│   │  ├─ RLS Policies      │ │  ← Data access control
│   │  └─ PL/pgSQL Functions│ │  ← Server-side game logic
│   ├───────────────────────┤ │
│   │  Realtime              │ │  ← Live subscriptions (attacks, map changes)
│   ├───────────────────────┤ │
│   │  Edge Functions        │ │  ← Complex combat resolution (Deno/TS)
│   └───────────────────────┘ │
└─────────────────────────────┘
```

---

## Frontend Architecture

### Scene Manager (State Machine)

The frontend uses a simple scene-based state machine. Each scene controls what's visible on screen. Only one scene is active at a time.

```
LoginScene ──→ ServerSelectScene ──→ WorldMapScene ──┐
                                         │           │
                                    CityScene    ArmyScene
                                    FieldScene   ResearchScene
                                    DiplomacyScene
                                    IntelligenceScene
                                    BattleReportScene
```

Each scene:
- Has an `enter()` method (setup UI, load data, start subscriptions)
- Has an `exit()` method (cleanup UI, stop subscriptions)
- Manages its own HTML panels and Canvas rendering

### Canvas Rendering (Map)

The hex map is rendered on a single HTML5 Canvas element. Rendering layers (drawn in order):
1. Terrain base (textured hexes)
2. Resource field indicators
3. Ownership coloring (player color tint/border)
4. Roads and railways (between-tile lines)
5. Structures and buildings (sprites)
6. Army sprites
7. Fog of war overlay (semi-transparent black over unseen tiles)
8. Selection highlight
9. Supply line overlay (optional toggle)
10. UI overlays (minimap, resource bar)

The camera system handles:
- Pan: mouse drag translates the canvas viewport
- Zoom: scroll wheel scales the rendering, with 5 discrete zoom levels
- Hex picking: convert mouse pixel position → hex coordinates using inverse hex-to-pixel math

### Supabase Client

Single client instance initialized in `src/api/supabaseClient.js`:
```javascript
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

All database operations go through `src/api/queries.js` (centralized query layer). All Realtime subscriptions managed in `src/api/subscriptions.js`.

### Data Flow

**On page load**:
1. Check auth session (`supabase.auth.getSession()`)
2. If logged in → load player's server list → navigate to ServerSelectScene or last active server
3. If not logged in → LoginScene

**On entering WorldMapScene**:
1. Fetch all tile data for the server (`tiles` table, filtered by server_id)
2. Fetch player's cities, resource fields, armies
3. Start Realtime subscriptions for: tile ownership changes, army movements, battle reports, messages
4. Render map

**On player action (e.g., build a building)**:
1. Client validates action locally (enough resources? valid tile? prerequisites met?)
2. Client calls Supabase RPC function (e.g., `rpc('build_building', { city_id, building_def })`)
3. Server-side function validates again (RLS + function logic), deducts resources, creates building row
4. Client receives response, updates local state, re-renders

---

## Database Architecture

### Key Schema Patterns

**Server-scoped data**: Most tables include `server_id` to support multiple game servers. Queries always filter by server_id.

**Lazy resource evaluation**: `city_resources` stores `amount`, `production_rate`, and `last_collected_at`. The client computes current resources as:
```
current = min(amount + production_rate * hours_since_last_collected, storage_capacity)
```
The server materializes this every 5 minutes via the game tick.

**Event-driven completions**: Buildings, training, and research use `completes_at` timestamps. The tick function queries for `completes_at <= now()` and processes completions. No per-tick computation for in-progress items.

**Army movement as scheduled events**: Armies have `march_arrives_at`. The tick processes arrivals, not intermediate positions. The client interpolates army position for display.

### Row Level Security (RLS) Strategy

| Table | Read Policy | Write Policy |
|-------|-------------|--------------|
| `game_servers` | All authenticated | Admin only |
| `tiles` | All authenticated (same server) | Owner or game tick function |
| `players` | All authenticated (same server) | Own row only |
| `cities` | All authenticated (same server, limited fields for enemy cities) | Owner only |
| `buildings` | Owner only (fog of war) | Owner only |
| `resource_fields` | Owner + adjacent tile owners (vision) | Owner only |
| `armies` | Owner + players with vision (intelligence) | Owner only |
| `army_units` | Same as armies | Owner only |
| `city_resources` | Owner only | Owner + game tick |
| `battle_reports` | Participants only | Game tick / Edge Function |
| `messages` | Sender or recipient | Sender |
| `alliances` | All authenticated | Leader/officers |
| `loans` | Borrower or lender | Game system |
| `trade_routes` | Participants | Participants |

### Game Tick Function (pg_cron)

Runs every 60 seconds per active server:

```sql
CREATE OR REPLACE FUNCTION process_game_tick(p_server_id UUID)
RETURNS void AS $$
BEGIN
  -- 1. Complete finished buildings
  -- Sets is_constructing=false, updates level, recalculates city production
  PERFORM complete_buildings(p_server_id);

  -- 2. Complete finished training
  -- Adds trained units to city garrison army
  PERFORM complete_training(p_server_id);

  -- 3. Complete finished research
  -- Updates player_research level, applies effects
  PERFORM complete_research(p_server_id);

  -- 4. Resolve arrived armies
  -- If arriving at enemy tile → trigger combat (via Edge Function or PL/pgSQL)
  -- If arriving at friendly tile → station/merge
  PERFORM resolve_army_arrivals(p_server_id);

  -- 5. Process resource depletion
  -- Reduce remaining reserves on all active resource fields based on extraction rate
  PERFORM process_depletion(p_server_id);

  -- 6. Materialize resources (every 5th tick)
  -- Update city_resources.amount, clamp to storage, deduct upkeep
  IF (extract(minute from now())::int % 5 = 0) THEN
    PERFORM materialize_resources(p_server_id);
  END IF;

  -- 7. Process supply chains
  -- Check army supply status, trigger/advance stranding if cut off
  PERFORM process_supply_chains(p_server_id);

  -- 8. Process fortification degradation
  -- Ungarrisoned fortifications lose 1% HP
  PERFORM degrade_fortifications(p_server_id);

  -- 9. Update server timestamp
  UPDATE game_servers SET last_tick_at = now() WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Combat Resolution

Combat is triggered when `resolve_army_arrivals` finds an army at an enemy tile. Options:

**Option A: PL/pgSQL (simpler, all in database)**
- Combat math in a PostgreSQL function
- Reads attacker army, defender garrison/army, terrain, fortifications
- Runs multi-round resolution algorithm
- Writes battle report, updates armies, updates tile ownership

**Option B: Edge Function (more complex logic in TypeScript)**
- pg_notify sends a combat event
- Edge Function picks up the event, runs TypeScript combat algorithm
- Edge Function writes results back to database

Phase 1 will use Option A for simplicity. Option B available for advanced combat (Phase 2+).

---

## Realtime Subscriptions

The frontend subscribes to database changes for live updates:

```javascript
// Subscribe to tile ownership changes on this server
supabase
  .channel('tiles')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tiles',
    filter: `server_id=eq.${serverId}`
  }, (payload) => {
    // Update local tile data and re-render map
    updateTile(payload.new);
  })
  .subscribe();

// Subscribe to battle reports involving this player
supabase
  .channel('battles')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'battle_reports',
    filter: `attacker_id=eq.${playerId}`
  }, (payload) => {
    showBattleNotification(payload.new);
  })
  .subscribe();
```

---

## Data Model Relationships

```
game_servers
  └── players (many per server)
       ├── cities (many per player)
       │    ├── buildings (many per city)
       │    └── city_resources (many per city, one per resource type)
       ├── resource_fields (many per player)
       ├── armies (many per player)
       │    └── army_units (many per army)
       ├── player_research (many per player)
       └── intelligence_ops (many per player)

  └── tiles (999 per server)
       └── tile_adjacency (6 neighbors per hex)

  └── alliances (many per server)
       └── alliance_members (many per alliance)

  └── battle_reports (many per server)
  └── messages (many per server)
  └── loans (many per server)
  └── trade_routes (many per server)
```

---

## Security Model

1. **Auth**: Supabase Auth handles all authentication. JWT tokens are verified on every request.
2. **RLS**: Every table has Row Level Security policies. Players can only read/write data they should have access to.
3. **Server-side validation**: All state-changing operations go through RPC functions that validate inputs server-side. The client is never trusted.
4. **Combat integrity**: Combat is resolved server-side (tick function or Edge Function). Players cannot manipulate combat outcomes.
5. **Rate limiting**: Supabase project settings limit API requests to prevent abuse.
6. **No secrets in frontend**: Only the anon key (designed to be public) is in client code. Service role key is only in Edge Functions.

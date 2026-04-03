-- ============================================================================
-- 005_military_tables.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Military tables: unit definitions, armies, army composition, training queue
-- ============================================================================
-- Depends on: 002_core_tables.sql, 003_map_tables.sql, 004_city_tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- unit_defs
-- Static definition table for all unit types. Loaded once with seed data.
-- Units belong to categories that determine combat behavior:
--   infantry  = cheap, defensive, good in forests/urban
--   armor     = expensive, fast, powerful on plains
--   artillery = long-range support, weak in melee
--   air       = strategic bombing, recon, interception
--   naval     = sea control, coastal bombardment, transport
--
-- train_cost example: {"iron": 50, "oil": 20}
-- upkeep example:     {"oil": 2, "farmland": 1}
-- special_abilities:   {"can_bombard": true, "range": 2}
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unit_defs (
    id                TEXT        PRIMARY KEY,
    name              TEXT        NOT NULL,
    category          TEXT        NOT NULL
                                  CHECK (category IN (
                                      'infantry', 'armor', 'artillery', 'air', 'naval'
                                  )),
    attack            REAL        NOT NULL,
    defense           REAL        NOT NULL,
    hp                REAL        NOT NULL,
    speed             REAL        NOT NULL,    -- hexes per tick
    -- Cost to train one unit: {resource_type: amount}
    train_cost        JSONB       NOT NULL,
    -- Training duration in ticks (1 tick = tick_interval_seconds on the server)
    train_time        INT         NOT NULL,
    -- Per-tick upkeep cost. NULL means no upkeep (militia, etc.)
    upkeep            JSONB,
    -- Buildings and/or research required: {"barracks": 3, "tank_doctrine": 1}
    prerequisites     JSONB,
    -- Unit-specific abilities: bombard range, can_transport, stealth, etc.
    special_abilities JSONB,
    description       TEXT
);

-- ---------------------------------------------------------------------------
-- armies
-- A movable group of units on the map. Armies belong to a player and
-- occupy a single tile at any given time.
--
-- Movement model:
--   When a march order is issued, march_path stores the full route,
--   march_started_at records when movement began, and march_arrives_at
--   is pre-calculated based on path length and slowest unit speed.
--   The game tick advances armies along their path.
--
-- Supply model:
--   Armies must maintain a supply line back to a friendly city.
--   supply_status degrades over time when cut off:
--     supplied -> low (2 ticks) -> critical (4 ticks) ->
--     desperate (8 ticks) -> collapsed (16 ticks)
--   Each degradation level reduces combat effectiveness.
--   supply_cut_since tracks when the supply line was first severed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS armies (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id         UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    player_id         UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    name              TEXT,
    tile_id           INT         NOT NULL,   -- current hex location
    status            TEXT        NOT NULL DEFAULT 'idle'
                                  CHECK (status IN (
                                      'idle', 'marching', 'fighting',
                                      'retreating', 'stranded'
                                  )),
    destination_tile  INT,                    -- target tile for current march
    -- Ordered list of tile IDs forming the march route
    march_path        INT[],
    march_started_at  TIMESTAMPTZ,
    march_arrives_at  TIMESTAMPTZ,
    supply_status     TEXT        NOT NULL DEFAULT 'supplied'
                                  CHECK (supply_status IN (
                                      'supplied', 'low', 'critical',
                                      'desperate', 'collapsed'
                                  )),
    -- When supply was first cut. NULL if currently supplied.
    -- Used to calculate supply degradation timing.
    supply_cut_since  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (tile_id, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- army_units
-- Composition of an army. Each row represents a stack of identical units.
-- hp_percent tracks aggregate health (battle damage). Experience accumulates
-- from combat and provides small stat bonuses.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS army_units (
    army_id   UUID        NOT NULL REFERENCES armies ON DELETE CASCADE,
    unit_def  TEXT        NOT NULL REFERENCES unit_defs ON DELETE RESTRICT,
    quantity  INT         NOT NULL DEFAULT 1
                          CHECK (quantity > 0),
    -- Aggregate health percentage of the unit stack (0-100).
    -- At 0% the stack is destroyed and should be removed.
    hp_percent REAL       NOT NULL DEFAULT 100.0
                          CHECK (hp_percent >= 0 AND hp_percent <= 100),
    -- Experience points gained from combat. Thresholds for veterancy
    -- levels are defined in game logic, not the schema.
    experience INT        NOT NULL DEFAULT 0,

    PRIMARY KEY (army_id, unit_def)
);

-- ---------------------------------------------------------------------------
-- training_queue
-- Units being trained in a city. Multiple units can be queued but only
-- one trains at a time (FIFO by started_at). The game tick checks
-- completes_at to graduate finished units into an army on the city's tile.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_queue (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id      UUID        NOT NULL REFERENCES cities ON DELETE CASCADE,
    unit_def     TEXT        NOT NULL REFERENCES unit_defs ON DELETE RESTRICT,
    quantity     INT         NOT NULL
                             CHECK (quantity > 0),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completes_at TIMESTAMPTZ NOT NULL
);

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Find all armies for a player on a server (army management panel)
CREATE INDEX IF NOT EXISTS idx_armies_server_player
    ON armies (server_id, player_id);

-- Find all armies on a specific tile (combat resolution, tile detail)
CREATE INDEX IF NOT EXISTS idx_armies_server_tile
    ON armies (server_id, tile_id);

-- Find marching armies that are about to arrive (game tick processing).
-- Partial index: only armies currently in 'marching' status need checking.
CREATE INDEX IF NOT EXISTS idx_armies_march_arrives
    ON armies (march_arrives_at)
    WHERE status = 'marching';

-- Find training that is about to complete (game tick processing)
CREATE INDEX IF NOT EXISTS idx_training_queue_completes
    ON training_queue (completes_at);

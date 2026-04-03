-- ============================================================================
-- 004_city_tables.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Cities, buildings, resource fields, supply routes, standalone structures
-- ============================================================================
-- Depends on: 002_core_tables.sql, 003_map_tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- cities
-- A city occupies a single hex tile. Only one city per tile per server.
-- City level (1-5) determines building slot count and is capped by the
-- tile's land_quality at founding time — building on war-torn land yields
-- a weaker city. The capital flag affects score calculation and loss
-- conditions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cities (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id                UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    player_id                UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    tile_id                  INT         NOT NULL,
    name                     TEXT        NOT NULL,
    level                    INT         NOT NULL DEFAULT 1
                                         CHECK (level >= 1 AND level <= 5),
    is_capital               BOOLEAN     NOT NULL DEFAULT false,
    -- Snapshot of the tile's land_quality when the city was founded.
    -- This caps the city's maximum effective level — you can't build a
    -- level-5 fortress on bombed-out rubble.
    land_quality_at_founding REAL        NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Composite FK to tiles (tile_id + server_id)
    FOREIGN KEY (tile_id, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE,
    -- Only one city per tile per server
    UNIQUE (tile_id, server_id)
);

-- ---------------------------------------------------------------------------
-- building_defs
-- Static definition table for all building types. Loaded once at schema
-- creation (seed data). JSONB arrays hold per-level costs, build times,
-- and effects so we can have variable progression without extra tables.
--
-- costs_per_level example:   [{"iron": 100}, {"iron": 200, "coal": 50}]
-- build_time_per_level:      [300, 600, 1200, 2400, 4800]  (seconds)
-- effects_per_level:         [{"production_bonus": 0.1}, {"production_bonus": 0.2}]
-- prerequisites:             {"barracks": 2, "basic_metallurgy": 1}
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS building_defs (
    id                  TEXT        PRIMARY KEY,
    name                TEXT        NOT NULL,
    category            TEXT        NOT NULL
                                    CHECK (category IN (
                                        'military', 'production', 'economy',
                                        'research', 'defense', 'infrastructure'
                                    )),
    description         TEXT,
    max_level           INT         NOT NULL DEFAULT 5,
    -- Array of {resource: amount} objects, one per level
    costs_per_level     JSONB       NOT NULL,
    -- Array of build durations in seconds, one per level
    build_time_per_level JSONB      NOT NULL,
    -- Array of effect objects describing what each level provides
    effects_per_level   JSONB       NOT NULL,
    -- Map of prerequisite building/research IDs to minimum levels required
    prerequisites       JSONB,
    -- Some buildings (shipyard, naval base) can only be built in coastal cities
    requires_coastal    BOOLEAN     NOT NULL DEFAULT false,
    -- Research that must be completed before this building is available
    requires_research   TEXT
);

-- ---------------------------------------------------------------------------
-- buildings
-- Instances of building_defs placed in city building slots. Each city has
-- a fixed number of slots determined by its level. slot_index is 0-based.
-- A building starts at level 0 (under initial construction) and upgrades
-- to building_def.max_level.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buildings (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id                  UUID        NOT NULL REFERENCES cities ON DELETE CASCADE,
    building_def             TEXT        NOT NULL REFERENCES building_defs ON DELETE RESTRICT,
    level                    INT         NOT NULL DEFAULT 0,
    slot_index               INT         NOT NULL,
    is_constructing          BOOLEAN     NOT NULL DEFAULT false,
    construction_started_at  TIMESTAMPTZ,
    construction_completes_at TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One building per slot in a city
    UNIQUE (city_id, slot_index)
);

-- ---------------------------------------------------------------------------
-- resource_fields
-- Represents active extraction operations on resource tiles. A player must
-- own the tile and invest in infrastructure to extract resources.
--
-- Extraction intensity affects depletion rate vs production rate:
--   sustainable = 0.5x production, 0.25x depletion
--   normal      = 1.0x production, 1.0x depletion
--   intensive   = 1.5x production, 3.0x depletion (strip mining)
--
-- Status lifecycle: undeveloped -> productive -> declining -> exhausted
-- "declining" triggers when reserves drop below 25% of total.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_fields (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id             UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    tile_id               INT         NOT NULL,
    player_id             UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    extraction_intensity  TEXT        NOT NULL DEFAULT 'normal'
                                      CHECK (extraction_intensity IN (
                                          'sustainable', 'normal', 'intensive'
                                      )),
    infrastructure_level  INT         NOT NULL DEFAULT 1
                                      CHECK (infrastructure_level >= 1 AND infrastructure_level <= 5),
    -- Calculated production rate (units per tick), updated by game tick
    production_rate       REAL        NOT NULL DEFAULT 0,
    last_collected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                TEXT        NOT NULL DEFAULT 'productive'
                                      CHECK (status IN (
                                          'undeveloped', 'productive', 'declining', 'exhausted'
                                      )),

    FOREIGN KEY (tile_id, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE,
    -- One extraction operation per resource tile per server
    UNIQUE (tile_id, server_id)
);

-- ---------------------------------------------------------------------------
-- city_resources
-- Per-city resource stockpiles. Each city independently stores resources
-- and has its own production/consumption rates. Resources must be
-- transported between cities via supply routes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS city_resources (
    city_id          UUID        NOT NULL REFERENCES cities ON DELETE CASCADE,
    resource_type    TEXT        NOT NULL,
    amount           REAL        NOT NULL DEFAULT 0,
    -- Net rate: production minus upkeep. Can be negative if city is consuming
    -- more than it produces (triggers supply route demand).
    production_rate  REAL        NOT NULL DEFAULT 0,
    storage_capacity REAL        NOT NULL DEFAULT 1000,
    last_collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (city_id, resource_type)
);

-- ---------------------------------------------------------------------------
-- supply_routes
-- Logistics connections between tiles. Resources and reinforcements flow
-- along these routes. The path_tiles array stores the ordered sequence of
-- tile IDs forming the route — if any tile in the path is captured or
-- destroyed, the route is disrupted.
--
-- Route types affect capacity and vulnerability:
--   road = low capacity, hard to interdict
--   rail = high capacity, vulnerable to bombing
--   sea  = highest capacity, requires naval dominance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supply_routes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id   UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    from_tile   INT         NOT NULL,
    to_tile     INT         NOT NULL,
    route_type  TEXT        NOT NULL
                            CHECK (route_type IN ('road', 'rail', 'sea')),
    -- Ordered array of tile IDs from source to destination.
    -- Used to check if any intermediate tile is enemy-controlled (interdiction).
    path_tiles  INT[]       NOT NULL,
    capacity    REAL        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'damaged', 'destroyed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (from_tile, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE,
    FOREIGN KEY (to_tile, server_id)   REFERENCES tiles (id, server_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- standalone_structures
-- Non-city structures placed directly on tiles: radar stations, airfields,
-- supply depots, coastal guns, etc. These exist outside the city building
-- slot system and can be built on any owned tile.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS standalone_structures (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id                UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    tile_id                  INT         NOT NULL,
    player_id                UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    structure_type           TEXT        NOT NULL,
    level                    INT         NOT NULL DEFAULT 1,
    hp                       REAL        NOT NULL,
    max_hp                   REAL        NOT NULL,
    is_constructing          BOOLEAN     NOT NULL DEFAULT false,
    construction_completes_at TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    FOREIGN KEY (tile_id, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE
);

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Find all cities for a player on a server (city management UI)
CREATE INDEX IF NOT EXISTS idx_cities_server_player
    ON cities (server_id, player_id);

-- Find all buildings in a city (city detail view)
CREATE INDEX IF NOT EXISTS idx_buildings_city
    ON buildings (city_id);

-- Find all resource fields for a player on a server (economy overview)
CREATE INDEX IF NOT EXISTS idx_resource_fields_server_player
    ON resource_fields (server_id, player_id);

-- Find all resource stockpiles for a city
CREATE INDEX IF NOT EXISTS idx_city_resources_city
    ON city_resources (city_id);

-- Find all supply routes on a server (logistics map overlay)
CREATE INDEX IF NOT EXISTS idx_supply_routes_server
    ON supply_routes (server_id);

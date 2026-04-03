-- ============================================================================
-- 003_map_tables.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Hex map tables: tiles, adjacency
-- ============================================================================
-- Depends on: 002_core_tables.sql
-- ============================================================================
-- The game map uses axial hex coordinates (q, r). The 999-tile map is
-- generated at server creation time and rows are inserted into these tables.
-- Tiles have persistent state that evolves over the 45-day cycle: resources
-- deplete, land quality degrades from war damage, and infrastructure is built.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- tiles
-- Each hex tile on the game map. The composite PK (id, server_id) allows the
-- same tile layout to be reused across servers with different state.
--
-- Resource depletion model:
--   resource_reserves_total  = original amount when map was generated
--   resource_reserves_remaining = current remaining (decremented by extraction)
--   When remaining hits 0, the tile is exhausted and yields nothing.
--
-- Land quality model:
--   land_quality starts at 100 and degrades from war_damage_level and
--   resource exhaustion. Cities built on degraded land have lower max level.
--   soil_quality applies only to farmland tiles and affects food production.
--
-- is_explored_by uses a UUID array for simplicity. For 20-50 players per
-- server this is efficient. If player counts grew to hundreds, a separate
-- exploration junction table would be preferable.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiles (
    id                       INT         NOT NULL,
    server_id                UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    q                        INT         NOT NULL,   -- axial hex coordinate
    r                        INT         NOT NULL,   -- axial hex coordinate
    terrain_type             TEXT        NOT NULL
                                         CHECK (terrain_type IN (
                                             'plains', 'forest', 'mountain', 'water',
                                             'coast', 'river', 'desert', 'snow',
                                             'urban', 'ruins'
                                         )),
    -- NULL means this tile has no extractable resource
    resource_type            TEXT        CHECK (resource_type IS NULL OR resource_type IN (
                                             'oil', 'iron', 'coal', 'bauxite',
                                             'rubber', 'copper', 'tungsten', 'farmland'
                                         )),
    resource_reserves_total     REAL,    -- original total reserves at map generation
    resource_reserves_remaining REAL,    -- current remaining (decremented each tick)
    -- Soil quality for farmland tiles. Degrades with intensive farming.
    soil_quality             REAL        NOT NULL DEFAULT 100.0,
    -- Cumulative war damage from battles fought on/near this tile (0-100).
    -- Affects land_quality and city productivity.
    war_damage_level         REAL        NOT NULL DEFAULT 0.0,
    -- Overall land quality, derived from war damage and depletion.
    -- Affects maximum city level and building efficiency.
    land_quality             REAL        NOT NULL DEFAULT 100.0,
    owner_id                 UUID        REFERENCES players ON DELETE SET NULL,
    -- Array of player IDs who have scouted/explored this tile.
    -- Used for fog-of-war. Empty means unexplored by all.
    is_explored_by           UUID[]      NOT NULL DEFAULT '{}',
    infrastructure_road      BOOLEAN     NOT NULL DEFAULT false,
    infrastructure_rail      BOOLEAN     NOT NULL DEFAULT false,
    fortification_type       TEXT,       -- e.g. 'bunker', 'trench', 'pillbox'
    fortification_hp         REAL        NOT NULL DEFAULT 0,

    PRIMARY KEY (id, server_id),

    -- Resource reserves can deplete to zero but never go negative
    CHECK (resource_reserves_remaining IS NULL OR resource_reserves_remaining >= 0),
    CHECK (soil_quality >= 0 AND soil_quality <= 100),
    CHECK (war_damage_level >= 0 AND war_damage_level <= 100),
    CHECK (land_quality >= 0 AND land_quality <= 100)
);

-- ---------------------------------------------------------------------------
-- tile_adjacency
-- Pre-computed adjacency graph for the hex map. Each edge stores movement
-- cost (terrain-dependent), and whether a river or bridge crosses it.
-- Rivers increase movement cost; bridges negate the river penalty.
--
-- For a hex grid the adjacency could be computed on-the-fly, but
-- pre-computing allows us to store variable movement costs (terrain,
-- infrastructure) and river crossings without recalculating every tick.
--
-- Only one row per edge: (tile_a, tile_b) where tile_a < tile_b by
-- convention. The application layer queries both directions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tile_adjacency (
    server_id     UUID        NOT NULL,
    tile_a        INT         NOT NULL,
    tile_b        INT         NOT NULL,
    movement_cost REAL        NOT NULL DEFAULT 1.0,
    has_river     BOOLEAN     NOT NULL DEFAULT false,
    has_bridge    BOOLEAN     NOT NULL DEFAULT false,

    PRIMARY KEY (server_id, tile_a, tile_b),

    FOREIGN KEY (tile_a, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE,
    FOREIGN KEY (tile_b, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE
);

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Find all tiles owned by a player on a server (territory display)
CREATE INDEX IF NOT EXISTS idx_tiles_server_owner
    ON tiles (server_id, owner_id);

-- Find resource tiles on a server (economic overview, geological surveys)
CREATE INDEX IF NOT EXISTS idx_tiles_server_resource
    ON tiles (server_id, resource_type)
    WHERE resource_type IS NOT NULL;

-- Spatial lookup by axial coordinates (rendering visible map region)
CREATE INDEX IF NOT EXISTS idx_tiles_server_coords
    ON tiles (server_id, q, r);

-- ============================================================================
-- 006_research_tables.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Research trees, player research progress, intelligence operations
-- ============================================================================
-- Depends on: 002_core_tables.sql, 003_map_tables.sql, 004_city_tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- research_defs
-- Static definition table for all researchable technologies. The tech tree
-- is defined by the prerequisites JSONB field, which maps research_def IDs
-- to minimum levels required.
--
-- Categories reflect the major branches of the tech tree:
--   military     = unit unlocks, combat bonuses
--   economic     = resource production, trade efficiency
--   engineering  = building unlocks, construction speed
--   intelligence = spy ops, counter-intel, fog-of-war reduction
--   superweapon  = late-game powerful abilities with high cost
--
-- cost_per_level example:          [{"iron": 200}, {"iron": 500, "oil": 100}]
-- research_time_per_level example: [3600, 7200]  (seconds)
-- effects_per_level example:       [{"infantry_attack": 0.1}, {"infantry_attack": 0.2}]
-- prerequisites example:           {"basic_tactics": 1, "advanced_metallurgy": 2}
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_defs (
    id                     TEXT        PRIMARY KEY,
    name                   TEXT        NOT NULL,
    category               TEXT        NOT NULL
                                       CHECK (category IN (
                                           'military', 'economic', 'engineering',
                                           'intelligence', 'superweapon'
                                       )),
    description            TEXT,
    max_level              INT         NOT NULL DEFAULT 1,
    -- Array of {resource: amount} objects, one entry per level
    cost_per_level         JSONB       NOT NULL,
    -- Array of durations in seconds, one entry per level
    research_time_per_level JSONB      NOT NULL,
    -- Array of effect objects describing bonuses granted at each level
    effects_per_level      JSONB       NOT NULL,
    -- Map of prerequisite research IDs to minimum levels required
    prerequisites          JSONB,
    -- A building of this type must exist in at least one of the player's
    -- cities before this research can be started (e.g. "research_lab")
    required_building      TEXT
);

-- ---------------------------------------------------------------------------
-- player_research
-- Tracks each player's progress through the tech tree. One row per
-- (player, research_def) pair. Level 0 means not yet researched.
-- Only one research can be active (is_researching = true) at a time
-- per player — enforced at application level to allow future "dual
-- research" upgrades without schema changes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_research (
    player_id              UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    research_def           TEXT        NOT NULL REFERENCES research_defs ON DELETE RESTRICT,
    level                  INT         NOT NULL DEFAULT 0,
    is_researching         BOOLEAN     NOT NULL DEFAULT false,
    research_started_at    TIMESTAMPTZ,
    research_completes_at  TIMESTAMPTZ,

    PRIMARY KEY (player_id, research_def)
);

-- ---------------------------------------------------------------------------
-- intelligence_ops
-- Covert operations launched by players. These run on a timer and resolve
-- at completes_at during the game tick.
--
-- Operation types:
--   scout           = reveal enemy army composition on a tile
--   geological_survey = reveal exact resource reserves on a tile
--   codebreak       = temporarily see target player's army movements
--   counter_intel   = chance to detect and block enemy spy ops
--   deception       = plant false information (fake army, fake resource data)
--
-- Results are stored as JSONB for flexibility — different op types return
-- different data structures. The status field tracks lifecycle:
--   in_progress -> completed (success) | detected (caught) | failed (bad luck)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intelligence_ops (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id        UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    player_id        UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    -- Target player for codebreak/counter_intel. NULL for tile-based ops.
    target_player_id UUID        REFERENCES players ON DELETE SET NULL,
    op_type          TEXT        NOT NULL
                                 CHECK (op_type IN (
                                     'scout', 'geological_survey', 'codebreak',
                                     'counter_intel', 'deception'
                                 )),
    -- Target tile for scout/geological_survey ops. NULL for player-targeted ops.
    target_tile      INT,
    status           TEXT        NOT NULL DEFAULT 'in_progress'
                                 CHECK (status IN (
                                     'in_progress', 'completed', 'detected', 'failed'
                                 )),
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completes_at     TIMESTAMPTZ,
    -- Operation results. Structure varies by op_type:
    -- scout:    {"units": [...], "fortifications": "bunker"}
    -- geo:      {"resource": "oil", "remaining": 4500, "total": 10000}
    -- codebreak: {"duration_ticks": 20, "armies_visible": true}
    result           JSONB,

    -- Composite FK for tile-targeted ops. The FK is valid when target_tile is set;
    -- when NULL, the FK columns are all NULL and the constraint is satisfied.
    FOREIGN KEY (target_tile, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE
);

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Find all research for a player (tech tree UI)
CREATE INDEX IF NOT EXISTS idx_player_research_player
    ON player_research (player_id);

-- Find research that is about to complete (game tick processing).
-- Partial index: only active research needs checking each tick.
CREATE INDEX IF NOT EXISTS idx_player_research_completes
    ON player_research (research_completes_at)
    WHERE is_researching = true;

-- Find all intelligence ops for a player on a server (intel panel)
CREATE INDEX IF NOT EXISTS idx_intelligence_ops_server_player
    ON intelligence_ops (server_id, player_id);

-- ============================================================================
-- 002_core_tables.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Core tables: servers, players, alliances, diplomacy, reputation
-- ============================================================================
-- Depends on: 001_extensions.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- game_servers
-- Each row represents one 45-day game world. Multiple servers can run
-- concurrently. The config JSONB column holds server-specific overrides
-- (e.g. resource multipliers, fog-of-war settings, victory conditions)
-- without requiring schema changes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_servers (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 TEXT        NOT NULL,
    status               TEXT        NOT NULL DEFAULT 'lobby'
                                     CHECK (status IN ('lobby', 'active', 'paused', 'ended')),
    speed_multiplier     REAL        NOT NULL DEFAULT 1.0,
    map_id               TEXT        NOT NULL,
    max_players          INT         NOT NULL DEFAULT 30,
    current_day          INT         NOT NULL DEFAULT 0,
    -- How often the game tick runs (in seconds). Default 60s = 1 tick/min.
    -- Combined with speed_multiplier this controls game pace.
    tick_interval_seconds INT        NOT NULL DEFAULT 60,
    started_at           TIMESTAMPTZ,
    ended_at             TIMESTAMPTZ,
    last_tick_at         TIMESTAMPTZ,
    -- Flexible config bag for server-specific rules, victory conditions, etc.
    config               JSONB       NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- players
-- Junction between auth.users and a game_server. A single Supabase user can
-- play on multiple servers simultaneously, but only once per server.
-- alignment represents the nation/faction the player chose at join time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    server_id          UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    display_name       TEXT        NOT NULL,
    alignment          TEXT        NOT NULL
                                   CHECK (alignment IN (
                                       'germany', 'uk', 'usa', 'ussr',
                                       'japan', 'italy', 'france'
                                   )),
    score              INT         NOT NULL DEFAULT 0,
    is_eliminated      BOOLEAN     NOT NULL DEFAULT false,
    -- Subscription tier affects premium features (extra build queues, cosmetics).
    -- Game balance is NOT pay-to-win; this is for convenience/cosmetic perks.
    subscription_tier  TEXT        NOT NULL DEFAULT 'free',
    joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One player entry per user per server
    UNIQUE (user_id, server_id)
);

-- ---------------------------------------------------------------------------
-- alliances
-- Player-created coalitions within a server. Tag is a short label shown
-- on the map (e.g. "NATO", "AXIS"). Limited to 5 characters for UI display.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alliances (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id  UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    tag        TEXT        CHECK (char_length(tag) <= 5),
    leader_id  UUID        REFERENCES players ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- alliance_members
-- Many-to-many between alliances and players. A player may only be in one
-- alliance at a time (enforced at application level — a UNIQUE on player_id
-- here would prevent history tracking if we ever want it).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alliance_members (
    alliance_id UUID        NOT NULL REFERENCES alliances ON DELETE CASCADE,
    player_id   UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    role        TEXT        NOT NULL DEFAULT 'member'
                            CHECK (role IN ('leader', 'officer', 'member')),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (alliance_id, player_id)
);

-- ---------------------------------------------------------------------------
-- diplomatic_relations
-- Bilateral agreements between two players on the same server.
-- The CHECK (player_a < player_b) ensures we store each pair only once
-- (canonical ordering), preventing duplicate/conflicting rows for the
-- same two players.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diplomatic_relations (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id      UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    player_a       UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    player_b       UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    relation_type  TEXT        NOT NULL
                               CHECK (relation_type IN (
                                   'nap', 'trade', 'military_access', 'alliance'
                               )),
    established_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at     TIMESTAMPTZ,

    -- Canonical ordering: player_a UUID must be less than player_b UUID.
    -- This prevents storing (A,B) and (B,A) as separate rows.
    CHECK (player_a < player_b)
);

-- ---------------------------------------------------------------------------
-- reputation
-- Tracks a player's diplomatic trustworthiness. Breaking treaties lowers
-- the score and imposes a cooldown before new treaties can be signed.
-- Score 0 = pariah, 50 = neutral, 100 = exemplary.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reputation (
    player_id              UUID        PRIMARY KEY REFERENCES players ON DELETE CASCADE,
    score                  INT         NOT NULL DEFAULT 50
                                       CHECK (score >= 0 AND score <= 100),
    last_betrayal_at       TIMESTAMPTZ,
    -- Player cannot form new diplomatic relations until this timestamp passes
    betrayal_cooldown_until TIMESTAMPTZ
);

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Look up all servers a user is playing on
CREATE INDEX IF NOT EXISTS idx_players_user_id
    ON players (user_id);

-- List all players on a given server (leaderboard, diplomacy lookups)
CREATE INDEX IF NOT EXISTS idx_players_server_id
    ON players (server_id);

-- List all alliances on a server
CREATE INDEX IF NOT EXISTS idx_alliances_server_id
    ON alliances (server_id);

-- Find diplomatic relations involving a server
CREATE INDEX IF NOT EXISTS idx_diplomatic_relations_server_id
    ON diplomatic_relations (server_id);

-- Find all relations for a specific player (either side of the pair)
CREATE INDEX IF NOT EXISTS idx_diplomatic_relations_player_a
    ON diplomatic_relations (player_a);

CREATE INDEX IF NOT EXISTS idx_diplomatic_relations_player_b
    ON diplomatic_relations (player_b);

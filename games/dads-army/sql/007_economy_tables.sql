-- ============================================================================
-- 007_economy_tables.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Economy, trade, battle reports, messaging, notifications, alignment defs
-- ============================================================================
-- Depends on: 002_core_tables.sql, 003_map_tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- loans
-- Financial system allowing players to borrow resources. Loans can come from
-- other players (P2P lending) or from an NPC bank (lender_id = NULL).
-- NPC bank loans have fixed interest rates; P2P loans have negotiated terms.
--
-- Missed payments accumulate. At 3 missed payments the loan defaults,
-- triggering reputation loss and possible asset seizure by the lender.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loans (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id        UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    borrower_id      UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    -- NULL lender_id means the loan is from the NPC central bank
    lender_id        UUID        REFERENCES players ON DELETE SET NULL,
    resource_type    TEXT        NOT NULL,
    amount           REAL        NOT NULL,
    -- Interest rate per payment period (e.g. 0.05 = 5%)
    interest_rate    REAL        NOT NULL,
    -- Amount due each payment period (principal + interest installment)
    repayment_amount REAL        NOT NULL,
    next_payment_at  TIMESTAMPTZ NOT NULL,
    missed_payments  INT         NOT NULL DEFAULT 0,
    status           TEXT        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'repaid', 'defaulted')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- trade_routes
-- Bilateral resource exchange agreements between two players. Both sides
-- send a specified resource and amount per tick. The route can be disrupted
-- if the physical path (route_path tile array) is interdicted by an enemy.
--
-- Unlike supply_routes (which are internal logistics), trade_routes cross
-- player borders and require a diplomatic 'trade' relation to function.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trade_routes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id       UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    player_a        UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    player_b        UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    -- Resource type and amount that player A sends to player B each tick
    resource_from_a TEXT        NOT NULL,
    amount_from_a   REAL        NOT NULL,
    -- Resource type and amount that player B sends to player A each tick
    resource_from_b TEXT        NOT NULL,
    amount_from_b   REAL        NOT NULL,
    -- Physical path through tile IDs. If any tile is enemy-controlled, disrupted.
    route_path      INT[],
    status          TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'disrupted', 'cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- battle_reports
-- Detailed record of every combat engagement. Snapshots of both armies are
-- stored so the report remains valid even after units are destroyed.
-- The rounds JSONB array contains per-round combat data for replay/review.
--
-- This table grows significantly over a 45-day cycle. Old reports can be
-- archived or pruned after the server ends.
--
-- attacker_army_snapshot example:
--   {"units": [{"def": "panzer_iv", "qty": 5, "hp": 85.0}], "total_attack": 250}
-- rounds example:
--   [{"round": 1, "attacker_damage": 45, "defender_damage": 30, ...}, ...]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS battle_reports (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id               UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    tile_id                 INT         NOT NULL,
    attacker_id             UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    -- NULL defender for battles against undefended tiles (razing empty cities)
    defender_id             UUID        REFERENCES players ON DELETE SET NULL,
    -- Full snapshot of armies at battle start (for replay/review)
    attacker_army_snapshot  JSONB       NOT NULL,
    defender_army_snapshot  JSONB       NOT NULL,
    terrain_type            TEXT        NOT NULL,
    fortification_type      TEXT,
    -- All combat modifiers that were applied: terrain bonus, supply penalty,
    -- veterancy bonus, weather, fortification, research bonuses, etc.
    modifiers_applied       JSONB       NOT NULL,
    -- Round-by-round combat log for detailed battle review
    rounds                  JSONB       NOT NULL,
    result                  TEXT        NOT NULL
                                        CHECK (result IN (
                                            'attacker_wins', 'defender_wins', 'draw'
                                        )),
    -- Summary of losses for quick display without parsing rounds
    attacker_losses         JSONB       NOT NULL,
    defender_losses         JSONB       NOT NULL,
    -- How much war_damage was inflicted on the tile from this battle
    war_damage_caused       REAL        NOT NULL DEFAULT 0,
    occurred_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- messages
-- In-game messaging system supporting direct messages, alliance chat,
-- global chat, and system notifications. Messages are scoped to a server.
--
-- Channel routing:
--   direct    = sender_id -> recipient_id (both required)
--   alliance  = sender_id -> alliance_id (all alliance members see it)
--   global    = sender_id -> all players on server
--   system    = sender_id is NULL, recipient_id is the target player
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id     UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    -- NULL sender for system messages
    sender_id     UUID        REFERENCES players ON DELETE SET NULL,
    -- NULL recipient for alliance/global messages
    recipient_id  UUID        REFERENCES players ON DELETE CASCADE,
    -- NULL alliance for non-alliance messages
    alliance_id   UUID        REFERENCES alliances ON DELETE CASCADE,
    channel       TEXT        NOT NULL DEFAULT 'direct'
                              CHECK (channel IN ('direct', 'alliance', 'global', 'system')),
    subject       TEXT,
    body          TEXT        NOT NULL,
    is_read       BOOLEAN     NOT NULL DEFAULT false,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- notifications
-- Push-style notifications for important game events. These are distinct
-- from messages — notifications are system-generated alerts that appear in
-- the notification bell/panel, not in the chat system.
--
-- The data JSONB field contains contextual information for deep-linking:
--   attack:             {"army_id": "...", "tile_id": 42, "attacker": "..."}
--   building_complete:  {"city_id": "...", "building_def": "barracks"}
--   stranding:          {"army_id": "...", "supply_status": "critical"}
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id         UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    notification_type TEXT        NOT NULL
                                  CHECK (notification_type IN (
                                      'attack', 'building_complete', 'training_complete',
                                      'research_complete', 'stranding', 'diplomatic', 'system'
                                  )),
    title             TEXT        NOT NULL,
    body              TEXT        NOT NULL,
    -- Contextual data for deep-linking to the relevant game screen
    data              JSONB,
    is_read           BOOLEAN     NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- alignment_defs
-- Static definition table for the 7 playable nations/factions. Each has
-- passive bonuses that apply throughout the game, a unique mechanic
-- (special ability or unit), and a starting bias that influences initial
-- resource tile placement near the player's starting position.
--
-- passive_bonuses example:
--   {"infantry_defense": 0.1, "resource_production": 0.05}
-- unique_mechanic example:
--   {"name": "Blitzkrieg", "description": "Armor units move 50% faster for
--    first 3 tiles of movement", "effect": {"armor_speed_bonus": 0.5, "tiles": 3}}
-- starting_bias example:
--   {"preferred_terrain": ["plains", "forest"], "bonus_resource": "iron"}
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alignment_defs (
    id              TEXT        PRIMARY KEY
                                CHECK (id IN (
                                    'germany', 'uk', 'usa', 'ussr',
                                    'japan', 'italy', 'france'
                                )),
    name            TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    -- Passive stat bonuses that apply to all units/buildings/production
    passive_bonuses JSONB       NOT NULL,
    -- Special faction ability with name, description, and effect parameters
    unique_mechanic JSONB       NOT NULL,
    -- Influences map generation for this faction's starting area
    starting_bias   JSONB       NOT NULL
);

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Battle report history for a server, ordered by most recent first
CREATE INDEX IF NOT EXISTS idx_battle_reports_server_time
    ON battle_reports (server_id, occurred_at DESC);

-- Find battles involving a specific attacker (player's battle history)
CREATE INDEX IF NOT EXISTS idx_battle_reports_attacker
    ON battle_reports (attacker_id);

-- Find battles involving a specific defender (player's battle history)
CREATE INDEX IF NOT EXISTS idx_battle_reports_defender
    ON battle_reports (defender_id);

-- Find messages sent to a specific player on a server (inbox)
CREATE INDEX IF NOT EXISTS idx_messages_server_recipient
    ON messages (server_id, recipient_id);

-- Find alliance messages on a server (alliance chat)
CREATE INDEX IF NOT EXISTS idx_messages_server_alliance
    ON messages (server_id, alliance_id);

-- Find notifications for a player, prioritizing unread ones
CREATE INDEX IF NOT EXISTS idx_notifications_player_read
    ON notifications (player_id, is_read);

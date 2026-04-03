-- ============================================================================
-- 008_rls_policies.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Row Level Security policies for all tables
-- ============================================================================
-- Depends on: 002_core_tables.sql, 003_map_tables.sql, 004-007 table files
-- ============================================================================
-- RLS Strategy:
--   - Players can read public data on their server (tiles, player names, alliances)
--   - Players can only modify their own data (cities, armies, buildings)
--   - Fog of war hides enemy army compositions and enemy city buildings
--   - The game tick function runs as SECURITY DEFINER and bypasses RLS
--   - Battle reports readable by attacker and defender only
--   - Messages readable by sender, recipient, or alliance members
--   - Notifications readable by the owning player only
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: get the current authenticated player's ID for a server
-- Used extensively in RLS policies to map auth.uid() → player_id
-- SECURITY DEFINER so it can read the players table regardless of RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_player_id(p_server_id UUID)
RETURNS UUID AS $$
  SELECT id FROM players WHERE user_id = auth.uid() AND server_id = p_server_id LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Helper function: check if authenticated user has a player on a given server
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_player_on_server(p_server_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM players WHERE user_id = auth.uid() AND server_id = p_server_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Helper function: get the alliance ID for a player (NULL if not in one)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_player_alliance_id(p_player_id UUID)
RETURNS UUID AS $$
  SELECT alliance_id FROM alliance_members WHERE player_id = p_player_id LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Helper function: check if a tile is visible to the current player
-- A tile is visible if: player owns it, or player owns an adjacent tile,
-- or the tile has been explored by the player.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tile_visible_to_player(p_tile_id INT, p_server_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_player_id UUID;
BEGIN
  v_player_id := get_player_id(p_server_id);
  IF v_player_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM tiles
    WHERE id = p_tile_id AND server_id = p_server_id
    AND (
      -- Player owns this tile
      owner_id = v_player_id
      -- Player has explored this tile
      OR v_player_id = ANY(is_explored_by)
      -- Player owns an adjacent tile
      OR EXISTS (
        SELECT 1 FROM tile_adjacency ta
        JOIN tiles t2 ON (
          (ta.tile_a = p_tile_id AND ta.tile_b = t2.id)
          OR (ta.tile_b = p_tile_id AND ta.tile_a = t2.id)
        )
        WHERE ta.server_id = p_server_id
        AND t2.server_id = p_server_id
        AND t2.owner_id = v_player_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ===========================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ===========================================================================

ALTER TABLE game_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE diplomatic_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tile_adjacency ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE standalone_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE armies ENABLE ROW LEVEL SECURITY;
ALTER TABLE army_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alignment_defs ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- game_servers — Public read for all authenticated users, no public write
-- ===========================================================================

CREATE POLICY "game_servers_select" ON game_servers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No INSERT/UPDATE/DELETE policies — only admin/service role can modify


-- ===========================================================================
-- players — Read all on same server (leaderboard), write only own row
-- ===========================================================================

CREATE POLICY "players_select" ON players
  FOR SELECT
  USING (
    -- Any authenticated user can see players on servers they belong to
    is_player_on_server(server_id)
    -- Also allow reading your own rows on any server (for server selection screen)
    OR user_id = auth.uid()
  );

CREATE POLICY "players_insert" ON players
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "players_update" ON players
  FOR UPDATE
  USING (user_id = auth.uid());

-- No DELETE — players are eliminated, not deleted


-- ===========================================================================
-- alliances — Read all on same server, write based on role
-- ===========================================================================

CREATE POLICY "alliances_select" ON alliances
  FOR SELECT
  USING (is_player_on_server(server_id));

CREATE POLICY "alliances_insert" ON alliances
  FOR INSERT
  WITH CHECK (
    is_player_on_server(server_id)
    -- The leader_id must be the inserting player
    AND leader_id = get_player_id(server_id)
  );

CREATE POLICY "alliances_update" ON alliances
  FOR UPDATE
  USING (
    -- Only the alliance leader can update
    leader_id = get_player_id(server_id)
  );

CREATE POLICY "alliances_delete" ON alliances
  FOR DELETE
  USING (
    -- Only the alliance leader can disband
    leader_id = get_player_id(server_id)
  );


-- ===========================================================================
-- alliance_members — Read all on same server, write based on role
-- ===========================================================================

CREATE POLICY "alliance_members_select" ON alliance_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alliances a
      WHERE a.id = alliance_id
      AND is_player_on_server(a.server_id)
    )
  );

CREATE POLICY "alliance_members_insert" ON alliance_members
  FOR INSERT
  WITH CHECK (
    -- Player can add themselves (join request accepted) or
    -- leader/officer of the alliance can add members
    player_id = (
      SELECT get_player_id(a.server_id) FROM alliances a WHERE a.id = alliance_id
    )
    OR EXISTS (
      SELECT 1 FROM alliance_members am
      JOIN alliances a ON a.id = am.alliance_id
      WHERE am.alliance_id = alliance_members.alliance_id
      AND am.player_id = get_player_id(a.server_id)
      AND am.role IN ('leader', 'officer')
    )
  );

CREATE POLICY "alliance_members_update" ON alliance_members
  FOR UPDATE
  USING (
    -- Only leader/officer can change roles
    EXISTS (
      SELECT 1 FROM alliance_members am
      JOIN alliances a ON a.id = am.alliance_id
      WHERE am.alliance_id = alliance_members.alliance_id
      AND am.player_id = get_player_id(a.server_id)
      AND am.role IN ('leader', 'officer')
    )
  );

CREATE POLICY "alliance_members_delete" ON alliance_members
  FOR DELETE
  USING (
    -- Player can remove themselves (leave), or leader/officer can kick
    EXISTS (
      SELECT 1 FROM alliances a WHERE a.id = alliance_id
      AND (
        player_id = get_player_id(a.server_id)
        OR EXISTS (
          SELECT 1 FROM alliance_members am
          WHERE am.alliance_id = alliance_members.alliance_id
          AND am.player_id = get_player_id(a.server_id)
          AND am.role IN ('leader', 'officer')
        )
      )
    )
  );


-- ===========================================================================
-- diplomatic_relations — Read own, write where participant
-- ===========================================================================

CREATE POLICY "diplomatic_relations_select" ON diplomatic_relations
  FOR SELECT
  USING (
    -- Can see relations involving yourself
    get_player_id(server_id) IN (player_a, player_b)
    -- Or any relations on your server (diplomacy is public knowledge)
    OR is_player_on_server(server_id)
  );

CREATE POLICY "diplomatic_relations_insert" ON diplomatic_relations
  FOR INSERT
  WITH CHECK (
    get_player_id(server_id) IN (player_a, player_b)
  );

CREATE POLICY "diplomatic_relations_update" ON diplomatic_relations
  FOR UPDATE
  USING (
    get_player_id(server_id) IN (player_a, player_b)
  );

CREATE POLICY "diplomatic_relations_delete" ON diplomatic_relations
  FOR DELETE
  USING (
    get_player_id(server_id) IN (player_a, player_b)
  );


-- ===========================================================================
-- reputation — Read all on same server, write only own
-- ===========================================================================

CREATE POLICY "reputation_select" ON reputation
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
      AND is_player_on_server(p.server_id)
    )
  );

CREATE POLICY "reputation_update" ON reputation
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id AND p.user_id = auth.uid()
    )
  );

-- No direct INSERT/DELETE — managed by game functions


-- ===========================================================================
-- tiles — Read all on your server, update only owned tiles
-- ===========================================================================

CREATE POLICY "tiles_select" ON tiles
  FOR SELECT
  USING (is_player_on_server(server_id));

CREATE POLICY "tiles_update" ON tiles
  FOR UPDATE
  USING (owner_id = get_player_id(server_id));

-- No INSERT/DELETE — tiles are created at map generation (service role)


-- ===========================================================================
-- tile_adjacency — Read all on your server
-- ===========================================================================

CREATE POLICY "tile_adjacency_select" ON tile_adjacency
  FOR SELECT
  USING (is_player_on_server(server_id));

-- No INSERT/UPDATE/DELETE — adjacency is created at map generation


-- ===========================================================================
-- cities — Read all on same server (names/locations are public map info),
--          but building details only for own cities. Write only own.
-- ===========================================================================

CREATE POLICY "cities_select" ON cities
  FOR SELECT
  USING (
    -- All cities on same server are visible (names and locations are public)
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = cities.owner_id
      AND is_player_on_server(p.server_id)
    )
  );

CREATE POLICY "cities_insert" ON cities
  FOR INSERT
  WITH CHECK (
    owner_id = get_player_id(
      (SELECT p.server_id FROM players p WHERE p.id = owner_id)
    )
  );

CREATE POLICY "cities_update" ON cities
  FOR UPDATE
  USING (
    owner_id = get_player_id(
      (SELECT p.server_id FROM players p WHERE p.id = owner_id)
    )
  );

CREATE POLICY "cities_delete" ON cities
  FOR DELETE
  USING (
    owner_id = get_player_id(
      (SELECT p.server_id FROM players p WHERE p.id = owner_id)
    )
  );


-- ===========================================================================
-- buildings — Fog of war: read only own city buildings, write only own
-- ===========================================================================

CREATE POLICY "buildings_select" ON buildings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_insert" ON buildings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_update" ON buildings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_delete" ON buildings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );


-- ===========================================================================
-- resource_fields — Read own + fields on visible tiles, write only own
-- ===========================================================================

CREATE POLICY "resource_fields_select" ON resource_fields
  FOR SELECT
  USING (
    -- Own fields always visible
    owner_id = get_player_id(server_id)
    -- Fields on visible tiles (adjacent to owned tiles)
    OR is_tile_visible_to_player(tile_id, server_id)
  );

CREATE POLICY "resource_fields_insert" ON resource_fields
  FOR INSERT
  WITH CHECK (owner_id = get_player_id(server_id));

CREATE POLICY "resource_fields_update" ON resource_fields
  FOR UPDATE
  USING (owner_id = get_player_id(server_id));

CREATE POLICY "resource_fields_delete" ON resource_fields
  FOR DELETE
  USING (owner_id = get_player_id(server_id));


-- ===========================================================================
-- city_resources — Read only own, write only own
-- ===========================================================================

CREATE POLICY "city_resources_select" ON city_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = city_resources.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "city_resources_update" ON city_resources
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = city_resources.city_id
      AND p.user_id = auth.uid()
    )
  );

-- No direct INSERT/DELETE — managed by game functions


-- ===========================================================================
-- supply_routes — Read all on same server, write only for own routes
-- ===========================================================================

CREATE POLICY "supply_routes_select" ON supply_routes
  FOR SELECT
  USING (is_player_on_server(server_id));

CREATE POLICY "supply_routes_insert" ON supply_routes
  FOR INSERT
  WITH CHECK (owner_id = get_player_id(server_id));

CREATE POLICY "supply_routes_update" ON supply_routes
  FOR UPDATE
  USING (owner_id = get_player_id(server_id));

CREATE POLICY "supply_routes_delete" ON supply_routes
  FOR DELETE
  USING (owner_id = get_player_id(server_id));


-- ===========================================================================
-- standalone_structures — Read on visible tiles, write only own
-- ===========================================================================

CREATE POLICY "standalone_structures_select" ON standalone_structures
  FOR SELECT
  USING (
    -- Own structures always visible
    owner_id = get_player_id(server_id)
    -- Structures on visible tiles
    OR is_tile_visible_to_player(tile_id, server_id)
  );

CREATE POLICY "standalone_structures_insert" ON standalone_structures
  FOR INSERT
  WITH CHECK (owner_id = get_player_id(server_id));

CREATE POLICY "standalone_structures_update" ON standalone_structures
  FOR UPDATE
  USING (owner_id = get_player_id(server_id));

CREATE POLICY "standalone_structures_delete" ON standalone_structures
  FOR DELETE
  USING (owner_id = get_player_id(server_id));


-- ===========================================================================
-- armies — Read own fully, read enemy only if visible (fog of war)
-- ===========================================================================

CREATE POLICY "armies_select" ON armies
  FOR SELECT
  USING (
    -- Own armies always visible
    owner_id = get_player_id(server_id)
    -- Enemy armies visible if on a tile the player can see
    OR is_tile_visible_to_player(tile_id, server_id)
  );

CREATE POLICY "armies_insert" ON armies
  FOR INSERT
  WITH CHECK (owner_id = get_player_id(server_id));

CREATE POLICY "armies_update" ON armies
  FOR UPDATE
  USING (owner_id = get_player_id(server_id));

CREATE POLICY "armies_delete" ON armies
  FOR DELETE
  USING (owner_id = get_player_id(server_id));


-- ===========================================================================
-- army_units — Read ONLY for own armies (fog of war hides enemy composition)
-- ===========================================================================

CREATE POLICY "army_units_select" ON army_units
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM armies a
      WHERE a.id = army_units.army_id
      AND a.owner_id = get_player_id(a.server_id)
    )
  );

CREATE POLICY "army_units_insert" ON army_units
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM armies a
      WHERE a.id = army_units.army_id
      AND a.owner_id = get_player_id(a.server_id)
    )
  );

CREATE POLICY "army_units_update" ON army_units
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM armies a
      WHERE a.id = army_units.army_id
      AND a.owner_id = get_player_id(a.server_id)
    )
  );

CREATE POLICY "army_units_delete" ON army_units
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM armies a
      WHERE a.id = army_units.army_id
      AND a.owner_id = get_player_id(a.server_id)
    )
  );


-- ===========================================================================
-- training_queue — Read/write only for own cities
-- ===========================================================================

CREATE POLICY "training_queue_select" ON training_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "training_queue_insert" ON training_queue
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "training_queue_update" ON training_queue
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "training_queue_delete" ON training_queue
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.owner_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );


-- ===========================================================================
-- player_research — Read/update only own
-- ===========================================================================

CREATE POLICY "player_research_select" ON player_research
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_research.player_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "player_research_update" ON player_research
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_research.player_id
      AND p.user_id = auth.uid()
    )
  );

-- No direct INSERT/DELETE — managed by game functions


-- ===========================================================================
-- intelligence_ops — Read only own
-- ===========================================================================

CREATE POLICY "intelligence_ops_select" ON intelligence_ops
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = intelligence_ops.player_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "intelligence_ops_insert" ON intelligence_ops
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = intelligence_ops.player_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "intelligence_ops_update" ON intelligence_ops
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = intelligence_ops.player_id
      AND p.user_id = auth.uid()
    )
  );

-- No DELETE — intelligence ops are historical records


-- ===========================================================================
-- loans — Read where borrower or lender, insert as borrower
-- ===========================================================================

CREATE POLICY "loans_select" ON loans
  FOR SELECT
  USING (
    get_player_id(server_id) IN (borrower_id, lender_id)
  );

CREATE POLICY "loans_insert" ON loans
  FOR INSERT
  WITH CHECK (
    borrower_id = get_player_id(server_id)
  );

CREATE POLICY "loans_update" ON loans
  FOR UPDATE
  USING (
    get_player_id(server_id) IN (borrower_id, lender_id)
  );

-- No DELETE — loans are settled, not deleted


-- ===========================================================================
-- trade_routes — Read/write where participant
-- ===========================================================================

CREATE POLICY "trade_routes_select" ON trade_routes
  FOR SELECT
  USING (
    get_player_id(server_id) IN (player_a, player_b)
  );

CREATE POLICY "trade_routes_insert" ON trade_routes
  FOR INSERT
  WITH CHECK (
    get_player_id(server_id) IN (player_a, player_b)
  );

CREATE POLICY "trade_routes_update" ON trade_routes
  FOR UPDATE
  USING (
    get_player_id(server_id) IN (player_a, player_b)
  );

CREATE POLICY "trade_routes_delete" ON trade_routes
  FOR DELETE
  USING (
    get_player_id(server_id) IN (player_a, player_b)
  );


-- ===========================================================================
-- battle_reports — Read only where attacker or defender
-- ===========================================================================

CREATE POLICY "battle_reports_select" ON battle_reports
  FOR SELECT
  USING (
    get_player_id(server_id) IN (attacker_id, defender_id)
  );

-- No INSERT/UPDATE/DELETE — created by game tick/combat functions


-- ===========================================================================
-- messages — Read as sender, recipient, or alliance member. Insert as sender.
-- ===========================================================================

CREATE POLICY "messages_select" ON messages
  FOR SELECT
  USING (
    -- Direct message: sender or recipient
    get_player_id(server_id) IN (sender_id, recipient_id)
    -- Alliance message: member of the target alliance
    OR (
      alliance_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM alliance_members am
        WHERE am.alliance_id = messages.alliance_id
        AND am.player_id = get_player_id(server_id)
      )
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = get_player_id(server_id)
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE
  USING (
    -- Only sender can edit (e.g., mark as read by sender is handled differently)
    sender_id = get_player_id(server_id)
    -- Or recipient can mark as read
    OR recipient_id = get_player_id(server_id)
  );

-- No DELETE — messages are historical


-- ===========================================================================
-- notifications — Read/update only own
-- ===========================================================================

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = notifications.player_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = notifications.player_id
      AND p.user_id = auth.uid()
    )
  );

-- No INSERT/DELETE — notifications are created/managed by game functions


-- ===========================================================================
-- Definition tables — Read-only for all authenticated users
-- building_defs, unit_defs, research_defs, alignment_defs
-- ===========================================================================

CREATE POLICY "building_defs_select" ON building_defs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "unit_defs_select" ON unit_defs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "research_defs_select" ON research_defs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "alignment_defs_select" ON alignment_defs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- No INSERT/UPDATE/DELETE on definition tables — seed data only

-- ============================================================================
-- 016_critical_fixes.sql
-- CRITICAL: Fixes that unblock the entire game
--
-- Issues:
--   1. armies.is_garrison column missing (causes 400 on every armies query)
--   2. join_server uses owner_id instead of player_id for cities INSERT
--      (capital city was never created)
--   3. RLS policies on cities reference owner_id instead of player_id
--
-- Run ALL statements in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- 1. Add is_garrison column to armies table
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'armies' AND column_name = 'is_garrison'
  ) THEN
    ALTER TABLE armies ADD COLUMN is_garrison BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;


-- =========================================================================
-- 2. Fix join_server — use player_id instead of owner_id for cities
-- =========================================================================
CREATE OR REPLACE FUNCTION join_server(
  p_server_id   UUID,
  p_display_name TEXT,
  p_alignment    TEXT
)
RETURNS UUID AS $$
DECLARE
  v_player_id     UUID;
  v_server        RECORD;
  v_player_count  INT;
  v_starting_tile RECORD;
  v_city_id       UUID;
  v_resource_types TEXT[] := ARRAY['money', 'food', 'steel', 'oil', 'manpower', 'ammunition', 'copper', 'coal', 'iron'];
  v_starting_amounts INT[];
  r TEXT;
  i INT;
BEGIN
  -- Validate server
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Server not found'; END IF;
  IF v_server.status NOT IN ('lobby', 'active') THEN
    RAISE EXCEPTION 'Server is not accepting players (status: %)', v_server.status;
  END IF;

  -- Validate alignment
  IF p_alignment NOT IN ('germany', 'uk', 'usa', 'ussr', 'japan', 'italy', 'france') THEN
    RAISE EXCEPTION 'Invalid alignment: %', p_alignment;
  END IF;

  -- Check not already on server
  IF EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'You are already on this server';
  END IF;

  -- Check max players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE server_id = p_server_id;
  IF v_player_count >= v_server.max_players THEN
    RAISE EXCEPTION 'Server is full';
  END IF;

  -- Create player
  INSERT INTO players (user_id, server_id, display_name, alignment)
  VALUES (auth.uid(), p_server_id, p_display_name, p_alignment)
  RETURNING id INTO v_player_id;

  -- Create reputation
  INSERT INTO reputation (player_id, score) VALUES (v_player_id, 50);

  -- Assign 3 starting tiles
  FOR v_starting_tile IN
    SELECT t.id, t.terrain_type, t.resource_type
    FROM tiles t
    WHERE t.server_id = p_server_id
    AND t.owner_id IS NULL
    AND t.terrain_type NOT IN ('water', 'mountain')
    ORDER BY
      CASE WHEN t.resource_type IS NULL AND t.terrain_type = 'plains' THEN 0 ELSE 1 END,
      random()
    LIMIT 3
  LOOP
    UPDATE tiles
    SET owner_id = v_player_id,
        is_explored_by = array_append(is_explored_by, v_player_id)
    WHERE id = v_starting_tile.id AND server_id = p_server_id;
  END LOOP;

  -- Find best tile for capital
  SELECT t.id INTO v_starting_tile
  FROM tiles t
  WHERE t.server_id = p_server_id AND t.owner_id = v_player_id
  AND t.resource_type IS NULL AND t.terrain_type = 'plains'
  LIMIT 1;

  IF v_starting_tile IS NULL THEN
    SELECT t.id INTO v_starting_tile
    FROM tiles t
    WHERE t.server_id = p_server_id AND t.owner_id = v_player_id
    LIMIT 1;
  END IF;

  -- Create capital city (FIX: player_id, not owner_id)
  INSERT INTO cities (
    player_id, tile_id, server_id, name, is_capital, level,
    land_quality_at_founding
  )
  VALUES (
    v_player_id, v_starting_tile.id, p_server_id,
    p_display_name || '''s Capital', true, 1, 100.0
  )
  RETURNING id INTO v_city_id;

  -- Seed starting resources
  v_starting_amounts := ARRAY[500, 300, 200, 150, 100, 100, 100, 150, 150];

  CASE p_alignment
    WHEN 'germany' THEN v_starting_amounts := ARRAY[400, 240, 160, 120, 80, 120, 80, 120, 120];
    WHEN 'usa' THEN v_starting_amounts := ARRAY[550, 330, 220, 165, 110, 110, 110, 165, 165];
    WHEN 'ussr' THEN v_starting_amounts := ARRAY[400, 400, 150, 100, 200, 80, 80, 200, 200];
    WHEN 'uk' THEN v_starting_amounts := ARRAY[500, 300, 200, 180, 100, 100, 100, 150, 150];
    WHEN 'japan' THEN v_starting_amounts := ARRAY[450, 280, 200, 90, 100, 120, 80, 130, 130];
    WHEN 'italy' THEN v_starting_amounts := ARRAY[480, 320, 180, 140, 90, 90, 110, 160, 160];
    WHEN 'france' THEN v_starting_amounts := ARRAY[500, 300, 200, 130, 100, 100, 100, 150, 150];
    ELSE NULL;
  END CASE;

  FOR i IN 1..array_length(v_resource_types, 1) LOOP
    INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
    VALUES (v_city_id, v_resource_types[i], v_starting_amounts[i], 0, 1000);
  END LOOP;

  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 3. Fix RLS policies on cities table (owner_id → player_id)
-- =========================================================================

-- Drop existing broken policies
DROP POLICY IF EXISTS "cities_select" ON cities;
DROP POLICY IF EXISTS "cities_insert" ON cities;
DROP POLICY IF EXISTS "cities_update" ON cities;
DROP POLICY IF EXISTS "cities_delete" ON cities;

-- Recreate with correct column name
CREATE POLICY "cities_select" ON cities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "cities_insert" ON cities
  FOR INSERT WITH CHECK (
    player_id = get_player_id(server_id)
  );

CREATE POLICY "cities_update" ON cities
  FOR UPDATE USING (
    player_id = get_player_id(server_id)
  );

CREATE POLICY "cities_delete" ON cities
  FOR DELETE USING (
    player_id = get_player_id(server_id)
  );


-- =========================================================================
-- 4. Fix build_city RPC (owner_id → player_id)
-- =========================================================================
CREATE OR REPLACE FUNCTION build_city(
  p_tile_id   INT,
  p_server_id UUID,
  p_name      TEXT
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_tile      RECORD;
  v_city_id   UUID;
  v_cost_money INT := 500;
  v_cost_steel INT := 100;
  v_cost_manpower INT := 50;
  v_land_quality REAL;
  v_cost_mult REAL;
BEGIN
  v_player_id := get_player_id(p_server_id);

  -- Get tile
  SELECT * INTO v_tile FROM tiles
  WHERE id = p_tile_id AND server_id = p_server_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Tile not found'; END IF;
  IF v_tile.owner_id != v_player_id THEN RAISE EXCEPTION 'You do not own this tile'; END IF;
  IF v_tile.terrain_type IN ('water', 'mountain') THEN RAISE EXCEPTION 'Cannot build city on %', v_tile.terrain_type; END IF;

  -- Check no existing city
  IF EXISTS (SELECT 1 FROM cities WHERE tile_id = p_tile_id AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'Already a city on this tile';
  END IF;

  v_land_quality := v_tile.land_quality;
  v_cost_mult := 2.0 - v_land_quality / 100.0;

  -- Check resources
  IF get_player_resource_total(v_player_id, 'money') < v_cost_money * v_cost_mult THEN
    RAISE EXCEPTION 'Insufficient money (short by %)', (v_cost_money * v_cost_mult) - get_player_resource_total(v_player_id, 'money');
  END IF;

  PERFORM deduct_player_resource(v_player_id, 'money', CEIL(v_cost_money * v_cost_mult));
  PERFORM deduct_player_resource(v_player_id, 'steel', CEIL(v_cost_steel * v_cost_mult));

  -- Create city (FIX: player_id, not owner_id)
  INSERT INTO cities (
    player_id, tile_id, server_id, name, is_capital, level,
    land_quality_at_founding
  )
  VALUES (
    v_player_id, p_tile_id, p_server_id, p_name, false, 1, v_land_quality
  )
  RETURNING id INTO v_city_id;

  -- Seed basic resources
  INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
  VALUES
    (v_city_id, 'money', 0, 0, 500),
    (v_city_id, 'food', 0, 0, 500),
    (v_city_id, 'steel', 0, 0, 500),
    (v_city_id, 'oil', 0, 0, 500),
    (v_city_id, 'manpower', 0, 0, 500);

  RETURN v_city_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

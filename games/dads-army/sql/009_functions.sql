-- ============================================================================
-- 009_functions.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- RPC functions (player actions) and game tick logic
-- ============================================================================
-- Depends on: 002-007 table files, 008_rls_policies.sql
-- ============================================================================
-- All state-changing functions are SECURITY DEFINER to bypass RLS and
-- perform their own validation. Called from the frontend via supabase.rpc()
-- or by pg_cron (game tick).
-- ============================================================================


-- ===========================================================================
-- 1. join_server — Player joins a game server
-- ===========================================================================
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
  -- Validate server exists and is joinable
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Server not found';
  END IF;
  IF v_server.status NOT IN ('lobby', 'active') THEN
    RAISE EXCEPTION 'Server is not accepting players (status: %)', v_server.status;
  END IF;

  -- Validate alignment
  IF p_alignment NOT IN ('germany', 'uk', 'usa', 'ussr', 'japan', 'italy', 'france') THEN
    RAISE EXCEPTION 'Invalid alignment: %', p_alignment;
  END IF;

  -- Check player not already on server
  IF EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'You are already on this server';
  END IF;

  -- Check max players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE server_id = p_server_id;
  IF v_player_count >= v_server.max_players THEN
    RAISE EXCEPTION 'Server is full (% / %)', v_player_count, v_server.max_players;
  END IF;

  -- Create player
  INSERT INTO players (user_id, server_id, display_name, alignment)
  VALUES (auth.uid(), p_server_id, p_display_name, p_alignment)
  RETURNING id INTO v_player_id;

  -- Create reputation row
  INSERT INTO reputation (player_id, score) VALUES (v_player_id, 50);

  -- Assign starting tiles: find 3 unclaimed tiles (prefer disused plains)
  -- At least one must be suitable for a capital city (plains/disused)
  FOR v_starting_tile IN
    SELECT t.id, t.terrain_type, t.resource_type
    FROM tiles t
    WHERE t.server_id = p_server_id
    AND t.owner_id IS NULL
    AND t.terrain_type NOT IN ('water', 'mountain')
    -- Prefer clustering: pick tiles adjacent to each other
    ORDER BY
      -- Prefer plains for the first tile (capital location)
      CASE WHEN t.resource_type IS NULL AND t.terrain_type = 'plains' THEN 0 ELSE 1 END,
      random()
    LIMIT 3
  LOOP
    UPDATE tiles
    SET owner_id = v_player_id,
        is_explored_by = array_append(is_explored_by, v_player_id)
    WHERE id = v_starting_tile.id AND server_id = p_server_id;
  END LOOP;

  -- Find the best tile for capital (disused land = no resource, plains terrain)
  SELECT t.id INTO v_starting_tile
  FROM tiles t
  WHERE t.server_id = p_server_id
  AND t.owner_id = v_player_id
  AND t.resource_type IS NULL
  AND t.terrain_type = 'plains'
  LIMIT 1;

  -- Fallback: any owned tile
  IF v_starting_tile IS NULL THEN
    SELECT t.id INTO v_starting_tile
    FROM tiles t
    WHERE t.server_id = p_server_id AND t.owner_id = v_player_id
    LIMIT 1;
  END IF;

  -- Create capital city
  INSERT INTO cities (
    owner_id, tile_id, server_id, name, is_capital, level,
    land_quality_at_founding
  )
  VALUES (
    v_player_id, v_starting_tile.id, p_server_id,
    p_display_name || '''s Capital', true, 1, 100.0
  )
  RETURNING id INTO v_city_id;

  -- Seed starting resources based on alignment
  -- Base amounts; alignment modifiers applied below
  v_starting_amounts := ARRAY[500, 300, 200, 150, 100, 100, 100, 150, 150];

  -- Alignment-specific adjustments
  CASE p_alignment
    WHEN 'germany' THEN
      -- Strong military start, fewer resources (-20%)
      v_starting_amounts := ARRAY[400, 240, 160, 120, 80, 120, 80, 120, 120];
    WHEN 'usa' THEN
      -- Industrial bonus (+25% factory, +10% resources)
      v_starting_amounts := ARRAY[550, 330, 220, 165, 110, 110, 110, 165, 165];
    WHEN 'ussr' THEN
      -- Manpower surplus, less industry
      v_starting_amounts := ARRAY[400, 400, 150, 100, 200, 80, 80, 200, 200];
    WHEN 'uk' THEN
      -- Balanced with intelligence focus
      v_starting_amounts := ARRAY[500, 300, 200, 180, 100, 100, 100, 150, 150];
    WHEN 'japan' THEN
      -- Naval focus, fewer land resources
      v_starting_amounts := ARRAY[450, 350, 180, 120, 120, 80, 60, 120, 120];
    WHEN 'italy' THEN
      -- Moderate across the board
      v_starting_amounts := ARRAY[480, 280, 180, 130, 90, 90, 90, 140, 140];
    WHEN 'france' THEN
      -- Strong defense/economy, weaker offense
      v_starting_amounts := ARRAY[550, 350, 180, 140, 80, 80, 120, 160, 160];
  END CASE;

  -- Insert city_resources for each resource type
  FOR i IN 1..array_length(v_resource_types, 1) LOOP
    INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
    VALUES (v_city_id, v_resource_types[i], v_starting_amounts[i], 0, 500);
  END LOOP;

  -- Explore tiles adjacent to starting tiles (fog of war reveal)
  UPDATE tiles
  SET is_explored_by = array_append(is_explored_by, v_player_id)
  WHERE server_id = p_server_id
  AND id IN (
    SELECT CASE WHEN ta.tile_a = ANY(
      SELECT t2.id FROM tiles t2 WHERE t2.server_id = p_server_id AND t2.owner_id = v_player_id
    ) THEN ta.tile_b ELSE ta.tile_a END
    FROM tile_adjacency ta
    WHERE ta.server_id = p_server_id
    AND (
      ta.tile_a IN (SELECT t2.id FROM tiles t2 WHERE t2.server_id = p_server_id AND t2.owner_id = v_player_id)
      OR ta.tile_b IN (SELECT t2.id FROM tiles t2 WHERE t2.server_id = p_server_id AND t2.owner_id = v_player_id)
    )
  )
  AND NOT (v_player_id = ANY(is_explored_by));

  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 2. build_city — Create a new city on an owned tile
-- ===========================================================================
CREATE OR REPLACE FUNCTION build_city(
  p_tile_id    INT,
  p_server_id  UUID,
  p_name       TEXT
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_tile      RECORD;
  v_city_id   UUID;
  v_cost_money INT := 1000;
  v_cost_steel INT := 200;
  v_resource_types TEXT[] := ARRAY['money', 'food', 'steel', 'oil', 'manpower', 'ammunition', 'copper', 'coal', 'iron'];
  r TEXT;
BEGIN
  v_player_id := get_player_id(p_server_id);
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'You are not a player on this server';
  END IF;

  -- Validate tile
  SELECT * INTO v_tile FROM tiles
  WHERE id = p_tile_id AND server_id = p_server_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tile not found';
  END IF;
  IF v_tile.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this tile';
  END IF;
  IF v_tile.terrain_type = 'water' THEN
    RAISE EXCEPTION 'Cannot build a city on water';
  END IF;

  -- Check: tile is disused land (no resource) OR resource tile <20% reserves
  IF v_tile.resource_type IS NOT NULL THEN
    IF v_tile.resource_reserves_remaining IS NOT NULL
       AND v_tile.resource_reserves_total IS NOT NULL
       AND v_tile.resource_reserves_total > 0
       AND (v_tile.resource_reserves_remaining / v_tile.resource_reserves_total) >= 0.20 THEN
      RAISE EXCEPTION 'Resource tile must be below 20%% reserves to build a city (currently at %% %%)',
        ROUND((v_tile.resource_reserves_remaining / v_tile.resource_reserves_total * 100)::numeric, 1);
    END IF;
  END IF;

  -- Check no existing city on tile
  IF EXISTS (SELECT 1 FROM cities WHERE tile_id = p_tile_id AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'There is already a city on this tile';
  END IF;

  -- Apply land quality cost multiplier: cost_mult = 2.0 - (land_quality / 100)
  v_cost_money := CEIL(v_cost_money * (2.0 - v_tile.land_quality / 100.0));
  v_cost_steel := CEIL(v_cost_steel * (2.0 - v_tile.land_quality / 100.0));

  -- Check resources (across all player's cities)
  IF (SELECT COALESCE(SUM(cr.amount), 0) FROM city_resources cr
      JOIN cities c ON c.id = cr.city_id
      WHERE c.owner_id = v_player_id AND cr.resource_type = 'money') < v_cost_money THEN
    RAISE EXCEPTION 'Not enough money (need %)', v_cost_money;
  END IF;
  IF (SELECT COALESCE(SUM(cr.amount), 0) FROM city_resources cr
      JOIN cities c ON c.id = cr.city_id
      WHERE c.owner_id = v_player_id AND cr.resource_type = 'steel') < v_cost_steel THEN
    RAISE EXCEPTION 'Not enough steel (need %)', v_cost_steel;
  END IF;

  -- Deduct resources (from capital city first, then overflow to others)
  PERFORM deduct_player_resource(v_player_id, 'money', v_cost_money);
  PERFORM deduct_player_resource(v_player_id, 'steel', v_cost_steel);

  -- Create city
  INSERT INTO cities (
    owner_id, tile_id, server_id, name, is_capital, level,
    land_quality_at_founding
  )
  VALUES (
    v_player_id, p_tile_id, p_server_id, p_name, false, 1,
    v_tile.land_quality
  )
  RETURNING id INTO v_city_id;

  -- Seed city resources with 0 amounts
  FOREACH r IN ARRAY v_resource_types LOOP
    INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
    VALUES (v_city_id, r, 0, 0, 500);
  END LOOP;

  RETURN v_city_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- Helper: deduct resources from a player (across their cities)
-- Deducts from capital first, then other cities
-- ===========================================================================
CREATE OR REPLACE FUNCTION deduct_player_resource(
  p_player_id    UUID,
  p_resource_type TEXT,
  p_amount        REAL
)
RETURNS void AS $$
DECLARE
  v_remaining  REAL := p_amount;
  v_city_row   RECORD;
  v_deduct     REAL;
BEGIN
  -- Deduct from cities, capital first
  FOR v_city_row IN
    SELECT cr.city_id, cr.amount, c.is_capital
    FROM city_resources cr
    JOIN cities c ON c.id = cr.city_id
    WHERE c.owner_id = p_player_id
    AND cr.resource_type = p_resource_type
    AND cr.amount > 0
    ORDER BY c.is_capital DESC, cr.amount DESC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_deduct := LEAST(v_city_row.amount, v_remaining);
    UPDATE city_resources
    SET amount = amount - v_deduct
    WHERE city_id = v_city_row.city_id AND resource_type = p_resource_type;
    v_remaining := v_remaining - v_deduct;
  END LOOP;

  IF v_remaining > 0.01 THEN
    RAISE EXCEPTION 'Insufficient % (short by %)', p_resource_type, ROUND(v_remaining::numeric, 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- Helper: get total resource amount for a player across all cities
-- ===========================================================================
CREATE OR REPLACE FUNCTION get_player_resource_total(
  p_player_id    UUID,
  p_resource_type TEXT
)
RETURNS REAL AS $$
  SELECT COALESCE(SUM(cr.amount), 0)
  FROM city_resources cr
  JOIN cities c ON c.id = cr.city_id
  WHERE c.owner_id = p_player_id
  AND cr.resource_type = p_resource_type;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ===========================================================================
-- 3. build_building — Construct a building in a city slot
-- ===========================================================================
CREATE OR REPLACE FUNCTION build_building(
  p_city_id       UUID,
  p_building_def  TEXT,
  p_slot_index    INT
)
RETURNS UUID AS $$
DECLARE
  v_player_id   UUID;
  v_city        RECORD;
  v_def         RECORD;
  v_building_id UUID;
  v_build_time  INTERVAL;
  v_max_slots   INT;
BEGIN
  -- Get city and validate ownership
  SELECT c.*, p.server_id AS p_server_id
  INTO v_city
  FROM cities c
  JOIN players p ON p.id = c.owner_id
  WHERE c.id = p_city_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'City not found';
  END IF;

  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this city';
  END IF;

  -- Get building definition
  SELECT * INTO v_def FROM building_defs WHERE name = p_building_def;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown building type: %', p_building_def;
  END IF;

  -- Check slot limits: city level determines available slots
  -- Level 1 = 3 slots, Level 2 = 5, Level 3 = 7, Level 4 = 9, Level 5 = 12
  v_max_slots := CASE v_city.level
    WHEN 1 THEN 3 WHEN 2 THEN 5 WHEN 3 THEN 7 WHEN 4 THEN 9 ELSE 12
  END;
  IF p_slot_index < 0 OR p_slot_index >= v_max_slots THEN
    RAISE EXCEPTION 'Slot index % is out of range (city level % has % slots)',
      p_slot_index, v_city.level, v_max_slots;
  END IF;

  -- Check slot not occupied
  IF EXISTS (SELECT 1 FROM buildings WHERE city_id = p_city_id AND slot_index = p_slot_index) THEN
    RAISE EXCEPTION 'Slot % is already occupied', p_slot_index;
  END IF;

  -- Check not already constructing another building in this city
  IF EXISTS (SELECT 1 FROM buildings WHERE city_id = p_city_id AND is_constructing = true) THEN
    RAISE EXCEPTION 'City is already constructing a building';
  END IF;

  -- Check prerequisites (building_defs.prerequisites is JSONB array of building names)
  IF v_def.prerequisites IS NOT NULL AND jsonb_array_length(v_def.prerequisites) > 0 THEN
    IF NOT (
      SELECT bool_and(EXISTS (
        SELECT 1 FROM buildings b
        WHERE b.city_id = p_city_id
        AND b.building_def = prereq.value #>> '{}'
        AND b.level >= 1
        AND b.is_constructing = false
      ))
      FROM jsonb_array_elements(v_def.prerequisites) AS prereq(value)
    ) THEN
      RAISE EXCEPTION 'Prerequisites not met for %', p_building_def;
    END IF;
  END IF;

  -- Check resources
  IF get_player_resource_total(v_player_id, 'money') < (v_def.cost_money)::real THEN
    RAISE EXCEPTION 'Not enough money';
  END IF;
  IF get_player_resource_total(v_player_id, 'steel') < (v_def.cost_steel)::real THEN
    RAISE EXCEPTION 'Not enough steel';
  END IF;

  -- Apply land quality cost multiplier
  PERFORM deduct_player_resource(v_player_id, 'money',
    CEIL((v_def.cost_money)::real * (2.0 - v_city.land_quality_at_founding / 100.0)));
  PERFORM deduct_player_resource(v_player_id, 'steel',
    CEIL((v_def.cost_steel)::real * (2.0 - v_city.land_quality_at_founding / 100.0)));

  -- Calculate build time (ticks * 60 seconds, adjusted by land quality)
  v_build_time := make_interval(secs => v_def.build_time_ticks * 60);

  -- Create building
  INSERT INTO buildings (
    city_id, building_def, slot_index, level,
    is_constructing, construction_completes_at
  )
  VALUES (
    p_city_id, p_building_def, p_slot_index, 0,
    true, now() + v_build_time
  )
  RETURNING id INTO v_building_id;

  RETURN v_building_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 4. upgrade_building — Upgrade an existing building to the next level
-- ===========================================================================
CREATE OR REPLACE FUNCTION upgrade_building(p_building_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_building  RECORD;
  v_city      RECORD;
  v_def       RECORD;
  v_max_level INT;
  v_cost_mult REAL;
  v_build_time INTERVAL;
BEGIN
  -- Get building with city info
  SELECT b.*, c.owner_id, c.land_quality_at_founding, c.level AS city_level,
         p.server_id
  INTO v_building
  FROM buildings b
  JOIN cities c ON c.id = b.city_id
  JOIN players p ON p.id = c.owner_id
  WHERE b.id = p_building_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Building not found';
  END IF;

  v_player_id := get_player_id(v_building.server_id);
  IF v_building.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this building';
  END IF;

  IF v_building.is_constructing THEN
    RAISE EXCEPTION 'Building is already under construction';
  END IF;

  -- Get building definition
  SELECT * INTO v_def FROM building_defs WHERE name = v_building.building_def;

  -- Max level based on land quality: max_level = ceil(5 * (land_quality / 100))
  v_max_level := CEIL(5.0 * v_building.land_quality_at_founding / 100.0);
  IF v_building.level >= v_max_level THEN
    RAISE EXCEPTION 'Building is at max level (% / %) due to land quality',
      v_building.level, v_max_level;
  END IF;

  IF v_building.level >= 5 THEN
    RAISE EXCEPTION 'Building is at absolute max level (5)';
  END IF;

  -- Cost scales with level: base * (level + 1)
  v_cost_mult := (v_building.level + 1)::real * (2.0 - v_building.land_quality_at_founding / 100.0);

  IF get_player_resource_total(v_player_id, 'money') < (v_def.cost_money * v_cost_mult) THEN
    RAISE EXCEPTION 'Not enough money for upgrade';
  END IF;
  IF get_player_resource_total(v_player_id, 'steel') < (v_def.cost_steel * v_cost_mult) THEN
    RAISE EXCEPTION 'Not enough steel for upgrade';
  END IF;

  PERFORM deduct_player_resource(v_player_id, 'money', CEIL(v_def.cost_money * v_cost_mult));
  PERFORM deduct_player_resource(v_player_id, 'steel', CEIL(v_def.cost_steel * v_cost_mult));

  -- Build time scales with level
  v_build_time := make_interval(secs => v_def.build_time_ticks * 60 * (v_building.level + 1));

  UPDATE buildings
  SET is_constructing = true,
      construction_completes_at = now() + v_build_time
  WHERE id = p_building_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 5. claim_tile — Claim an unclaimed adjacent tile
-- ===========================================================================
CREATE OR REPLACE FUNCTION claim_tile(
  p_tile_id    INT,
  p_server_id  UUID
)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_tile      RECORD;
BEGIN
  v_player_id := get_player_id(p_server_id);
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'You are not a player on this server';
  END IF;

  -- Get target tile
  SELECT * INTO v_tile FROM tiles WHERE id = p_tile_id AND server_id = p_server_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tile not found';
  END IF;
  IF v_tile.owner_id IS NOT NULL THEN
    RAISE EXCEPTION 'Tile is already claimed';
  END IF;
  IF v_tile.terrain_type = 'water' THEN
    RAISE EXCEPTION 'Cannot claim water tiles';
  END IF;

  -- Check adjacency: target tile must be adjacent to a tile the player owns
  IF NOT EXISTS (
    SELECT 1 FROM tile_adjacency ta
    JOIN tiles t ON (
      (ta.tile_a = p_tile_id AND ta.tile_b = t.id)
      OR (ta.tile_b = p_tile_id AND ta.tile_a = t.id)
    )
    WHERE ta.server_id = p_server_id
    AND t.server_id = p_server_id
    AND t.owner_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Tile is not adjacent to any of your tiles';
  END IF;

  -- Claim the tile
  UPDATE tiles
  SET owner_id = v_player_id,
      is_explored_by = CASE
        WHEN v_player_id = ANY(is_explored_by) THEN is_explored_by
        ELSE array_append(is_explored_by, v_player_id)
      END
  WHERE id = p_tile_id AND server_id = p_server_id;

  -- Reveal adjacent tiles (fog of war)
  UPDATE tiles
  SET is_explored_by = array_append(is_explored_by, v_player_id)
  WHERE server_id = p_server_id
  AND NOT (v_player_id = ANY(is_explored_by))
  AND id IN (
    SELECT CASE WHEN ta.tile_a = p_tile_id THEN ta.tile_b ELSE ta.tile_a END
    FROM tile_adjacency ta
    WHERE ta.server_id = p_server_id
    AND (ta.tile_a = p_tile_id OR ta.tile_b = p_tile_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 6. develop_resource_field — Build extraction infrastructure on a tile
-- ===========================================================================
CREATE OR REPLACE FUNCTION develop_resource_field(
  p_tile_id    INT,
  p_server_id  UUID
)
RETURNS UUID AS $$
DECLARE
  v_player_id   UUID;
  v_tile        RECORD;
  v_field_id    UUID;
  v_base_rate   REAL;
  v_cost_money  INT := 100;
  v_cost_steel  INT := 10;
BEGIN
  v_player_id := get_player_id(p_server_id);
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'You are not a player on this server';
  END IF;

  SELECT * INTO v_tile FROM tiles WHERE id = p_tile_id AND server_id = p_server_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tile not found';
  END IF;
  IF v_tile.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this tile';
  END IF;
  IF v_tile.resource_type IS NULL THEN
    RAISE EXCEPTION 'This tile has no resource to develop';
  END IF;

  -- Check not already developed
  IF EXISTS (SELECT 1 FROM resource_fields WHERE tile_id = p_tile_id AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'This tile already has a developed resource field';
  END IF;

  -- Base production rates by resource type
  v_base_rate := CASE v_tile.resource_type
    WHEN 'iron' THEN 10.0
    WHEN 'coal' THEN 8.0
    WHEN 'oil' THEN 6.0
    WHEN 'bauxite' THEN 5.0
    WHEN 'rubber' THEN 4.0
    WHEN 'copper' THEN 7.0
    WHEN 'tungsten' THEN 2.0
    WHEN 'farmland' THEN 12.0
    ELSE 5.0
  END;

  -- Check and deduct resources
  IF get_player_resource_total(v_player_id, 'money') < v_cost_money THEN
    RAISE EXCEPTION 'Not enough money (need %)', v_cost_money;
  END IF;
  IF get_player_resource_total(v_player_id, 'steel') < v_cost_steel THEN
    RAISE EXCEPTION 'Not enough steel (need %)', v_cost_steel;
  END IF;
  PERFORM deduct_player_resource(v_player_id, 'money', v_cost_money);
  PERFORM deduct_player_resource(v_player_id, 'steel', v_cost_steel);

  -- Create resource field at infrastructure level 1
  INSERT INTO resource_fields (
    tile_id, server_id, owner_id, resource_type,
    infrastructure_level, production_rate, extraction_intensity,
    status
  )
  VALUES (
    p_tile_id, p_server_id, v_player_id, v_tile.resource_type,
    1, v_base_rate, 'normal', 'productive'
  )
  RETURNING id INTO v_field_id;

  RETURN v_field_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 7. set_extraction_intensity — Change extraction intensity on a field
-- ===========================================================================
CREATE OR REPLACE FUNCTION set_extraction_intensity(
  p_field_id   UUID,
  p_intensity  TEXT
)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_field     RECORD;
BEGIN
  -- Validate intensity
  IF p_intensity NOT IN ('sustainable', 'normal', 'intensive') THEN
    RAISE EXCEPTION 'Invalid intensity: %. Must be sustainable, normal, or intensive', p_intensity;
  END IF;

  SELECT * INTO v_field FROM resource_fields WHERE id = p_field_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource field not found';
  END IF;

  v_player_id := get_player_id(v_field.server_id);
  IF v_field.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this resource field';
  END IF;

  -- Intensive requires infrastructure level 3+
  IF p_intensity = 'intensive' AND v_field.infrastructure_level < 3 THEN
    RAISE EXCEPTION 'Intensive extraction requires infrastructure level 3 or higher (currently level %)',
      v_field.infrastructure_level;
  END IF;

  UPDATE resource_fields
  SET extraction_intensity = p_intensity
  WHERE id = p_field_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 8. train_units — Queue unit training in a city
-- ===========================================================================
CREATE OR REPLACE FUNCTION train_units(
  p_city_id   UUID,
  p_unit_def  TEXT,
  p_quantity  INT
)
RETURNS UUID AS $$
DECLARE
  v_player_id     UUID;
  v_city          RECORD;
  v_def           RECORD;
  v_queue_id      UUID;
  v_total_cost    JSONB;
  v_key           TEXT;
  v_value         REAL;
  v_train_time    INTERVAL;
  v_building_name TEXT;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 100';
  END IF;

  -- Get city
  SELECT c.*, p.server_id AS p_server_id
  INTO v_city
  FROM cities c
  JOIN players p ON p.id = c.owner_id
  WHERE c.id = p_city_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'City not found';
  END IF;

  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this city';
  END IF;

  -- Get unit definition
  SELECT * INTO v_def FROM unit_defs WHERE name = p_unit_def;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown unit type: %', p_unit_def;
  END IF;

  -- Check required building exists in city
  v_building_name := CASE v_def.category
    WHEN 'infantry' THEN 'barracks'
    WHEN 'armor' THEN 'tank_factory'
    WHEN 'artillery' THEN 'artillery_yard'
    ELSE NULL
  END;

  IF v_building_name IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM buildings
      WHERE city_id = p_city_id
      AND building_def = v_building_name
      AND level >= 1
      AND is_constructing = false
    ) THEN
      RAISE EXCEPTION 'City needs a % to train %', v_building_name, p_unit_def;
    END IF;
  END IF;

  -- Calculate total cost (unit cost * quantity)
  -- v_def.training_cost is JSONB like {"manpower": 20, "munitions": 10}
  v_total_cost := v_def.training_cost;

  -- Check and deduct each resource
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_total_cost)
  LOOP
    v_value := v_value::real * p_quantity;
    IF get_player_resource_total(v_player_id, v_key) < v_value THEN
      RAISE EXCEPTION 'Not enough % (need %, have %)',
        v_key, v_value, get_player_resource_total(v_player_id, v_key);
    END IF;
  END LOOP;

  -- Deduct resources
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_total_cost)
  LOOP
    PERFORM deduct_player_resource(v_player_id, v_key, v_value::real * p_quantity);
  END LOOP;

  -- Calculate training time: training_time_ticks * 60s * quantity
  -- (sequential training within the building queue)
  v_train_time := make_interval(secs => v_def.training_time_ticks * 60 * p_quantity);

  -- Create training queue entry
  INSERT INTO training_queue (
    city_id, unit_def, quantity, completes_at
  )
  VALUES (
    p_city_id, p_unit_def, p_quantity, now() + v_train_time
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 9. form_army — Create an army from city garrison units
-- ===========================================================================
CREATE OR REPLACE FUNCTION form_army(
  p_city_id UUID,
  p_name    TEXT,
  p_units   JSONB
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_city      RECORD;
  v_army_id   UUID;
  v_unit      JSONB;
  v_unit_def  TEXT;
  v_quantity  INT;
  v_garrison  RECORD;
BEGIN
  -- Get city
  SELECT c.*, p.server_id AS p_server_id
  INTO v_city
  FROM cities c
  JOIN players p ON p.id = c.owner_id
  WHERE c.id = p_city_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'City not found';
  END IF;

  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this city';
  END IF;

  -- Validate p_units format: [{"unit_def": "riflemen", "quantity": 10}, ...]
  IF jsonb_array_length(p_units) = 0 THEN
    RAISE EXCEPTION 'Must include at least one unit type';
  END IF;
  IF jsonb_array_length(p_units) > 10 THEN
    RAISE EXCEPTION 'Maximum 10 unit stacks per army';
  END IF;

  -- Check garrison has enough units (garrison army is tied to the city)
  FOR v_unit IN SELECT * FROM jsonb_array_elements(p_units)
  LOOP
    v_unit_def := v_unit ->> 'unit_def';
    v_quantity := (v_unit ->> 'quantity')::int;

    IF v_quantity < 1 THEN
      RAISE EXCEPTION 'Quantity must be at least 1 for %', v_unit_def;
    END IF;

    -- Check garrison army has enough of this unit type
    SELECT * INTO v_garrison
    FROM army_units au
    JOIN armies a ON a.id = au.army_id
    WHERE a.owner_id = v_player_id
    AND a.tile_id = v_city.tile_id
    AND a.server_id = v_city.p_server_id
    AND a.is_garrison = true
    AND au.unit_def = v_unit_def;

    IF NOT FOUND OR v_garrison.quantity < v_quantity THEN
      RAISE EXCEPTION 'Not enough % in garrison (have %, need %)',
        v_unit_def, COALESCE(v_garrison.quantity, 0), v_quantity;
    END IF;
  END LOOP;

  -- Create army
  INSERT INTO armies (
    owner_id, server_id, tile_id, name, status, is_garrison
  )
  VALUES (
    v_player_id, v_city.p_server_id, v_city.tile_id, p_name, 'idle', false
  )
  RETURNING id INTO v_army_id;

  -- Transfer units from garrison to new army
  FOR v_unit IN SELECT * FROM jsonb_array_elements(p_units)
  LOOP
    v_unit_def := v_unit ->> 'unit_def';
    v_quantity := (v_unit ->> 'quantity')::int;

    -- Reduce garrison
    UPDATE army_units
    SET quantity = quantity - v_quantity
    WHERE army_id = (
      SELECT a.id FROM armies a
      WHERE a.owner_id = v_player_id
      AND a.tile_id = v_city.tile_id
      AND a.server_id = v_city.p_server_id
      AND a.is_garrison = true
    )
    AND unit_def = v_unit_def;

    -- Remove empty garrison stacks
    DELETE FROM army_units
    WHERE quantity <= 0;

    -- Add to new army
    INSERT INTO army_units (army_id, unit_def, quantity, avg_hp_percent, experience_level)
    VALUES (v_army_id, v_unit_def, v_quantity, 1.0, 0);
  END LOOP;

  RETURN v_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 10. march_army — Send an army to a destination tile
-- ===========================================================================
CREATE OR REPLACE FUNCTION march_army(
  p_army_id         UUID,
  p_destination_tile INT
)
RETURNS void AS $$
DECLARE
  v_player_id  UUID;
  v_army       RECORD;
  v_path       INT[];
  v_total_cost REAL := 0;
  v_army_speed REAL;
  v_arrive_at  TIMESTAMPTZ;
BEGIN
  -- Get army
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Army not found';
  END IF;

  v_player_id := get_player_id(v_army.server_id);
  IF v_army.owner_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this army';
  END IF;
  IF v_army.status != 'idle' THEN
    RAISE EXCEPTION 'Army is not idle (status: %)', v_army.status;
  END IF;
  IF v_army.is_garrison THEN
    RAISE EXCEPTION 'Cannot march a garrison army. Form a field army first.';
  END IF;
  IF v_army.tile_id = p_destination_tile THEN
    RAISE EXCEPTION 'Army is already on the destination tile';
  END IF;

  -- Get army speed (slowest unit)
  SELECT COALESCE(MIN(ud.speed), 1)
  INTO v_army_speed
  FROM army_units au
  JOIN unit_defs ud ON ud.name = au.unit_def
  WHERE au.army_id = p_army_id;

  -- BFS pathfinding on tile_adjacency
  v_path := find_path(v_army.tile_id, p_destination_tile, v_army.server_id);

  IF v_path IS NULL OR array_length(v_path, 1) IS NULL THEN
    RAISE EXCEPTION 'No path found to destination tile';
  END IF;

  -- Calculate total movement cost along path
  SELECT SUM(ta.movement_cost)
  INTO v_total_cost
  FROM unnest(v_path[1:array_length(v_path,1)-1]) WITH ORDINALITY AS src(tile, idx),
       unnest(v_path[2:array_length(v_path,1)]) WITH ORDINALITY AS dst(tile, idx2)
  JOIN tile_adjacency ta ON (
    ta.server_id = v_army.server_id
    AND LEAST(src.tile, dst.tile) = ta.tile_a
    AND GREATEST(src.tile, dst.tile) = ta.tile_b
  )
  WHERE src.idx = dst.idx2;

  -- Calculate arrival time: total_cost / speed * tick_duration (60s)
  v_arrive_at := now() + make_interval(secs => CEIL(v_total_cost / v_army_speed) * 60);

  -- Update army
  UPDATE armies
  SET status = 'marching',
      march_path = v_path,
      march_arrives_at = v_arrive_at,
      destination_tile_id = p_destination_tile
  WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- Helper: BFS pathfinding on tile adjacency graph
-- Returns array of tile IDs from start to end (inclusive)
-- ===========================================================================
CREATE OR REPLACE FUNCTION find_path(
  p_start_tile INT,
  p_end_tile   INT,
  p_server_id  UUID
)
RETURNS INT[] AS $$
DECLARE
  v_queue     INT[] := ARRAY[p_start_tile];
  v_visited   INT[] := ARRAY[p_start_tile];
  v_parent    JSONB := jsonb_build_object(p_start_tile::text, NULL);
  v_current   INT;
  v_neighbor  INT;
  v_path      INT[] := '{}';
  v_found     BOOLEAN := false;
  v_iteration INT := 0;
  v_max_iter  INT := 1000; -- Safety limit
BEGIN
  WHILE array_length(v_queue, 1) > 0 AND v_iteration < v_max_iter LOOP
    v_iteration := v_iteration + 1;
    v_current := v_queue[1];
    v_queue := v_queue[2:];

    IF v_current = p_end_tile THEN
      v_found := true;
      EXIT;
    END IF;

    -- Get neighbors
    FOR v_neighbor IN
      SELECT CASE WHEN ta.tile_a = v_current THEN ta.tile_b ELSE ta.tile_a END
      FROM tile_adjacency ta
      WHERE ta.server_id = p_server_id
      AND (ta.tile_a = v_current OR ta.tile_b = v_current)
      -- Exclude water tiles from pathing
      AND EXISTS (
        SELECT 1 FROM tiles t
        WHERE t.id = CASE WHEN ta.tile_a = v_current THEN ta.tile_b ELSE ta.tile_a END
        AND t.server_id = p_server_id
        AND t.terrain_type != 'water'
      )
    LOOP
      IF NOT (v_neighbor = ANY(v_visited)) THEN
        v_visited := array_append(v_visited, v_neighbor);
        v_queue := array_append(v_queue, v_neighbor);
        v_parent := v_parent || jsonb_build_object(v_neighbor::text, v_current);
      END IF;
    END LOOP;
  END LOOP;

  IF NOT v_found THEN
    RETURN NULL;
  END IF;

  -- Reconstruct path from end to start
  v_current := p_end_tile;
  WHILE v_current IS NOT NULL LOOP
    v_path := v_current || v_path;
    v_current := (v_parent ->> v_current::text)::int;
  END LOOP;

  RETURN v_path;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ===========================================================================
-- 11. build_road — Build a road between two adjacent tiles
-- ===========================================================================
CREATE OR REPLACE FUNCTION build_road(
  p_from_tile  INT,
  p_to_tile    INT,
  p_server_id  UUID
)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_cost_money INT := 50;
  v_cost_steel INT := 10;
BEGIN
  v_player_id := get_player_id(p_server_id);
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'You are not a player on this server';
  END IF;

  -- Check both tiles are owned by player or ally
  IF NOT EXISTS (
    SELECT 1 FROM tiles
    WHERE id = p_from_tile AND server_id = p_server_id
    AND (
      owner_id = v_player_id
      OR owner_id IN (
        SELECT am2.player_id FROM alliance_members am1
        JOIN alliance_members am2 ON am1.alliance_id = am2.alliance_id
        WHERE am1.player_id = v_player_id AND am2.player_id != v_player_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'You must own or be allied with the owner of the source tile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM tiles
    WHERE id = p_to_tile AND server_id = p_server_id
    AND (
      owner_id = v_player_id
      OR owner_id IN (
        SELECT am2.player_id FROM alliance_members am1
        JOIN alliance_members am2 ON am1.alliance_id = am2.alliance_id
        WHERE am1.player_id = v_player_id AND am2.player_id != v_player_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'You must own or be allied with the owner of the destination tile';
  END IF;

  -- Check adjacency
  IF NOT EXISTS (
    SELECT 1 FROM tile_adjacency
    WHERE server_id = p_server_id
    AND (
      (tile_a = LEAST(p_from_tile, p_to_tile) AND tile_b = GREATEST(p_from_tile, p_to_tile))
    )
  ) THEN
    RAISE EXCEPTION 'Tiles are not adjacent';
  END IF;

  -- Check resources
  IF get_player_resource_total(v_player_id, 'money') < v_cost_money THEN
    RAISE EXCEPTION 'Not enough money (need %)', v_cost_money;
  END IF;
  IF get_player_resource_total(v_player_id, 'steel') < v_cost_steel THEN
    RAISE EXCEPTION 'Not enough steel (need %)', v_cost_steel;
  END IF;

  PERFORM deduct_player_resource(v_player_id, 'money', v_cost_money);
  PERFORM deduct_player_resource(v_player_id, 'steel', v_cost_steel);

  -- Set road infrastructure on both tiles
  UPDATE tiles SET infrastructure_road = true
  WHERE server_id = p_server_id AND id IN (p_from_tile, p_to_tile);

  -- Reduce movement cost on the adjacency edge
  UPDATE tile_adjacency
  SET movement_cost = GREATEST(movement_cost * 0.5, 0.5)
  WHERE server_id = p_server_id
  AND tile_a = LEAST(p_from_tile, p_to_tile)
  AND tile_b = GREATEST(p_from_tile, p_to_tile);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- 12. process_game_tick — Main game loop (called by pg_cron every minute)
-- ===========================================================================
CREATE OR REPLACE FUNCTION process_game_tick(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_server     RECORD;
  v_tick_count INT;
BEGIN
  -- Get server
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN; -- Server not active, skip
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 1: Complete finished buildings
  -- -----------------------------------------------------------------------
  PERFORM complete_buildings(p_server_id);

  -- -----------------------------------------------------------------------
  -- Step 2: Complete finished training
  -- -----------------------------------------------------------------------
  PERFORM complete_training(p_server_id);

  -- -----------------------------------------------------------------------
  -- Step 3: Complete finished research
  -- -----------------------------------------------------------------------
  PERFORM complete_research(p_server_id);

  -- -----------------------------------------------------------------------
  -- Step 4: Resolve army arrivals
  -- -----------------------------------------------------------------------
  PERFORM resolve_army_arrivals(p_server_id);

  -- -----------------------------------------------------------------------
  -- Step 5: Process resource depletion
  -- -----------------------------------------------------------------------
  PERFORM process_depletion(p_server_id);

  -- -----------------------------------------------------------------------
  -- Step 6: Materialize resources (every 5th tick)
  -- -----------------------------------------------------------------------
  IF (extract(minute FROM now())::int % 5 = 0) THEN
    PERFORM materialize_resources(p_server_id);
  END IF;

  -- -----------------------------------------------------------------------
  -- Step 7: Process supply chains
  -- -----------------------------------------------------------------------
  PERFORM process_supply_chains(p_server_id);

  -- -----------------------------------------------------------------------
  -- Step 8: Degrade ungarrisoned fortifications
  -- -----------------------------------------------------------------------
  PERFORM degrade_fortifications(p_server_id);

  -- -----------------------------------------------------------------------
  -- Step 9: Update server timestamp and day counter
  -- Increment current_day every 24 ticks (1 tick = 1 hour game time)
  -- -----------------------------------------------------------------------
  v_tick_count := COALESCE(
    EXTRACT(EPOCH FROM (now() - COALESCE(v_server.started_at, now())))::int / 60,
    0
  );

  UPDATE game_servers
  SET last_tick_at = now(),
      current_day = v_tick_count / 24
  WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================================================
-- Tick sub-function: Complete finished buildings
-- ===========================================================================
CREATE OR REPLACE FUNCTION complete_buildings(p_server_id UUID)
RETURNS void AS $$
BEGIN
  -- Mark completed buildings: level up and stop construction
  UPDATE buildings b
  SET level = level + 1,
      is_constructing = false,
      construction_completes_at = NULL
  FROM cities c
  JOIN players p ON p.id = c.owner_id
  WHERE b.city_id = c.id
  AND p.server_id = p_server_id
  AND b.is_constructing = true
  AND b.construction_completes_at <= now();

  -- Send notifications for completed buildings
  INSERT INTO notifications (player_id, type, title, body, data)
  SELECT c.owner_id,
         'building_complete',
         'Building Complete',
         b.building_def || ' (Level ' || b.level || ') completed in ' || c.name,
         jsonb_build_object('city_id', c.id, 'building_id', b.id, 'building_def', b.building_def, 'level', b.level)
  FROM buildings b
  JOIN cities c ON c.id = b.city_id
  JOIN players p ON p.id = c.owner_id
  WHERE p.server_id = p_server_id
  AND b.is_constructing = false
  AND b.construction_completes_at IS NULL
  -- Only notify for buildings that just completed (level changed this tick)
  -- We use the fact that construction_completes_at was just set to NULL above
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.player_id = c.owner_id
    AND n.type = 'building_complete'
    AND (n.data ->> 'building_id')::uuid = b.id
    AND (n.data ->> 'level')::int = b.level
  );
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- Tick sub-function: Complete finished training
-- ===========================================================================
CREATE OR REPLACE FUNCTION complete_training(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_queue_row RECORD;
  v_garrison_army_id UUID;
BEGIN
  FOR v_queue_row IN
    SELECT tq.*, c.owner_id, c.tile_id, p.server_id AS srv_id
    FROM training_queue tq
    JOIN cities c ON c.id = tq.city_id
    JOIN players p ON p.id = c.owner_id
    WHERE p.server_id = p_server_id
    AND tq.completes_at <= now()
  LOOP
    -- Find or create garrison army for the city
    SELECT a.id INTO v_garrison_army_id
    FROM armies a
    WHERE a.owner_id = v_queue_row.owner_id
    AND a.tile_id = v_queue_row.tile_id
    AND a.server_id = v_queue_row.srv_id
    AND a.is_garrison = true;

    IF v_garrison_army_id IS NULL THEN
      INSERT INTO armies (owner_id, server_id, tile_id, name, status, is_garrison)
      VALUES (v_queue_row.owner_id, v_queue_row.srv_id, v_queue_row.tile_id, 'Garrison', 'idle', true)
      RETURNING id INTO v_garrison_army_id;
    END IF;

    -- Add units to garrison (merge if same unit type exists)
    IF EXISTS (
      SELECT 1 FROM army_units
      WHERE army_id = v_garrison_army_id AND unit_def = v_queue_row.unit_def
    ) THEN
      UPDATE army_units
      SET quantity = quantity + v_queue_row.quantity
      WHERE army_id = v_garrison_army_id AND unit_def = v_queue_row.unit_def;
    ELSE
      INSERT INTO army_units (army_id, unit_def, quantity, avg_hp_percent, experience_level)
      VALUES (v_garrison_army_id, v_queue_row.unit_def, v_queue_row.quantity, 1.0, 0);
    END IF;

    -- Send notification
    INSERT INTO notifications (player_id, type, title, body, data)
    VALUES (
      v_queue_row.owner_id,
      'training_complete',
      'Training Complete',
      v_queue_row.quantity || 'x ' || v_queue_row.unit_def || ' trained in your city',
      jsonb_build_object('city_id', v_queue_row.city_id, 'unit_def', v_queue_row.unit_def, 'quantity', v_queue_row.quantity)
    );

    -- Remove from queue
    DELETE FROM training_queue WHERE id = v_queue_row.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- Tick sub-function: Complete finished research
-- ===========================================================================
CREATE OR REPLACE FUNCTION complete_research(p_server_id UUID)
RETURNS void AS $$
BEGIN
  -- Complete research that has finished
  UPDATE player_research pr
  SET level = level + 1,
      is_researching = false,
      research_completes_at = NULL
  FROM players p
  WHERE pr.player_id = p.id
  AND p.server_id = p_server_id
  AND pr.is_researching = true
  AND pr.research_completes_at <= now();

  -- Notify players
  INSERT INTO notifications (player_id, type, title, body, data)
  SELECT pr.player_id,
         'research_complete',
         'Research Complete',
         pr.research_def || ' (Level ' || pr.level || ') has been researched',
         jsonb_build_object('research_def', pr.research_def, 'level', pr.level)
  FROM player_research pr
  JOIN players p ON p.id = pr.player_id
  WHERE p.server_id = p_server_id
  AND pr.is_researching = false
  AND pr.research_completes_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.player_id = pr.player_id
    AND n.type = 'research_complete'
    AND (n.data ->> 'research_def') = pr.research_def
    AND (n.data ->> 'level')::int = pr.level
  );
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- Tick sub-function: Resolve army arrivals
-- ===========================================================================
CREATE OR REPLACE FUNCTION resolve_army_arrivals(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_army RECORD;
  v_dest_tile RECORD;
BEGIN
  FOR v_army IN
    SELECT * FROM armies
    WHERE server_id = p_server_id
    AND status = 'marching'
    AND march_arrives_at <= now()
  LOOP
    -- Get destination tile
    SELECT * INTO v_dest_tile
    FROM tiles
    WHERE id = v_army.destination_tile_id AND server_id = p_server_id;

    -- Check if destination is hostile
    IF v_dest_tile.owner_id IS NOT NULL
       AND v_dest_tile.owner_id != v_army.owner_id
       -- Check if not allied
       AND NOT EXISTS (
         SELECT 1 FROM alliance_members am1
         JOIN alliance_members am2 ON am1.alliance_id = am2.alliance_id
         WHERE am1.player_id = v_army.owner_id
         AND am2.player_id = v_dest_tile.owner_id
       )
    THEN
      -- Hostile tile: resolve combat
      PERFORM resolve_combat(v_army.id, v_dest_tile.id, p_server_id);
    ELSE
      -- Friendly or unclaimed: just arrive
      UPDATE armies
      SET status = 'idle',
          tile_id = v_army.destination_tile_id,
          march_path = NULL,
          march_arrives_at = NULL,
          destination_tile_id = NULL
      WHERE id = v_army.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- Tick sub-function: Process resource depletion
-- ===========================================================================
CREATE OR REPLACE FUNCTION process_depletion(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field RECORD;
  v_extraction REAL;
  v_depletion_rate REAL;
  v_intensity_mult REAL;
  v_depletion_mult REAL;
  v_decline_factor REAL;
BEGIN
  FOR v_field IN
    SELECT rf.*, t.resource_reserves_remaining, t.resource_reserves_total,
           t.soil_quality, t.resource_type AS tile_resource_type
    FROM resource_fields rf
    JOIN tiles t ON t.id = rf.tile_id AND t.server_id = rf.server_id
    WHERE rf.server_id = p_server_id
    AND rf.status IN ('productive', 'declining')
  LOOP
    -- Skip farmland (uses soil quality, not depletion)
    IF v_field.tile_resource_type = 'farmland' THEN
      CONTINUE;
    END IF;

    -- Calculate intensity multipliers
    v_intensity_mult := CASE v_field.extraction_intensity
      WHEN 'sustainable' THEN 0.7
      WHEN 'normal' THEN 1.0
      WHEN 'intensive' THEN 1.5
      ELSE 1.0
    END;
    v_depletion_mult := CASE v_field.extraction_intensity
      WHEN 'sustainable' THEN 0.7
      WHEN 'normal' THEN 1.0
      WHEN 'intensive' THEN 1.8 -- 20% waste penalty
      ELSE 1.0
    END;

    -- Calculate effective extraction (with decline factor)
    v_extraction := v_field.production_rate * v_intensity_mult;

    IF v_field.resource_reserves_remaining IS NOT NULL
       AND v_field.resource_reserves_total IS NOT NULL
       AND v_field.resource_reserves_total > 0
       AND v_field.resource_reserves_remaining < v_field.resource_reserves_total * 0.50 THEN
      v_decline_factor := v_field.resource_reserves_remaining / (v_field.resource_reserves_total * 0.50);
      v_extraction := v_extraction * v_decline_factor;
    END IF;

    -- Calculate depletion (may be higher than extraction due to waste)
    v_depletion_rate := v_field.production_rate * v_depletion_mult;

    -- Apply depletion to tile
    UPDATE tiles
    SET resource_reserves_remaining = GREATEST(resource_reserves_remaining - v_depletion_rate, 0)
    WHERE id = v_field.tile_id AND server_id = p_server_id;

    -- Update field status based on remaining reserves
    IF v_field.resource_reserves_remaining IS NOT NULL AND v_field.resource_reserves_remaining <= v_depletion_rate THEN
      -- Exhausted
      UPDATE resource_fields SET status = 'exhausted', production_rate = 0
      WHERE id = v_field.id;

      -- Notify owner
      INSERT INTO notifications (player_id, type, title, body, data)
      VALUES (
        v_field.owner_id, 'field_exhausted', 'Resource Exhausted',
        v_field.resource_type || ' field is exhausted',
        jsonb_build_object('field_id', v_field.id, 'tile_id', v_field.tile_id)
      );
    ELSIF v_field.resource_reserves_remaining IS NOT NULL
      AND v_field.resource_reserves_total IS NOT NULL
      AND v_field.resource_reserves_remaining < v_field.resource_reserves_total * 0.50
      AND v_field.status = 'productive' THEN
      -- Transition to declining
      UPDATE resource_fields SET status = 'declining' WHERE id = v_field.id;

      INSERT INTO notifications (player_id, type, title, body, data)
      VALUES (
        v_field.owner_id, 'field_declining', 'Resource Declining',
        v_field.resource_type || ' field is declining',
        jsonb_build_object('field_id', v_field.id, 'tile_id', v_field.tile_id)
      );
    END IF;

    -- Intensive mode: 1% chance of infrastructure damage per tick
    IF v_field.extraction_intensity = 'intensive' AND random() < 0.01 THEN
      UPDATE resource_fields
      SET infrastructure_level = GREATEST(infrastructure_level - 1, 1)
      WHERE id = v_field.id;

      INSERT INTO notifications (player_id, type, title, body, data)
      VALUES (
        v_field.owner_id, 'infrastructure_damage', 'Infrastructure Damaged',
        'Intensive extraction damaged infrastructure on ' || v_field.resource_type || ' field',
        jsonb_build_object('field_id', v_field.id)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- Tick sub-function: Materialize resources (runs every 5th tick)
-- ===========================================================================
CREATE OR REPLACE FUNCTION materialize_resources(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field   RECORD;
  v_city_id UUID;
BEGIN
  -- For each active resource field, add production to the nearest city's resources
  FOR v_field IN
    SELECT rf.*, t.resource_type AS tile_resource_type, t.soil_quality
    FROM resource_fields rf
    JOIN tiles t ON t.id = rf.tile_id AND t.server_id = rf.server_id
    WHERE rf.server_id = p_server_id
    AND rf.status IN ('productive', 'declining')
  LOOP
    -- Find the owner's nearest city (simplified: use capital or any city)
    SELECT c.id INTO v_city_id
    FROM cities c
    WHERE c.owner_id = v_field.owner_id
    ORDER BY c.is_capital DESC
    LIMIT 1;

    IF v_city_id IS NOT NULL THEN
      -- Add production (capped at storage)
      UPDATE city_resources
      SET amount = LEAST(amount + v_field.production_rate * 5, storage_capacity)
      WHERE city_id = v_city_id
      AND resource_type = v_field.resource_type;
    END IF;
  END LOOP;

  -- Passive manpower generation from cities
  UPDATE city_resources cr
  SET amount = LEAST(
    amount + (c.level * 2.0 * 5), -- city_level * 2 per tick * 5 ticks
    storage_capacity
  )
  FROM cities c
  JOIN players p ON p.id = c.owner_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'manpower';

  -- Passive money generation from cities
  UPDATE city_resources cr
  SET amount = LEAST(
    amount + (c.level * 5.0 * 5),
    storage_capacity
  )
  FROM cities c
  JOIN players p ON p.id = c.owner_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'money';
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- Tick sub-function: Process supply chains
-- ===========================================================================
CREATE OR REPLACE FUNCTION process_supply_chains(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_army       RECORD;
  v_has_supply BOOLEAN;
BEGIN
  -- For each non-garrison army, check if it has a valid supply route
  -- back to a friendly city within supply range
  FOR v_army IN
    SELECT a.* FROM armies a
    WHERE a.server_id = p_server_id
    AND a.is_garrison = false
    AND a.status IN ('idle', 'marching')
  LOOP
    -- Simple supply check: is there a friendly city within 10 hex distance?
    -- (A proper implementation would use pathfinding along owned/allied tiles)
    v_has_supply := EXISTS (
      SELECT 1 FROM cities c
      JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
      JOIN tiles at2 ON at2.id = v_army.tile_id AND at2.server_id = v_army.server_id
      WHERE c.owner_id = v_army.owner_id
      AND c.server_id = p_server_id
      -- Simplified distance check using axial coordinates
      AND (ABS(ct.q - at2.q) + ABS(ct.r - at2.r) + ABS(ct.q + ct.r - at2.q - at2.r)) / 2 <= 10
    );

    UPDATE armies
    SET supply_status = CASE
      WHEN v_has_supply THEN 'full'
      WHEN supply_status = 'full' THEN 'low'
      WHEN supply_status = 'low' THEN 'critical'
      WHEN supply_status = 'critical' THEN 'desperate'
      WHEN supply_status = 'desperate' THEN 'collapse'
      ELSE supply_status
    END
    WHERE id = v_army.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- Tick sub-function: Degrade ungarrisoned fortifications
-- ===========================================================================
CREATE OR REPLACE FUNCTION degrade_fortifications(p_server_id UUID)
RETURNS void AS $$
BEGIN
  -- Reduce HP of fortifications on tiles without a garrison army
  UPDATE tiles t
  SET fortification_hp = GREATEST(fortification_hp - (fortification_hp * 0.01), 0)
  WHERE t.server_id = p_server_id
  AND t.fortification_type IS NOT NULL
  AND t.fortification_hp > 0
  AND NOT EXISTS (
    SELECT 1 FROM armies a
    WHERE a.tile_id = t.id
    AND a.server_id = t.server_id
    AND a.owner_id = t.owner_id
    AND (a.is_garrison = true OR a.status = 'idle')
  );

  -- Remove fortification type if HP reaches 0
  UPDATE tiles
  SET fortification_type = NULL
  WHERE server_id = p_server_id
  AND fortification_hp <= 0
  AND fortification_type IS NOT NULL;
END;
$$ LANGUAGE plpgsql;


-- ===========================================================================
-- 13. resolve_combat — Multi-round combat resolution
-- ===========================================================================
CREATE OR REPLACE FUNCTION resolve_combat(
  p_attacker_army_id UUID,
  p_tile_id          INT,
  p_server_id        UUID
)
RETURNS void AS $$
DECLARE
  v_attacker       RECORD;
  v_defender_army   RECORD;
  v_tile            RECORD;
  v_round           INT;
  v_max_rounds      INT := 10;
  v_atk_units       JSONB := '[]';
  v_def_units       JSONB := '[]';
  v_atk_total_atk   REAL;
  v_atk_total_def   REAL;
  v_def_total_atk   REAL;
  v_def_total_def   REAL;
  v_terrain_def_mod REAL := 1.0;
  v_terrain_atk_mod REAL := 1.0;
  v_fort_bonus      REAL := 0.0;
  v_city_bonus      REAL := 0.0;
  v_atk_morale      REAL := 100.0;
  v_def_morale      REAL := 100.0;
  v_atk_casualties  INT := 0;
  v_def_casualties  INT := 0;
  v_damage_dealt    REAL;
  v_round_data      JSONB := '[]';
  v_attacker_won    BOOLEAN;
  v_battle_report_id UUID;
  v_unit             RECORD;
  v_atk_inf_atk     REAL; v_atk_arm_atk REAL; v_atk_art_atk REAL;
  v_def_inf_atk     REAL; v_def_arm_atk REAL; v_def_art_atk REAL;
  v_atk_inf_hp      REAL; v_atk_arm_hp  REAL; v_atk_art_hp  REAL;
  v_def_inf_hp      REAL; v_def_arm_hp  REAL; v_def_art_hp  REAL;
  v_war_damage       REAL;
BEGIN
  -- Get attacker army
  SELECT * INTO v_attacker FROM armies WHERE id = p_attacker_army_id;

  -- Get tile
  SELECT * INTO v_tile FROM tiles WHERE id = p_tile_id AND server_id = p_server_id;

  -- Find defender army (garrison or standing army on the tile)
  SELECT * INTO v_defender_army
  FROM armies
  WHERE tile_id = p_tile_id
  AND server_id = p_server_id
  AND owner_id = v_tile.owner_id
  ORDER BY is_garrison DESC -- prefer garrison
  LIMIT 1;

  -- Terrain modifiers
  v_terrain_def_mod := CASE v_tile.terrain_type
    WHEN 'forest' THEN 1.20   -- +20% defense in forests
    WHEN 'mountain' THEN 1.40 -- +40% defense in mountains
    WHEN 'urban' THEN 1.30    -- +30% defense in urban
    WHEN 'ruins' THEN 1.10    -- +10% defense in ruins
    ELSE 1.0
  END;

  -- River crossing penalty for attacker
  -- (simplified: check if there's a river between attacker origin and target)
  IF EXISTS (
    SELECT 1 FROM tile_adjacency ta
    WHERE ta.server_id = p_server_id
    AND ta.has_river = true AND ta.has_bridge = false
    AND (
      (ta.tile_a = v_attacker.tile_id AND ta.tile_b = p_tile_id)
      OR (ta.tile_a = p_tile_id AND ta.tile_b = v_attacker.tile_id)
    )
  ) THEN
    v_terrain_atk_mod := 0.80; -- -20% attack for river crossing
  END IF;

  -- Fortification bonus
  IF v_tile.fortification_type IS NOT NULL AND v_tile.fortification_hp > 0 THEN
    v_fort_bonus := v_tile.fortification_hp / 100.0 * 0.30; -- up to +30% based on fort HP
  END IF;

  -- City defense bonus
  IF EXISTS (SELECT 1 FROM cities WHERE tile_id = p_tile_id AND server_id = p_server_id) THEN
    v_city_bonus := 0.50; -- +50% defense for cities
  END IF;

  -- Gather attacker unit stats by category
  SELECT
    COALESCE(SUM(CASE WHEN ud.category = 'infantry' THEN au.quantity * ud.attack * au.avg_hp_percent ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'armor'    THEN au.quantity * ud.attack * au.avg_hp_percent ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.attack * au.avg_hp_percent ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'infantry' THEN au.quantity * ud.hp * au.avg_hp_percent ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'armor'    THEN au.quantity * ud.hp * au.avg_hp_percent ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.hp * au.avg_hp_percent ELSE 0 END), 0)
  INTO v_atk_inf_atk, v_atk_arm_atk, v_atk_art_atk,
       v_atk_inf_hp, v_atk_arm_hp, v_atk_art_hp
  FROM army_units au
  JOIN unit_defs ud ON ud.name = au.unit_def
  WHERE au.army_id = p_attacker_army_id;

  -- Gather defender unit stats (if defender exists)
  IF v_defender_army IS NOT NULL THEN
    SELECT
      COALESCE(SUM(CASE WHEN ud.category = 'infantry' THEN au.quantity * ud.attack * au.avg_hp_percent ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'armor'    THEN au.quantity * ud.attack * au.avg_hp_percent ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.attack * au.avg_hp_percent ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'infantry' THEN au.quantity * ud.hp * au.avg_hp_percent ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'armor'    THEN au.quantity * ud.hp * au.avg_hp_percent ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.hp * au.avg_hp_percent ELSE 0 END), 0)
    INTO v_def_inf_atk, v_def_arm_atk, v_def_art_atk,
         v_def_inf_hp, v_def_arm_hp, v_def_art_hp
    FROM army_units au
    JOIN unit_defs ud ON ud.name = au.unit_def
    WHERE au.army_id = v_defender_army.id;
  ELSE
    -- No defender army — attacker wins automatically
    v_def_inf_atk := 0; v_def_arm_atk := 0; v_def_art_atk := 0;
    v_def_inf_hp := 0; v_def_arm_hp := 0; v_def_art_hp := 0;
  END IF;

  -- -----------------------------------------------------------------------
  -- Multi-round combat loop
  -- -----------------------------------------------------------------------
  FOR v_round IN 1..v_max_rounds LOOP
    -- Total remaining HP for each side
    IF (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp) <= 0 THEN
      EXIT; -- Attacker eliminated
    END IF;
    IF (v_def_inf_hp + v_def_arm_hp + v_def_art_hp) <= 0 THEN
      EXIT; -- Defender eliminated
    END IF;
    IF v_atk_morale <= 0 OR v_def_morale <= 0 THEN
      EXIT; -- One side routed
    END IF;

    -- Category effectiveness matrix (rock-paper-scissors):
    -- Infantry +25% vs Artillery, -25% vs Armor
    -- Armor +25% vs Infantry, -25% vs Artillery
    -- Artillery +25% vs Armor, -25% vs Infantry

    -- Attacker damage to defender
    v_atk_total_atk := (
      -- Infantry attacks: effective vs artillery, weak vs armor
      v_atk_inf_atk * (
        CASE WHEN v_def_art_hp > 0 THEN 1.25 ELSE 1.0 END *
        CASE WHEN v_def_arm_hp > 0 THEN 0.75 ELSE 1.0 END
      )
      -- Armor attacks: effective vs infantry, weak vs artillery
      + v_atk_arm_atk * (
        CASE WHEN v_def_inf_hp > 0 THEN 1.25 ELSE 1.0 END *
        CASE WHEN v_def_art_hp > 0 THEN 0.75 ELSE 1.0 END
      )
      -- Artillery attacks: effective vs armor, weak vs infantry
      + v_atk_art_atk * (
        CASE WHEN v_def_arm_hp > 0 THEN 1.25 ELSE 1.0 END *
        CASE WHEN v_def_inf_hp > 0 THEN 0.75 ELSE 1.0 END
      )
    ) * v_terrain_atk_mod;

    -- Defender damage to attacker (with terrain and fortification bonuses)
    v_def_total_atk := (
      v_def_inf_atk * (
        CASE WHEN v_atk_art_hp > 0 THEN 1.25 ELSE 1.0 END *
        CASE WHEN v_atk_arm_hp > 0 THEN 0.75 ELSE 1.0 END
      )
      + v_def_arm_atk * (
        CASE WHEN v_atk_inf_hp > 0 THEN 1.25 ELSE 1.0 END *
        CASE WHEN v_atk_art_hp > 0 THEN 0.75 ELSE 1.0 END
      )
      + v_def_art_atk * (
        CASE WHEN v_atk_arm_hp > 0 THEN 1.25 ELSE 1.0 END *
        CASE WHEN v_atk_inf_hp > 0 THEN 0.75 ELSE 1.0 END
      )
    ) * v_terrain_def_mod * (1.0 + v_fort_bonus + v_city_bonus);

    -- Apply damage to defender HP pools (distributed proportionally)
    v_damage_dealt := v_atk_total_atk * 0.1; -- 10% of attack power per round
    IF (v_def_inf_hp + v_def_arm_hp + v_def_art_hp) > 0 THEN
      v_def_inf_hp := GREATEST(v_def_inf_hp - v_damage_dealt * v_def_inf_hp / (v_def_inf_hp + v_def_arm_hp + v_def_art_hp), 0);
      v_def_arm_hp := GREATEST(v_def_arm_hp - v_damage_dealt * v_def_arm_hp / (v_def_inf_hp + v_def_arm_hp + v_def_art_hp + 0.01), 0);
      v_def_art_hp := GREATEST(v_def_art_hp - v_damage_dealt * v_def_art_hp / (v_def_inf_hp + v_def_arm_hp + v_def_art_hp + 0.01), 0);
    END IF;

    -- Apply damage to attacker HP pools
    v_damage_dealt := v_def_total_atk * 0.1;
    IF (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp) > 0 THEN
      v_atk_inf_hp := GREATEST(v_atk_inf_hp - v_damage_dealt * v_atk_inf_hp / (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp), 0);
      v_atk_arm_hp := GREATEST(v_atk_arm_hp - v_damage_dealt * v_atk_arm_hp / (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp + 0.01), 0);
      v_atk_art_hp := GREATEST(v_atk_art_hp - v_damage_dealt * v_atk_art_hp / (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp + 0.01), 0);
    END IF;

    -- Morale impact: losing HP reduces morale proportionally
    v_atk_morale := v_atk_morale - (v_def_total_atk * 0.05);
    v_def_morale := v_def_morale - (v_atk_total_atk * 0.05);

    -- Record round data
    v_round_data := v_round_data || jsonb_build_object(
      'round', v_round,
      'atk_hp', jsonb_build_object('infantry', ROUND(v_atk_inf_hp::numeric, 1), 'armor', ROUND(v_atk_arm_hp::numeric, 1), 'artillery', ROUND(v_atk_art_hp::numeric, 1)),
      'def_hp', jsonb_build_object('infantry', ROUND(v_def_inf_hp::numeric, 1), 'armor', ROUND(v_def_arm_hp::numeric, 1), 'artillery', ROUND(v_def_art_hp::numeric, 1)),
      'atk_morale', ROUND(v_atk_morale::numeric, 1),
      'def_morale', ROUND(v_def_morale::numeric, 1)
    );
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Determine winner
  -- -----------------------------------------------------------------------
  v_attacker_won := (
    (v_def_inf_hp + v_def_arm_hp + v_def_art_hp) <= 0
    OR v_def_morale <= 0
  ) AND (
    (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp) > 0
    AND v_atk_morale > 0
  );

  -- -----------------------------------------------------------------------
  -- Apply casualties to actual army_units
  -- -----------------------------------------------------------------------
  -- Calculate casualty ratio for each side and apply to unit quantities
  DECLARE
    v_atk_hp_start REAL;
    v_def_hp_start REAL;
    v_atk_hp_end   REAL;
    v_def_hp_end   REAL;
    v_atk_loss_pct REAL;
    v_def_loss_pct REAL;
  BEGIN
    -- Calculate total HP at start (from army_units)
    SELECT COALESCE(SUM(au.quantity * ud.hp * au.avg_hp_percent), 0)
    INTO v_atk_hp_start
    FROM army_units au
    JOIN unit_defs ud ON ud.name = au.unit_def
    WHERE au.army_id = p_attacker_army_id;

    v_atk_hp_end := v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp;
    v_atk_loss_pct := CASE WHEN v_atk_hp_start > 0
      THEN 1.0 - (v_atk_hp_end / v_atk_hp_start)
      ELSE 1.0 END;

    -- Apply attacker losses: reduce quantity and avg_hp
    UPDATE army_units au
    SET quantity = GREATEST(CEIL(quantity * (1.0 - v_atk_loss_pct)), 0),
        avg_hp_percent = GREATEST(avg_hp_percent * (1.0 - v_atk_loss_pct * 0.5), 0.1)
    WHERE au.army_id = p_attacker_army_id;

    -- Remove eliminated stacks
    DELETE FROM army_units WHERE army_id = p_attacker_army_id AND quantity <= 0;

    -- Apply defender losses
    IF v_defender_army IS NOT NULL THEN
      SELECT COALESCE(SUM(au.quantity * ud.hp * au.avg_hp_percent), 0)
      INTO v_def_hp_start
      FROM army_units au
      JOIN unit_defs ud ON ud.name = au.unit_def
      WHERE au.army_id = v_defender_army.id;

      v_def_hp_end := v_def_inf_hp + v_def_arm_hp + v_def_art_hp;
      v_def_loss_pct := CASE WHEN v_def_hp_start > 0
        THEN 1.0 - (v_def_hp_end / v_def_hp_start)
        ELSE 1.0 END;

      UPDATE army_units au
      SET quantity = GREATEST(CEIL(quantity * (1.0 - v_def_loss_pct)), 0),
          avg_hp_percent = GREATEST(avg_hp_percent * (1.0 - v_def_loss_pct * 0.5), 0.1)
      WHERE au.army_id = v_defender_army.id;

      DELETE FROM army_units WHERE army_id = v_defender_army.id AND quantity <= 0;
    END IF;

    v_atk_casualties := CEIL(v_atk_hp_start * v_atk_loss_pct);
    v_def_casualties := CEIL(COALESCE(v_def_hp_start, 0) * COALESCE(v_def_loss_pct, 1.0));
  END;

  -- -----------------------------------------------------------------------
  -- Update army states based on outcome
  -- -----------------------------------------------------------------------
  IF v_attacker_won THEN
    -- Attacker arrives on tile
    UPDATE armies
    SET status = 'idle',
        tile_id = p_tile_id,
        march_path = NULL,
        march_arrives_at = NULL,
        destination_tile_id = NULL
    WHERE id = p_attacker_army_id;

    -- Transfer tile ownership
    UPDATE tiles
    SET owner_id = v_attacker.owner_id
    WHERE id = p_tile_id AND server_id = p_server_id;

    -- Destroy defender army if eliminated
    IF v_defender_army IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM army_units WHERE army_id = v_defender_army.id
    ) THEN
      DELETE FROM armies WHERE id = v_defender_army.id;
    ELSIF v_defender_army IS NOT NULL THEN
      -- Defender retreats (set status to retreating if they routed)
      UPDATE armies SET status = 'retreating' WHERE id = v_defender_army.id;
    END IF;
  ELSE
    -- Attacker defeated or routed: retreat to origin tile
    UPDATE armies
    SET status = 'retreating',
        march_path = NULL,
        march_arrives_at = NULL,
        destination_tile_id = NULL
    WHERE id = p_attacker_army_id;

    -- Destroy attacker army if eliminated
    IF NOT EXISTS (SELECT 1 FROM army_units WHERE army_id = p_attacker_army_id) THEN
      DELETE FROM armies WHERE id = p_attacker_army_id;
    END IF;
  END IF;

  -- -----------------------------------------------------------------------
  -- War damage to tile
  -- -----------------------------------------------------------------------
  v_war_damage := LEAST(5.0 + (v_atk_casualties + v_def_casualties) / 100.0, 25.0);
  UPDATE tiles
  SET war_damage_level = LEAST(war_damage_level + v_war_damage, 100),
      land_quality = GREATEST(land_quality - v_war_damage * 0.5, 0)
  WHERE id = p_tile_id AND server_id = p_server_id;

  -- -----------------------------------------------------------------------
  -- Create battle report
  -- -----------------------------------------------------------------------
  INSERT INTO battle_reports (
    server_id, tile_id, attacker_id, defender_id,
    attacker_won, attacker_casualties, defender_casualties,
    rounds, round_data, terrain_type,
    created_at
  )
  VALUES (
    p_server_id, p_tile_id, v_attacker.owner_id,
    CASE WHEN v_defender_army IS NOT NULL THEN v_defender_army.owner_id ELSE v_tile.owner_id END,
    v_attacker_won, v_atk_casualties, v_def_casualties,
    LEAST(v_round - 1, v_max_rounds), v_round_data, v_tile.terrain_type,
    now()
  )
  RETURNING id INTO v_battle_report_id;

  -- -----------------------------------------------------------------------
  -- Notify both players
  -- -----------------------------------------------------------------------
  INSERT INTO notifications (player_id, type, title, body, data)
  VALUES (
    v_attacker.owner_id,
    CASE WHEN v_attacker_won THEN 'battle_victory' ELSE 'battle_defeat' END,
    CASE WHEN v_attacker_won THEN 'Victory!' ELSE 'Defeat!' END,
    'Battle at tile ' || p_tile_id || ': ' ||
      CASE WHEN v_attacker_won THEN 'Your forces prevailed' ELSE 'Your forces were repelled' END,
    jsonb_build_object('battle_report_id', v_battle_report_id, 'tile_id', p_tile_id)
  );

  IF v_defender_army IS NOT NULL OR v_tile.owner_id IS NOT NULL THEN
    INSERT INTO notifications (player_id, type, title, body, data)
    VALUES (
      COALESCE(
        CASE WHEN v_defender_army IS NOT NULL THEN v_defender_army.owner_id ELSE NULL END,
        v_tile.owner_id
      ),
      CASE WHEN v_attacker_won THEN 'battle_defeat' ELSE 'battle_victory' END,
      CASE WHEN v_attacker_won THEN 'Territory Lost!' ELSE 'Defense Successful!' END,
      'Battle at tile ' || p_tile_id || ': ' ||
        CASE WHEN v_attacker_won THEN 'Enemy forces captured the tile' ELSE 'Your forces repelled the attack' END,
      jsonb_build_object('battle_report_id', v_battle_report_id, 'tile_id', p_tile_id)
    );
  END IF;

  -- Grant experience to surviving units
  UPDATE army_units
  SET experience_level = LEAST(experience_level + 1, 5)
  WHERE army_id = p_attacker_army_id;

  IF v_defender_army IS NOT NULL THEN
    UPDATE army_units
    SET experience_level = LEAST(experience_level + 1, 5)
    WHERE army_id = v_defender_army.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

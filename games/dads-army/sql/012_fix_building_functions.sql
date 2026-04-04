-- ============================================================================
-- 012_fix_building_functions.sql
-- Fix: build_building, upgrade_building, complete_buildings
--
-- Issues fixed:
--   1. c.owner_id → c.player_id (cities table uses player_id)
--   2. v_def.cost_money/cost_steel → parse from costs_per_level JSONB
--   3. v_def.build_time_ticks → parse from build_time_per_level JSONB
--   4. Match building_defs by id instead of name
--
-- Run each statement individually in Supabase SQL Editor.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. build_building (fixed)
-- ---------------------------------------------------------------------------
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
  v_costs       JSONB;
  v_cost_mult   REAL;
  v_resource    TEXT;
  v_amount      REAL;
BEGIN
  -- Get city and validate ownership
  SELECT c.*, c.player_id AS city_player_id, p.server_id AS p_server_id
  INTO v_city
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE c.id = p_city_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'City not found';
  END IF;

  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.city_player_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this city';
  END IF;

  -- Get building definition by id
  SELECT * INTO v_def FROM building_defs WHERE id = p_building_def;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown building type: %', p_building_def;
  END IF;

  -- Check slot limits: city level determines available slots
  v_max_slots := CASE v_city.level
    WHEN 1 THEN 3 WHEN 2 THEN 5 WHEN 3 THEN 8 WHEN 4 THEN 12 ELSE 16
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

  -- Land quality cost multiplier
  v_cost_mult := 2.0 - v_city.land_quality_at_founding / 100.0;

  -- Get level 1 costs (index 0 in the JSONB array)
  v_costs := v_def.costs_per_level->0;

  -- Check and deduct each resource in the costs object
  FOR v_resource, v_amount IN SELECT * FROM jsonb_each_text(v_costs)
  LOOP
    v_amount := CEIL(v_amount::real * v_cost_mult);
    IF get_player_resource_total(v_player_id, v_resource) < v_amount THEN
      RAISE EXCEPTION 'Not enough %', v_resource;
    END IF;
  END LOOP;

  -- Deduct resources
  FOR v_resource, v_amount IN SELECT * FROM jsonb_each_text(v_costs)
  LOOP
    v_amount := CEIL(v_amount::real * v_cost_mult);
    PERFORM deduct_player_resource(v_player_id, v_resource, v_amount);
  END LOOP;

  -- Calculate build time from JSONB array (index 0 = level 1, value in seconds)
  v_build_time := make_interval(secs => (v_def.build_time_per_level->0)::int);

  -- Create building at level 0 (under construction)
  INSERT INTO buildings (
    city_id, building_def, slot_index, level,
    is_constructing, construction_started_at, construction_completes_at
  )
  VALUES (
    p_city_id, p_building_def, p_slot_index, 0,
    true, now(), now() + v_build_time
  )
  RETURNING id INTO v_building_id;

  RETURN v_building_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- 2. upgrade_building (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upgrade_building(p_building_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id  UUID;
  v_building   RECORD;
  v_city       RECORD;
  v_def        RECORD;
  v_max_level  INT;
  v_cost_mult  REAL;
  v_build_time INTERVAL;
  v_costs      JSONB;
  v_resource   TEXT;
  v_amount     REAL;
BEGIN
  -- Get building with city info
  SELECT b.*, c.player_id AS city_player_id, c.land_quality_at_founding,
         c.level AS city_level, p.server_id
  INTO v_building
  FROM buildings b
  JOIN cities c ON c.id = b.city_id
  JOIN players p ON p.id = c.player_id
  WHERE b.id = p_building_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Building not found';
  END IF;

  v_player_id := get_player_id(v_building.server_id);
  IF v_building.city_player_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this building';
  END IF;

  IF v_building.is_constructing THEN
    RAISE EXCEPTION 'Building is already under construction';
  END IF;

  -- Get building definition by id
  SELECT * INTO v_def FROM building_defs WHERE id = v_building.building_def;

  -- Max level based on land quality
  v_max_level := LEAST(v_def.max_level, CEIL(5.0 * v_building.land_quality_at_founding / 100.0));
  IF v_building.level >= v_max_level THEN
    RAISE EXCEPTION 'Building is at max level (% / %) due to land quality',
      v_building.level, v_max_level;
  END IF;

  -- Cost multiplier from land quality
  v_cost_mult := 2.0 - v_building.land_quality_at_founding / 100.0;

  -- Get costs for the next level (current level = index in JSONB array)
  -- e.g. building at level 1 upgrading to level 2 → costs_per_level[1]
  v_costs := v_def.costs_per_level->v_building.level;
  IF v_costs IS NULL THEN
    RAISE EXCEPTION 'No cost data for level %', v_building.level + 1;
  END IF;

  -- Check and deduct resources
  FOR v_resource, v_amount IN SELECT * FROM jsonb_each_text(v_costs)
  LOOP
    v_amount := CEIL(v_amount::real * v_cost_mult);
    IF get_player_resource_total(v_player_id, v_resource) < v_amount THEN
      RAISE EXCEPTION 'Not enough % for upgrade', v_resource;
    END IF;
  END LOOP;

  FOR v_resource, v_amount IN SELECT * FROM jsonb_each_text(v_costs)
  LOOP
    v_amount := CEIL(v_amount::real * v_cost_mult);
    PERFORM deduct_player_resource(v_player_id, v_resource, v_amount);
  END LOOP;

  -- Build time for the next level (index = current level)
  v_build_time := make_interval(secs => (v_def.build_time_per_level->v_building.level)::int);

  UPDATE buildings
  SET is_constructing = true,
      construction_started_at = now(),
      construction_completes_at = now() + v_build_time
  WHERE id = p_building_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- 3. complete_buildings (fixed — owner_id → player_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_buildings(p_server_id UUID)
RETURNS void AS $$
BEGIN
  -- Mark completed buildings: level up and stop construction
  UPDATE buildings b
  SET level = b.level + 1,
      is_constructing = false,
      construction_completes_at = NULL
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE b.city_id = c.id
  AND p.server_id = p_server_id
  AND b.is_constructing = true
  AND b.construction_completes_at <= now();
END;
$$ LANGUAGE plpgsql;

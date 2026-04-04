-- ============================================================================
-- 023_fix_fish_city_upgrade_warehouse.sql
-- Fixes: fish constraint, city upgrade system, warehouse storage, slot alignment
-- Run each statement in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- 1. Allow fish and uranium in tiles.resource_type CHECK constraint
-- =========================================================================
ALTER TABLE tiles DROP CONSTRAINT IF EXISTS tiles_resource_type_check;
ALTER TABLE tiles ADD CONSTRAINT tiles_resource_type_check
  CHECK (resource_type IS NULL OR resource_type IN (
    'oil', 'iron', 'coal', 'bauxite', 'rubber', 'copper',
    'tungsten', 'farmland', 'fish', 'uranium'
  ));


-- =========================================================================
-- 2. Add fish base rate to develop_resource_field
-- =========================================================================
CREATE OR REPLACE FUNCTION develop_resource_field(
  p_tile_id   INT,
  p_server_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_tile      RECORD;
  v_field_id  UUID;
  v_base_rate REAL;
  v_resource  TEXT;
BEGIN
  v_player_id := get_player_id(p_server_id);

  SELECT * INTO v_tile FROM tiles
  WHERE id = p_tile_id AND server_id = p_server_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Tile not found'; END IF;
  IF v_tile.owner_id != v_player_id THEN RAISE EXCEPTION 'You do not own this tile'; END IF;

  -- Determine resource type (handle farmland terrain with NULL resource_type)
  v_resource := v_tile.resource_type;
  IF v_resource IS NULL AND v_tile.terrain_type = 'farmland' THEN
    v_resource := 'farmland';
  END IF;
  IF v_resource IS NULL THEN RAISE EXCEPTION 'No resource on this tile'; END IF;

  -- Check not already developed
  IF EXISTS (SELECT 1 FROM resource_fields WHERE tile_id = p_tile_id AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'Resource field already developed';
  END IF;

  -- Base production rates per resource type
  v_base_rate := CASE v_resource
    WHEN 'iron' THEN 10.0
    WHEN 'coal' THEN 8.0
    WHEN 'oil' THEN 6.0
    WHEN 'bauxite' THEN 5.0
    WHEN 'rubber' THEN 4.0
    WHEN 'copper' THEN 7.0
    WHEN 'tungsten' THEN 2.0
    WHEN 'farmland' THEN 12.0
    WHEN 'fish' THEN 8.0
    WHEN 'uranium' THEN 1.0
    ELSE 5.0
  END;

  INSERT INTO resource_fields (
    server_id, tile_id, player_id,
    infrastructure_level, production_rate, extraction_intensity,
    status
  )
  VALUES (
    p_server_id, p_tile_id, v_player_id,
    1, v_base_rate, 'normal', 'productive'
  )
  RETURNING id INTO v_field_id;

  RETURN v_field_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 3. City upgrade RPC — upgrade city level (unlocks more building slots)
-- =========================================================================
CREATE OR REPLACE FUNCTION upgrade_city(p_city_id UUID, p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_city      RECORD;
  v_cost_money INT;
  v_cost_steel INT;
  v_cost_manpower INT;
  v_upgrade_time INT; -- seconds
  v_max_level INT := 5;
BEGIN
  v_player_id := get_player_id(p_server_id);

  SELECT * INTO v_city FROM cities
  WHERE id = p_city_id AND server_id = p_server_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'City not found'; END IF;
  IF v_city.player_id != v_player_id THEN RAISE EXCEPTION 'Not your city'; END IF;

  -- Max level check (also limited by land quality)
  v_max_level := LEAST(5, CEIL(5.0 * v_city.land_quality_at_founding / 100.0));
  IF v_city.level >= v_max_level THEN
    RAISE EXCEPTION 'City is at max level (% / %)', v_city.level, v_max_level;
  END IF;

  -- Costs per level (from cities.md documentation)
  v_cost_money := CASE v_city.level
    WHEN 1 THEN 1000 WHEN 2 THEN 3000 WHEN 3 THEN 8000 WHEN 4 THEN 20000 ELSE 0 END;
  v_cost_steel := CASE v_city.level
    WHEN 1 THEN 200 WHEN 2 THEN 500 WHEN 3 THEN 1200 WHEN 4 THEN 3000 ELSE 0 END;
  v_cost_manpower := CASE v_city.level
    WHEN 1 THEN 100 WHEN 2 THEN 200 WHEN 3 THEN 400 WHEN 4 THEN 800 ELSE 0 END;

  -- Check resources
  IF get_player_resource_total(v_player_id, 'money') < v_cost_money THEN
    RAISE EXCEPTION 'Not enough money (need %)', v_cost_money;
  END IF;
  IF get_player_resource_total(v_player_id, 'steel') < v_cost_steel THEN
    RAISE EXCEPTION 'Not enough steel (need %)', v_cost_steel;
  END IF;
  IF get_player_resource_total(v_player_id, 'manpower') < v_cost_manpower THEN
    RAISE EXCEPTION 'Not enough manpower (need %)', v_cost_manpower;
  END IF;

  -- Deduct resources
  PERFORM deduct_player_resource(v_player_id, 'money', v_cost_money);
  PERFORM deduct_player_resource(v_player_id, 'steel', v_cost_steel);
  PERFORM deduct_player_resource(v_player_id, 'manpower', v_cost_manpower);

  -- Upgrade immediately (no construction timer for city upgrades in MVP)
  UPDATE cities SET level = level + 1 WHERE id = p_city_id;

  -- Increase storage capacity for all resources in this city
  UPDATE city_resources
  SET storage_capacity = CASE v_city.level + 1
    WHEN 2 THEN 1000 WHEN 3 THEN 2000 WHEN 4 THEN 4000 WHEN 5 THEN 8000 ELSE storage_capacity
  END
  WHERE city_id = p_city_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 4. Align build_building slot counts to docs (3/5/8/12/16)
-- =========================================================================
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
  SELECT c.*, c.player_id AS city_player_id, p.server_id AS p_server_id
  INTO v_city
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE c.id = p_city_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'City not found'; END IF;

  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.city_player_id != v_player_id THEN RAISE EXCEPTION 'You do not own this city'; END IF;

  SELECT * INTO v_def FROM building_defs WHERE id = p_building_def;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown building type: %', p_building_def; END IF;

  -- Slot counts aligned with docs: 3/5/8/12/16
  v_max_slots := CASE v_city.level
    WHEN 1 THEN 3 WHEN 2 THEN 5 WHEN 3 THEN 8 WHEN 4 THEN 12 ELSE 16
  END;
  IF p_slot_index < 0 OR p_slot_index >= v_max_slots THEN
    RAISE EXCEPTION 'Slot index % is out of range (city level % has % slots)',
      p_slot_index, v_city.level, v_max_slots;
  END IF;

  IF EXISTS (SELECT 1 FROM buildings WHERE city_id = p_city_id AND slot_index = p_slot_index) THEN
    RAISE EXCEPTION 'Slot % is already occupied', p_slot_index;
  END IF;

  IF EXISTS (SELECT 1 FROM buildings WHERE city_id = p_city_id AND is_constructing = true) THEN
    RAISE EXCEPTION 'City is already constructing a building';
  END IF;

  v_cost_mult := 2.0 - v_city.land_quality_at_founding / 100.0;
  v_costs := v_def.costs_per_level->0;

  FOR v_resource, v_amount IN SELECT * FROM jsonb_each_text(v_costs)
  LOOP
    v_amount := CEIL(v_amount::real * v_cost_mult);
    IF get_player_resource_total(v_player_id, v_resource) < v_amount THEN
      RAISE EXCEPTION 'Not enough %', v_resource;
    END IF;
  END LOOP;

  FOR v_resource, v_amount IN SELECT * FROM jsonb_each_text(v_costs)
  LOOP
    v_amount := CEIL(v_amount::real * v_cost_mult);
    PERFORM deduct_player_resource(v_player_id, v_resource, v_amount);
  END LOOP;

  v_build_time := make_interval(secs => (v_def.build_time_per_level->0)::int);

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


-- =========================================================================
-- 5. Update materialize_resources — apply Warehouse storage_capacity
-- =========================================================================
CREATE OR REPLACE FUNCTION materialize_resources(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field RECORD; v_city_id UUID; v_building RECORD; v_effects JSONB;
  v_effect_key TEXT; v_effect_val TEXT; v_resource TEXT; v_production REAL;
  v_yield_mod REAL; v_mapped_resource TEXT;
BEGIN
  -- Reset production rates
  UPDATE city_resources cr SET production_rate = 0
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Reset storage_capacity to base (from city level), then add building bonuses
  UPDATE city_resources cr
  SET storage_capacity = CASE c.level
    WHEN 1 THEN 500 WHEN 2 THEN 1000 WHEN 3 THEN 2000 WHEN 4 THEN 4000 WHEN 5 THEN 8000 ELSE 500
  END
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Apply Warehouse storage_capacity bonuses
  UPDATE city_resources cr
  SET storage_capacity = cr.storage_capacity + (
    SELECT COALESCE(SUM(
      (bd.effects_per_level->(b.level - 1)->>'storage_capacity')::real
    ), 0)
    FROM buildings b
    JOIN building_defs bd ON bd.id = b.building_def
    WHERE b.city_id = cr.city_id
    AND b.is_constructing = false AND b.level >= 1
    AND bd.effects_per_level->(b.level - 1)->>'storage_capacity' IS NOT NULL
  )
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Resource field production
  FOR v_field IN
    SELECT rf.*, t.resource_type AS tile_resource_type, t.soil_quality,
           t.control_level, t.terrain_type
    FROM resource_fields rf
    JOIN tiles t ON t.id = rf.tile_id AND t.server_id = rf.server_id
    WHERE rf.server_id = p_server_id AND rf.status IN ('productive', 'declining')
  LOOP
    v_yield_mod := CASE v_field.control_level
      WHEN 'claimed' THEN 0.50 WHEN 'occupied' THEN 0.75
      WHEN 'improved' THEN 1.00 ELSE 0.50 END;

    v_mapped_resource := CASE v_field.tile_resource_type
      WHEN 'farmland' THEN 'food' WHEN 'fish' THEN 'food'
      WHEN 'oil' THEN 'oil' WHEN 'iron' THEN 'iron' WHEN 'coal' THEN 'coal'
      WHEN 'copper' THEN 'copper' WHEN 'bauxite' THEN 'aluminum'
      WHEN 'rubber' THEN 'rubber' WHEN 'tungsten' THEN 'tungsten'
      WHEN 'uranium' THEN 'uranium' ELSE v_field.tile_resource_type END;

    IF v_mapped_resource IS NULL AND v_field.terrain_type = 'farmland' THEN
      v_mapped_resource := 'food';
    END IF;
    IF v_mapped_resource IS NULL THEN CONTINUE; END IF;

    SELECT c.id INTO v_city_id FROM cities c
    WHERE c.player_id = v_field.player_id ORDER BY c.is_capital DESC LIMIT 1;

    IF v_city_id IS NOT NULL THEN
      v_production := v_field.production_rate * v_yield_mod;
      UPDATE city_resources
      SET amount = LEAST(amount + v_production * 5, storage_capacity),
          production_rate = production_rate + v_production
      WHERE city_id = v_city_id AND resource_type = v_mapped_resource;

      IF NOT FOUND THEN
        INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
        VALUES (v_city_id, v_mapped_resource, v_production * 5, v_production, 500);
      END IF;
    END IF;
  END LOOP;

  -- Building-based production
  FOR v_building IN
    SELECT b.building_def, b.level, b.city_id, bd.effects_per_level
    FROM buildings b JOIN cities c ON c.id = b.city_id
    JOIN players p ON p.id = c.player_id
    JOIN building_defs bd ON bd.id = b.building_def
    WHERE p.server_id = p_server_id AND b.is_constructing = false AND b.level >= 1
  LOOP
    v_effects := v_building.effects_per_level->(v_building.level - 1);
    IF v_effects IS NULL THEN CONTINUE; END IF;
    FOR v_effect_key, v_effect_val IN SELECT * FROM jsonb_each_text(v_effects)
    LOOP
      v_resource := CASE v_effect_key
        WHEN 'money_income' THEN 'money' WHEN 'steel_production' THEN 'steel'
        WHEN 'fuel_production' THEN 'oil' WHEN 'ammo_production' THEN 'ammunition'
        WHEN 'food_production' THEN 'food' WHEN 'aluminum_production' THEN 'aluminum'
        WHEN 'trade_income' THEN 'money' ELSE NULL END;
      IF v_resource IS NOT NULL THEN
        UPDATE city_resources
        SET amount = LEAST(amount + v_effect_val::real * 5, storage_capacity),
            production_rate = production_rate + v_effect_val::real
        WHERE city_id = v_building.city_id AND resource_type = v_resource;
      END IF;
    END LOOP;
  END LOOP;

  -- Passive city generation
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0 * 5), storage_capacity),
      production_rate = production_rate + (c.level * 2.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'manpower';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 5.0 * 5), storage_capacity),
      production_rate = production_rate + (c.level * 5.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'money';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 032_economy_rebalance.sql
-- Economy rebalance: higher storage, passive terrain production, better starts
-- Run each statement in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- 1. Increase base storage per city level (was 500/1000/2000/4000/8000)
-- =========================================================================
-- Update materialize_resources to use new storage values
CREATE OR REPLACE FUNCTION materialize_resources(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field RECORD; v_city_id UUID; v_building RECORD; v_effects JSONB;
  v_effect_key TEXT; v_effect_val TEXT; v_resource TEXT; v_production REAL;
  v_yield_mod REAL; v_mapped_resource TEXT;
  v_city RECORD; v_terrain_tile RECORD;
BEGIN
  -- Reset production rates
  UPDATE city_resources cr SET production_rate = 0
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Reset storage to new base values per city level (tripled)
  UPDATE city_resources cr
  SET storage_capacity = CASE c.level
    WHEN 1 THEN 2000 WHEN 2 THEN 4000 WHEN 3 THEN 8000 WHEN 4 THEN 16000 WHEN 5 THEN 32000 ELSE 2000
  END
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Apply Warehouse storage bonuses
  UPDATE city_resources cr
  SET storage_capacity = cr.storage_capacity + (
    SELECT COALESCE(SUM(
      (bd.effects_per_level->(b.level - 1)->>'storage_capacity')::real
    ), 0)
    FROM buildings b JOIN building_defs bd ON bd.id = b.building_def
    WHERE b.city_id = cr.city_id AND b.is_constructing = false AND b.level >= 1
    AND bd.effects_per_level->(b.level - 1)->>'storage_capacity' IS NOT NULL
  )
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- -----------------------------------------------------------------------
  -- Resource field production (with control_level modifier)
  -- -----------------------------------------------------------------------
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
      SET amount = LEAST(amount + v_production, storage_capacity),
          production_rate = production_rate + v_production
      WHERE city_id = v_city_id AND resource_type = v_mapped_resource;

      IF NOT FOUND THEN
        INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
        VALUES (v_city_id, v_mapped_resource, v_production, v_production, 2000);
      END IF;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Building-based production
  -- -----------------------------------------------------------------------
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
        SET amount = LEAST(amount + v_effect_val::real, storage_capacity),
            production_rate = production_rate + v_effect_val::real
        WHERE city_id = v_building.city_id AND resource_type = v_resource;
      END IF;
    END LOOP;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Passive terrain production (NEW — cities get resources from territory)
  -- Each owned tile adjacent to a city provides small passive income
  -- based on terrain type. This is the bootstrap path.
  -- -----------------------------------------------------------------------
  FOR v_city IN
    SELECT c.id AS city_id, c.tile_id, c.level, c.player_id, ct.q, ct.r
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    JOIN players p ON p.id = c.player_id
    WHERE p.server_id = p_server_id
  LOOP
    -- Check all owned tiles within 3 hexes of city
    FOR v_terrain_tile IN
      SELECT t.terrain_type, t.resource_type
      FROM tiles t
      WHERE t.server_id = p_server_id
      AND t.owner_id = v_city.player_id
      AND (ABS(t.q - v_city.q) + ABS(t.r - v_city.r) + ABS((t.q + t.r) - (v_city.q + v_city.r))) / 2 <= 3
    LOOP
      -- Terrain-based passive production (small amounts)
      CASE v_terrain_tile.terrain_type
        WHEN 'forest' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.0, storage_capacity),
            production_rate = production_rate + 1.0
          WHERE city_id = v_city.city_id AND resource_type = 'steel';
        WHEN 'mountain' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.5, storage_capacity),
            production_rate = production_rate + 1.5
          WHERE city_id = v_city.city_id AND resource_type = 'iron';
          UPDATE city_resources SET amount = LEAST(amount + 0.5, storage_capacity),
            production_rate = production_rate + 0.5
          WHERE city_id = v_city.city_id AND resource_type = 'coal';
        WHEN 'desert' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.0, storage_capacity),
            production_rate = production_rate + 1.0
          WHERE city_id = v_city.city_id AND resource_type = 'coal';
        WHEN 'coast' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.0, storage_capacity),
            production_rate = production_rate + 1.0
          WHERE city_id = v_city.city_id AND resource_type = 'food';
        WHEN 'plains' THEN
          UPDATE city_resources SET amount = LEAST(amount + 0.5, storage_capacity),
            production_rate = production_rate + 0.5
          WHERE city_id = v_city.city_id AND resource_type = 'manpower';
        ELSE NULL;
      END CASE;
    END LOOP;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Passive city generation (money + manpower)
  -- -----------------------------------------------------------------------
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 3.0), storage_capacity),
      production_rate = production_rate + (c.level * 3.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'manpower';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 10.0), storage_capacity),
      production_rate = production_rate + (c.level * 10.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'money';

  -- Basic steel and iron passive for ALL cities (bootstrap — you need steel to build)
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0), storage_capacity),
      production_rate = production_rate + (c.level * 2.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'steel';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0), storage_capacity),
      production_rate = production_rate + (c.level * 2.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'iron';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 1.0), storage_capacity),
      production_rate = production_rate + (c.level * 1.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'coal';
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 2. Increase existing city storage to new values
-- =========================================================================
UPDATE city_resources cr
SET storage_capacity = CASE c.level
  WHEN 1 THEN 2000 WHEN 2 THEN 4000 WHEN 3 THEN 8000 WHEN 4 THEN 16000 WHEN 5 THEN 32000 ELSE 2000
END
FROM cities c
WHERE cr.city_id = c.id;


-- =========================================================================
-- 3. Update upgrade_city to use new storage values
-- =========================================================================
CREATE OR REPLACE FUNCTION upgrade_city(p_city_id UUID, p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id UUID; v_city RECORD;
  v_cost_money INT; v_cost_steel INT; v_cost_manpower INT;
  v_max_level INT := 5;
BEGIN
  v_player_id := get_player_id(p_server_id);
  SELECT * INTO v_city FROM cities WHERE id = p_city_id AND server_id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'City not found'; END IF;
  IF v_city.player_id != v_player_id THEN RAISE EXCEPTION 'Not your city'; END IF;
  v_max_level := LEAST(5, CEIL(5.0 * v_city.land_quality_at_founding / 100.0));
  IF v_city.level >= v_max_level THEN RAISE EXCEPTION 'City at max level'; END IF;

  v_cost_money := CASE v_city.level WHEN 1 THEN 1000 WHEN 2 THEN 3000 WHEN 3 THEN 8000 WHEN 4 THEN 20000 ELSE 0 END;
  v_cost_steel := CASE v_city.level WHEN 1 THEN 200 WHEN 2 THEN 500 WHEN 3 THEN 1200 WHEN 4 THEN 3000 ELSE 0 END;
  v_cost_manpower := CASE v_city.level WHEN 1 THEN 100 WHEN 2 THEN 200 WHEN 3 THEN 400 WHEN 4 THEN 800 ELSE 0 END;

  IF get_player_resource_total(v_player_id, 'money') < v_cost_money THEN RAISE EXCEPTION 'Not enough money'; END IF;
  IF get_player_resource_total(v_player_id, 'steel') < v_cost_steel THEN RAISE EXCEPTION 'Not enough steel'; END IF;
  IF get_player_resource_total(v_player_id, 'manpower') < v_cost_manpower THEN RAISE EXCEPTION 'Not enough manpower'; END IF;

  PERFORM deduct_player_resource(v_player_id, 'money', v_cost_money);
  PERFORM deduct_player_resource(v_player_id, 'steel', v_cost_steel);
  PERFORM deduct_player_resource(v_player_id, 'manpower', v_cost_manpower);

  UPDATE cities SET level = level + 1 WHERE id = p_city_id;

  -- New storage values (tripled)
  UPDATE city_resources SET storage_capacity = CASE v_city.level + 1
    WHEN 2 THEN 4000 WHEN 3 THEN 8000 WHEN 4 THEN 16000 WHEN 5 THEN 32000 ELSE storage_capacity
  END WHERE city_id = p_city_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 4. Update join_server starting resources (double them)
-- =========================================================================
-- Note: This only affects NEW players joining. Existing players need manual top-up.
-- For existing players, run statement 5 below.


-- =========================================================================
-- 5. Top up existing players' resources to reasonable starting levels
-- =========================================================================
UPDATE city_resources
SET amount = GREATEST(amount, 1000)
WHERE resource_type IN ('money', 'food', 'steel', 'oil', 'manpower', 'iron', 'coal')
AND amount < 1000;

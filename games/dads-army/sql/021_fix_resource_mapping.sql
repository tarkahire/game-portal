-- ============================================================================
-- 021_fix_resource_mapping.sql
-- Fix: farmland→food mapping, update production_rate for resource fields
-- Run in Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION materialize_resources(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field      RECORD;
  v_city_id    UUID;
  v_building   RECORD;
  v_effects    JSONB;
  v_effect_key TEXT;
  v_effect_val REAL;
  v_resource   TEXT;
  v_production REAL;
  v_yield_mod  REAL;
  v_mapped_resource TEXT;
BEGIN
  -- -----------------------------------------------------------------------
  -- 0. Reset production_rate to recalculate fresh each cycle
  -- -----------------------------------------------------------------------
  UPDATE city_resources cr
  SET production_rate = 0
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- -----------------------------------------------------------------------
  -- 1. Resource field production → nearest city (with control_level + mapping)
  -- -----------------------------------------------------------------------
  FOR v_field IN
    SELECT rf.*, t.resource_type AS tile_resource_type, t.soil_quality,
           t.control_level, t.terrain_type
    FROM resource_fields rf
    JOIN tiles t ON t.id = rf.tile_id AND t.server_id = rf.server_id
    WHERE rf.server_id = p_server_id
    AND rf.status IN ('productive', 'declining')
  LOOP
    v_yield_mod := CASE v_field.control_level
      WHEN 'claimed' THEN 0.50
      WHEN 'occupied' THEN 0.75
      WHEN 'improved' THEN 1.00
      ELSE 0.50
    END;

    -- Map tile resource type to city resource type
    v_mapped_resource := CASE v_field.tile_resource_type
      WHEN 'farmland' THEN 'food'
      WHEN 'oil' THEN 'oil'
      WHEN 'iron' THEN 'iron'
      WHEN 'coal' THEN 'coal'
      WHEN 'copper' THEN 'copper'
      WHEN 'bauxite' THEN 'aluminum'
      WHEN 'rubber' THEN 'rubber'
      WHEN 'tungsten' THEN 'tungsten'
      ELSE v_field.tile_resource_type
    END;

    -- Also handle farmland tiles where resource_type is NULL but terrain is farmland
    IF v_mapped_resource IS NULL AND v_field.terrain_type = 'farmland' THEN
      v_mapped_resource := 'food';
    END IF;

    IF v_mapped_resource IS NULL THEN CONTINUE; END IF;

    SELECT c.id INTO v_city_id
    FROM cities c
    WHERE c.player_id = v_field.player_id
    ORDER BY c.is_capital DESC
    LIMIT 1;

    IF v_city_id IS NOT NULL THEN
      v_production := v_field.production_rate * v_yield_mod;

      -- Add resources (5 ticks worth)
      UPDATE city_resources
      SET amount = LEAST(amount + v_production * 5, storage_capacity),
          production_rate = production_rate + v_production
      WHERE city_id = v_city_id
      AND resource_type = v_mapped_resource;

      -- If resource type doesn't exist in city_resources, create it
      IF NOT FOUND THEN
        INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
        VALUES (v_city_id, v_mapped_resource, v_production * 5, v_production, 500);
      END IF;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 2. Building-based production
  -- -----------------------------------------------------------------------
  FOR v_building IN
    SELECT b.building_def, b.level, b.city_id, bd.effects_per_level
    FROM buildings b
    JOIN cities c ON c.id = b.city_id
    JOIN players p ON p.id = c.player_id
    JOIN building_defs bd ON bd.id = b.building_def
    WHERE p.server_id = p_server_id
    AND b.is_constructing = false
    AND b.level >= 1
  LOOP
    v_effects := v_building.effects_per_level->(v_building.level - 1);
    IF v_effects IS NULL THEN CONTINUE; END IF;

    FOR v_effect_key, v_effect_val IN SELECT * FROM jsonb_each_text(v_effects)
    LOOP
      v_resource := CASE v_effect_key
        WHEN 'money_income' THEN 'money'
        WHEN 'steel_production' THEN 'steel'
        WHEN 'fuel_production' THEN 'oil'
        WHEN 'ammo_production' THEN 'ammunition'
        WHEN 'food_production' THEN 'food'
        WHEN 'aluminum_production' THEN 'aluminum'
        WHEN 'trade_income' THEN 'money'
        ELSE NULL
      END;

      IF v_resource IS NOT NULL THEN
        UPDATE city_resources
        SET amount = LEAST(amount + v_effect_val::real * 5, storage_capacity),
            production_rate = production_rate + v_effect_val::real
        WHERE city_id = v_building.city_id
        AND resource_type = v_resource;
      END IF;
    END LOOP;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 3. Passive generation from cities
  -- -----------------------------------------------------------------------
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0 * 5), storage_capacity),
      production_rate = production_rate + (c.level * 2.0)
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'manpower';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 5.0 * 5), storage_capacity),
      production_rate = production_rate + (c.level * 5.0)
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'money';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 017_fix_materialize_resources.sql
-- Fix: materialize_resources
--   1. owner_id → player_id
--   2. Add building-based production (Tax Office, Steel Mill, etc.)
--   3. Update city_resources.production_rate so the UI shows correct rates
--
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
BEGIN
  -- -----------------------------------------------------------------------
  -- 1. Resource field production → nearest city
  -- -----------------------------------------------------------------------
  FOR v_field IN
    SELECT rf.*, t.resource_type AS tile_resource_type, t.soil_quality
    FROM resource_fields rf
    JOIN tiles t ON t.id = rf.tile_id AND t.server_id = rf.server_id
    WHERE rf.server_id = p_server_id
    AND rf.status IN ('productive', 'declining')
  LOOP
    SELECT c.id INTO v_city_id
    FROM cities c
    WHERE c.player_id = v_field.player_id
    ORDER BY c.is_capital DESC
    LIMIT 1;

    IF v_city_id IS NOT NULL AND v_field.tile_resource_type IS NOT NULL THEN
      UPDATE city_resources
      SET amount = LEAST(amount + v_field.production_rate * 5, storage_capacity)
      WHERE city_id = v_city_id
      AND resource_type = v_field.tile_resource_type;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 2. Building-based production (Tax Office, Steel Mill, etc.)
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
    -- Get effects for this building's current level (0-indexed in JSONB array)
    v_effects := v_building.effects_per_level->(v_building.level - 1);
    IF v_effects IS NULL THEN CONTINUE; END IF;

    -- Map effect keys to resource types and add production
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
        v_production := v_effect_val::real * 5; -- 5 ticks worth
        UPDATE city_resources
        SET amount = LEAST(amount + v_production, storage_capacity)
        WHERE city_id = v_building.city_id
        AND resource_type = v_resource;

        -- Also update production_rate for UI display
        UPDATE city_resources
        SET production_rate = v_effect_val::real
        WHERE city_id = v_building.city_id
        AND resource_type = v_resource
        AND production_rate < v_effect_val::real;
      END IF;
    END LOOP;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 3. Passive generation from cities
  -- -----------------------------------------------------------------------
  -- Manpower: city_level * 2 per tick
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0 * 5), storage_capacity),
      production_rate = GREATEST(production_rate, c.level * 2.0)
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'manpower';

  -- Base money: city_level * 5 per tick
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 5.0 * 5), storage_capacity)
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'money';
END;
$$ LANGUAGE plpgsql;

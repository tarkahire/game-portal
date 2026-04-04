-- ============================================================================
-- 022_fix_resource_gaps.sql
-- Add missing resource types to all cities + map fish→food
-- Run in Supabase SQL Editor.
-- ============================================================================

-- 1. Add all possible resource types to every city
INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
SELECT c.id, rt.resource_type, 0, 0, 500
FROM cities c
CROSS JOIN (
  VALUES ('money'), ('food'), ('steel'), ('oil'), ('manpower'),
         ('ammunition'), ('copper'), ('coal'), ('iron'),
         ('aluminum'), ('rubber'), ('tungsten')
) AS rt(resource_type)
WHERE NOT EXISTS (
  SELECT 1 FROM city_resources cr
  WHERE cr.city_id = c.id AND cr.resource_type = rt.resource_type
);

-- 2. Update materialize_resources to map fish→food
-- (fish is a coastal food source)
CREATE OR REPLACE FUNCTION materialize_resources(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field RECORD; v_city_id UUID; v_building RECORD; v_effects JSONB;
  v_effect_key TEXT; v_effect_val REAL; v_resource TEXT; v_production REAL;
  v_yield_mod REAL; v_mapped_resource TEXT;
BEGIN
  -- Reset production rates
  UPDATE city_resources cr SET production_rate = 0
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
      WHEN 'farmland' THEN 'food'
      WHEN 'fish' THEN 'food'
      WHEN 'oil' THEN 'oil'
      WHEN 'iron' THEN 'iron'
      WHEN 'coal' THEN 'coal'
      WHEN 'copper' THEN 'copper'
      WHEN 'bauxite' THEN 'aluminum'
      WHEN 'rubber' THEN 'rubber'
      WHEN 'tungsten' THEN 'tungsten'
      WHEN 'uranium' THEN 'uranium'
      ELSE v_field.tile_resource_type
    END;

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

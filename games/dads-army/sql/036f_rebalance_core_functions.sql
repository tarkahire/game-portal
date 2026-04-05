-- ============================================================================
-- 036f: Updated core functions (materialize_resources, process_game_tick,
-- get_visible_tiles) with synthetic production + discovery support.
-- Run SIXTH (LAST) in Supabase SQL Editor.
-- ============================================================================

-- =========================================================================
-- Updated materialize_resources — synthetic production + multi-layer fields
-- =========================================================================
CREATE OR REPLACE FUNCTION materialize_resources(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field RECORD; v_city_id UUID; v_building RECORD; v_effects JSONB;
  v_effect_key TEXT; v_effect_val TEXT; v_resource TEXT; v_production REAL;
  v_yield_mod REAL; v_mapped_resource TEXT;
  v_city RECORD; v_terrain_tile RECORD;
  v_research RECORD; v_tile_resource TEXT;
BEGIN
  -- Reset production rates
  UPDATE city_resources cr SET production_rate = 0
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Reset storage to base values per city level
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
  -- Resource field production (primary, secondary, deep layers)
  -- -----------------------------------------------------------------------
  FOR v_field IN
    SELECT rf.*,
      CASE rf.resource_layer
        WHEN 'secondary' THEN t.secondary_resource
        WHEN 'deep' THEN t.deep_resource
        ELSE t.resource_type
      END AS tile_resource_type,
      t.soil_quality, t.control_level, t.terrain_type
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
  -- Synthetic research production
  -- -----------------------------------------------------------------------
  FOR v_research IN
    SELECT pr.player_id, pr.research_def, pr.level,
           rd.effects_per_level
    FROM player_research pr
    JOIN research_defs rd ON rd.id = pr.research_def
    JOIN players p ON p.id = pr.player_id
    WHERE p.server_id = p_server_id
    AND pr.level >= 1
    AND pr.is_researching = false
    AND pr.research_def IN (
      'synthetic_materials', 'synthetic_tungsten', 'synthetic_copper',
      'synthetic_bauxite', 'synthetic_fuel_advanced'
    )
  LOOP
    SELECT c.id INTO v_city_id FROM cities c
    WHERE c.player_id = v_research.player_id ORDER BY c.is_capital DESC LIMIT 1;

    IF v_city_id IS NOT NULL THEN
      v_effects := v_research.effects_per_level->(v_research.level - 1);
      IF v_effects IS NULL THEN CONTINUE; END IF;

      FOR v_effect_key, v_effect_val IN SELECT * FROM jsonb_each_text(v_effects)
      LOOP
        v_resource := CASE v_effect_key
          WHEN 'synthetic_rubber' THEN 'rubber'
          WHEN 'synthetic_fuel' THEN 'oil'
          WHEN 'synthetic_tungsten' THEN 'tungsten'
          WHEN 'synthetic_copper' THEN 'copper'
          WHEN 'synthetic_aluminum' THEN 'aluminum'
          WHEN 'synthetic_oil' THEN 'oil'
          ELSE NULL
        END;
        IF v_resource IS NOT NULL THEN
          UPDATE city_resources
          SET amount = LEAST(amount + v_effect_val::real, storage_capacity),
              production_rate = production_rate + v_effect_val::real
          WHERE city_id = v_city_id AND resource_type = v_resource;

          IF NOT FOUND THEN
            INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
            VALUES (v_city_id, v_resource, v_effect_val::real, v_effect_val::real, 2000);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Passive terrain production
  -- -----------------------------------------------------------------------
  FOR v_city IN
    SELECT c.id AS city_id, c.tile_id, c.level, c.player_id, ct.q, ct.r
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    JOIN players p ON p.id = c.player_id
    WHERE p.server_id = p_server_id
  LOOP
    FOR v_terrain_tile IN
      SELECT t.terrain_type, t.resource_type
      FROM tiles t
      WHERE t.server_id = p_server_id
      AND t.owner_id = v_city.player_id
      AND (ABS(t.q - v_city.q) + ABS(t.r - v_city.r) + ABS((t.q + t.r) - (v_city.q + v_city.r))) / 2 <= 3
    LOOP
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
  -- Passive city generation (money, manpower, bootstrap steel/iron/coal)
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
-- Updated process_game_tick — includes discoveries
-- =========================================================================
CREATE OR REPLACE FUNCTION process_game_tick(p_server_id UUID)
RETURNS void AS $$
DECLARE v_server RECORD;
BEGIN
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id AND status = 'active';
  IF NOT FOUND THEN RETURN; END IF;

  PERFORM complete_buildings(p_server_id);
  PERFORM complete_training(p_server_id);
  PERFORM resolve_army_arrivals(p_server_id);
  PERFORM update_control_levels(p_server_id);
  PERFORM process_depletion(p_server_id);
  PERFORM process_discoveries(p_server_id);  -- NEW
  PERFORM materialize_resources(p_server_id);
  PERFORM process_supply_chains(p_server_id);
  PERFORM degrade_fortifications(p_server_id);

  UPDATE game_servers SET last_tick_at = now() WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- Updated get_visible_tiles — includes discovery columns
-- =========================================================================
DROP FUNCTION IF EXISTS get_visible_tiles(uuid);

CREATE OR REPLACE FUNCTION get_visible_tiles(p_server_id UUID)
RETURNS TABLE (
  id INT, q INT, r INT, terrain_type TEXT, owner_id UUID,
  resource_type TEXT, resource_reserves_total REAL, resource_reserves_remaining REAL,
  soil_quality REAL, war_damage_level REAL, land_quality REAL,
  infrastructure_road BOOLEAN, infrastructure_rail BOOLEAN,
  fortification_type TEXT, fortification_hp REAL,
  fog_state TEXT, control_level TEXT,
  secondary_resource TEXT, deep_resource TEXT, discovery_stage_completed INT
) AS $$
DECLARE
  v_player_id UUID;
BEGIN
  v_player_id := get_player_id(p_server_id);

  RETURN QUERY
  WITH
  vision_sources AS (
    SELECT ct.q AS vq, ct.r AS vr, 2 AS vrange
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    WHERE c.player_id = v_player_id AND c.server_id = p_server_id
    UNION ALL
    SELECT at2.q AS vq, at2.r AS vr,
           COALESCE((
             SELECT MAX(ud.vision_range)
             FROM army_units au
             JOIN unit_defs ud ON ud.id = au.unit_def
             WHERE au.army_id = a.id
           ), 1) AS vrange
    FROM armies a
    JOIN tiles at2 ON at2.id = a.tile_id AND at2.server_id = a.server_id
    WHERE a.player_id = v_player_id AND a.server_id = p_server_id
  ),
  visible_coords AS (
    SELECT DISTINCT t2.id AS tile_id
    FROM tiles t2, vision_sources vs
    WHERE t2.server_id = p_server_id
    AND (ABS(t2.q - vs.vq) + ABS(t2.r - vs.vr) + ABS((t2.q + t2.r) - (vs.vq + vs.vr))) / 2 <= vs.vrange
  )
  SELECT
    t.id, t.q, t.r, t.terrain_type,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.owner_id
         WHEN v_player_id = ANY(t.is_explored_by) THEN t.owner_id ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_type
         WHEN v_player_id = ANY(t.is_explored_by) THEN t.resource_type ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_reserves_total ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_reserves_remaining ELSE NULL END,
    t.soil_quality,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.war_damage_level ELSE 0 END,
    t.land_quality,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by) THEN t.infrastructure_road ELSE false END,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by) THEN t.infrastructure_rail ELSE false END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.fortification_type ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.fortification_hp ELSE 0 END,
    CASE
      WHEN vc.tile_id IS NOT NULL THEN 'visible'
      WHEN v_player_id = ANY(t.is_explored_by) THEN 'stale'
      ELSE 'unexplored'
    END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.control_level ELSE NULL END,
    -- Discovery columns: only show discovered resources on visible/explored tiles
    CASE WHEN (vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by))
              AND t.discovery_stage_completed >= 2 THEN t.secondary_resource ELSE NULL END,
    CASE WHEN (vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by))
              AND t.discovery_stage_completed >= 3 THEN t.deep_resource ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by)
         THEN t.discovery_stage_completed ELSE 1 END
  FROM tiles t
  LEFT JOIN visible_coords vc ON vc.tile_id = t.id
  WHERE t.server_id = p_server_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

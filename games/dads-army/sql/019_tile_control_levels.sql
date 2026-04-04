-- ============================================================================
-- 019_tile_control_levels.sql
-- Tile control levels: claimed / occupied / improved
--
-- Yield modifiers:
--   claimed  = 0.50x (you own it but nobody's there — declining)
--   occupied = 0.75x (troops present — stable)
--   improved = 1.00x (engineers have fortified operations — full yield)
--
-- Run each statement in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- 1. Add control_level column to tiles
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tiles' AND column_name = 'control_level'
  ) THEN
    ALTER TABLE tiles ADD COLUMN control_level TEXT NOT NULL DEFAULT 'claimed'
      CHECK (control_level IN ('claimed', 'occupied', 'improved'));
  END IF;
END $$;

-- Set existing owned tiles to 'claimed' (they were click-claimed with no troops)
UPDATE tiles SET control_level = 'claimed' WHERE owner_id IS NOT NULL;


-- =========================================================================
-- 1b. Update get_visible_tiles to include control_level
-- =========================================================================
CREATE OR REPLACE FUNCTION get_visible_tiles(p_server_id UUID)
RETURNS TABLE (
  id INT, q INT, r INT, terrain_type TEXT, owner_id UUID,
  resource_type TEXT, resource_reserves_total REAL, resource_reserves_remaining REAL,
  soil_quality REAL, war_damage_level REAL, land_quality REAL,
  infrastructure_road BOOLEAN, infrastructure_rail BOOLEAN,
  fortification_type TEXT, fortification_hp REAL,
  fog_state TEXT, control_level TEXT
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
           COALESCE((SELECT MAX(ud.vision_range) FROM army_units au JOIN unit_defs ud ON ud.id = au.unit_def WHERE au.army_id = a.id), 1) AS vrange
    FROM armies a
    JOIN tiles at2 ON at2.id = a.tile_id AND at2.server_id = a.server_id
    WHERE a.player_id = v_player_id AND a.server_id = p_server_id
    UNION ALL
    SELECT ot.q AS vq, ot.r AS vr, 1 AS vrange
    FROM tiles ot WHERE ot.owner_id = v_player_id AND ot.server_id = p_server_id
  ),
  visible_coords AS (
    SELECT DISTINCT t.id AS tile_id
    FROM tiles t, vision_sources vs
    WHERE t.server_id = p_server_id
    AND (ABS(t.q - vs.vq) + ABS(t.r - vs.vr) + ABS((t.q + t.r) - (vs.vq + vs.vr))) / 2 <= vs.vrange
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
    CASE WHEN vc.tile_id IS NOT NULL THEN t.control_level ELSE NULL END
  FROM tiles t
  LEFT JOIN visible_coords vc ON vc.tile_id = t.id
  WHERE t.server_id = p_server_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =========================================================================
-- 2. improve_tile — Engineers improve a tile to full yield
-- =========================================================================
CREATE OR REPLACE FUNCTION improve_tile(
  p_army_id   UUID,
  p_tile_id   INT,
  p_server_id UUID
)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_army      RECORD;
  v_tile      RECORD;
  v_has_eng   BOOLEAN;
BEGIN
  v_player_id := get_player_id(p_server_id);

  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.tile_id != p_tile_id THEN RAISE EXCEPTION 'Army is not on this tile'; END IF;
  IF v_army.status != 'idle' THEN RAISE EXCEPTION 'Army must be idle'; END IF;

  SELECT * INTO v_tile FROM tiles WHERE id = p_tile_id AND server_id = p_server_id;
  IF v_tile.owner_id != v_player_id THEN RAISE EXCEPTION 'You do not own this tile'; END IF;

  IF v_tile.control_level = 'improved' THEN
    RAISE EXCEPTION 'Tile is already improved';
  END IF;

  -- Check army has engineer units
  v_has_eng := EXISTS (
    SELECT 1 FROM army_units au
    JOIN unit_defs ud ON ud.id = au.unit_def
    WHERE au.army_id = p_army_id
    AND ud.special_abilities->>'can_build' = 'true'
  );

  IF NOT v_has_eng THEN
    RAISE EXCEPTION 'Army needs engineer units to improve a tile';
  END IF;

  UPDATE tiles
  SET control_level = 'improved'
  WHERE id = p_tile_id AND server_id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 3. update_control_levels — Game tick function
--    Checks military presence and adjusts control_level accordingly
-- =========================================================================
CREATE OR REPLACE FUNCTION update_control_levels(p_server_id UUID)
RETURNS void AS $$
BEGIN
  -- Tiles with troops present: at least 'occupied'
  UPDATE tiles t
  SET control_level = CASE
    WHEN t.control_level = 'improved' THEN 'improved'  -- don't downgrade improved
    ELSE 'occupied'
  END
  WHERE t.server_id = p_server_id
  AND t.owner_id IS NOT NULL
  AND t.control_level != 'improved'
  AND EXISTS (
    SELECT 1 FROM armies a
    WHERE a.tile_id = t.id AND a.server_id = t.server_id
    AND a.player_id = t.owner_id
    AND a.status IN ('idle', 'marching')
  );

  -- Tiles WITHOUT troops: degrade to 'claimed' (unless improved)
  UPDATE tiles t
  SET control_level = 'claimed'
  WHERE t.server_id = p_server_id
  AND t.owner_id IS NOT NULL
  AND t.control_level = 'occupied'
  AND NOT EXISTS (
    SELECT 1 FROM armies a
    WHERE a.tile_id = t.id AND a.server_id = t.server_id
    AND a.player_id = t.owner_id
  );

  -- Improved tiles without troops for extended period degrade to occupied
  -- (not implemented yet — future enhancement for tile decay)
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 4. Update materialize_resources to apply control_level yield modifier
-- =========================================================================
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
  v_tile       RECORD;
BEGIN
  -- -----------------------------------------------------------------------
  -- 1. Resource field production → nearest city (with control_level modifier)
  -- -----------------------------------------------------------------------
  FOR v_field IN
    SELECT rf.*, t.resource_type AS tile_resource_type, t.soil_quality, t.control_level
    FROM resource_fields rf
    JOIN tiles t ON t.id = rf.tile_id AND t.server_id = rf.server_id
    WHERE rf.server_id = p_server_id
    AND rf.status IN ('productive', 'declining')
  LOOP
    -- Yield modifier based on control level
    v_yield_mod := CASE v_field.control_level
      WHEN 'claimed' THEN 0.50
      WHEN 'occupied' THEN 0.75
      WHEN 'improved' THEN 1.00
      ELSE 0.50
    END;

    SELECT c.id INTO v_city_id
    FROM cities c
    WHERE c.player_id = v_field.player_id
    ORDER BY c.is_capital DESC
    LIMIT 1;

    IF v_city_id IS NOT NULL AND v_field.tile_resource_type IS NOT NULL THEN
      UPDATE city_resources
      SET amount = LEAST(amount + v_field.production_rate * 5 * v_yield_mod, storage_capacity)
      WHERE city_id = v_city_id
      AND resource_type = v_field.tile_resource_type;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- 2. Building-based production (unaffected by control_level)
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
        v_production := v_effect_val::real * 5;
        UPDATE city_resources
        SET amount = LEAST(amount + v_production, storage_capacity)
        WHERE city_id = v_building.city_id
        AND resource_type = v_resource;

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
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0 * 5), storage_capacity),
      production_rate = GREATEST(production_rate, c.level * 2.0)
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'manpower';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 5.0 * 5), storage_capacity)
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id
  AND p.server_id = p_server_id
  AND cr.resource_type = 'money';
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 5. Register update_control_levels in the game tick
-- =========================================================================
CREATE OR REPLACE FUNCTION process_game_tick(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_server     RECORD;
BEGIN
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id AND status = 'active';
  IF NOT FOUND THEN RETURN; END IF;

  -- Step 1: Complete finished buildings
  PERFORM complete_buildings(p_server_id);

  -- Step 2: Complete finished training
  PERFORM complete_training(p_server_id);

  -- Step 3: Resolve arrived armies
  PERFORM resolve_army_arrivals(p_server_id);

  -- Step 4: Update tile control levels based on military presence
  PERFORM update_control_levels(p_server_id);

  -- Step 5: Process resource depletion
  PERFORM process_depletion(p_server_id);

  -- Step 6: Materialize resources (every 5th tick)
  IF (extract(minute from now())::int % 5 = 0) THEN
    PERFORM materialize_resources(p_server_id);
  END IF;

  -- Step 7: Process supply chains
  PERFORM process_supply_chains(p_server_id);

  -- Step 8: Degrade ungarrisoned fortifications
  PERFORM degrade_fortifications(p_server_id);

  -- Step 9: Update server timestamp
  UPDATE game_servers SET last_tick_at = now() WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 018_fog_of_war.sql
-- Phase 1.5: Fog of War
--
-- Adds vision_range to unit_defs and creates get_visible_tiles RPC that
-- returns all tiles with fog_state and strips sensitive data outside vision.
--
-- Run each statement in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- 1. Add vision_range column to unit_defs
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unit_defs' AND column_name = 'vision_range'
  ) THEN
    ALTER TABLE unit_defs ADD COLUMN vision_range INT NOT NULL DEFAULT 1;
    -- Scouts and recon vehicles get extended vision
    UPDATE unit_defs SET vision_range = 2 WHERE id IN ('armored_car');
    UPDATE unit_defs SET vision_range = 1 WHERE id NOT IN ('armored_car');
  END IF;
END $$;


-- =========================================================================
-- 2. get_visible_tiles — Returns all tiles with fog_state
-- =========================================================================
CREATE OR REPLACE FUNCTION get_visible_tiles(p_server_id UUID)
RETURNS TABLE (
  id INT,
  q INT,
  r INT,
  terrain_type TEXT,
  owner_id UUID,
  resource_type TEXT,
  resource_reserves_total REAL,
  resource_reserves_remaining REAL,
  soil_quality REAL,
  war_damage_level REAL,
  land_quality REAL,
  infrastructure_road BOOLEAN,
  infrastructure_rail BOOLEAN,
  fortification_type TEXT,
  fortification_hp REAL,
  fog_state TEXT
) AS $$
DECLARE
  v_player_id UUID;
BEGIN
  v_player_id := get_player_id(p_server_id);

  RETURN QUERY
  WITH
  -- All tiles the player can currently see
  vision_sources AS (
    -- Cities provide 2-hex vision
    SELECT ct.q AS vq, ct.r AS vr, 2 AS vrange
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    WHERE c.player_id = v_player_id AND c.server_id = p_server_id

    UNION ALL

    -- Armies provide vision based on unit type (max vision in army)
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

    UNION ALL

    -- Owned tiles provide 1-hex vision (you can see your own territory edges)
    SELECT ot.q AS vq, ot.r AS vr, 1 AS vrange
    FROM tiles ot
    WHERE ot.owner_id = v_player_id AND ot.server_id = p_server_id
  ),
  -- Compute set of visible tile coordinates
  visible_coords AS (
    SELECT DISTINCT t.id AS tile_id
    FROM tiles t, vision_sources vs
    WHERE t.server_id = p_server_id
    AND (ABS(t.q - vs.vq) + ABS(t.r - vs.vr) + ABS((t.q + t.r) - (vs.vq + vs.vr))) / 2 <= vs.vrange
  )
  SELECT
    t.id,
    t.q,
    t.r,
    t.terrain_type,
    -- Sensitive data: only show for visible tiles
    CASE WHEN vc.tile_id IS NOT NULL THEN t.owner_id ELSE
      CASE WHEN v_player_id = ANY(t.is_explored_by) THEN t.owner_id ELSE NULL END
    END AS owner_id,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_type ELSE
      CASE WHEN v_player_id = ANY(t.is_explored_by) THEN t.resource_type ELSE NULL END
    END AS resource_type,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_reserves_total ELSE NULL END AS resource_reserves_total,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_reserves_remaining ELSE NULL END AS resource_reserves_remaining,
    t.soil_quality,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.war_damage_level ELSE 0 END AS war_damage_level,
    t.land_quality,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by) THEN t.infrastructure_road ELSE false END AS infrastructure_road,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by) THEN t.infrastructure_rail ELSE false END AS infrastructure_rail,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.fortification_type ELSE NULL END AS fortification_type,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.fortification_hp ELSE 0 END AS fortification_hp,
    -- Fog state
    CASE
      WHEN vc.tile_id IS NOT NULL THEN 'visible'
      WHEN v_player_id = ANY(t.is_explored_by) THEN 'stale'
      ELSE 'unexplored'
    END AS fog_state
  FROM tiles t
  LEFT JOIN visible_coords vc ON vc.tile_id = t.id
  WHERE t.server_id = p_server_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =========================================================================
-- 3. get_visible_armies — Only return armies on visible tiles
-- =========================================================================
CREATE OR REPLACE FUNCTION get_visible_armies(p_server_id UUID)
RETURNS TABLE (
  id UUID,
  player_id UUID,
  tile_id INT,
  name TEXT,
  status TEXT,
  is_garrison BOOLEAN
) AS $$
DECLARE
  v_player_id UUID;
BEGIN
  v_player_id := get_player_id(p_server_id);

  RETURN QUERY
  WITH vision_sources AS (
    SELECT ct.q AS vq, ct.r AS vr, 2 AS vrange
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    WHERE c.player_id = v_player_id AND c.server_id = p_server_id
    UNION ALL
    SELECT at2.q AS vq, at2.r AS vr, COALESCE((
      SELECT MAX(ud.vision_range) FROM army_units au JOIN unit_defs ud ON ud.id = au.unit_def WHERE au.army_id = a.id
    ), 1) AS vrange
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
  SELECT a.id, a.player_id, a.tile_id, a.name, a.status, a.is_garrison
  FROM armies a
  JOIN visible_coords vc ON vc.tile_id = a.tile_id
  WHERE a.server_id = p_server_id
  AND a.is_garrison = false
  AND (a.player_id = v_player_id OR vc.tile_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =========================================================================
-- 4. Update explore_on_arrival — mark tiles explored when armies move
-- =========================================================================
CREATE OR REPLACE FUNCTION explore_on_arrival(
  p_player_id UUID,
  p_tile_id INT,
  p_server_id UUID,
  p_vision_range INT DEFAULT 1
)
RETURNS void AS $$
BEGIN
  UPDATE tiles t
  SET is_explored_by = CASE
    WHEN p_player_id = ANY(t.is_explored_by) THEN t.is_explored_by
    ELSE array_append(t.is_explored_by, p_player_id)
  END
  FROM tiles center
  WHERE center.id = p_tile_id AND center.server_id = p_server_id
  AND t.server_id = p_server_id
  AND (ABS(t.q - center.q) + ABS(t.r - center.r) + ABS((t.q + t.r) - (center.q + center.r))) / 2 <= p_vision_range;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

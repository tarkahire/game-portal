-- ============================================================================
-- 033_fix_vision_no_claim_creep.sql
-- Remove owned-tile vision from fog of war. Vision only from cities + troops.
-- Claiming tiles no longer expands visible area.
-- Run in Supabase SQL Editor.
-- ============================================================================

-- Drop old function signature first (return type changed previously)
DROP FUNCTION IF EXISTS get_visible_tiles(uuid);

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
  -- Vision sources: ONLY cities and armies (NOT owned tiles)
  vision_sources AS (
    -- Cities provide 2-hex vision
    SELECT ct.q AS vq, ct.r AS vr, 2 AS vrange
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    WHERE c.player_id = v_player_id AND c.server_id = p_server_id

    UNION ALL

    -- Armies provide vision based on unit type (1-2 hex)
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

    -- REMOVED: owned tiles no longer provide vision
    -- This prevents "claim creep" where clicking tiles expands fog indefinitely
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


-- Also update get_visible_armies to match (no owned-tile vision)
CREATE OR REPLACE FUNCTION get_visible_armies(p_server_id UUID)
RETURNS TABLE (
  id UUID, player_id UUID, tile_id INT, name TEXT, status TEXT, is_garrison BOOLEAN
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
    SELECT at2.q AS vq, at2.r AS vr,
           COALESCE((SELECT MAX(ud.vision_range) FROM army_units au JOIN unit_defs ud ON ud.id = au.unit_def WHERE au.army_id = a.id), 1) AS vrange
    FROM armies a
    JOIN tiles at2 ON at2.id = a.tile_id AND at2.server_id = a.server_id
    WHERE a.player_id = v_player_id AND a.server_id = p_server_id
    -- REMOVED: owned tiles no longer provide vision
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

-- Add destination_tile to get_visible_armies return type
CREATE OR REPLACE FUNCTION get_visible_armies(p_server_id UUID)
RETURNS TABLE (
  id UUID, player_id UUID, tile_id INT, name TEXT, status TEXT,
  is_garrison BOOLEAN, destination_tile INT
) AS $$
DECLARE
  v_player_id UUID;
BEGIN
  v_player_id := get_player_id(p_server_id);
  RETURN QUERY
  WITH vision_sources AS (
    SELECT ct.q AS vq, ct.r AS vr, 2 AS vrange
    FROM cities c JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    WHERE c.player_id = v_player_id AND c.server_id = p_server_id
    UNION ALL
    SELECT at2.q AS vq, at2.r AS vr,
           COALESCE((SELECT MAX(ud.vision_range) FROM army_units au JOIN unit_defs ud ON ud.id = au.unit_def WHERE au.army_id = a.id), 1) AS vrange
    FROM armies a JOIN tiles at2 ON at2.id = a.tile_id AND at2.server_id = a.server_id
    WHERE a.player_id = v_player_id AND a.server_id = p_server_id
  ),
  visible_coords AS (
    SELECT DISTINCT t.id AS tile_id FROM tiles t, vision_sources vs
    WHERE t.server_id = p_server_id
    AND (ABS(t.q - vs.vq) + ABS(t.r - vs.vr) + ABS((t.q + t.r) - (vs.vq + vs.vr))) / 2 <= vs.vrange
  )
  SELECT a.id, a.player_id, a.tile_id, a.name, a.status, a.is_garrison, a.destination_tile
  FROM armies a JOIN visible_coords vc ON vc.tile_id = a.tile_id
  WHERE a.server_id = p_server_id AND a.is_garrison = false
  AND (a.player_id = v_player_id OR vc.tile_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

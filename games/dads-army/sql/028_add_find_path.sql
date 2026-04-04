-- find_path was never created in the database (BFS pathfinding for army movement)
CREATE OR REPLACE FUNCTION find_path(p_start_tile INT, p_end_tile INT, p_server_id UUID)
RETURNS INT[] AS $$
DECLARE
  v_queue INT[] := ARRAY[p_start_tile]; v_visited INT[] := ARRAY[p_start_tile];
  v_parent JSONB := jsonb_build_object(p_start_tile::text, NULL);
  v_current INT; v_neighbor INT; v_path INT[] := '{}';
  v_found BOOLEAN := false; v_iteration INT := 0;
BEGIN
  WHILE array_length(v_queue, 1) > 0 AND v_iteration < 1000 LOOP
    v_iteration := v_iteration + 1; v_current := v_queue[1]; v_queue := v_queue[2:];
    IF v_current = p_end_tile THEN v_found := true; EXIT; END IF;
    FOR v_neighbor IN
      SELECT CASE WHEN ta.tile_a = v_current THEN ta.tile_b ELSE ta.tile_a END
      FROM tile_adjacency ta WHERE ta.server_id = p_server_id
      AND (ta.tile_a = v_current OR ta.tile_b = v_current)
      AND EXISTS (SELECT 1 FROM tiles t WHERE t.id = CASE WHEN ta.tile_a = v_current THEN ta.tile_b ELSE ta.tile_a END AND t.server_id = p_server_id AND t.terrain_type != 'water')
    LOOP
      IF NOT (v_neighbor = ANY(v_visited)) THEN
        v_visited := array_append(v_visited, v_neighbor);
        v_queue := array_append(v_queue, v_neighbor);
        v_parent := v_parent || jsonb_build_object(v_neighbor::text, v_current);
      END IF;
    END LOOP;
  END LOOP;
  IF NOT v_found THEN RETURN NULL; END IF;
  v_current := p_end_tile;
  WHILE v_current IS NOT NULL LOOP v_path := v_current || v_path; v_current := (v_parent ->> v_current::text)::int; END LOOP;
  RETURN v_path;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

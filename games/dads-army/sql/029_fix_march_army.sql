-- Fix march_army: simplified movement cost calculation (was using invalid lateral join)
CREATE OR REPLACE FUNCTION march_army(p_army_id UUID, p_destination_tile INT)
RETURNS void AS $$
DECLARE
  v_player_id UUID; v_army RECORD; v_path INT[];
  v_total_cost REAL; v_army_speed REAL; v_arrive_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;
  v_player_id := get_player_id(v_army.server_id);
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.status NOT IN ('idle', 'fortified') THEN RAISE EXCEPTION 'Army is not idle (status: %)', v_army.status; END IF;
  IF v_army.is_garrison THEN RAISE EXCEPTION 'Cannot march a garrison army'; END IF;
  IF v_army.tile_id = p_destination_tile THEN RAISE EXCEPTION 'Already on destination tile'; END IF;
  SELECT COALESCE(MIN(ud.speed), 1) INTO v_army_speed FROM army_units au JOIN unit_defs ud ON ud.id = au.unit_def WHERE au.army_id = p_army_id;
  v_path := find_path(v_army.tile_id, p_destination_tile, v_army.server_id);
  IF v_path IS NULL OR array_length(v_path, 1) IS NULL THEN RAISE EXCEPTION 'No path found'; END IF;
  v_total_cost := array_length(v_path, 1) - 1;
  v_arrive_at := now() + make_interval(secs => CEIL(v_total_cost / v_army_speed) * 60);
  UPDATE armies SET status = 'marching', march_path = v_path, march_started_at = now(),
    march_arrives_at = v_arrive_at, destination_tile = p_destination_tile WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix form_army: DELETE garrison row when taking all units (avoids quantity=0 CHECK violation)
CREATE OR REPLACE FUNCTION form_army(p_city_id UUID, p_name TEXT, p_units JSONB)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID; v_city RECORD; v_army_id UUID;
  v_unit JSONB; v_unit_def TEXT; v_quantity INT;
  v_garrison RECORD; v_garrison_army_id UUID; v_garr_qty INT;
BEGIN
  SELECT c.*, c.player_id AS city_player_id, p.server_id AS p_server_id
  INTO v_city FROM cities c JOIN players p ON p.id = c.player_id WHERE c.id = p_city_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'City not found'; END IF;
  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.city_player_id != v_player_id THEN RAISE EXCEPTION 'Not your city'; END IF;
  IF jsonb_array_length(p_units) = 0 THEN RAISE EXCEPTION 'Must include at least one unit'; END IF;
  SELECT a.id INTO v_garrison_army_id FROM armies a
  WHERE a.player_id = v_player_id AND a.tile_id = v_city.tile_id AND a.server_id = v_city.p_server_id AND a.is_garrison = true;
  IF v_garrison_army_id IS NULL THEN RAISE EXCEPTION 'No garrison army'; END IF;
  FOR v_unit IN SELECT * FROM jsonb_array_elements(p_units) LOOP
    v_unit_def := v_unit ->> 'unit_def'; v_quantity := (v_unit ->> 'quantity')::int;
    IF v_quantity < 1 THEN CONTINUE; END IF;
    SELECT quantity INTO v_garr_qty FROM army_units WHERE army_id = v_garrison_army_id AND unit_def = v_unit_def;
    IF v_garr_qty IS NULL OR v_garr_qty < v_quantity THEN
      RAISE EXCEPTION 'Not enough % (have %, need %)', v_unit_def, COALESCE(v_garr_qty, 0), v_quantity;
    END IF;
  END LOOP;
  INSERT INTO armies (player_id, server_id, tile_id, name, status, is_garrison)
  VALUES (v_player_id, v_city.p_server_id, v_city.tile_id, p_name, 'idle', false)
  RETURNING id INTO v_army_id;
  FOR v_unit IN SELECT * FROM jsonb_array_elements(p_units) LOOP
    v_unit_def := v_unit ->> 'unit_def'; v_quantity := (v_unit ->> 'quantity')::int;
    IF v_quantity < 1 THEN CONTINUE; END IF;
    SELECT quantity INTO v_garr_qty FROM army_units WHERE army_id = v_garrison_army_id AND unit_def = v_unit_def;
    IF v_garr_qty = v_quantity THEN
      DELETE FROM army_units WHERE army_id = v_garrison_army_id AND unit_def = v_unit_def;
    ELSE
      UPDATE army_units SET quantity = quantity - v_quantity WHERE army_id = v_garrison_army_id AND unit_def = v_unit_def;
    END IF;
    INSERT INTO army_units (army_id, unit_def, quantity, hp_percent, experience)
    VALUES (v_army_id, v_unit_def, v_quantity, 100.0, 0);
  END LOOP;
  RETURN v_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 013_fix_military_functions.sql
-- Fix: train_units, form_army, march_army, complete_training
--
-- Issues fixed across all functions:
--   1. c.owner_id / a.owner_id → c.player_id / a.player_id
--   2. v_def.training_cost → v_def.train_cost
--   3. v_def.training_time_ticks → v_def.train_time
--   4. avg_hp_percent → hp_percent, experience_level → experience
--   5. destination_tile_id → destination_tile
--   6. Match unit_defs by id instead of name
--   7. form_army INSERT uses player_id not owner_id
--
-- Run each statement individually in Supabase SQL Editor.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. train_units (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION train_units(
  p_city_id   UUID,
  p_unit_def  TEXT,
  p_quantity  INT
)
RETURNS UUID AS $$
DECLARE
  v_player_id     UUID;
  v_city          RECORD;
  v_def           RECORD;
  v_queue_id      UUID;
  v_key           TEXT;
  v_value         REAL;
  v_train_time    INTERVAL;
  v_building_name TEXT;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 100';
  END IF;

  -- Get city
  SELECT c.*, c.player_id AS city_player_id, p.server_id AS p_server_id
  INTO v_city
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE c.id = p_city_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'City not found';
  END IF;

  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.city_player_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this city';
  END IF;

  -- Get unit definition by id
  SELECT * INTO v_def FROM unit_defs WHERE id = p_unit_def;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown unit type: %', p_unit_def;
  END IF;

  -- Check required building exists in city
  v_building_name := CASE v_def.category
    WHEN 'infantry' THEN 'barracks'
    WHEN 'armor' THEN 'tank_factory'
    WHEN 'artillery' THEN 'barracks'
    ELSE NULL
  END;

  IF v_building_name IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM buildings
      WHERE city_id = p_city_id
      AND building_def = v_building_name
      AND level >= 1
      AND is_constructing = false
    ) THEN
      RAISE EXCEPTION 'City needs a % to train %', v_building_name, p_unit_def;
    END IF;
  END IF;

  -- Check and deduct each resource (train_cost * quantity)
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_def.train_cost)
  LOOP
    v_value := v_value::real * p_quantity;
    IF get_player_resource_total(v_player_id, v_key) < v_value THEN
      RAISE EXCEPTION 'Not enough % (need %, have %)',
        v_key, v_value, get_player_resource_total(v_player_id, v_key);
    END IF;
  END LOOP;

  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_def.train_cost)
  LOOP
    PERFORM deduct_player_resource(v_player_id, v_key, v_value::real * p_quantity);
  END LOOP;

  -- Training time: train_time (seconds) * quantity (sequential training)
  v_train_time := make_interval(secs => v_def.train_time * p_quantity);

  -- Create training queue entry
  INSERT INTO training_queue (city_id, unit_def, quantity, completes_at)
  VALUES (p_city_id, p_unit_def, p_quantity, now() + v_train_time)
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- 2. form_army (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION form_army(
  p_city_id UUID,
  p_name    TEXT,
  p_units   JSONB
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_city      RECORD;
  v_army_id   UUID;
  v_unit      JSONB;
  v_unit_def  TEXT;
  v_quantity  INT;
  v_garrison  RECORD;
  v_garrison_army_id UUID;
BEGIN
  -- Get city
  SELECT c.*, c.player_id AS city_player_id, p.server_id AS p_server_id
  INTO v_city
  FROM cities c
  JOIN players p ON p.id = c.player_id
  WHERE c.id = p_city_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'City not found';
  END IF;

  v_player_id := get_player_id(v_city.p_server_id);
  IF v_city.city_player_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this city';
  END IF;

  IF jsonb_array_length(p_units) = 0 THEN
    RAISE EXCEPTION 'Must include at least one unit type';
  END IF;
  IF jsonb_array_length(p_units) > 10 THEN
    RAISE EXCEPTION 'Maximum 10 unit stacks per army';
  END IF;

  -- Find the garrison army for this city
  SELECT a.id INTO v_garrison_army_id
  FROM armies a
  WHERE a.player_id = v_player_id
  AND a.tile_id = v_city.tile_id
  AND a.server_id = v_city.p_server_id
  AND a.is_garrison = true;

  IF v_garrison_army_id IS NULL THEN
    RAISE EXCEPTION 'No garrison army at this city';
  END IF;

  -- Check garrison has enough units
  FOR v_unit IN SELECT * FROM jsonb_array_elements(p_units)
  LOOP
    v_unit_def := v_unit ->> 'unit_def';
    v_quantity := (v_unit ->> 'quantity')::int;

    IF v_quantity < 1 THEN
      RAISE EXCEPTION 'Quantity must be at least 1 for %', v_unit_def;
    END IF;

    SELECT * INTO v_garrison
    FROM army_units au
    WHERE au.army_id = v_garrison_army_id
    AND au.unit_def = v_unit_def;

    IF NOT FOUND OR v_garrison.quantity < v_quantity THEN
      RAISE EXCEPTION 'Not enough % in garrison (have %, need %)',
        v_unit_def, COALESCE(v_garrison.quantity, 0), v_quantity;
    END IF;
  END LOOP;

  -- Create army
  INSERT INTO armies (
    player_id, server_id, tile_id, name, status, is_garrison
  )
  VALUES (
    v_player_id, v_city.p_server_id, v_city.tile_id, p_name, 'idle', false
  )
  RETURNING id INTO v_army_id;

  -- Transfer units from garrison to new army
  FOR v_unit IN SELECT * FROM jsonb_array_elements(p_units)
  LOOP
    v_unit_def := v_unit ->> 'unit_def';
    v_quantity := (v_unit ->> 'quantity')::int;

    -- Reduce garrison
    UPDATE army_units
    SET quantity = quantity - v_quantity
    WHERE army_id = v_garrison_army_id
    AND unit_def = v_unit_def;

    -- Remove empty stacks
    DELETE FROM army_units WHERE army_id = v_garrison_army_id AND quantity <= 0;

    -- Add to new army
    INSERT INTO army_units (army_id, unit_def, quantity, hp_percent, experience)
    VALUES (v_army_id, v_unit_def, v_quantity, 100.0, 0);
  END LOOP;

  RETURN v_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- 3. march_army (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION march_army(
  p_army_id         UUID,
  p_destination_tile INT
)
RETURNS void AS $$
DECLARE
  v_player_id  UUID;
  v_army       RECORD;
  v_path       INT[];
  v_total_cost REAL := 0;
  v_army_speed REAL;
  v_arrive_at  TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Army not found';
  END IF;

  v_player_id := get_player_id(v_army.server_id);
  IF v_army.player_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this army';
  END IF;
  IF v_army.status != 'idle' THEN
    RAISE EXCEPTION 'Army is not idle (status: %)', v_army.status;
  END IF;
  IF v_army.is_garrison THEN
    RAISE EXCEPTION 'Cannot march a garrison army. Form a field army first.';
  END IF;
  IF v_army.tile_id = p_destination_tile THEN
    RAISE EXCEPTION 'Army is already on the destination tile';
  END IF;

  -- Get army speed (slowest unit) — join by unit_defs.id
  SELECT COALESCE(MIN(ud.speed), 1)
  INTO v_army_speed
  FROM army_units au
  JOIN unit_defs ud ON ud.id = au.unit_def
  WHERE au.army_id = p_army_id;

  -- BFS pathfinding
  v_path := find_path(v_army.tile_id, p_destination_tile, v_army.server_id);

  IF v_path IS NULL OR array_length(v_path, 1) IS NULL THEN
    RAISE EXCEPTION 'No path found to destination tile';
  END IF;

  -- Calculate total movement cost along path
  SELECT COALESCE(SUM(ta.movement_cost), array_length(v_path, 1) - 1)
  INTO v_total_cost
  FROM unnest(v_path[1:array_length(v_path,1)-1]) WITH ORDINALITY AS src(tile, idx),
       unnest(v_path[2:array_length(v_path,1)]) WITH ORDINALITY AS dst(tile, idx2)
  JOIN tile_adjacency ta ON (
    ta.server_id = v_army.server_id
    AND LEAST(src.tile, dst.tile) = ta.tile_a
    AND GREATEST(src.tile, dst.tile) = ta.tile_b
  )
  WHERE src.idx = dst.idx2;

  -- Calculate arrival time
  v_arrive_at := now() + make_interval(secs => CEIL(v_total_cost / v_army_speed) * 60);

  UPDATE armies
  SET status = 'marching',
      march_path = v_path,
      march_started_at = now(),
      march_arrives_at = v_arrive_at,
      destination_tile = p_destination_tile
  WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- 4. complete_training (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_training(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_queue_row RECORD;
  v_garrison_army_id UUID;
BEGIN
  FOR v_queue_row IN
    SELECT tq.*, c.player_id AS city_player_id, c.tile_id, p.server_id AS srv_id
    FROM training_queue tq
    JOIN cities c ON c.id = tq.city_id
    JOIN players p ON p.id = c.player_id
    WHERE p.server_id = p_server_id
    AND tq.completes_at <= now()
  LOOP
    -- Find or create garrison army for the city
    SELECT a.id INTO v_garrison_army_id
    FROM armies a
    WHERE a.player_id = v_queue_row.city_player_id
    AND a.tile_id = v_queue_row.tile_id
    AND a.server_id = v_queue_row.srv_id
    AND a.is_garrison = true;

    IF v_garrison_army_id IS NULL THEN
      INSERT INTO armies (player_id, server_id, tile_id, name, status, is_garrison)
      VALUES (v_queue_row.city_player_id, v_queue_row.srv_id, v_queue_row.tile_id, 'Garrison', 'idle', true)
      RETURNING id INTO v_garrison_army_id;
    END IF;

    -- Add units to garrison (merge if same unit type exists)
    IF EXISTS (
      SELECT 1 FROM army_units
      WHERE army_id = v_garrison_army_id AND unit_def = v_queue_row.unit_def
    ) THEN
      UPDATE army_units
      SET quantity = quantity + v_queue_row.quantity
      WHERE army_id = v_garrison_army_id AND unit_def = v_queue_row.unit_def;
    ELSE
      INSERT INTO army_units (army_id, unit_def, quantity, hp_percent, experience)
      VALUES (v_garrison_army_id, v_queue_row.unit_def, v_queue_row.quantity, 100.0, 0);
    END IF;

    -- Remove completed training entry
    DELETE FROM training_queue WHERE id = v_queue_row.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

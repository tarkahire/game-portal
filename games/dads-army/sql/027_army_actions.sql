-- ============================================================================
-- 027_army_actions.sql
-- Army actions: fortify, garrison (return to city), disband
-- Run each statement in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- 1. Add 'fortified' to armies status CHECK constraint
-- =========================================================================
ALTER TABLE armies DROP CONSTRAINT IF EXISTS armies_status_check;
ALTER TABLE armies ADD CONSTRAINT armies_status_check
  CHECK (status IN ('idle', 'marching', 'fighting', 'retreating', 'stranded', 'fortified'));


-- =========================================================================
-- 2. fortify_army — Dig in at current position (+defense bonus in combat)
-- =========================================================================
CREATE OR REPLACE FUNCTION fortify_army(p_army_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_army RECORD;
BEGIN
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;

  v_player_id := get_player_id(v_army.server_id);
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.is_garrison THEN RAISE EXCEPTION 'Cannot fortify a garrison'; END IF;
  IF v_army.status NOT IN ('idle', 'fortified') THEN
    RAISE EXCEPTION 'Army must be idle to fortify (status: %)', v_army.status;
  END IF;

  UPDATE armies SET status = 'fortified' WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 3. unfortify_army — Return to idle from fortified
-- =========================================================================
CREATE OR REPLACE FUNCTION unfortify_army(p_army_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_army RECORD;
BEGIN
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;

  v_player_id := get_player_id(v_army.server_id);
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.status != 'fortified' THEN RAISE EXCEPTION 'Army is not fortified'; END IF;

  UPDATE armies SET status = 'idle' WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 4. garrison_army — Dissolve field army, return units to city garrison
-- =========================================================================
CREATE OR REPLACE FUNCTION garrison_army(p_army_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_army RECORD;
  v_garrison_id UUID;
  v_au RECORD;
BEGIN
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;

  v_player_id := get_player_id(v_army.server_id);
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.is_garrison THEN RAISE EXCEPTION 'Already a garrison'; END IF;
  IF v_army.status NOT IN ('idle', 'fortified') THEN
    RAISE EXCEPTION 'Army must be idle or fortified to garrison (status: %)', v_army.status;
  END IF;

  -- Must be on a city tile
  IF NOT EXISTS (
    SELECT 1 FROM cities WHERE tile_id = v_army.tile_id AND server_id = v_army.server_id
    AND player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'Army must be on one of your city tiles to garrison';
  END IF;

  -- Find or create garrison army at this tile
  SELECT id INTO v_garrison_id FROM armies
  WHERE player_id = v_player_id AND tile_id = v_army.tile_id
  AND server_id = v_army.server_id AND is_garrison = true;

  IF v_garrison_id IS NULL THEN
    INSERT INTO armies (player_id, server_id, tile_id, name, status, is_garrison)
    VALUES (v_player_id, v_army.server_id, v_army.tile_id, 'Garrison', 'idle', true)
    RETURNING id INTO v_garrison_id;
  END IF;

  -- Transfer all units to garrison
  FOR v_au IN SELECT * FROM army_units WHERE army_id = p_army_id
  LOOP
    IF EXISTS (SELECT 1 FROM army_units WHERE army_id = v_garrison_id AND unit_def = v_au.unit_def) THEN
      UPDATE army_units
      SET quantity = quantity + v_au.quantity
      WHERE army_id = v_garrison_id AND unit_def = v_au.unit_def;
    ELSE
      INSERT INTO army_units (army_id, unit_def, quantity, hp_percent, experience)
      VALUES (v_garrison_id, v_au.unit_def, v_au.quantity, v_au.hp_percent, v_au.experience);
    END IF;
  END LOOP;

  -- Delete the field army and its units
  DELETE FROM army_units WHERE army_id = p_army_id;
  DELETE FROM armies WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 5. disband_army — Permanently destroy an army and all its units
-- =========================================================================
CREATE OR REPLACE FUNCTION disband_army(p_army_id UUID)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_army RECORD;
BEGIN
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;

  v_player_id := get_player_id(v_army.server_id);
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.is_garrison THEN RAISE EXCEPTION 'Cannot disband a garrison'; END IF;

  DELETE FROM army_units WHERE army_id = p_army_id;
  DELETE FROM armies WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 6. Update resolve_combat to apply fortified defense bonus (+20%)
-- =========================================================================
-- The fortified bonus is applied as an additional modifier when the
-- defender has status='fortified'. This is added to the terrain defense
-- modifier in the combat resolution function.
-- (For now, a note: the resolve_combat function should check
--  v_defender_army.status = 'fortified' and apply +0.20 to v_terrain_def_mod.
--  This will be integrated in the next combat system update.)

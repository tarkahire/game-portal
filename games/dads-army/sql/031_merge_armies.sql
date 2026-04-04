-- ============================================================================
-- 031_merge_armies.sql
-- Merge two armies on the same tile into one
-- Run in Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION merge_armies(
  p_target_army_id UUID,
  p_source_army_id UUID
)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_target    RECORD;
  v_source    RECORD;
  v_au        RECORD;
BEGIN
  SELECT * INTO v_target FROM armies WHERE id = p_target_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target army not found'; END IF;

  SELECT * INTO v_source FROM armies WHERE id = p_source_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source army not found'; END IF;

  v_player_id := get_player_id(v_target.server_id);
  IF v_target.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_source.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;

  IF v_target.tile_id != v_source.tile_id THEN
    RAISE EXCEPTION 'Armies must be on the same tile to merge';
  END IF;

  IF v_target.is_garrison OR v_source.is_garrison THEN
    RAISE EXCEPTION 'Cannot merge garrison armies (use Return to Garrison instead)';
  END IF;

  IF v_target.status NOT IN ('idle', 'fortified') OR v_source.status NOT IN ('idle', 'fortified') THEN
    RAISE EXCEPTION 'Both armies must be idle or fortified to merge';
  END IF;

  -- Transfer all units from source to target
  FOR v_au IN SELECT * FROM army_units WHERE army_id = p_source_army_id
  LOOP
    IF EXISTS (SELECT 1 FROM army_units WHERE army_id = p_target_army_id AND unit_def = v_au.unit_def) THEN
      -- Same unit type exists: merge quantities, average HP
      UPDATE army_units
      SET quantity = quantity + v_au.quantity,
          hp_percent = (
            (hp_percent * quantity + v_au.hp_percent * v_au.quantity) / (quantity + v_au.quantity)
          ),
          experience = GREATEST(experience, v_au.experience)
      WHERE army_id = p_target_army_id AND unit_def = v_au.unit_def;
    ELSE
      -- New unit type: move the row
      INSERT INTO army_units (army_id, unit_def, quantity, hp_percent, experience)
      VALUES (p_target_army_id, v_au.unit_def, v_au.quantity, v_au.hp_percent, v_au.experience);
    END IF;
  END LOOP;

  -- Delete source army
  DELETE FROM army_units WHERE army_id = p_source_army_id;
  DELETE FROM armies WHERE id = p_source_army_id;

  -- Set target back to idle if it was fortified
  UPDATE armies SET status = 'idle' WHERE id = p_target_army_id AND status = 'fortified';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

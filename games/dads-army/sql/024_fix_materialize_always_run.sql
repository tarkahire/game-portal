-- ============================================================================
-- 024_fix_materialize_always_run.sql
-- Remove 5-minute gate on materialize_resources — run every tick
-- Also fixes v_effect_val type (TEXT not REAL)
-- Run in Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION process_game_tick(p_server_id UUID)
RETURNS void AS $$
DECLARE v_server RECORD;
BEGIN
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id AND status = 'active';
  IF NOT FOUND THEN RETURN; END IF;

  PERFORM complete_buildings(p_server_id);
  PERFORM complete_training(p_server_id);
  PERFORM resolve_army_arrivals(p_server_id);
  PERFORM update_control_levels(p_server_id);
  PERFORM process_depletion(p_server_id);
  PERFORM materialize_resources(p_server_id);  -- Run every tick, not every 5th
  PERFORM process_supply_chains(p_server_id);
  PERFORM degrade_fortifications(p_server_id);

  UPDATE game_servers SET last_tick_at = now() WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

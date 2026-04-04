-- ============================================================================
-- 015_fix_supply_functions.sql
-- Fix: process_supply_chains, degrade_fortifications (owner_id → player_id)
-- Run each statement individually in Supabase SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. process_supply_chains (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_supply_chains(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_army       RECORD;
  v_has_supply BOOLEAN;
BEGIN
  FOR v_army IN
    SELECT a.* FROM armies a
    WHERE a.server_id = p_server_id
    AND a.is_garrison = false
    AND a.status IN ('idle', 'marching')
  LOOP
    -- Simple supply check: friendly city within 10 hex distance
    -- Road-connected tiles extend range (simplified: if road exists on army tile, +5 range)
    v_has_supply := EXISTS (
      SELECT 1 FROM cities c
      JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
      JOIN tiles at2 ON at2.id = v_army.tile_id AND at2.server_id = v_army.server_id
      WHERE c.player_id = v_army.player_id
      AND c.server_id = p_server_id
      AND (ABS(ct.q - at2.q) + ABS(ct.r - at2.r) + ABS(ct.q + ct.r - at2.q - at2.r)) / 2
          <= CASE WHEN at2.infrastructure_road THEN 15 ELSE 10 END
    );

    UPDATE armies
    SET supply_status = CASE
      WHEN v_has_supply THEN 'supplied'
      WHEN supply_status = 'supplied' THEN 'low'
      WHEN supply_status = 'low' THEN 'critical'
      WHEN supply_status = 'critical' THEN 'desperate'
      WHEN supply_status = 'desperate' THEN 'collapsed'
      ELSE supply_status
    END,
    supply_cut_since = CASE
      WHEN v_has_supply THEN NULL
      WHEN supply_cut_since IS NULL THEN now()
      ELSE supply_cut_since
    END
    WHERE id = v_army.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- 2. degrade_fortifications (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION degrade_fortifications(p_server_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tiles t
  SET fortification_hp = GREATEST(fortification_hp - (fortification_hp * 0.01), 0)
  WHERE t.server_id = p_server_id
  AND t.fortification_type IS NOT NULL
  AND t.fortification_hp > 0
  AND NOT EXISTS (
    SELECT 1 FROM armies a
    WHERE a.tile_id = t.id
    AND a.server_id = t.server_id
    AND a.player_id = t.owner_id
    AND (a.is_garrison = true OR a.status = 'idle')
  );

  UPDATE tiles
  SET fortification_type = NULL
  WHERE server_id = p_server_id
  AND fortification_hp <= 0
  AND fortification_type IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

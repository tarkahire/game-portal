-- ============================================================================
-- 011_fix_extraction_intensity.sql
-- Fix: set_extraction_intensity references owner_id but resource_fields uses player_id
-- Run this in Supabase SQL Editor to patch the function.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_extraction_intensity(
  p_field_id   UUID,
  p_intensity  TEXT
)
RETURNS void AS $$
DECLARE
  v_player_id UUID;
  v_field     RECORD;
BEGIN
  -- Validate intensity
  IF p_intensity NOT IN ('sustainable', 'normal', 'intensive') THEN
    RAISE EXCEPTION 'Invalid intensity: %. Must be sustainable, normal, or intensive', p_intensity;
  END IF;

  SELECT * INTO v_field FROM resource_fields WHERE id = p_field_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource field not found';
  END IF;

  v_player_id := get_player_id(v_field.server_id);
  -- FIX: was v_field.owner_id, but resource_fields uses player_id
  IF v_field.player_id != v_player_id THEN
    RAISE EXCEPTION 'You do not own this resource field';
  END IF;

  -- Intensive requires infrastructure level 3+
  IF p_intensity = 'intensive' AND v_field.infrastructure_level < 3 THEN
    RAISE EXCEPTION 'Intensive extraction requires infrastructure level 3 or higher (currently level %)',
      v_field.infrastructure_level;
  END IF;

  UPDATE resource_fields
  SET extraction_intensity = p_intensity
  WHERE id = p_field_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

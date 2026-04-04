-- ============================================================================
-- 020_fix_city_control_and_resources.sql
-- Fix: cities always at least 'occupied', add missing resource types
-- Run each statement in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- 1. Fix: City tiles should always be at least 'occupied'
-- =========================================================================
CREATE OR REPLACE FUNCTION update_control_levels(p_server_id UUID)
RETURNS void AS $$
BEGIN
  -- City tiles are always at least 'occupied' (garrison protects them)
  UPDATE tiles t
  SET control_level = CASE
    WHEN t.control_level = 'improved' THEN 'improved'
    ELSE 'occupied'
  END
  WHERE t.server_id = p_server_id
  AND t.owner_id IS NOT NULL
  AND t.control_level = 'claimed'
  AND EXISTS (
    SELECT 1 FROM cities c
    WHERE c.tile_id = t.id AND c.server_id = t.server_id
  );

  -- Non-city tiles with troops: upgrade to 'occupied'
  UPDATE tiles t
  SET control_level = 'occupied'
  WHERE t.server_id = p_server_id
  AND t.owner_id IS NOT NULL
  AND t.control_level = 'claimed'
  AND EXISTS (
    SELECT 1 FROM armies a
    WHERE a.tile_id = t.id AND a.server_id = t.server_id
    AND a.player_id = t.owner_id
    AND a.status IN ('idle', 'marching')
  );

  -- Tiles WITHOUT troops AND without cities: degrade occupied → claimed
  UPDATE tiles t
  SET control_level = 'claimed'
  WHERE t.server_id = p_server_id
  AND t.owner_id IS NOT NULL
  AND t.control_level = 'occupied'
  AND NOT EXISTS (
    SELECT 1 FROM armies a
    WHERE a.tile_id = t.id AND a.server_id = t.server_id
    AND a.player_id = t.owner_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM cities c
    WHERE c.tile_id = t.id AND c.server_id = t.server_id
  );
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- 2. Ensure all 9 resource types exist for every city
-- =========================================================================
INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
SELECT c.id, rt.resource_type, 0, 0, 500
FROM cities c
CROSS JOIN (
  VALUES ('money'), ('food'), ('steel'), ('oil'), ('manpower'),
         ('ammunition'), ('copper'), ('coal'), ('iron')
) AS rt(resource_type)
WHERE NOT EXISTS (
  SELECT 1 FROM city_resources cr
  WHERE cr.city_id = c.id AND cr.resource_type = rt.resource_type
);


-- =========================================================================
-- 3. Run a tick to apply the city control fix immediately
-- =========================================================================
-- (Run manually after the above):
-- SELECT process_game_tick('157dbc2d-f0e3-4ae8-9d88-c2189a580152');

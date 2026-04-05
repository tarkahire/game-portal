-- ============================================================================
-- 036a: Remove rare resource requirements from L1-L2 buildings
-- Run FIRST in Supabase SQL Editor.
-- ============================================================================

-- Tank Factory: L1/L2 use iron/coal instead of rubber; L3 needs 40 rubber (was 120)
UPDATE building_defs SET costs_per_level = '[
  {"money":300,"steel":100,"iron":30},
  {"money":600,"steel":200,"iron":50,"coal":30},
  {"money":1200,"steel":400,"rubber":40,"oil":20}
]'::jsonb WHERE id = 'tank_factory';

-- Shipyard: L1/L2 use iron/coal instead of rubber; L3 needs 30 rubber (was 100)
UPDATE building_defs SET costs_per_level = '[
  {"money":400,"steel":150,"iron":40},
  {"money":800,"steel":300,"coal":40,"iron":30},
  {"money":1600,"steel":600,"rubber":30,"oil":15}
]'::jsonb WHERE id = 'shipyard';

-- Munitions Factory: L1/L2 use iron/coal instead of copper; L3 needs 25 copper (was 80)
UPDATE building_defs SET costs_per_level = '[
  {"money":180,"steel":30,"iron":20},
  {"money":360,"steel":60,"coal":25,"iron":15},
  {"money":720,"steel":120,"copper":25}
]'::jsonb WHERE id = 'munitions_factory';

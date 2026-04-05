-- ============================================================================
-- 036b: New early-game units + synthetic research for all rare materials
-- Run SECOND in Supabase SQL Editor.
-- ============================================================================

-- =========================================================================
-- New early-game units (no rare materials required)
-- =========================================================================

INSERT INTO unit_defs (id, name, category, attack, defense, hp, speed, train_cost, train_time, upkeep, prerequisites, special_abilities, description, vision_range)
VALUES
  ('militia', 'Home Guard Militia', 'infantry', 6, 8, 70, 1.5,
   '{"manpower":30,"money":10}'::jsonb, 60,
   '{"food":1}'::jsonb,
   '{"barracks":1}'::jsonb,
   '{}'::jsonb,
   'Poorly equipped volunteers. Cheap to raise, weak in combat, but they hold the line.',
   1),

  ('scout_car', 'Scout Car', 'armor', 8, 6, 60, 5.0,
   '{"steel":25,"iron":10,"money":35}'::jsonb, 120,
   '{"money":0.3}'::jsonb,
   '{"tank_factory":1}'::jsonb,
   '{"recon":true,"vision_bonus":3}'::jsonb,
   'Unarmored scout vehicle. Very fast with excellent vision, but fragile. Uses no rubber or fuel.',
   3),

  ('infantry_gun', 'Infantry Support Gun', 'artillery', 18, 5, 50, 1.0,
   '{"steel":40,"iron":15,"money":40}'::jsonb, 200,
   '{"ammunition":1,"money":0.4}'::jsonb,
   '{"barracks":1}'::jsonb,
   '{"range":1,"bonus_vs_fortified":1.15,"setup_time":0}'::jsonb,
   'Light infantry gun. Less powerful than field guns but requires no rare materials.',
   1),

  ('armored_truck', 'Armored Supply Truck', 'armor', 4, 8, 90, 3.5,
   '{"steel":35,"iron":15,"money":45}'::jsonb, 150,
   '{"money":0.5}'::jsonb,
   '{"tank_factory":1}'::jsonb,
   '{"transport_capacity":3,"supply_bonus":true}'::jsonb,
   'Lightly armored transport. Carries infantry without requiring rubber.',
   1)
ON CONFLICT (id) DO NOTHING;

-- Update Tank Factory L1 effects to enable new units
UPDATE building_defs SET effects_per_level = '[
  {"enables":["light_tank","armored_car","halftrack","scout_car","armored_truck"],"training_speed":1.0},
  {"enables":["light_tank","armored_car","halftrack","scout_car","armored_truck","medium_tank"],"training_speed":1.2},
  {"enables":["light_tank","armored_car","halftrack","scout_car","armored_truck","medium_tank","heavy_tank"],"training_speed":1.4}
]'::jsonb WHERE id = 'tank_factory';

-- Update Barracks L1 effects to enable militia and infantry gun
UPDATE building_defs SET effects_per_level = '[
  {"enables":["riflemen","mg_squad","militia","infantry_gun"],"training_speed":1.0},
  {"enables":["riflemen","mg_squad","mortar_team","engineers","militia","infantry_gun"],"training_speed":1.25},
  {"enables":["riflemen","mg_squad","mortar_team","engineers","paratroopers","militia","infantry_gun"],"training_speed":1.5}
]'::jsonb WHERE id = 'barracks';


-- =========================================================================
-- New synthetic research for all rare materials
-- =========================================================================

INSERT INTO research_defs (id, name, category, max_level, prerequisites, cost_per_level, research_time_per_level, effects_per_level, description)
VALUES
  ('synthetic_tungsten', 'Tungsten Carbide Synthesis', 'economic', 2,
   '{"synthetic_materials":1}'::jsonb,
   '[{"money":500,"steel":60,"coal":40},{"money":1100,"steel":140,"coal":100}]'::jsonb,
   '[1800,3600]'::jsonb,
   '[{"synthetic_tungsten":3},{"synthetic_tungsten":8}]'::jsonb,
   'Develop tungsten carbide alternatives using steel and carbon compounds.'),

  ('synthetic_copper', 'Copper Reclamation', 'economic', 2,
   '{"refined_processing":1}'::jsonb,
   '[{"money":350,"steel":40},{"money":800,"steel":100}]'::jsonb,
   '[1200,2400]'::jsonb,
   '[{"synthetic_copper":5},{"synthetic_copper":12}]'::jsonb,
   'Reclaim and recycle copper from scrap and industrial waste.'),

  ('synthetic_bauxite', 'Alumina Synthesis', 'economic', 2,
   '{"synthetic_materials":1,"refined_processing":1}'::jsonb,
   '[{"money":600,"coal":60,"steel":50},{"money":1300,"coal":150,"steel":120}]'::jsonb,
   '[2100,4200]'::jsonb,
   '[{"synthetic_aluminum":4},{"synthetic_aluminum":10}]'::jsonb,
   'Develop alternative aluminum production from clay and other minerals.'),

  ('synthetic_fuel_advanced', 'Fischer-Tropsch Fuel', 'economic', 2,
   '{"synthetic_materials":2}'::jsonb,
   '[{"money":700,"coal":80},{"money":1500,"coal":200}]'::jsonb,
   '[2400,4800]'::jsonb,
   '[{"synthetic_oil":6},{"synthetic_oil":15}]'::jsonb,
   'Coal-to-liquid fuel conversion using the Fischer-Tropsch process.')
ON CONFLICT (id) DO NOTHING;

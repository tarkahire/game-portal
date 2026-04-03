-- =============================================================================
-- Dad's Army — WW2 Persistent Strategy Game
-- seed_definitions.sql — Game balance / definition data
-- =============================================================================

BEGIN;

-- =============================================================================
-- ALIGNMENT DEFINITIONS (7 factions)
-- =============================================================================
INSERT INTO alignment_defs (id, name, description, passive_bonuses, unique_mechanic, starting_bias) VALUES

('germany', 'Germany',
  'Blitzkrieg doctrine. Fast armor, combined arms bonus.',
  '{"armor_speed": 1.2, "attack_vs_stationary": 1.15, "encirclement_bonus": 1.1}',
  '{"name": "Combined Arms", "description": "Adjacent different unit categories get +15% attack", "bonus": 0.15}',
  '{"resources_multiplier": 0.8, "starting_units": {"riflemen": 10, "light_tank": 2, "field_gun": 2}, "extra_tiles": 1}'
),

('uk', 'United Kingdom',
  'Naval supremacy and colonial supply lines. Strong intelligence network.',
  '{"naval_combat": 1.2, "trade_income": 1.15, "code_breaking_speed": 1.25}',
  '{"name": "Naval Supremacy", "description": "All naval units get +20% combat in home waters, trade routes generate +15% income", "naval_bonus": 0.20, "trade_bonus": 0.15}',
  '{"resources_multiplier": 0.9, "starting_units": {"riflemen": 8, "engineers": 2, "field_gun": 1}, "extra_tiles": 0, "bonus_trade_routes": 2}'
),

('usa', 'United States of America',
  'Industrial powerhouse. Unmatched production capacity once mobilized.',
  '{"production_speed": 1.2, "resource_extraction": 1.1, "unit_cost_reduction": 0.9}',
  '{"name": "Arsenal of Democracy", "description": "Factories produce 20% faster and can lend-lease resources to allies at reduced cost", "production_bonus": 0.20, "lend_lease_efficiency": 0.8}',
  '{"resources_multiplier": 1.3, "starting_units": {"riflemen": 6, "armored_car": 1}, "extra_tiles": 0, "late_mobilization_turns": 5}'
),

('ussr', 'Soviet Union',
  'Vast manpower reserves. Defense in depth, scorched earth capability.',
  '{"manpower_generation": 1.3, "defense_on_own_territory": 1.2, "winter_combat": 1.25}',
  '{"name": "Deep Battle", "description": "Units on owned territory get +20% defense. Scorched earth denies resources to enemy for 5 turns", "defense_bonus": 0.20, "scorched_earth_turns": 5}',
  '{"resources_multiplier": 1.0, "starting_units": {"riflemen": 14, "field_gun": 1}, "extra_tiles": 2, "manpower_bonus": 50}'
),

('japan', 'Empire of Japan',
  'Fanatical morale and island-hopping expertise. Strong naval aviation.',
  '{"morale_resistance": 1.3, "amphibious_attack": 1.2, "aircraft_carrier_capacity": 1.25}',
  '{"name": "Bushido", "description": "Units fight at full strength until 25% HP. Last stand gives +30% attack below 25% HP", "last_stand_threshold": 0.25, "last_stand_bonus": 0.30}',
  '{"resources_multiplier": 0.7, "starting_units": {"riflemen": 12, "engineers": 1, "field_gun": 1}, "extra_tiles": 0, "island_tiles_bonus": 3}'
),

('italy', 'Kingdom of Italy',
  'Mediterranean control. Strong fortification and defensive engineering.',
  '{"fortification_strength": 1.2, "naval_mediterranean": 1.15, "building_cost_reduction": 0.85}',
  '{"name": "Mare Nostrum", "description": "Buildings cost 15% less and fortifications are 20% stronger. Mediterranean naval bonus", "building_discount": 0.15, "fort_bonus": 0.20}',
  '{"resources_multiplier": 0.85, "starting_units": {"riflemen": 8, "field_gun": 2}, "extra_tiles": 0, "coastal_tiles_bonus": 2}'
),

('france', 'France',
  'Fortification expertise and colonial reach. Strong initial defenses.',
  '{"fortification_defense": 1.25, "colonial_resources": 1.2, "artillery_accuracy": 1.15}',
  '{"name": "Maginot Doctrine", "description": "Pre-built fortifications on border tiles. Artillery units get +15% accuracy", "starting_forts": 3, "artillery_bonus": 0.15}',
  '{"resources_multiplier": 0.9, "starting_units": {"riflemen": 8, "field_gun": 3, "engineers": 1}, "extra_tiles": 0, "starting_fort_level": 2}'
);


-- =============================================================================
-- BUILDING DEFINITIONS (23 buildings)
-- =============================================================================
INSERT INTO building_defs (id, name, category, description, max_level, placement_rules, costs_per_level, build_time_per_level, effects_per_level) VALUES

-- ---- MILITARY ----

('barracks', 'Barracks', 'military',
  'Trains infantry units. Higher levels unlock advanced infantry and increase training speed.',
  3, '{"requires_terrain": ["plains", "farmland", "forest", "disused"]}',
  '[
    {"money": 100, "steel": 20, "manpower": 30},
    {"money": 200, "steel": 50, "manpower": 50},
    {"money": 400, "steel": 100, "manpower": 80}
  ]',
  '[300, 600, 1200]',
  '[
    {"enables": ["riflemen", "mg_squad"], "training_speed": 1.0},
    {"enables": ["riflemen", "mg_squad", "mortar_team", "engineers"], "training_speed": 1.25},
    {"enables": ["riflemen", "mg_squad", "mortar_team", "engineers", "paratroopers"], "training_speed": 1.5}
  ]'
),

('tank_factory', 'Tank Factory', 'military',
  'Produces armored vehicles. Requires steel and rubber supply.',
  3, '{"requires_terrain": ["plains", "disused"], "requires_building": ["steel_mill"]}',
  '[
    {"money": 300, "steel": 100, "rubber": 30},
    {"money": 600, "steel": 200, "rubber": 60},
    {"money": 1200, "steel": 400, "rubber": 120}
  ]',
  '[600, 1200, 2400]',
  '[
    {"enables": ["light_tank", "armored_car", "halftrack"], "training_speed": 1.0},
    {"enables": ["light_tank", "armored_car", "halftrack", "medium_tank"], "training_speed": 1.2},
    {"enables": ["light_tank", "armored_car", "halftrack", "medium_tank", "heavy_tank"], "training_speed": 1.4}
  ]'
),

('shipyard', 'Shipyard', 'military',
  'Builds naval vessels. Must be placed on coastal tiles.',
  3, '{"requires_terrain": ["coast"], "coastal_only": true}',
  '[
    {"money": 400, "steel": 150, "rubber": 20},
    {"money": 800, "steel": 300, "rubber": 50},
    {"money": 1600, "steel": 600, "rubber": 100}
  ]',
  '[900, 1800, 3600]',
  '[
    {"enables": ["patrol_boat", "transport_ship"], "build_speed": 1.0},
    {"enables": ["patrol_boat", "transport_ship", "destroyer", "submarine"], "build_speed": 1.2},
    {"enables": ["patrol_boat", "transport_ship", "destroyer", "submarine", "cruiser", "battleship"], "build_speed": 1.4}
  ]'
),

('airfield', 'Airfield', 'military',
  'Stations and launches aircraft. Each level adds hangar capacity.',
  3, '{"requires_terrain": ["plains", "farmland", "disused"]}',
  '[
    {"money": 250, "steel": 60},
    {"money": 500, "steel": 120},
    {"money": 1000, "steel": 250}
  ]',
  '[480, 960, 1920]',
  '[
    {"aircraft_capacity": 3, "enables": ["fighter", "light_bomber"]},
    {"aircraft_capacity": 6, "enables": ["fighter", "light_bomber", "medium_bomber", "recon_plane"]},
    {"aircraft_capacity": 10, "enables": ["fighter", "light_bomber", "medium_bomber", "recon_plane", "heavy_bomber"]}
  ]'
),

-- ---- PRODUCTION ----

('steel_mill', 'Steel Mill', 'production',
  'Converts iron ore and coal into steel. Essential for military production.',
  3, '{"requires_terrain": ["plains", "disused"], "requires_nearby_resource": ["iron", "coal"]}',
  '[
    {"money": 150, "iron": 30, "coal": 20},
    {"money": 300, "iron": 60, "coal": 40},
    {"money": 600, "iron": 120, "coal": 80}
  ]',
  '[360, 720, 1440]',
  '[
    {"steel_production": 10, "consumes": {"iron": 5, "coal": 3}},
    {"steel_production": 22, "consumes": {"iron": 10, "coal": 6}},
    {"steel_production": 36, "consumes": {"iron": 16, "coal": 10}}
  ]'
),

('oil_refinery', 'Oil Refinery', 'production',
  'Processes crude oil into usable fuel for vehicles and aircraft.',
  3, '{"requires_terrain": ["plains", "desert", "disused"], "requires_nearby_resource": ["oil"]}',
  '[
    {"money": 200, "steel": 40},
    {"money": 400, "steel": 80},
    {"money": 800, "steel": 160}
  ]',
  '[420, 840, 1680]',
  '[
    {"fuel_production": 8, "consumes": {"oil": 5}},
    {"fuel_production": 18, "consumes": {"oil": 10}},
    {"fuel_production": 30, "consumes": {"oil": 16}}
  ]'
),

('munitions_factory', 'Munitions Factory', 'production',
  'Manufactures ammunition from copper and chemical components.',
  3, '{"requires_terrain": ["plains", "disused"]}',
  '[
    {"money": 180, "steel": 30, "copper": 20},
    {"money": 360, "steel": 60, "copper": 40},
    {"money": 720, "steel": 120, "copper": 80}
  ]',
  '[360, 720, 1440]',
  '[
    {"ammo_production": 12, "consumes": {"copper": 4}},
    {"ammo_production": 26, "consumes": {"copper": 8}},
    {"ammo_production": 42, "consumes": {"copper": 13}}
  ]'
),

('chemical_plant', 'Chemical Plant', 'production',
  'Produces fertilizer for farms or explosives for military use. Mode is selectable.',
  3, '{"requires_terrain": ["plains", "disused"]}',
  '[
    {"money": 200, "steel": 35, "coal": 15},
    {"money": 400, "steel": 70, "coal": 30},
    {"money": 800, "steel": 140, "coal": 60}
  ]',
  '[420, 840, 1680]',
  '[
    {"mode_fertilizer": {"farm_yield_bonus": 0.15, "consumes": {"coal": 2}}, "mode_explosives": {"ammo_production": 8, "consumes": {"coal": 3}}},
    {"mode_fertilizer": {"farm_yield_bonus": 0.25, "consumes": {"coal": 4}}, "mode_explosives": {"ammo_production": 18, "consumes": {"coal": 6}}},
    {"mode_fertilizer": {"farm_yield_bonus": 0.35, "consumes": {"coal": 6}}, "mode_explosives": {"ammo_production": 30, "consumes": {"coal": 10}}}
  ]'
),

('aluminum_smelter', 'Aluminum Smelter', 'production',
  'Processes bauxite into aluminum, needed for aircraft and advanced vehicles.',
  3, '{"requires_terrain": ["plains", "disused"], "requires_nearby_resource": ["bauxite"]}',
  '[
    {"money": 180, "steel": 25, "coal": 15},
    {"money": 360, "steel": 50, "coal": 30},
    {"money": 720, "steel": 100, "coal": 60}
  ]',
  '[360, 720, 1440]',
  '[
    {"aluminum_production": 6, "consumes": {"bauxite": 4, "coal": 2}},
    {"aluminum_production": 14, "consumes": {"bauxite": 8, "coal": 4}},
    {"aluminum_production": 24, "consumes": {"bauxite": 13, "coal": 7}}
  ]'
),

('farm_enhancement', 'Farm Enhancement', 'production',
  'Improves agricultural output of nearby farmland tiles.',
  3, '{"requires_terrain": ["farmland"]}',
  '[
    {"money": 80, "manpower": 20},
    {"money": 160, "manpower": 40},
    {"money": 320, "manpower": 60}
  ]',
  '[240, 480, 960]',
  '[
    {"food_production": 8, "affects_radius": 1},
    {"food_production": 18, "affects_radius": 1},
    {"food_production": 30, "affects_radius": 2}
  ]'
),

-- ---- ECONOMY ----

('tax_office', 'Tax Office', 'economy',
  'Generates money from controlled territory population.',
  3, '{"requires_terrain": ["plains", "farmland", "disused"]}',
  '[
    {"money": 120, "manpower": 15},
    {"money": 240, "manpower": 30},
    {"money": 480, "manpower": 50}
  ]',
  '[300, 600, 1200]',
  '[
    {"money_income": 15, "per_controlled_tile_bonus": 0.5},
    {"money_income": 35, "per_controlled_tile_bonus": 1.0},
    {"money_income": 60, "per_controlled_tile_bonus": 1.5}
  ]'
),

('trade_post', 'Trade Post', 'economy',
  'Enables resource trading with other players and generates trade income.',
  3, '{"requires_terrain": ["plains", "coast", "disused"]}',
  '[
    {"money": 100, "manpower": 10},
    {"money": 200, "manpower": 20},
    {"money": 400, "manpower": 35}
  ]',
  '[240, 480, 960]',
  '[
    {"trade_slots": 2, "trade_income": 5, "trade_fee_reduction": 0.0},
    {"trade_slots": 4, "trade_income": 12, "trade_fee_reduction": 0.1},
    {"trade_slots": 6, "trade_income": 20, "trade_fee_reduction": 0.2}
  ]'
),

('bank', 'Bank', 'economy',
  'Enables loans and financial instruments. Generates passive interest income.',
  3, '{"requires_terrain": ["plains", "disused"]}',
  '[
    {"money": 200, "manpower": 15},
    {"money": 400, "manpower": 25},
    {"money": 800, "manpower": 40}
  ]',
  '[360, 720, 1440]',
  '[
    {"enables_loans": true, "max_loan": 500, "interest_income": 5},
    {"enables_loans": true, "max_loan": 1500, "interest_income": 12},
    {"enables_loans": true, "max_loan": 4000, "interest_income": 25}
  ]'
),

('warehouse', 'Warehouse', 'economy',
  'Increases storage capacity for resources. Prevents overflow waste.',
  3, '{"requires_terrain": ["plains", "disused", "farmland"]}',
  '[
    {"money": 60, "steel": 15},
    {"money": 120, "steel": 30},
    {"money": 240, "steel": 60}
  ]',
  '[180, 360, 720]',
  '[
    {"storage_capacity": 500, "spoilage_reduction": 0.1},
    {"storage_capacity": 1200, "spoilage_reduction": 0.2},
    {"storage_capacity": 2500, "spoilage_reduction": 0.35}
  ]'
),

-- ---- RESEARCH ----

('research_lab', 'Research Laboratory', 'research',
  'Enables technological research. Higher levels unlock advanced tech and speed research.',
  3, '{"requires_terrain": ["plains", "disused"]}',
  '[
    {"money": 250, "steel": 40, "manpower": 20},
    {"money": 500, "steel": 80, "manpower": 35},
    {"money": 1000, "steel": 160, "manpower": 55}
  ]',
  '[480, 960, 1920]',
  '[
    {"research_speed": 1.0, "max_concurrent_research": 1},
    {"research_speed": 1.3, "max_concurrent_research": 2},
    {"research_speed": 1.6, "max_concurrent_research": 3}
  ]'
),

('intelligence_center', 'Intelligence Center', 'research',
  'Codebreaking, enemy scouting, and counter-intelligence operations.',
  3, '{"requires_terrain": ["plains", "disused", "forest"]}',
  '[
    {"money": 200, "steel": 20, "manpower": 25},
    {"money": 400, "steel": 40, "manpower": 45},
    {"money": 800, "steel": 80, "manpower": 70}
  ]',
  '[420, 840, 1680]',
  '[
    {"vision_range_bonus": 1, "codebreak_chance": 0.05, "counter_intel": 0.1},
    {"vision_range_bonus": 2, "codebreak_chance": 0.12, "counter_intel": 0.2},
    {"vision_range_bonus": 3, "codebreak_chance": 0.20, "counter_intel": 0.35}
  ]'
),

('engineering_corps', 'Engineering Corps HQ', 'research',
  'Unlocks advanced construction techniques and structural engineering.',
  3, '{"requires_terrain": ["plains", "disused"]}',
  '[
    {"money": 180, "steel": 50, "manpower": 20},
    {"money": 360, "steel": 100, "manpower": 35},
    {"money": 720, "steel": 200, "manpower": 55}
  ]',
  '[360, 720, 1440]',
  '[
    {"build_speed_bonus": 0.1, "repair_speed": 1.0},
    {"build_speed_bonus": 0.2, "repair_speed": 1.3, "enables_pontoon_bridges": true},
    {"build_speed_bonus": 0.3, "repair_speed": 1.6, "enables_field_fortification": true}
  ]'
),

-- ---- DEFENSE ----

('walls', 'Defensive Walls', 'defense',
  'Fortifies a city tile with defensive structures. Attackers suffer penalties.',
  3, '{"requires_terrain": ["plains", "disused", "farmland", "forest"]}',
  '[
    {"money": 80, "steel": 40},
    {"money": 180, "steel": 90},
    {"money": 400, "steel": 200}
  ]',
  '[240, 480, 960]',
  '[
    {"defense_bonus": 0.20, "attacker_penalty": 0.05},
    {"defense_bonus": 0.35, "attacker_penalty": 0.10},
    {"defense_bonus": 0.50, "attacker_penalty": 0.15}
  ]'
),

('bunker', 'Bunker', 'defense',
  'Hardened structure providing resistance to bombardment and air strikes.',
  3, '{"requires_terrain": ["plains", "disused", "forest", "mountain"]}',
  '[
    {"money": 120, "steel": 80},
    {"money": 280, "steel": 180},
    {"money": 600, "steel": 400}
  ]',
  '[360, 720, 1440]',
  '[
    {"bombardment_resistance": 0.30, "garrison_capacity": 2},
    {"bombardment_resistance": 0.50, "garrison_capacity": 4},
    {"bombardment_resistance": 0.70, "garrison_capacity": 6}
  ]'
),

('anti_aircraft', 'Anti-Aircraft Battery', 'defense',
  'Defends tiles against enemy air attacks and provides early warning.',
  3, '{"requires_terrain": ["plains", "disused", "mountain", "coast"]}',
  '[
    {"money": 100, "steel": 50},
    {"money": 220, "steel": 110},
    {"money": 480, "steel": 240}
  ]',
  '[300, 600, 1200]',
  '[
    {"aa_defense": 15, "detection_range": 2},
    {"aa_defense": 30, "detection_range": 3},
    {"aa_defense": 50, "detection_range": 4}
  ]'
),

-- ---- INFRASTRUCTURE ----

('road_depot', 'Road Depot', 'infrastructure',
  'Enables road construction between tiles. Roads speed unit movement.',
  3, '{"requires_terrain": ["plains", "disused", "farmland", "forest"]}',
  '[
    {"money": 60, "steel": 10},
    {"money": 130, "steel": 25},
    {"money": 280, "steel": 55}
  ]',
  '[180, 360, 720]',
  '[
    {"road_build_range": 2, "road_speed_bonus": 0.3},
    {"road_build_range": 3, "road_speed_bonus": 0.5},
    {"road_build_range": 5, "road_speed_bonus": 0.7}
  ]'
),

('rail_station', 'Rail Station', 'infrastructure',
  'Enables rail connections for rapid long-distance unit and supply transport.',
  3, '{"requires_terrain": ["plains", "disused"]}',
  '[
    {"money": 200, "steel": 80},
    {"money": 450, "steel": 180},
    {"money": 1000, "steel": 400}
  ]',
  '[480, 960, 1920]',
  '[
    {"rail_speed_multiplier": 3.0, "supply_throughput": 20},
    {"rail_speed_multiplier": 4.0, "supply_throughput": 45},
    {"rail_speed_multiplier": 5.0, "supply_throughput": 80}
  ]'
),

('port', 'Port', 'infrastructure',
  'Enables naval operations, overseas trade, and amphibious embarkation.',
  3, '{"requires_terrain": ["coast"], "coastal_only": true}',
  '[
    {"money": 250, "steel": 60},
    {"money": 500, "steel": 130},
    {"money": 1100, "steel": 280}
  ]',
  '[420, 840, 1680]',
  '[
    {"naval_capacity": 5, "trade_routes": 1, "embark_speed": 1.0},
    {"naval_capacity": 10, "trade_routes": 2, "embark_speed": 1.3},
    {"naval_capacity": 20, "trade_routes": 4, "embark_speed": 1.6}
  ]'
);


-- =============================================================================
-- UNIT DEFINITIONS (15 land units)
-- =============================================================================
INSERT INTO unit_defs (id, name, category, description, attack, defense, hp, speed, cost, train_time, upkeep, special, required_building, required_research) VALUES

-- ---- INFANTRY ----

('riflemen', 'Riflemen', 'infantry',
  'Standard infantry. Versatile and cheap. The backbone of any army.',
  10, 12, 100, 2.0,
  '{"manpower": 50, "money": 20}',
  120,
  '{"food": 1, "money": 0.5}',
  '{}',
  'barracks', NULL
),

('mg_squad', 'Machine Gun Squad', 'infantry',
  'Defensive specialists. Excellent at holding positions against infantry assaults.',
  8, 18, 100, 1.5,
  '{"manpower": 60, "steel": 10, "money": 30}',
  180,
  '{"food": 1, "ammo": 1, "money": 0.8}',
  '{"suppression": true, "suppression_radius": 1, "defense_vs_infantry": 1.3}',
  'barracks', NULL
),

('mortar_team', 'Mortar Team', 'infantry',
  'Indirect fire support. Effective against fortified positions.',
  15, 6, 80, 1.5,
  '{"manpower": 40, "steel": 20, "ammo": 10, "money": 25}',
  180,
  '{"food": 1, "ammo": 2, "money": 0.6}',
  '{"indirect_fire": true, "range": 2, "bonus_vs_fortified": 1.3}',
  'barracks', 'small_arms_improvement'
),

('engineers', 'Combat Engineers', 'infantry',
  'Specialists who build and repair structures, clear mines, and bridge rivers.',
  6, 8, 90, 2.0,
  '{"manpower": 60, "steel": 30, "money": 40}',
  240,
  '{"food": 1, "money": 1.0}',
  '{"can_build": true, "can_repair": true, "can_clear_mines": true, "can_bridge": true, "build_speed": 1.5}',
  'barracks', NULL
),

('paratroopers', 'Paratroopers', 'infantry',
  'Elite airborne troops. Can be dropped behind enemy lines from airfields.',
  14, 10, 90, 2.0,
  '{"manpower": 80, "money": 60}',
  360,
  '{"food": 1, "money": 1.2}',
  '{"can_airdrop": true, "airdrop_range": 8, "surprise_attack_bonus": 1.25}',
  'barracks', 'advanced_tactics'
),

-- ---- ARMOR ----

('light_tank', 'Light Tank', 'armor',
  'Fast, lightly armored tank. Good for flanking maneuvers and recon.',
  20, 18, 150, 3.0,
  '{"steel": 80, "rubber": 20, "oil": 10, "money": 100}',
  300,
  '{"fuel": 2, "money": 1.0}',
  '{"flanking_bonus": 1.2}',
  'tank_factory', NULL
),

('medium_tank', 'Medium Tank', 'armor',
  'Well-balanced tank. Good firepower and armor for the cost.',
  30, 28, 200, 2.5,
  '{"steel": 150, "rubber": 30, "oil": 20, "money": 180}',
  480,
  '{"fuel": 3, "money": 1.5}',
  '{"breakthrough_bonus": 1.15}',
  'tank_factory', 'armor_plating'
),

('heavy_tank', 'Heavy Tank', 'armor',
  'Heavily armored behemoth. Devastating firepower but slow and expensive.',
  45, 40, 300, 1.5,
  '{"steel": 300, "rubber": 40, "oil": 30, "money": 350}',
  720,
  '{"fuel": 5, "money": 2.5}',
  '{"bonus_vs_fortifications": 1.3, "intimidation": true}',
  'tank_factory', 'heavy_armor'
),

('armored_car', 'Armored Car', 'armor',
  'Fast recon vehicle. Extended vision range, excellent for scouting.',
  12, 10, 80, 4.0,
  '{"steel": 40, "rubber": 15, "oil": 5, "money": 50}',
  180,
  '{"fuel": 1, "money": 0.5}',
  '{"recon": true, "vision_bonus": 2, "can_spot_mines": true}',
  'tank_factory', NULL
),

('halftrack', 'Halftrack', 'armor',
  'Armored personnel carrier. Transports infantry at vehicle speed.',
  8, 12, 120, 3.0,
  '{"steel": 60, "rubber": 20, "money": 70}',
  240,
  '{"fuel": 1.5, "money": 0.8}',
  '{"transport_capacity": 2, "transport_speed_bonus": true, "mounted_fire": true}',
  'tank_factory', NULL
),

-- ---- ARTILLERY ----

('field_gun', 'Field Gun', 'artillery',
  'Standard artillery piece. Provides fire support at range.',
  25, 4, 60, 1.0,
  '{"steel": 60, "money": 50}',
  240,
  '{"ammo": 2, "money": 0.5}',
  '{"range": 2, "setup_time": 1}',
  'barracks', NULL
),

('howitzer', 'Howitzer', 'artillery',
  'Heavy artillery. Devastating against fortifications and dug-in infantry.',
  40, 3, 50, 0.8,
  '{"steel": 120, "money": 100}',
  360,
  '{"ammo": 4, "money": 1.0}',
  '{"range": 3, "setup_time": 2, "bonus_vs_fortifications": 1.5, "splash_damage": true}',
  'barracks', 'small_arms_improvement'
),

('anti_tank_gun', 'Anti-Tank Gun', 'artillery',
  'Specialized gun designed to destroy armored vehicles.',
  35, 5, 50, 0.5,
  '{"steel": 80, "tungsten": 5, "money": 70}',
  300,
  '{"ammo": 2, "money": 0.7}',
  '{"range": 2, "bonus_vs_armor": 1.5, "armor_piercing": true, "setup_time": 1}',
  'barracks', 'armor_plating'
),

('aa_gun', 'Anti-Aircraft Gun', 'artillery',
  'Fires at enemy aircraft. Essential for defending against air raids.',
  5, 3, 50, 1.0,
  '{"steel": 70, "money": 60}',
  240,
  '{"ammo": 2, "money": 0.5}',
  '{"anti_air": true, "aa_attack": 30, "aa_range": 3, "setup_time": 1}',
  'barracks', NULL
),

('rocket_artillery', 'Rocket Artillery', 'artillery',
  'Devastating area bombardment but inaccurate. Terrifying to enemy morale.',
  50, 2, 40, 0.8,
  '{"steel": 100, "ammo": 20, "money": 120}',
  420,
  '{"ammo": 5, "money": 1.2}',
  '{"range": 4, "area_damage": true, "accuracy": 0.6, "morale_damage": 1.5, "setup_time": 2}',
  'barracks', 'advanced_tactics'
);


-- =============================================================================
-- RESEARCH DEFINITIONS (25 technologies)
-- =============================================================================
INSERT INTO research_defs (id, name, category, description, max_level, prerequisites, cost_per_level, research_time_per_level, effects_per_level) VALUES

-- ---- MILITARY TECH ----

('small_arms_improvement', 'Small Arms Improvement', 'military',
  'Better rifles and personal weapons. Improves infantry attack power.',
  3, '[]',
  '[
    {"money": 100, "steel": 20},
    {"money": 250, "steel": 50},
    {"money": 500, "steel": 100}
  ]',
  '[600, 1200, 2400]',
  '[
    {"infantry_attack": 1.05},
    {"infantry_attack": 1.10},
    {"infantry_attack": 1.18}
  ]'
),

('armor_plating', 'Armor Plating', 'military',
  'Improved armor materials and designs. Increases vehicle defense.',
  3, '["small_arms_improvement"]',
  '[
    {"money": 200, "steel": 60},
    {"money": 450, "steel": 130},
    {"money": 900, "steel": 280}
  ]',
  '[900, 1800, 3600]',
  '[
    {"armor_defense": 1.08},
    {"armor_defense": 1.16},
    {"armor_defense": 1.25}
  ]'
),

('advanced_tactics', 'Advanced Tactics', 'military',
  'Refined military doctrine. Units fight more effectively and gain new abilities.',
  3, '["small_arms_improvement"]',
  '[
    {"money": 150, "manpower": 10},
    {"money": 350, "manpower": 25},
    {"money": 700, "manpower": 50}
  ]',
  '[900, 1800, 3600]',
  '[
    {"all_units_attack": 1.05, "all_units_defense": 1.05},
    {"all_units_attack": 1.10, "all_units_defense": 1.10},
    {"all_units_attack": 1.15, "all_units_defense": 1.15, "enables_flanking_maneuvers": true}
  ]'
),

('heavy_armor', 'Heavy Armor Development', 'military',
  'Unlocks heavy tank production and improves all armor HP.',
  2, '["armor_plating"]',
  '[
    {"money": 500, "steel": 200},
    {"money": 1200, "steel": 450}
  ]',
  '[1800, 3600]',
  '[
    {"enables_heavy_tank": true, "armor_hp": 1.1},
    {"armor_hp": 1.2, "armor_speed": 1.1}
  ]'
),

('combined_arms_doctrine', 'Combined Arms Doctrine', 'military',
  'Coordinated tactics between infantry, armor, and artillery.',
  2, '["advanced_tactics", "armor_plating"]',
  '[
    {"money": 400, "manpower": 30},
    {"money": 900, "manpower": 60}
  ]',
  '[1800, 3600]',
  '[
    {"mixed_force_bonus": 0.10},
    {"mixed_force_bonus": 0.20, "combined_arms_coordination": true}
  ]'
),

('elite_training', 'Elite Training Program', 'military',
  'Produces veteran units with superior combat performance.',
  2, '["combined_arms_doctrine"]',
  '[
    {"money": 600, "manpower": 50},
    {"money": 1500, "manpower": 100}
  ]',
  '[2400, 4800]',
  '[
    {"new_unit_experience": 0.25, "training_speed": 1.15},
    {"new_unit_experience": 0.50, "training_speed": 1.3, "enables_special_forces": true}
  ]'
),

-- ---- ECONOMIC TECH ----

('improved_mining', 'Improved Mining', 'economic',
  'Better extraction techniques. Increases resource yield from mines.',
  3, '[]',
  '[
    {"money": 80},
    {"money": 200},
    {"money": 450}
  ]',
  '[480, 960, 1920]',
  '[
    {"mining_output": 1.1},
    {"mining_output": 1.2},
    {"mining_output": 1.35}
  ]'
),

('refined_processing', 'Refined Processing', 'economic',
  'More efficient industrial processes. Less waste, more output.',
  3, '["improved_mining"]',
  '[
    {"money": 120, "steel": 15},
    {"money": 280, "steel": 35},
    {"money": 600, "steel": 75}
  ]',
  '[600, 1200, 2400]',
  '[
    {"processing_efficiency": 1.1, "waste_reduction": 0.05},
    {"processing_efficiency": 1.2, "waste_reduction": 0.10},
    {"processing_efficiency": 1.3, "waste_reduction": 0.18}
  ]'
),

('industrial_logistics', 'Industrial Logistics', 'economic',
  'Optimized supply chains and production scheduling.',
  3, '["refined_processing"]',
  '[
    {"money": 180},
    {"money": 400},
    {"money": 850}
  ]',
  '[900, 1800, 3600]',
  '[
    {"build_speed": 1.08, "supply_range": 1},
    {"build_speed": 1.16, "supply_range": 2},
    {"build_speed": 1.25, "supply_range": 3}
  ]'
),

('mass_production', 'Mass Production', 'economic',
  'Assembly line techniques. Dramatically reduces unit and building costs.',
  2, '["industrial_logistics"]',
  '[
    {"money": 500, "steel": 50},
    {"money": 1200, "steel": 120}
  ]',
  '[1800, 3600]',
  '[
    {"unit_cost_reduction": 0.10, "building_cost_reduction": 0.08},
    {"unit_cost_reduction": 0.20, "building_cost_reduction": 0.15}
  ]'
),

('synthetic_materials', 'Synthetic Materials', 'economic',
  'Produce synthetic rubber and fuel. Reduces dependency on rare resources.',
  2, '["refined_processing"]',
  '[
    {"money": 400, "coal": 50},
    {"money": 900, "coal": 120}
  ]',
  '[1500, 3000]',
  '[
    {"synthetic_rubber": 5, "synthetic_fuel": 3},
    {"synthetic_rubber": 12, "synthetic_fuel": 8, "rubber_dependency": -0.3}
  ]'
),

('advanced_chemistry', 'Advanced Chemistry', 'economic',
  'Breakthroughs in chemistry unlock explosives and pharmaceutical production.',
  2, '["synthetic_materials"]',
  '[
    {"money": 600, "coal": 40},
    {"money": 1400, "coal": 100}
  ]',
  '[2400, 4800]',
  '[
    {"chemical_plant_output": 1.3, "explosive_damage": 1.1},
    {"chemical_plant_output": 1.6, "explosive_damage": 1.2, "enables_chemical_weapons": true}
  ]'
),

-- ---- ENGINEERING TECH ----

('basic_geology', 'Basic Geology', 'engineering',
  'Geological surveys reveal potential resource deposits.',
  2, '[]',
  '[
    {"money": 60},
    {"money": 150}
  ]',
  '[360, 720]',
  '[
    {"resource_survey_range": 2, "discovery_chance": 0.1},
    {"resource_survey_range": 4, "discovery_chance": 0.2}
  ]'
),

('advanced_geology', 'Advanced Geology', 'engineering',
  'Deep geological analysis. Can find hidden deposits and estimate reserves.',
  2, '["basic_geology"]',
  '[
    {"money": 200},
    {"money": 500}
  ]',
  '[720, 1440]',
  '[
    {"deep_survey": true, "reserve_estimation": true, "discovery_chance": 0.3},
    {"rare_resource_discovery": true, "discovery_chance": 0.45}
  ]'
),

('structural_engineering', 'Structural Engineering', 'engineering',
  'Improved construction techniques. Buildings are tougher and cheaper.',
  3, '["basic_geology"]',
  '[
    {"money": 120, "steel": 20},
    {"money": 280, "steel": 50},
    {"money": 600, "steel": 110}
  ]',
  '[600, 1200, 2400]',
  '[
    {"building_hp": 1.1, "build_cost_reduction": 0.05},
    {"building_hp": 1.2, "build_cost_reduction": 0.10},
    {"building_hp": 1.35, "build_cost_reduction": 0.15}
  ]'
),

('radio_technology', 'Radio Technology', 'engineering',
  'Improved communications. Faster command response and coordination.',
  2, '["structural_engineering"]',
  '[
    {"money": 200, "copper": 15},
    {"money": 500, "copper": 40}
  ]',
  '[900, 1800]',
  '[
    {"command_range": 2, "coordination_bonus": 0.08},
    {"command_range": 4, "coordination_bonus": 0.15, "enables_radio_intercept": true}
  ]'
),

('advanced_fortification', 'Advanced Fortification', 'engineering',
  'Bunker and trench design improvements. Dramatically improves defensive structures.',
  2, '["structural_engineering"]',
  '[
    {"money": 300, "steel": 80},
    {"money": 700, "steel": 200}
  ]',
  '[1200, 2400]',
  '[
    {"fortification_strength": 1.25, "bunker_garrison_capacity": 2},
    {"fortification_strength": 1.5, "enables_underground_bunkers": true}
  ]'
),

('seismic_survey', 'Seismic Survey', 'engineering',
  'Advanced underground mapping. Reveals enemy tunnels and hidden bases.',
  1, '["advanced_geology"]',
  '[
    {"money": 400}
  ]',
  '[1800]',
  '[
    {"detect_tunnels": true, "detect_hidden_bases": true, "earthquake_resistance": 1.2}
  ]'
),

-- ---- INTELLIGENCE TECH ----

('basic_codebreaking', 'Basic Codebreaking', 'intelligence',
  'Initial efforts to decode enemy communications.',
  2, '[]',
  '[
    {"money": 100, "manpower": 10},
    {"money": 250, "manpower": 25}
  ]',
  '[600, 1200]',
  '[
    {"intel_gathering": 1.1, "enemy_movement_reveal_chance": 0.05},
    {"intel_gathering": 1.2, "enemy_movement_reveal_chance": 0.12}
  ]'
),

('signals_analysis', 'Signals Analysis', 'intelligence',
  'Systematic interception and analysis of enemy radio traffic.',
  2, '["basic_codebreaking"]',
  '[
    {"money": 200, "copper": 10},
    {"money": 450, "copper": 25}
  ]',
  '[900, 1800]',
  '[
    {"enemy_army_size_reveal": true, "intercept_chance": 0.15},
    {"enemy_research_reveal": true, "intercept_chance": 0.25}
  ]'
),

('misinformation', 'Misinformation Campaigns', 'intelligence',
  'Plant false intelligence to mislead the enemy.',
  2, '["signals_analysis"]',
  '[
    {"money": 250, "manpower": 15},
    {"money": 600, "manpower": 35}
  ]',
  '[1200, 2400]',
  '[
    {"decoy_units": 2, "enemy_scout_confusion": 0.2},
    {"decoy_units": 5, "enemy_scout_confusion": 0.4, "false_flag_ops": true}
  ]'
),

('advanced_cryptography', 'Advanced Cryptography', 'intelligence',
  'Breakthrough in mathematical cryptanalysis. Major intelligence advantage.',
  2, '["signals_analysis"]',
  '[
    {"money": 400, "manpower": 25},
    {"money": 1000, "manpower": 50}
  ]',
  '[1800, 3600]',
  '[
    {"codebreak_all_basic": true, "own_code_security": 1.5},
    {"codebreak_advanced": true, "predict_enemy_moves": 0.3}
  ]'
),

('ultra_intelligence', 'Ultra Intelligence', 'intelligence',
  'Complete enemy signal dominance. Near-perfect knowledge of enemy operations.',
  1, '["advanced_cryptography", "misinformation"]',
  '[
    {"money": 1500, "manpower": 80}
  ]',
  '[5400]',
  '[
    {"full_enemy_visibility_duration": 30, "enemy_plan_reveal": true, "counter_intel_immunity": true}
  ]'
),

-- ---- SUPERWEAPONS ----

('v_rocket_program', 'V-Rocket Program', 'superweapon',
  'Develop long-range ballistic rockets. Devastating bombardment at extreme range.',
  3, '["advanced_tactics", "structural_engineering"]',
  '[
    {"money": 800, "steel": 200, "fuel": 50},
    {"money": 1800, "steel": 450, "fuel": 120},
    {"money": 4000, "steel": 1000, "fuel": 300}
  ]',
  '[3600, 7200, 14400]',
  '[
    {"enables_v1_rocket": true, "rocket_range": 6, "rocket_damage": 60},
    {"enables_v2_rocket": true, "rocket_range": 10, "rocket_damage": 120},
    {"rocket_accuracy": 1.5, "rocket_rate_of_fire": 2.0}
  ]'
),

('jet_aircraft', 'Jet Aircraft Development', 'superweapon',
  'Revolutionary jet propulsion. Faster aircraft that outclass propeller planes.',
  2, '["advanced_tactics", "refined_processing"]',
  '[
    {"money": 1000, "steel": 150, "aluminum": 80, "fuel": 60},
    {"money": 2500, "steel": 350, "aluminum": 200, "fuel": 150}
  ]',
  '[5400, 10800]',
  '[
    {"enables_jet_fighter": true, "jet_speed_bonus": 1.5},
    {"enables_jet_bomber": true, "jet_combat_bonus": 1.3}
  ]'
),

('nuclear_research', 'Nuclear Research', 'superweapon',
  'The Manhattan Project. Ultimate weapon capable of destroying entire cities.',
  3, '["advanced_chemistry", "seismic_survey"]',
  '[
    {"money": 2000, "steel": 200, "uranium": 10},
    {"money": 5000, "steel": 500, "uranium": 30},
    {"money": 12000, "steel": 1200, "uranium": 100}
  ]',
  '[7200, 14400, 36000]',
  '[
    {"enables_reactor": true, "uranium_enrichment": true},
    {"enables_dirty_bomb": true, "radiation_zone": 2},
    {"enables_nuclear_bomb": true, "blast_radius": 4, "instant_kill_radius": 2, "fallout_duration": 20}
  ]'
);


COMMIT;

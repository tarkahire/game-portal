-- ============================================================================
-- 036_economy_rebalance_v2.sql
-- Major economy rebalance: remove rare resource gates from early buildings,
-- add starting stockpiles of all resources, synthetic research for all rare
-- materials, engineer field discovery system, and early-game units.
--
-- Run each numbered section in order in Supabase SQL Editor.
-- ============================================================================


-- =========================================================================
-- PART 1: Remove rare resource requirements from L1-L2 buildings
-- Only L3 requires small amounts of rare materials.
-- =========================================================================

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


-- =========================================================================
-- PART 2: New early-game units (no rare materials required)
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
-- PART 3: New synthetic research for all rare materials
-- =========================================================================

INSERT INTO research_defs (id, name, category, max_level, prerequisites, costs_per_level, research_times, effects_per_level, description)
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


-- =========================================================================
-- PART 4: Discovery system — Schema changes
-- =========================================================================

-- 4a. New columns on tiles for secondary and deep resources
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS secondary_resource TEXT;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS secondary_reserves_total REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS secondary_reserves_remaining REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS deep_resource TEXT;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS deep_reserves_total REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS deep_reserves_remaining REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS discovery_stage_completed INT NOT NULL DEFAULT 1;

-- 4b. New table for active discoveries
CREATE TABLE IF NOT EXISTS tile_discoveries (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id             UUID        NOT NULL REFERENCES game_servers ON DELETE CASCADE,
    tile_id               INT         NOT NULL,
    player_id             UUID        NOT NULL REFERENCES players ON DELETE CASCADE,
    army_id               UUID        NOT NULL REFERENCES armies ON DELETE CASCADE,
    discovery_stage       INT         NOT NULL CHECK (discovery_stage IN (2, 3)),
    status                TEXT        NOT NULL DEFAULT 'in_progress'
                                      CHECK (status IN ('in_progress', 'completed', 'failed')),
    engineers_committed   INT         NOT NULL CHECK (engineers_committed >= 20),
    started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    completes_at          TIMESTAMPTZ NOT NULL,
    discovered_resource   TEXT,
    discovered_amount     REAL,
    FOREIGN KEY (tile_id, server_id) REFERENCES tiles (id, server_id) ON DELETE CASCADE
);

-- Only one active discovery per tile at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_tile_discoveries_active
    ON tile_discoveries (tile_id, server_id) WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_tile_discoveries_completes
    ON tile_discoveries (completes_at) WHERE status = 'in_progress';

-- RLS for tile_discoveries
ALTER TABLE tile_discoveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tile_discoveries_select" ON tile_discoveries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tile_discoveries_insert" ON tile_discoveries FOR INSERT WITH CHECK (true);
CREATE POLICY "tile_discoveries_update" ON tile_discoveries FOR UPDATE USING (true);
CREATE POLICY "tile_discoveries_delete" ON tile_discoveries FOR DELETE USING (true);

-- 4c. Add resource_layer column to resource_fields
ALTER TABLE resource_fields ADD COLUMN IF NOT EXISTS resource_layer TEXT NOT NULL DEFAULT 'primary'
    CHECK (resource_layer IN ('primary', 'secondary', 'deep'));

-- Drop old unique constraint and create new one with resource_layer
ALTER TABLE resource_fields DROP CONSTRAINT IF EXISTS resource_fields_tile_id_server_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_fields_tile_layer
    ON resource_fields (tile_id, server_id, resource_layer);


-- =========================================================================
-- PART 5: Seed hidden secondary/deep resources on all existing tiles
-- Uses deterministic seeding based on tile coordinates for reproducibility.
-- =========================================================================
DO $$
DECLARE
  v_tile RECORD;
  v_rand REAL;
  v_sec_resource TEXT;
  v_deep_resource TEXT;
  v_sec_reserves REAL;
  v_deep_reserves REAL;
  v_terrain TEXT;
BEGIN
  FOR v_tile IN
    SELECT id, server_id, q, r, terrain_type
    FROM tiles
    WHERE terrain_type NOT IN ('water', 'river')
  LOOP
    v_terrain := v_tile.terrain_type;

    -- Deterministic random based on tile position
    v_rand := ((v_tile.q * 7 + v_tile.r * 13 + 37) % 100) / 100.0;

    -- SECONDARY RESOURCE (stage 2): ~70% of land tiles
    v_sec_resource := NULL;
    IF v_rand < 0.70 THEN
      -- Pick resource weighted by terrain
      v_rand := ((v_tile.q * 11 + v_tile.r * 23 + 59) % 100) / 100.0;
      CASE v_terrain
        WHEN 'mountain' THEN
          IF v_rand < 0.30 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.55 THEN v_sec_resource := 'coal';
          ELSIF v_rand < 0.75 THEN v_sec_resource := 'copper';
          ELSIF v_rand < 0.85 THEN v_sec_resource := 'tungsten';
          ELSE v_sec_resource := 'bauxite'; END IF;
        WHEN 'plains', 'disused' THEN
          IF v_rand < 0.25 THEN v_sec_resource := 'copper';
          ELSIF v_rand < 0.45 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.65 THEN v_sec_resource := 'coal';
          ELSIF v_rand < 0.80 THEN v_sec_resource := 'bauxite';
          ELSE v_sec_resource := 'oil'; END IF;
        WHEN 'forest' THEN
          IF v_rand < 0.20 THEN v_sec_resource := 'rubber';
          ELSIF v_rand < 0.45 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.70 THEN v_sec_resource := 'coal';
          ELSIF v_rand < 0.85 THEN v_sec_resource := 'copper';
          ELSE v_sec_resource := 'bauxite'; END IF;
        WHEN 'desert' THEN
          IF v_rand < 0.40 THEN v_sec_resource := 'oil';
          ELSIF v_rand < 0.60 THEN v_sec_resource := 'copper';
          ELSIF v_rand < 0.75 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.90 THEN v_sec_resource := 'coal';
          ELSE v_sec_resource := 'bauxite'; END IF;
        WHEN 'farmland' THEN
          IF v_rand < 0.30 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.60 THEN v_sec_resource := 'coal';
          ELSIF v_rand < 0.85 THEN v_sec_resource := 'copper';
          ELSE v_sec_resource := 'bauxite'; END IF;
        WHEN 'coast', 'marsh' THEN
          IF v_rand < 0.35 THEN v_sec_resource := 'copper';
          ELSIF v_rand < 0.65 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.80 THEN v_sec_resource := 'coal';
          ELSE v_sec_resource := 'oil'; END IF;
        WHEN 'snow' THEN
          IF v_rand < 0.35 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.65 THEN v_sec_resource := 'coal';
          ELSIF v_rand < 0.85 THEN v_sec_resource := 'tungsten';
          ELSE v_sec_resource := 'copper'; END IF;
        WHEN 'urban', 'ruins' THEN
          IF v_rand < 0.40 THEN v_sec_resource := 'iron';
          ELSIF v_rand < 0.70 THEN v_sec_resource := 'copper';
          ELSE v_sec_resource := 'coal'; END IF;
        ELSE NULL;
      END CASE;

      IF v_sec_resource IS NOT NULL THEN
        v_sec_reserves := 30000 + ((v_tile.q * 17 + v_tile.r * 31 + 43) % 50000);
        UPDATE tiles SET
          secondary_resource = v_sec_resource,
          secondary_reserves_total = v_sec_reserves,
          secondary_reserves_remaining = v_sec_reserves
        WHERE id = v_tile.id AND server_id = v_tile.server_id;
      END IF;
    END IF;

    -- DEEP RESOURCE (stage 3): ~30% of land tiles, higher rare chance
    v_deep_resource := NULL;
    v_rand := ((v_tile.q * 19 + v_tile.r * 29 + 71) % 100) / 100.0;
    IF v_rand < 0.30 THEN
      v_rand := ((v_tile.q * 23 + v_tile.r * 37 + 83) % 100) / 100.0;
      CASE v_terrain
        WHEN 'mountain' THEN
          IF v_rand < 0.25 THEN v_deep_resource := 'tungsten';
          ELSIF v_rand < 0.30 THEN v_deep_resource := 'uranium';
          ELSIF v_rand < 0.50 THEN v_deep_resource := 'bauxite';
          ELSIF v_rand < 0.70 THEN v_deep_resource := 'iron';
          ELSIF v_rand < 0.85 THEN v_deep_resource := 'coal';
          ELSE v_deep_resource := 'copper'; END IF;
        WHEN 'plains', 'disused' THEN
          IF v_rand < 0.15 THEN v_deep_resource := 'rubber';
          ELSIF v_rand < 0.35 THEN v_deep_resource := 'bauxite';
          ELSIF v_rand < 0.60 THEN v_deep_resource := 'copper';
          ELSIF v_rand < 0.80 THEN v_deep_resource := 'oil';
          ELSIF v_rand < 0.90 THEN v_deep_resource := 'tungsten';
          ELSE v_deep_resource := 'iron'; END IF;
        WHEN 'forest' THEN
          IF v_rand < 0.25 THEN v_deep_resource := 'rubber';
          ELSIF v_rand < 0.35 THEN v_deep_resource := 'tungsten';
          ELSIF v_rand < 0.55 THEN v_deep_resource := 'copper';
          ELSIF v_rand < 0.70 THEN v_deep_resource := 'bauxite';
          ELSIF v_rand < 0.85 THEN v_deep_resource := 'iron';
          ELSE v_deep_resource := 'coal'; END IF;
        WHEN 'desert' THEN
          IF v_rand < 0.30 THEN v_deep_resource := 'oil';
          ELSIF v_rand < 0.45 THEN v_deep_resource := 'tungsten';
          ELSIF v_rand < 0.48 THEN v_deep_resource := 'uranium';
          ELSIF v_rand < 0.68 THEN v_deep_resource := 'copper';
          ELSIF v_rand < 0.85 THEN v_deep_resource := 'bauxite';
          ELSE v_deep_resource := 'iron'; END IF;
        WHEN 'farmland' THEN
          IF v_rand < 0.25 THEN v_deep_resource := 'copper';
          ELSIF v_rand < 0.45 THEN v_deep_resource := 'bauxite';
          ELSIF v_rand < 0.60 THEN v_deep_resource := 'iron';
          ELSIF v_rand < 0.75 THEN v_deep_resource := 'coal';
          ELSIF v_rand < 0.90 THEN v_deep_resource := 'rubber';
          ELSE v_deep_resource := 'tungsten'; END IF;
        WHEN 'snow' THEN
          IF v_rand < 0.30 THEN v_deep_resource := 'tungsten';
          ELSIF v_rand < 0.55 THEN v_deep_resource := 'iron';
          ELSIF v_rand < 0.75 THEN v_deep_resource := 'coal';
          ELSIF v_rand < 0.90 THEN v_deep_resource := 'copper';
          ELSE v_deep_resource := 'bauxite'; END IF;
        ELSE
          IF v_rand < 0.30 THEN v_deep_resource := 'copper';
          ELSIF v_rand < 0.55 THEN v_deep_resource := 'iron';
          ELSIF v_rand < 0.75 THEN v_deep_resource := 'coal';
          ELSIF v_rand < 0.90 THEN v_deep_resource := 'bauxite';
          ELSE v_deep_resource := 'tungsten'; END IF;
      END CASE;

      IF v_deep_resource IS NOT NULL THEN
        v_deep_reserves := 15000 + ((v_tile.q * 31 + v_tile.r * 41 + 97) % 25000);
        UPDATE tiles SET
          deep_resource = v_deep_resource,
          deep_reserves_total = v_deep_reserves,
          deep_reserves_remaining = v_deep_reserves
        WHERE id = v_tile.id AND server_id = v_tile.server_id;
      END IF;
    END IF;
  END LOOP;
END $$;


-- =========================================================================
-- PART 6: Updated join_server with 13 resource types per doctrine
-- =========================================================================
CREATE OR REPLACE FUNCTION join_server(
  p_server_id    UUID,
  p_display_name TEXT,
  p_alignment    TEXT
)
RETURNS UUID AS $$
DECLARE
  v_player_id     UUID;
  v_server        RECORD;
  v_player_count  INT;
  v_starting_tile RECORD;
  v_city_id       UUID;
  v_resource_types TEXT[] := ARRAY[
    'money','food','steel','oil','manpower','ammunition',
    'copper','coal','iron','rubber','tungsten','bauxite','aluminum'
  ];
  v_starting_amounts INT[];
  r TEXT;
  i INT;
BEGIN
  -- Validate server
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Server not found'; END IF;
  IF v_server.status NOT IN ('lobby', 'active') THEN
    RAISE EXCEPTION 'Server is not accepting players (status: %)', v_server.status;
  END IF;

  -- Validate alignment
  IF p_alignment NOT IN ('germany', 'uk', 'usa', 'ussr', 'japan', 'italy', 'france') THEN
    RAISE EXCEPTION 'Invalid alignment: %', p_alignment;
  END IF;

  -- Check not already on server
  IF EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'You are already on this server';
  END IF;

  -- Check max players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE server_id = p_server_id;
  IF v_player_count >= v_server.max_players THEN
    RAISE EXCEPTION 'Server is full';
  END IF;

  -- Create player
  INSERT INTO players (user_id, server_id, display_name, alignment)
  VALUES (auth.uid(), p_server_id, p_display_name, p_alignment)
  RETURNING id INTO v_player_id;

  -- Create reputation
  INSERT INTO reputation (player_id, score) VALUES (v_player_id, 50);

  -- Assign 3 starting tiles
  FOR v_starting_tile IN
    SELECT t.id, t.terrain_type, t.resource_type
    FROM tiles t
    WHERE t.server_id = p_server_id
    AND t.owner_id IS NULL
    AND t.terrain_type NOT IN ('water', 'mountain')
    ORDER BY
      CASE WHEN t.resource_type IS NULL AND t.terrain_type = 'plains' THEN 0 ELSE 1 END,
      random()
    LIMIT 3
  LOOP
    UPDATE tiles
    SET owner_id = v_player_id,
        is_explored_by = array_append(is_explored_by, v_player_id)
    WHERE id = v_starting_tile.id AND server_id = p_server_id;
  END LOOP;

  -- Find best tile for capital
  SELECT t.id INTO v_starting_tile
  FROM tiles t
  WHERE t.server_id = p_server_id AND t.owner_id = v_player_id
  AND t.resource_type IS NULL AND t.terrain_type = 'plains'
  LIMIT 1;

  IF v_starting_tile IS NULL THEN
    SELECT t.id INTO v_starting_tile
    FROM tiles t
    WHERE t.server_id = p_server_id AND t.owner_id = v_player_id
    LIMIT 1;
  END IF;

  -- Create capital city
  INSERT INTO cities (
    player_id, tile_id, server_id, name, is_capital, level,
    land_quality_at_founding
  )
  VALUES (
    v_player_id, v_starting_tile.id, p_server_id,
    p_display_name || '''s Capital', true, 1, 100.0
  )
  RETURNING id INTO v_city_id;

  -- Seed starting resources (13 types, balanced by doctrine)
  -- Order: money, food, steel, oil, manpower, ammo, copper, coal, iron, rubber, tungsten, bauxite, aluminum
  CASE p_alignment
    WHEN 'japan'   THEN v_starting_amounts := ARRAY[600,350,250,180,120,120,100,180,180,25,8,20,15];
    WHEN 'italy'   THEN v_starting_amounts := ARRAY[580,340,230,160,110,110,110,170,170,20,6,18,12];
    WHEN 'germany' THEN v_starting_amounts := ARRAY[500,280,200,150,100,150,90,150,150,15,10,15,10];
    WHEN 'uk'      THEN v_starting_amounts := ARRAY[520,300,200,180,100,100,100,150,150,15,5,15,10];
    WHEN 'france'  THEN v_starting_amounts := ARRAY[500,300,200,130,100,100,100,150,150,12,5,12,8];
    WHEN 'ussr'    THEN v_starting_amounts := ARRAY[450,400,180,120,200,100,80,200,200,10,5,10,8];
    WHEN 'usa'     THEN v_starting_amounts := ARRAY[400,280,180,120,80,80,80,140,140,10,3,10,5];
    ELSE v_starting_amounts := ARRAY[500,300,200,150,100,100,100,150,150,10,5,10,8];
  END CASE;

  FOR i IN 1..array_length(v_resource_types, 1) LOOP
    INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
    VALUES (v_city_id, v_resource_types[i], v_starting_amounts[i], 0, 2000);
  END LOOP;

  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- PART 7: start_discovery — Engineers discover hidden resources
-- =========================================================================
CREATE OR REPLACE FUNCTION start_discovery(
  p_tile_id    INT,
  p_server_id  UUID,
  p_army_id    UUID,
  p_stage      INT  -- 2 or 3
)
RETURNS UUID AS $$
DECLARE
  v_player_id      UUID;
  v_tile           RECORD;
  v_army           RECORD;
  v_engineer_count INT;
  v_min_engineers  INT;
  v_duration       INTERVAL;
  v_discovery_id   UUID;
BEGIN
  v_player_id := get_player_id(p_server_id);

  -- Validate stage
  IF p_stage NOT IN (2, 3) THEN
    RAISE EXCEPTION 'Discovery stage must be 2 or 3';
  END IF;

  -- Validate tile ownership
  SELECT * INTO v_tile FROM tiles
  WHERE id = p_tile_id AND server_id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tile not found'; END IF;
  IF v_tile.owner_id != v_player_id THEN RAISE EXCEPTION 'You do not own this tile'; END IF;
  IF v_tile.terrain_type IN ('water', 'river') THEN RAISE EXCEPTION 'Cannot discover on water tiles'; END IF;

  -- Check not already discovered at this stage
  IF v_tile.discovery_stage_completed >= p_stage THEN
    RAISE EXCEPTION 'Stage % already discovered on this tile', p_stage;
  END IF;

  -- Must discover stage 2 before stage 3
  IF p_stage = 3 AND v_tile.discovery_stage_completed < 2 THEN
    RAISE EXCEPTION 'Must complete stage 2 discovery before stage 3';
  END IF;

  -- Check no active discovery on this tile
  IF EXISTS (SELECT 1 FROM tile_discoveries
    WHERE tile_id = p_tile_id AND server_id = p_server_id AND status = 'in_progress') THEN
    RAISE EXCEPTION 'A discovery is already in progress on this tile';
  END IF;

  -- Validate army
  SELECT * INTO v_army FROM armies WHERE id = p_army_id AND server_id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.tile_id != p_tile_id THEN RAISE EXCEPTION 'Army is not on this tile'; END IF;
  IF v_army.status NOT IN ('idle', 'fortified') THEN RAISE EXCEPTION 'Army must be idle'; END IF;

  -- Count engineers in the army
  SELECT COALESCE(SUM(au.quantity), 0) INTO v_engineer_count
  FROM army_units au
  WHERE au.army_id = p_army_id AND au.unit_def = 'engineers';

  -- Set requirements by stage
  IF p_stage = 2 THEN
    v_min_engineers := 20;
    v_duration := interval '3 hours';
  ELSE
    v_min_engineers := 60;
    v_duration := interval '12 hours';
  END IF;

  IF v_engineer_count < v_min_engineers THEN
    RAISE EXCEPTION 'Need at least % engineers (have %)', v_min_engineers, v_engineer_count;
  END IF;

  -- Create discovery record
  INSERT INTO tile_discoveries (
    server_id, tile_id, player_id, army_id,
    discovery_stage, engineers_committed,
    completes_at
  )
  VALUES (
    p_server_id, p_tile_id, v_player_id, p_army_id,
    p_stage, v_engineer_count,
    now() + v_duration
  )
  RETURNING id INTO v_discovery_id;

  RETURN v_discovery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- PART 8: process_discoveries — Complete/fail discoveries each tick
-- =========================================================================
CREATE OR REPLACE FUNCTION process_discoveries(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_disc RECORD;
  v_army_exists BOOLEAN;
  v_tile_owned BOOLEAN;
  v_success_chance REAL;
  v_roll REAL;
  v_resource TEXT;
  v_reserves REAL;
BEGIN
  FOR v_disc IN
    SELECT td.*, t.owner_id AS current_owner, t.terrain_type,
           t.secondary_resource, t.deep_resource
    FROM tile_discoveries td
    JOIN tiles t ON t.id = td.tile_id AND t.server_id = td.server_id
    WHERE td.server_id = p_server_id
    AND td.status = 'in_progress'
    AND td.completes_at <= now()
  LOOP
    -- Check army still exists and is on the tile
    v_army_exists := EXISTS (
      SELECT 1 FROM armies WHERE id = v_disc.army_id AND tile_id = v_disc.tile_id
    );
    v_tile_owned := (v_disc.current_owner = v_disc.player_id);

    IF NOT v_army_exists OR NOT v_tile_owned THEN
      -- Discovery failed — army moved/destroyed or tile lost
      UPDATE tile_discoveries SET status = 'failed' WHERE id = v_disc.id;

      INSERT INTO notifications (user_id, type, title, body)
      SELECT p.user_id, 'system',
        'Discovery Failed',
        'Engineers on tile (' || v_disc.tile_id || ') were disrupted. Discovery failed.'
      FROM players p WHERE p.id = v_disc.player_id;

      CONTINUE;
    END IF;

    -- Calculate success chance based on engineer count
    IF v_disc.discovery_stage = 2 THEN
      -- Stage 2: 70% base + 0.5% per engineer above 20 (max 90%)
      v_success_chance := LEAST(0.90, 0.70 + (v_disc.engineers_committed - 20) * 0.005);
    ELSE
      -- Stage 3: 40% base + 0.3% per engineer above 60 (max 70%)
      v_success_chance := LEAST(0.70, 0.40 + (v_disc.engineers_committed - 60) * 0.003);
    END IF;

    v_roll := random();

    IF v_roll <= v_success_chance THEN
      -- SUCCESS — reveal the resource
      IF v_disc.discovery_stage = 2 THEN
        v_resource := v_disc.secondary_resource;
      ELSE
        v_resource := v_disc.deep_resource;
      END IF;

      -- Update tile discovery stage
      UPDATE tiles SET discovery_stage_completed = v_disc.discovery_stage
      WHERE id = v_disc.tile_id AND server_id = v_disc.server_id;

      -- Mark discovery completed
      UPDATE tile_discoveries SET
        status = 'completed',
        discovered_resource = v_resource,
        discovered_amount = CASE v_disc.discovery_stage
          WHEN 2 THEN COALESCE((SELECT secondary_reserves_total FROM tiles WHERE id = v_disc.tile_id AND server_id = v_disc.server_id), 0)
          ELSE COALESCE((SELECT deep_reserves_total FROM tiles WHERE id = v_disc.tile_id AND server_id = v_disc.server_id), 0)
        END
      WHERE id = v_disc.id;

      -- Notify player
      INSERT INTO notifications (user_id, type, title, body)
      SELECT p.user_id, 'system',
        'Discovery Complete!',
        'Engineers discovered ' || COALESCE(v_resource, 'nothing') || ' deposits on tile (' || v_disc.tile_id || ')!'
      FROM players p WHERE p.id = v_disc.player_id;
    ELSE
      -- FAILED — no resource found (bad luck)
      UPDATE tile_discoveries SET status = 'failed' WHERE id = v_disc.id;

      INSERT INTO notifications (user_id, type, title, body)
      SELECT p.user_id, 'system',
        'Discovery Unsuccessful',
        'Engineers on tile (' || v_disc.tile_id || ') found nothing at stage ' || v_disc.discovery_stage || '. Try again with more engineers.'
      FROM players p WHERE p.id = v_disc.player_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- PART 9: Update march_army — block marching during active discovery
-- =========================================================================
CREATE OR REPLACE FUNCTION march_army(p_army_id UUID, p_destination_tile INT)
RETURNS void AS $$
DECLARE
  v_player_id UUID; v_army RECORD; v_path INT[];
  v_total_cost REAL; v_army_speed REAL; v_arrive_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_army FROM armies WHERE id = p_army_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;
  v_player_id := get_player_id(v_army.server_id);
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.status NOT IN ('idle', 'fortified') THEN RAISE EXCEPTION 'Army is not idle (status: %)', v_army.status; END IF;
  IF v_army.is_garrison THEN RAISE EXCEPTION 'Cannot march a garrison army'; END IF;
  IF v_army.tile_id = p_destination_tile THEN RAISE EXCEPTION 'Already on destination tile'; END IF;

  -- Block marching if army has an active discovery
  IF EXISTS (SELECT 1 FROM tile_discoveries
    WHERE army_id = p_army_id AND status = 'in_progress') THEN
    RAISE EXCEPTION 'Army is committed to a discovery operation. Cancel or wait for completion.';
  END IF;

  SELECT COALESCE(MIN(ud.speed), 1) INTO v_army_speed FROM army_units au JOIN unit_defs ud ON ud.id = au.unit_def WHERE au.army_id = p_army_id;
  v_path := find_path(v_army.tile_id, p_destination_tile, v_army.server_id);
  IF v_path IS NULL OR array_length(v_path, 1) IS NULL THEN RAISE EXCEPTION 'No path found'; END IF;
  v_total_cost := array_length(v_path, 1) - 1;
  v_arrive_at := now() + make_interval(secs => CEIL(v_total_cost / v_army_speed) * 60);
  UPDATE armies SET status = 'marching', march_path = v_path, march_started_at = now(),
    march_arrives_at = v_arrive_at, destination_tile = p_destination_tile WHERE id = p_army_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- PART 10: Updated materialize_resources — synthetic production + multi-layer
-- =========================================================================
CREATE OR REPLACE FUNCTION materialize_resources(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_field RECORD; v_city_id UUID; v_building RECORD; v_effects JSONB;
  v_effect_key TEXT; v_effect_val TEXT; v_resource TEXT; v_production REAL;
  v_yield_mod REAL; v_mapped_resource TEXT;
  v_city RECORD; v_terrain_tile RECORD;
  v_research RECORD; v_tile_resource TEXT;
BEGIN
  -- Reset production rates
  UPDATE city_resources cr SET production_rate = 0
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Reset storage to base values per city level
  UPDATE city_resources cr
  SET storage_capacity = CASE c.level
    WHEN 1 THEN 2000 WHEN 2 THEN 4000 WHEN 3 THEN 8000 WHEN 4 THEN 16000 WHEN 5 THEN 32000 ELSE 2000
  END
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- Apply Warehouse storage bonuses
  UPDATE city_resources cr
  SET storage_capacity = cr.storage_capacity + (
    SELECT COALESCE(SUM(
      (bd.effects_per_level->(b.level - 1)->>'storage_capacity')::real
    ), 0)
    FROM buildings b JOIN building_defs bd ON bd.id = b.building_def
    WHERE b.city_id = cr.city_id AND b.is_constructing = false AND b.level >= 1
    AND bd.effects_per_level->(b.level - 1)->>'storage_capacity' IS NOT NULL
  )
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id;

  -- -----------------------------------------------------------------------
  -- Resource field production (primary, secondary, deep layers)
  -- -----------------------------------------------------------------------
  FOR v_field IN
    SELECT rf.*,
      CASE rf.resource_layer
        WHEN 'secondary' THEN t.secondary_resource
        WHEN 'deep' THEN t.deep_resource
        ELSE t.resource_type
      END AS tile_resource_type,
      t.soil_quality, t.control_level, t.terrain_type
    FROM resource_fields rf
    JOIN tiles t ON t.id = rf.tile_id AND t.server_id = rf.server_id
    WHERE rf.server_id = p_server_id AND rf.status IN ('productive', 'declining')
  LOOP
    v_yield_mod := CASE v_field.control_level
      WHEN 'claimed' THEN 0.50 WHEN 'occupied' THEN 0.75
      WHEN 'improved' THEN 1.00 ELSE 0.50 END;

    v_mapped_resource := CASE v_field.tile_resource_type
      WHEN 'farmland' THEN 'food' WHEN 'fish' THEN 'food'
      WHEN 'oil' THEN 'oil' WHEN 'iron' THEN 'iron' WHEN 'coal' THEN 'coal'
      WHEN 'copper' THEN 'copper' WHEN 'bauxite' THEN 'aluminum'
      WHEN 'rubber' THEN 'rubber' WHEN 'tungsten' THEN 'tungsten'
      WHEN 'uranium' THEN 'uranium' ELSE v_field.tile_resource_type END;

    IF v_mapped_resource IS NULL AND v_field.terrain_type = 'farmland' THEN
      v_mapped_resource := 'food';
    END IF;
    IF v_mapped_resource IS NULL THEN CONTINUE; END IF;

    SELECT c.id INTO v_city_id FROM cities c
    WHERE c.player_id = v_field.player_id ORDER BY c.is_capital DESC LIMIT 1;

    IF v_city_id IS NOT NULL THEN
      v_production := v_field.production_rate * v_yield_mod;
      UPDATE city_resources
      SET amount = LEAST(amount + v_production, storage_capacity),
          production_rate = production_rate + v_production
      WHERE city_id = v_city_id AND resource_type = v_mapped_resource;

      IF NOT FOUND THEN
        INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
        VALUES (v_city_id, v_mapped_resource, v_production, v_production, 2000);
      END IF;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Building-based production
  -- -----------------------------------------------------------------------
  FOR v_building IN
    SELECT b.building_def, b.level, b.city_id, bd.effects_per_level
    FROM buildings b JOIN cities c ON c.id = b.city_id
    JOIN players p ON p.id = c.player_id
    JOIN building_defs bd ON bd.id = b.building_def
    WHERE p.server_id = p_server_id AND b.is_constructing = false AND b.level >= 1
  LOOP
    v_effects := v_building.effects_per_level->(v_building.level - 1);
    IF v_effects IS NULL THEN CONTINUE; END IF;
    FOR v_effect_key, v_effect_val IN SELECT * FROM jsonb_each_text(v_effects)
    LOOP
      v_resource := CASE v_effect_key
        WHEN 'money_income' THEN 'money' WHEN 'steel_production' THEN 'steel'
        WHEN 'fuel_production' THEN 'oil' WHEN 'ammo_production' THEN 'ammunition'
        WHEN 'food_production' THEN 'food' WHEN 'aluminum_production' THEN 'aluminum'
        WHEN 'trade_income' THEN 'money' ELSE NULL END;
      IF v_resource IS NOT NULL THEN
        UPDATE city_resources
        SET amount = LEAST(amount + v_effect_val::real, storage_capacity),
            production_rate = production_rate + v_effect_val::real
        WHERE city_id = v_building.city_id AND resource_type = v_resource;
      END IF;
    END LOOP;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Synthetic research production (NEW)
  -- -----------------------------------------------------------------------
  FOR v_research IN
    SELECT pr.player_id, pr.research_def, pr.level,
           rd.effects_per_level
    FROM player_research pr
    JOIN research_defs rd ON rd.id = pr.research_def
    JOIN players p ON p.id = pr.player_id
    WHERE p.server_id = p_server_id
    AND pr.level >= 1
    AND pr.is_researching = false
    AND pr.research_def IN (
      'synthetic_materials', 'synthetic_tungsten', 'synthetic_copper',
      'synthetic_bauxite', 'synthetic_fuel_advanced'
    )
  LOOP
    -- Get player's capital city
    SELECT c.id INTO v_city_id FROM cities c
    WHERE c.player_id = v_research.player_id ORDER BY c.is_capital DESC LIMIT 1;

    IF v_city_id IS NOT NULL THEN
      v_effects := v_research.effects_per_level->(v_research.level - 1);
      IF v_effects IS NULL THEN CONTINUE; END IF;

      FOR v_effect_key, v_effect_val IN SELECT * FROM jsonb_each_text(v_effects)
      LOOP
        v_resource := CASE v_effect_key
          WHEN 'synthetic_rubber' THEN 'rubber'
          WHEN 'synthetic_fuel' THEN 'oil'
          WHEN 'synthetic_tungsten' THEN 'tungsten'
          WHEN 'synthetic_copper' THEN 'copper'
          WHEN 'synthetic_aluminum' THEN 'aluminum'
          WHEN 'synthetic_oil' THEN 'oil'
          ELSE NULL
        END;
        IF v_resource IS NOT NULL THEN
          UPDATE city_resources
          SET amount = LEAST(amount + v_effect_val::real, storage_capacity),
              production_rate = production_rate + v_effect_val::real
          WHERE city_id = v_city_id AND resource_type = v_resource;

          IF NOT FOUND THEN
            INSERT INTO city_resources (city_id, resource_type, amount, production_rate, storage_capacity)
            VALUES (v_city_id, v_resource, v_effect_val::real, v_effect_val::real, 2000);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Passive terrain production
  -- -----------------------------------------------------------------------
  FOR v_city IN
    SELECT c.id AS city_id, c.tile_id, c.level, c.player_id, ct.q, ct.r
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    JOIN players p ON p.id = c.player_id
    WHERE p.server_id = p_server_id
  LOOP
    FOR v_terrain_tile IN
      SELECT t.terrain_type, t.resource_type
      FROM tiles t
      WHERE t.server_id = p_server_id
      AND t.owner_id = v_city.player_id
      AND (ABS(t.q - v_city.q) + ABS(t.r - v_city.r) + ABS((t.q + t.r) - (v_city.q + v_city.r))) / 2 <= 3
    LOOP
      CASE v_terrain_tile.terrain_type
        WHEN 'forest' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.0, storage_capacity),
            production_rate = production_rate + 1.0
          WHERE city_id = v_city.city_id AND resource_type = 'steel';
        WHEN 'mountain' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.5, storage_capacity),
            production_rate = production_rate + 1.5
          WHERE city_id = v_city.city_id AND resource_type = 'iron';
          UPDATE city_resources SET amount = LEAST(amount + 0.5, storage_capacity),
            production_rate = production_rate + 0.5
          WHERE city_id = v_city.city_id AND resource_type = 'coal';
        WHEN 'desert' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.0, storage_capacity),
            production_rate = production_rate + 1.0
          WHERE city_id = v_city.city_id AND resource_type = 'coal';
        WHEN 'coast' THEN
          UPDATE city_resources SET amount = LEAST(amount + 1.0, storage_capacity),
            production_rate = production_rate + 1.0
          WHERE city_id = v_city.city_id AND resource_type = 'food';
        WHEN 'plains' THEN
          UPDATE city_resources SET amount = LEAST(amount + 0.5, storage_capacity),
            production_rate = production_rate + 0.5
          WHERE city_id = v_city.city_id AND resource_type = 'manpower';
        ELSE NULL;
      END CASE;
    END LOOP;
  END LOOP;

  -- -----------------------------------------------------------------------
  -- Passive city generation (money, manpower, bootstrap steel/iron/coal)
  -- -----------------------------------------------------------------------
  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 3.0), storage_capacity),
      production_rate = production_rate + (c.level * 3.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'manpower';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 10.0), storage_capacity),
      production_rate = production_rate + (c.level * 10.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'money';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0), storage_capacity),
      production_rate = production_rate + (c.level * 2.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'steel';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 2.0), storage_capacity),
      production_rate = production_rate + (c.level * 2.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'iron';

  UPDATE city_resources cr
  SET amount = LEAST(amount + (c.level * 1.0), storage_capacity),
      production_rate = production_rate + (c.level * 1.0)
  FROM cities c JOIN players p ON p.id = c.player_id
  WHERE cr.city_id = c.id AND p.server_id = p_server_id AND cr.resource_type = 'coal';
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- PART 11: Update process_game_tick to include discoveries
-- =========================================================================
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
  PERFORM process_discoveries(p_server_id);  -- NEW: complete/fail engineer discoveries
  PERFORM materialize_resources(p_server_id);
  PERFORM process_supply_chains(p_server_id);
  PERFORM degrade_fortifications(p_server_id);

  UPDATE game_servers SET last_tick_at = now() WHERE id = p_server_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- PART 12: Update get_visible_tiles to include discovery columns
-- =========================================================================
DROP FUNCTION IF EXISTS get_visible_tiles(uuid);

CREATE OR REPLACE FUNCTION get_visible_tiles(p_server_id UUID)
RETURNS TABLE (
  id INT, q INT, r INT, terrain_type TEXT, owner_id UUID,
  resource_type TEXT, resource_reserves_total REAL, resource_reserves_remaining REAL,
  soil_quality REAL, war_damage_level REAL, land_quality REAL,
  infrastructure_road BOOLEAN, infrastructure_rail BOOLEAN,
  fortification_type TEXT, fortification_hp REAL,
  fog_state TEXT, control_level TEXT,
  secondary_resource TEXT, deep_resource TEXT, discovery_stage_completed INT
) AS $$
DECLARE
  v_player_id UUID;
BEGIN
  v_player_id := get_player_id(p_server_id);

  RETURN QUERY
  WITH
  vision_sources AS (
    SELECT ct.q AS vq, ct.r AS vr, 2 AS vrange
    FROM cities c
    JOIN tiles ct ON ct.id = c.tile_id AND ct.server_id = c.server_id
    WHERE c.player_id = v_player_id AND c.server_id = p_server_id
    UNION ALL
    SELECT at2.q AS vq, at2.r AS vr,
           COALESCE((
             SELECT MAX(ud.vision_range)
             FROM army_units au
             JOIN unit_defs ud ON ud.id = au.unit_def
             WHERE au.army_id = a.id
           ), 1) AS vrange
    FROM armies a
    JOIN tiles at2 ON at2.id = a.tile_id AND at2.server_id = a.server_id
    WHERE a.player_id = v_player_id AND a.server_id = p_server_id
  ),
  visible_coords AS (
    SELECT DISTINCT t2.id AS tile_id
    FROM tiles t2, vision_sources vs
    WHERE t2.server_id = p_server_id
    AND (ABS(t2.q - vs.vq) + ABS(t2.r - vs.vr) + ABS((t2.q + t2.r) - (vs.vq + vs.vr))) / 2 <= vs.vrange
  )
  SELECT
    t.id, t.q, t.r, t.terrain_type,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.owner_id
         WHEN v_player_id = ANY(t.is_explored_by) THEN t.owner_id ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_type
         WHEN v_player_id = ANY(t.is_explored_by) THEN t.resource_type ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_reserves_total ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.resource_reserves_remaining ELSE NULL END,
    t.soil_quality,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.war_damage_level ELSE 0 END,
    t.land_quality,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by) THEN t.infrastructure_road ELSE false END,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by) THEN t.infrastructure_rail ELSE false END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.fortification_type ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.fortification_hp ELSE 0 END,
    CASE
      WHEN vc.tile_id IS NOT NULL THEN 'visible'
      WHEN v_player_id = ANY(t.is_explored_by) THEN 'stale'
      ELSE 'unexplored'
    END,
    CASE WHEN vc.tile_id IS NOT NULL THEN t.control_level ELSE NULL END,
    -- Discovery columns: only show discovered resources on visible/explored tiles
    CASE WHEN (vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by))
              AND t.discovery_stage_completed >= 2 THEN t.secondary_resource ELSE NULL END,
    CASE WHEN (vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by))
              AND t.discovery_stage_completed >= 3 THEN t.deep_resource ELSE NULL END,
    CASE WHEN vc.tile_id IS NOT NULL OR v_player_id = ANY(t.is_explored_by)
         THEN t.discovery_stage_completed ELSE 1 END
  FROM tiles t
  LEFT JOIN visible_coords vc ON vc.tile_id = t.id
  WHERE t.server_id = p_server_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 036d: Seed hidden resources on tiles + updated join_server (13 resources)
-- Run FOURTH in Supabase SQL Editor.
-- NOTE: The seed block may take a few seconds on large maps.
-- ============================================================================

-- =========================================================================
-- Seed hidden secondary/deep resources on all existing tiles
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
    v_rand := ((v_tile.q * 7 + v_tile.r * 13 + 37) % 100) / 100.0;

    -- SECONDARY RESOURCE (stage 2): ~70% of land tiles
    v_sec_resource := NULL;
    IF v_rand < 0.70 THEN
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
-- Updated join_server with 13 resource types per doctrine
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
  SELECT * INTO v_server FROM game_servers WHERE id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Server not found'; END IF;
  IF v_server.status NOT IN ('lobby', 'active') THEN
    RAISE EXCEPTION 'Server is not accepting players (status: %)', v_server.status;
  END IF;

  IF p_alignment NOT IN ('germany', 'uk', 'usa', 'ussr', 'japan', 'italy', 'france') THEN
    RAISE EXCEPTION 'Invalid alignment: %', p_alignment;
  END IF;

  IF EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND server_id = p_server_id) THEN
    RAISE EXCEPTION 'You are already on this server';
  END IF;

  SELECT COUNT(*) INTO v_player_count FROM players WHERE server_id = p_server_id;
  IF v_player_count >= v_server.max_players THEN
    RAISE EXCEPTION 'Server is full';
  END IF;

  INSERT INTO players (user_id, server_id, display_name, alignment)
  VALUES (auth.uid(), p_server_id, p_display_name, p_alignment)
  RETURNING id INTO v_player_id;

  INSERT INTO reputation (player_id, score) VALUES (v_player_id, 50);

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

  INSERT INTO cities (
    player_id, tile_id, server_id, name, is_capital, level,
    land_quality_at_founding
  )
  VALUES (
    v_player_id, v_starting_tile.id, p_server_id,
    p_display_name || '''s Capital', true, 1, 100.0
  )
  RETURNING id INTO v_city_id;

  -- Starting resources: 13 types, balanced by doctrine strength
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

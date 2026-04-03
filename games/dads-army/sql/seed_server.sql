-- =============================================================================
-- Dad's Army — WW2 Persistent Strategy Game
-- seed_server.sql — Create a playable game server with 999 hex tiles
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CREATE GAME SERVER
-- =============================================================================
INSERT INTO game_servers (name, map_id, max_players, status, speed_multiplier, created_at)
VALUES (
  'European Theater #1',
  'europe_ww2',
  30,
  'lobby',
  1.0,
  NOW()
);

-- =============================================================================
-- 2. GENERATE 999 HEX TILES WITH TERRAIN & RESOURCES
-- =============================================================================
-- Hex spiral generation using axial coordinates (q, r).
-- Ring 0: center (0,0) = 1 tile
-- Ring n: 6*n tiles
-- Rings 0..17 = 1 + 6*(1+2+...+17) = 1 + 6*153 = 919 tiles
-- Ring 18 partial = 80 more tiles => 999 total
--
-- Geography mapping (axial coords to rough European theatre):
--   North (r < 0):  Scandinavia, North Sea — forest, snow, coast, water
--   South (r > 0):  Mediterranean, N. Africa — desert, coast, water
--   East  (q > 0):  Eastern Europe, Russia — plains, farmland, forest
--   West  (q < 0):  France, UK, Atlantic — coast, plains, forest
--   Center:         Central Europe — plains, farmland, forest, disused
--   Far edges:      Water (open ocean)
-- =============================================================================

DO $$
DECLARE
  v_server_id UUID;
  v_q         INT;
  v_r         INT;
  v_ring      INT;
  v_side      INT;
  v_step      INT;
  v_tile_num  INT := 0;
  v_terrain   TEXT;
  v_resource  TEXT;
  v_reserve   INT;
  v_dist      FLOAT;
  v_angle     FLOAT;
  v_rand      FLOAT;

  -- Hex direction vectors for axial coords (6 directions)
  -- 0: +q      (1, 0)
  -- 1: +q -r   (1,-1)
  -- 2:    -r   (0,-1)
  -- 3: -q      (-1, 0)
  -- 4: -q +r   (-1, 1)
  -- 5:    +r   (0, 1)
  dir_q INT[] := ARRAY[1, 1, 0, -1, -1, 0];
  dir_r INT[] := ARRAY[0, -1, -1, 0, 1, 1];

BEGIN
  -- Get the server we just created
  SELECT id INTO v_server_id
    FROM game_servers
   WHERE name = 'European Theater #1'
   ORDER BY created_at DESC
   LIMIT 1;

  -- =========================================================================
  -- Ring 0: center tile (0, 0)
  -- =========================================================================
  v_q := 0;
  v_r := 0;
  v_tile_num := 1;

  INSERT INTO tiles (server_id, q, r, terrain_type, resource_type, resource_reserve, tile_index)
  VALUES (v_server_id, 0, 0, 'plains', NULL, 0, 0);

  -- =========================================================================
  -- Rings 1 through 18 (partial ring 18)
  -- =========================================================================
  -- Start position for each ring: move to (ring, 0) in cube coords,
  -- which in axial is (ring, 0). But the standard spiral starts by
  -- moving to the first hex of the ring, then walking 6 sides.
  --
  -- Canonical spiral: start at hex (0, -ring) [top of ring], then walk
  -- direction 0,1,2,3,4,5 for ring steps each.
  -- Actually: start at (ring, 0) and walk direction 2 first, etc.
  -- We use the standard approach: start at (0, -ring), directions 0..5.

  v_q := 0;
  v_r := 0;

  FOR v_ring IN 1..18 LOOP
    -- Starting hex for this ring: (0, -v_ring)
    v_q := 0;
    v_r := -v_ring;

    FOR v_side IN 0..5 LOOP
      FOR v_step IN 1..v_ring LOOP
        v_tile_num := v_tile_num + 1;
        EXIT WHEN v_tile_num > 999;

        -- Determine distance from center and angle for geography
        v_dist := sqrt(v_q::FLOAT * v_q::FLOAT + v_r::FLOAT * v_r::FLOAT + v_q::FLOAT * v_r::FLOAT);
        -- Approximate angle (atan2 on pixel-space coords)
        -- Axial to pixel: x = q + r/2, y = r * sqrt(3)/2
        v_angle := atan2(v_r * 0.866, v_q + v_r * 0.5);
        -- v_angle: 0 = east, pi/2 = south, -pi/2 = north, pi/-pi = west

        v_rand := random();

        -- =================================================================
        -- TERRAIN ASSIGNMENT based on geography
        -- =================================================================
        -- Far edges: open water
        IF v_dist > 16 THEN
          v_terrain := 'water';

        -- Ocean bands (simulating seas around Europe)
        ELSIF v_dist > 13 AND v_angle < -1.5 THEN
          -- Far north: Arctic Ocean
          v_terrain := CASE WHEN v_rand < 0.7 THEN 'water' ELSE 'snow' END;
        ELSIF v_dist > 13 AND v_angle > 2.0 THEN
          -- Far west: Atlantic
          v_terrain := CASE WHEN v_rand < 0.8 THEN 'water' ELSE 'coast' END;
        ELSIF v_dist > 13 AND v_angle BETWEEN 0.8 AND 2.0 THEN
          -- Far south: deep Mediterranean / N. Africa
          v_terrain := CASE WHEN v_rand < 0.5 THEN 'water' ELSE 'desert' END;

        -- NORTH (Scandinavia / North Sea) — r < -6
        ELSIF v_r < -6 THEN
          v_terrain := CASE
            WHEN v_rand < 0.25 THEN 'forest'
            WHEN v_rand < 0.40 THEN 'snow'
            WHEN v_rand < 0.55 THEN 'coast'
            WHEN v_rand < 0.70 THEN 'water'
            WHEN v_rand < 0.80 THEN 'mountain'
            WHEN v_rand < 0.90 THEN 'plains'
            ELSE 'disused'
          END;

        -- SOUTH (Mediterranean) — r > 6
        ELSIF v_r > 6 THEN
          v_terrain := CASE
            WHEN v_rand < 0.25 THEN 'desert'
            WHEN v_rand < 0.45 THEN 'coast'
            WHEN v_rand < 0.60 THEN 'water'
            WHEN v_rand < 0.72 THEN 'plains'
            WHEN v_rand < 0.82 THEN 'mountain'
            WHEN v_rand < 0.90 THEN 'farmland'
            ELSE 'disused'
          END;

        -- EAST (Russia / Eastern Europe) — q > 6
        ELSIF v_q > 6 THEN
          v_terrain := CASE
            WHEN v_rand < 0.30 THEN 'plains'
            WHEN v_rand < 0.50 THEN 'farmland'
            WHEN v_rand < 0.65 THEN 'forest'
            WHEN v_rand < 0.75 THEN 'snow'
            WHEN v_rand < 0.82 THEN 'marsh'
            WHEN v_rand < 0.90 THEN 'disused'
            ELSE 'mountain'
          END;

        -- WEST (France / Atlantic coast) — q < -6
        ELSIF v_q < -6 THEN
          v_terrain := CASE
            WHEN v_rand < 0.25 THEN 'coast'
            WHEN v_rand < 0.45 THEN 'plains'
            WHEN v_rand < 0.60 THEN 'forest'
            WHEN v_rand < 0.72 THEN 'farmland'
            WHEN v_rand < 0.82 THEN 'water'
            WHEN v_rand < 0.90 THEN 'disused'
            ELSE 'mountain'
          END;

        -- CENTRAL EUROPE (the heartland) — everything else within ~6 of center
        ELSE
          v_terrain := CASE
            WHEN v_rand < 0.22 THEN 'plains'
            WHEN v_rand < 0.40 THEN 'farmland'
            WHEN v_rand < 0.55 THEN 'forest'
            WHEN v_rand < 0.65 THEN 'disused'
            WHEN v_rand < 0.72 THEN 'mountain'
            WHEN v_rand < 0.78 THEN 'coast'
            WHEN v_rand < 0.85 THEN 'marsh'
            ELSE 'plains'
          END;
        END IF;

        -- =================================================================
        -- RESOURCE ASSIGNMENT based on terrain and geography
        -- =================================================================
        v_resource := NULL;
        v_reserve  := 0;
        v_rand     := random();  -- fresh roll for resources

        -- Water and snow tiles generally have no resources
        IF v_terrain NOT IN ('water', 'snow', 'coast') THEN

          -- OIL: concentrated in southeast (Caucasus/Romania area, q>3 AND r>3)
          IF v_q > 3 AND v_r > 3 AND v_terrain IN ('plains', 'desert') AND v_rand < 0.35 THEN
            v_resource := 'oil';
            v_reserve := CASE
              WHEN v_rand < 0.10 THEN 500000  -- Rich
              WHEN v_rand < 0.20 THEN 200000  -- Large
              ELSE 100000                      -- Medium
            END;

          -- IRON: industrial heartland, scattered broadly
          ELSIF v_terrain IN ('mountain', 'plains', 'forest') AND v_rand < 0.12 THEN
            v_resource := 'iron';
            v_reserve := CASE
              WHEN v_rand < 0.03 THEN 200000
              WHEN v_rand < 0.07 THEN 100000
              ELSE 50000
            END;

          -- COAL: near industrial areas, often with iron
          ELSIF v_terrain IN ('mountain', 'plains', 'forest') AND v_rand >= 0.12 AND v_rand < 0.24 THEN
            v_resource := 'coal';
            v_reserve := CASE
              WHEN v_rand < 0.15 THEN 200000
              WHEN v_rand < 0.19 THEN 100000
              ELSE 50000
            END;

          -- FARMLAND: temperate zones yield food
          ELSIF v_terrain = 'farmland' AND v_rand < 0.60 THEN
            v_resource := 'food';
            v_reserve := CASE
              WHEN v_rand < 0.15 THEN 200000
              WHEN v_rand < 0.35 THEN 100000
              ELSE 50000
            END;

          -- BAUXITE: scattered in southern/central regions
          ELSIF v_terrain IN ('mountain', 'plains') AND v_r > 0 AND v_rand >= 0.24 AND v_rand < 0.30 THEN
            v_resource := 'bauxite';
            v_reserve := CASE
              WHEN v_rand < 0.26 THEN 200000
              WHEN v_rand < 0.28 THEN 100000
              ELSE 50000
            END;

          -- COPPER: scattered in mountains and plains
          ELSIF v_terrain IN ('mountain', 'forest', 'plains') AND v_rand >= 0.30 AND v_rand < 0.37 THEN
            v_resource := 'copper';
            v_reserve := CASE
              WHEN v_rand < 0.32 THEN 200000
              WHEN v_rand < 0.34 THEN 100000
              ELSE 50000
            END;

          -- RUBBER: rare, southwest only (representing colonial import depots)
          ELSIF v_q < -2 AND v_r > 2 AND v_terrain IN ('coast', 'plains', 'forest') AND v_rand < 0.15 THEN
            v_resource := 'rubber';
            v_reserve := CASE
              WHEN v_rand < 0.05 THEN 100000
              ELSE 50000
            END;

          -- TUNGSTEN: very rare, Iberian peninsula area (southwest)
          ELSIF v_q < -4 AND v_r > 1 AND v_r < 6 AND v_terrain IN ('mountain', 'plains') AND v_rand < 0.08 THEN
            v_resource := 'tungsten';
            v_reserve := CASE
              WHEN v_rand < 0.03 THEN 100000
              ELSE 50000
            END;

          -- URANIUM: extremely rare, scattered (for nuclear research)
          ELSIF v_terrain IN ('mountain') AND v_rand >= 0.98 THEN
            v_resource := 'uranium';
            v_reserve := 50000;

          END IF;
        END IF;

        -- Coastal tiles can have fish
        IF v_terrain = 'coast' AND v_rand < 0.30 THEN
          v_resource := 'fish';
          v_reserve := 100000;
        END IF;

        INSERT INTO tiles (server_id, q, r, terrain_type, resource_type, resource_reserve, tile_index)
        VALUES (v_server_id, v_q, v_r, v_terrain, v_resource, v_reserve, v_tile_num - 1);

        -- Move to next hex in the current side direction
        v_q := v_q + dir_q[v_side + 1];  -- PG arrays are 1-indexed
        v_r := v_r + dir_r[v_side + 1];

      END LOOP;  -- v_step
      EXIT WHEN v_tile_num > 999;
    END LOOP;  -- v_side
    EXIT WHEN v_tile_num > 999;
  END LOOP;  -- v_ring

  RAISE NOTICE 'Generated % tiles for server %', v_tile_num, v_server_id;

END $$;


-- =============================================================================
-- 3. GENERATE TILE ADJACENCY FOR ALL 999 TILES
-- =============================================================================
-- Each hex tile at (q, r) has up to 6 neighbors at:
--   (q+1, r), (q+1, r-1), (q, r-1), (q-1, r), (q-1, r+1), (q, r+1)
-- We only insert an adjacency row when both tiles exist on this server.
-- =============================================================================

DO $$
DECLARE
  v_server_id UUID;
  -- The 6 axial hex directions
  dq INT[] := ARRAY[1, 1, 0, -1, -1, 0];
  dr INT[] := ARRAY[0, -1, -1, 0, 1, 1];
  -- Direction labels for readability
  dir_labels TEXT[] := ARRAY['E', 'NE', 'NW', 'W', 'SW', 'SE'];
  v_dir INT;
  v_tile RECORD;
  v_neighbor_id UUID;
  v_count INT := 0;
BEGIN
  SELECT id INTO v_server_id
    FROM game_servers
   WHERE name = 'European Theater #1'
   ORDER BY created_at DESC
   LIMIT 1;

  -- For every tile on this server, check all 6 directions
  FOR v_tile IN
    SELECT id, q, r FROM tiles WHERE server_id = v_server_id
  LOOP
    FOR v_dir IN 1..6 LOOP
      -- Look for the neighboring tile
      SELECT id INTO v_neighbor_id
        FROM tiles
       WHERE server_id = v_server_id
         AND q = v_tile.q + dq[v_dir]
         AND r = v_tile.r + dr[v_dir];

      IF v_neighbor_id IS NOT NULL THEN
        -- Insert adjacency (avoid duplicates with ON CONFLICT or check)
        INSERT INTO tile_adjacency (server_id, tile_id, neighbor_tile_id, direction)
        VALUES (v_server_id, v_tile.id, v_neighbor_id, dir_labels[v_dir])
        ON CONFLICT (server_id, tile_id, neighbor_tile_id) DO NOTHING;

        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Generated % adjacency records for server %', v_count, v_server_id;

END $$;


-- =============================================================================
-- VERIFICATION QUERIES (can be run after seeding to confirm data)
-- =============================================================================

-- Tile count by terrain type
-- SELECT terrain_type, COUNT(*) FROM tiles
--  WHERE server_id = (SELECT id FROM game_servers WHERE name = 'European Theater #1' LIMIT 1)
--  GROUP BY terrain_type ORDER BY COUNT(*) DESC;

-- Resource distribution
-- SELECT resource_type, COUNT(*), SUM(resource_reserve) AS total_reserves FROM tiles
--  WHERE server_id = (SELECT id FROM game_servers WHERE name = 'European Theater #1' LIMIT 1)
--    AND resource_type IS NOT NULL
--  GROUP BY resource_type ORDER BY COUNT(*) DESC;

-- Adjacency count per tile (should be 1-6, avg ~5.5 for interior tiles)
-- SELECT AVG(adj_count), MIN(adj_count), MAX(adj_count) FROM (
--   SELECT tile_id, COUNT(*) AS adj_count FROM tile_adjacency
--    WHERE server_id = (SELECT id FROM game_servers WHERE name = 'European Theater #1' LIMIT 1)
--    GROUP BY tile_id
-- ) sub;

COMMIT;

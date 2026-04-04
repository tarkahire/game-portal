-- seed_server_fixed.sql
-- Run each section separately

-- ============================================
-- 1. CREATE GAME SERVER
-- ============================================
INSERT INTO game_servers (name, map_id, max_players, status, speed_multiplier, created_at)
VALUES ('European Theater #1', 'europe_ww2', 30, 'lobby', 1.0, NOW());

-- ============================================
-- 2. GENERATE 999 HEX TILES
-- ============================================
-- Run this as one block:
DO $$
DECLARE
  v_server_id UUID;
  v_q INT; v_r INT; v_ring INT; v_side INT; v_step INT;
  v_tile_num INT := 0;
  v_terrain TEXT; v_resource TEXT; v_reserve INT;
  v_dist FLOAT; v_angle FLOAT; v_rand FLOAT;
  dir_q INT[] := ARRAY[1, 1, 0, -1, -1, 0];
  dir_r INT[] := ARRAY[0, -1, -1, 0, 1, 1];
BEGIN
  SELECT id INTO v_server_id FROM game_servers WHERE name = 'European Theater #1' ORDER BY created_at DESC LIMIT 1;

  INSERT INTO tiles (id, server_id, q, r, terrain_type) VALUES (0, v_server_id, 0, 0, 'plains');
  v_tile_num := 1;

  FOR v_ring IN 1..18 LOOP
    v_q := 0; v_r := -v_ring;
    FOR v_side IN 0..5 LOOP
      FOR v_step IN 1..v_ring LOOP
        EXIT WHEN v_tile_num >= 999;
        v_dist := sqrt(v_q::FLOAT * v_q + v_r::FLOAT * v_r + v_q::FLOAT * v_r);
        v_angle := atan2(v_r * 0.866, v_q + v_r * 0.5);
        v_rand := random();

        IF v_dist > 16 THEN v_terrain := 'water';
        ELSIF v_dist > 13 AND v_angle < -1.5 THEN v_terrain := CASE WHEN v_rand < 0.7 THEN 'water' ELSE 'snow' END;
        ELSIF v_dist > 13 AND v_angle > 2.0 THEN v_terrain := CASE WHEN v_rand < 0.8 THEN 'water' ELSE 'coast' END;
        ELSIF v_dist > 13 AND v_angle BETWEEN 0.8 AND 2.0 THEN v_terrain := CASE WHEN v_rand < 0.5 THEN 'water' ELSE 'desert' END;
        ELSIF v_r < -6 THEN
          v_terrain := CASE WHEN v_rand < 0.25 THEN 'forest' WHEN v_rand < 0.40 THEN 'snow' WHEN v_rand < 0.55 THEN 'coast' WHEN v_rand < 0.70 THEN 'water' WHEN v_rand < 0.80 THEN 'mountain' WHEN v_rand < 0.90 THEN 'plains' ELSE 'disused' END;
        ELSIF v_r > 6 THEN
          v_terrain := CASE WHEN v_rand < 0.25 THEN 'desert' WHEN v_rand < 0.45 THEN 'coast' WHEN v_rand < 0.60 THEN 'water' WHEN v_rand < 0.72 THEN 'plains' WHEN v_rand < 0.82 THEN 'mountain' WHEN v_rand < 0.90 THEN 'farmland' ELSE 'disused' END;
        ELSIF v_q > 6 THEN
          v_terrain := CASE WHEN v_rand < 0.30 THEN 'plains' WHEN v_rand < 0.50 THEN 'farmland' WHEN v_rand < 0.65 THEN 'forest' WHEN v_rand < 0.75 THEN 'snow' WHEN v_rand < 0.82 THEN 'marsh' WHEN v_rand < 0.90 THEN 'disused' ELSE 'mountain' END;
        ELSIF v_q < -6 THEN
          v_terrain := CASE WHEN v_rand < 0.25 THEN 'coast' WHEN v_rand < 0.45 THEN 'plains' WHEN v_rand < 0.60 THEN 'forest' WHEN v_rand < 0.72 THEN 'farmland' WHEN v_rand < 0.82 THEN 'water' WHEN v_rand < 0.90 THEN 'disused' ELSE 'mountain' END;
        ELSE
          v_terrain := CASE WHEN v_rand < 0.22 THEN 'plains' WHEN v_rand < 0.40 THEN 'farmland' WHEN v_rand < 0.55 THEN 'forest' WHEN v_rand < 0.65 THEN 'disused' WHEN v_rand < 0.72 THEN 'mountain' WHEN v_rand < 0.78 THEN 'coast' WHEN v_rand < 0.85 THEN 'marsh' ELSE 'plains' END;
        END IF;

        v_resource := NULL; v_reserve := 0; v_rand := random();

        IF v_terrain NOT IN ('water', 'snow', 'coast') THEN
          IF v_q > 3 AND v_r > 3 AND v_terrain IN ('plains', 'desert') AND v_rand < 0.35 THEN
            v_resource := 'oil'; v_reserve := CASE WHEN v_rand < 0.10 THEN 500000 WHEN v_rand < 0.20 THEN 200000 ELSE 100000 END;
          ELSIF v_terrain IN ('mountain', 'plains', 'forest') AND v_rand < 0.12 THEN
            v_resource := 'iron'; v_reserve := CASE WHEN v_rand < 0.03 THEN 200000 WHEN v_rand < 0.07 THEN 100000 ELSE 50000 END;
          ELSIF v_terrain IN ('mountain', 'plains', 'forest') AND v_rand >= 0.12 AND v_rand < 0.24 THEN
            v_resource := 'coal'; v_reserve := CASE WHEN v_rand < 0.15 THEN 200000 WHEN v_rand < 0.19 THEN 100000 ELSE 50000 END;
          ELSIF v_terrain = 'farmland' AND v_rand < 0.60 THEN
            v_resource := 'farmland'; v_reserve := CASE WHEN v_rand < 0.15 THEN 200000 WHEN v_rand < 0.35 THEN 100000 ELSE 50000 END;
          ELSIF v_terrain IN ('mountain', 'plains') AND v_r > 0 AND v_rand >= 0.24 AND v_rand < 0.30 THEN
            v_resource := 'bauxite'; v_reserve := CASE WHEN v_rand < 0.26 THEN 200000 WHEN v_rand < 0.28 THEN 100000 ELSE 50000 END;
          ELSIF v_terrain IN ('mountain', 'forest', 'plains') AND v_rand >= 0.30 AND v_rand < 0.37 THEN
            v_resource := 'copper'; v_reserve := CASE WHEN v_rand < 0.32 THEN 200000 WHEN v_rand < 0.34 THEN 100000 ELSE 50000 END;
          ELSIF v_q < -2 AND v_r > 2 AND v_terrain IN ('plains', 'forest') AND v_rand < 0.15 THEN
            v_resource := 'rubber'; v_reserve := CASE WHEN v_rand < 0.05 THEN 100000 ELSE 50000 END;
          ELSIF v_q < -4 AND v_r > 1 AND v_r < 6 AND v_terrain IN ('mountain', 'plains') AND v_rand < 0.08 THEN
            v_resource := 'tungsten'; v_reserve := CASE WHEN v_rand < 0.03 THEN 100000 ELSE 50000 END;
          ELSIF v_terrain = 'mountain' AND v_rand >= 0.98 THEN
            v_resource := 'uranium'; v_reserve := 50000;
          END IF;
        END IF;

        IF v_terrain = 'coast' AND v_rand < 0.30 THEN
          v_resource := 'fish'; v_reserve := 100000;
        END IF;

        INSERT INTO tiles (id, server_id, q, r, terrain_type, resource_type, resource_reserves_total, resource_reserves_remaining)
        VALUES (v_tile_num, v_server_id, v_q, v_r, v_terrain, v_resource, CASE WHEN v_reserve > 0 THEN v_reserve ELSE NULL END, CASE WHEN v_reserve > 0 THEN v_reserve ELSE NULL END);

        v_tile_num := v_tile_num + 1;
        v_q := v_q + dir_q[v_side + 1];
        v_r := v_r + dir_r[v_side + 1];
      END LOOP;
      EXIT WHEN v_tile_num >= 999;
    END LOOP;
    EXIT WHEN v_tile_num >= 999;
  END LOOP;
  RAISE NOTICE 'Generated % tiles', v_tile_num;
END $$;

-- ============================================
-- 3. GENERATE TILE ADJACENCY
-- ============================================
-- Run this as one block:
DO $$
DECLARE
  v_server_id UUID;
  dq INT[] := ARRAY[1, 1, 0, -1, -1, 0];
  dr INT[] := ARRAY[0, -1, -1, 0, 1, 1];
  v_dir INT; v_tile RECORD;
  v_nq INT; v_nr INT; v_nid INT;
  v_count INT := 0;
BEGIN
  SELECT id INTO v_server_id FROM game_servers WHERE name = 'European Theater #1' ORDER BY created_at DESC LIMIT 1;

  FOR v_tile IN SELECT id, q, r FROM tiles WHERE server_id = v_server_id LOOP
    FOR v_dir IN 1..6 LOOP
      v_nq := v_tile.q + dq[v_dir];
      v_nr := v_tile.r + dr[v_dir];
      SELECT t.id INTO v_nid FROM tiles t WHERE t.server_id = v_server_id AND t.q = v_nq AND t.r = v_nr;
      IF v_nid IS NOT NULL AND v_tile.id < v_nid THEN
        INSERT INTO tile_adjacency (server_id, tile_a, tile_b, movement_cost, has_river, has_bridge)
        VALUES (v_server_id, v_tile.id, v_nid,
          CASE
            WHEN EXISTS (SELECT 1 FROM tiles t WHERE t.id = v_nid AND t.server_id = v_server_id AND t.terrain_type = 'mountain') THEN 3.0
            WHEN EXISTS (SELECT 1 FROM tiles t WHERE t.id = v_nid AND t.server_id = v_server_id AND t.terrain_type IN ('forest', 'marsh')) THEN 1.5
            WHEN EXISTS (SELECT 1 FROM tiles t WHERE t.id = v_nid AND t.server_id = v_server_id AND t.terrain_type = 'desert') THEN 1.3
            ELSE 1.0
          END, false, false)
        ON CONFLICT (server_id, tile_a, tile_b) DO NOTHING;
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Generated % adjacency records', v_count;
END $$;

-- ============================================
-- 4. VERIFY
-- ============================================
-- SELECT 'tiles' as tbl, COUNT(*) FROM tiles
-- UNION ALL SELECT 'tile_adjacency', COUNT(*) FROM tile_adjacency
-- UNION ALL SELECT 'terrain distribution:', 0;
--
-- SELECT terrain_type, COUNT(*) FROM tiles
-- WHERE server_id = (SELECT id FROM game_servers LIMIT 1)
-- GROUP BY terrain_type ORDER BY count DESC;
--
-- SELECT resource_type, COUNT(*) FROM tiles
-- WHERE resource_type IS NOT NULL AND server_id = (SELECT id FROM game_servers LIMIT 1)
-- GROUP BY resource_type ORDER BY count DESC;

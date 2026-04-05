-- ============================================================================
-- 036e: Discovery functions + updated march_army
-- Run FIFTH in Supabase SQL Editor.
-- ============================================================================

-- =========================================================================
-- start_discovery — Engineers discover hidden resources
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

  IF p_stage NOT IN (2, 3) THEN
    RAISE EXCEPTION 'Discovery stage must be 2 or 3';
  END IF;

  SELECT * INTO v_tile FROM tiles
  WHERE id = p_tile_id AND server_id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tile not found'; END IF;
  IF v_tile.owner_id != v_player_id THEN RAISE EXCEPTION 'You do not own this tile'; END IF;
  IF v_tile.terrain_type IN ('water', 'river') THEN RAISE EXCEPTION 'Cannot discover on water tiles'; END IF;

  IF v_tile.discovery_stage_completed >= p_stage THEN
    RAISE EXCEPTION 'Stage % already discovered on this tile', p_stage;
  END IF;

  IF p_stage = 3 AND v_tile.discovery_stage_completed < 2 THEN
    RAISE EXCEPTION 'Must complete stage 2 discovery before stage 3';
  END IF;

  IF EXISTS (SELECT 1 FROM tile_discoveries
    WHERE tile_id = p_tile_id AND server_id = p_server_id AND status = 'in_progress') THEN
    RAISE EXCEPTION 'A discovery is already in progress on this tile';
  END IF;

  SELECT * INTO v_army FROM armies WHERE id = p_army_id AND server_id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Army not found'; END IF;
  IF v_army.player_id != v_player_id THEN RAISE EXCEPTION 'Not your army'; END IF;
  IF v_army.tile_id != p_tile_id THEN RAISE EXCEPTION 'Army is not on this tile'; END IF;
  IF v_army.status NOT IN ('idle', 'fortified') THEN RAISE EXCEPTION 'Army must be idle'; END IF;

  SELECT COALESCE(SUM(au.quantity), 0) INTO v_engineer_count
  FROM army_units au
  WHERE au.army_id = p_army_id AND au.unit_def = 'engineers';

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
-- process_discoveries — Complete/fail discoveries each tick
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
    v_army_exists := EXISTS (
      SELECT 1 FROM armies WHERE id = v_disc.army_id AND tile_id = v_disc.tile_id
    );
    v_tile_owned := (v_disc.current_owner = v_disc.player_id);

    IF NOT v_army_exists OR NOT v_tile_owned THEN
      UPDATE tile_discoveries SET status = 'failed' WHERE id = v_disc.id;
      INSERT INTO notifications (user_id, type, title, body)
      SELECT p.user_id, 'system',
        'Discovery Failed',
        'Engineers on tile (' || v_disc.tile_id || ') were disrupted. Discovery failed.'
      FROM players p WHERE p.id = v_disc.player_id;
      CONTINUE;
    END IF;

    IF v_disc.discovery_stage = 2 THEN
      v_success_chance := LEAST(0.90, 0.70 + (v_disc.engineers_committed - 20) * 0.005);
    ELSE
      v_success_chance := LEAST(0.70, 0.40 + (v_disc.engineers_committed - 60) * 0.003);
    END IF;

    v_roll := random();

    IF v_roll <= v_success_chance THEN
      IF v_disc.discovery_stage = 2 THEN
        v_resource := v_disc.secondary_resource;
      ELSE
        v_resource := v_disc.deep_resource;
      END IF;

      UPDATE tiles SET discovery_stage_completed = v_disc.discovery_stage
      WHERE id = v_disc.tile_id AND server_id = v_disc.server_id;

      UPDATE tile_discoveries SET
        status = 'completed',
        discovered_resource = v_resource,
        discovered_amount = CASE v_disc.discovery_stage
          WHEN 2 THEN COALESCE((SELECT secondary_reserves_total FROM tiles WHERE id = v_disc.tile_id AND server_id = v_disc.server_id), 0)
          ELSE COALESCE((SELECT deep_reserves_total FROM tiles WHERE id = v_disc.tile_id AND server_id = v_disc.server_id), 0)
        END
      WHERE id = v_disc.id;

      INSERT INTO notifications (user_id, type, title, body)
      SELECT p.user_id, 'system',
        'Discovery Complete!',
        'Engineers discovered ' || COALESCE(v_resource, 'nothing') || ' deposits on tile (' || v_disc.tile_id || ')!'
      FROM players p WHERE p.id = v_disc.player_id;
    ELSE
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
-- Updated march_army — block marching during active discovery
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

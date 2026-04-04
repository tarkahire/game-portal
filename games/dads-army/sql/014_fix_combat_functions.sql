-- ============================================================================
-- 014_fix_combat_functions.sql
-- Fix: resolve_army_arrivals, resolve_combat
--
-- Issues fixed:
--   1. owner_id → player_id throughout
--   2. ud.name → ud.id for unit_defs joins
--   3. avg_hp_percent → hp_percent
--   4. destination_tile_id → destination_tile
--   5. experience_level → experience
--   6. battle_reports INSERT: match actual table schema
--      (result, attacker_losses, defender_losses, attacker_army_snapshot,
--       defender_army_snapshot, modifiers_applied, war_damage_caused)
--
-- Run each statement individually in Supabase SQL Editor.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. resolve_army_arrivals (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_army_arrivals(p_server_id UUID)
RETURNS void AS $$
DECLARE
  v_army RECORD;
  v_dest_tile RECORD;
BEGIN
  FOR v_army IN
    SELECT * FROM armies
    WHERE server_id = p_server_id
    AND status = 'marching'
    AND march_arrives_at <= now()
  LOOP
    SELECT * INTO v_dest_tile
    FROM tiles
    WHERE id = v_army.destination_tile AND server_id = p_server_id;

    IF v_dest_tile.owner_id IS NOT NULL
       AND v_dest_tile.owner_id != v_army.player_id
       AND NOT EXISTS (
         SELECT 1 FROM alliance_members am1
         JOIN alliance_members am2 ON am1.alliance_id = am2.alliance_id
         WHERE am1.player_id = v_army.player_id
         AND am2.player_id = v_dest_tile.owner_id
       )
    THEN
      PERFORM resolve_combat(v_army.id, v_dest_tile.id, p_server_id);
    ELSE
      UPDATE armies
      SET status = 'idle',
          tile_id = v_army.destination_tile,
          march_path = NULL,
          march_started_at = NULL,
          march_arrives_at = NULL,
          destination_tile = NULL
      WHERE id = v_army.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- 2. resolve_combat (fixed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_combat(
  p_attacker_army_id UUID,
  p_tile_id          INT,
  p_server_id        UUID
)
RETURNS void AS $$
DECLARE
  v_attacker       RECORD;
  v_defender_army   RECORD;
  v_tile            RECORD;
  v_round           INT;
  v_max_rounds      INT := 10;
  v_terrain_def_mod REAL := 1.0;
  v_terrain_atk_mod REAL := 1.0;
  v_fort_bonus      REAL := 0.0;
  v_city_bonus      REAL := 0.0;
  v_atk_morale      REAL := 100.0;
  v_def_morale      REAL := 100.0;
  v_atk_inf_atk     REAL; v_atk_arm_atk REAL; v_atk_art_atk REAL;
  v_def_inf_atk     REAL; v_def_arm_atk REAL; v_def_art_atk REAL;
  v_atk_inf_hp      REAL; v_atk_arm_hp  REAL; v_atk_art_hp  REAL;
  v_def_inf_hp      REAL; v_def_arm_hp  REAL; v_def_art_hp  REAL;
  v_atk_total_atk   REAL;
  v_def_total_atk   REAL;
  v_damage_dealt    REAL;
  v_round_data      JSONB := '[]';
  v_attacker_won    BOOLEAN;
  v_battle_report_id UUID;
  v_war_damage      REAL;
  v_atk_hp_start    REAL;
  v_def_hp_start    REAL;
  v_atk_hp_end      REAL;
  v_def_hp_end      REAL;
  v_atk_loss_pct    REAL;
  v_def_loss_pct    REAL;
  v_atk_snapshot    JSONB;
  v_def_snapshot     JSONB;
  v_result_text     TEXT;
BEGIN
  -- Get attacker army
  SELECT * INTO v_attacker FROM armies WHERE id = p_attacker_army_id;

  -- Get tile
  SELECT * INTO v_tile FROM tiles WHERE id = p_tile_id AND server_id = p_server_id;

  -- Find defender army (garrison or field army on the tile)
  SELECT * INTO v_defender_army
  FROM armies
  WHERE tile_id = p_tile_id
  AND server_id = p_server_id
  AND player_id = v_tile.owner_id
  ORDER BY is_garrison DESC
  LIMIT 1;

  -- Terrain modifiers
  v_terrain_def_mod := CASE v_tile.terrain_type
    WHEN 'forest' THEN 1.20
    WHEN 'mountain' THEN 1.40
    WHEN 'urban' THEN 1.30
    WHEN 'ruins' THEN 1.10
    ELSE 1.0
  END;

  IF EXISTS (
    SELECT 1 FROM tile_adjacency ta
    WHERE ta.server_id = p_server_id
    AND ta.has_river = true AND ta.has_bridge = false
    AND (
      (ta.tile_a = v_attacker.tile_id AND ta.tile_b = p_tile_id)
      OR (ta.tile_a = p_tile_id AND ta.tile_b = v_attacker.tile_id)
    )
  ) THEN
    v_terrain_atk_mod := 0.80;
  END IF;

  -- Fortification bonus
  IF v_tile.fortification_type IS NOT NULL AND v_tile.fortification_hp > 0 THEN
    v_fort_bonus := v_tile.fortification_hp / 100.0 * 0.30;
  END IF;

  -- City defense bonus
  IF EXISTS (SELECT 1 FROM cities WHERE tile_id = p_tile_id AND server_id = p_server_id) THEN
    v_city_bonus := 0.50;
  END IF;

  -- Snapshot attacker army (for battle report)
  SELECT jsonb_agg(jsonb_build_object(
    'unit_def', au.unit_def, 'quantity', au.quantity,
    'hp_percent', au.hp_percent, 'category', ud.category
  ))
  INTO v_atk_snapshot
  FROM army_units au
  JOIN unit_defs ud ON ud.id = au.unit_def
  WHERE au.army_id = p_attacker_army_id;

  -- Gather attacker unit stats by category
  SELECT
    COALESCE(SUM(CASE WHEN ud.category = 'infantry'  THEN au.quantity * ud.attack * au.hp_percent / 100.0 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'armor'     THEN au.quantity * ud.attack * au.hp_percent / 100.0 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.attack * au.hp_percent / 100.0 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'infantry'  THEN au.quantity * ud.hp * au.hp_percent / 100.0 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'armor'     THEN au.quantity * ud.hp * au.hp_percent / 100.0 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.hp * au.hp_percent / 100.0 ELSE 0 END), 0)
  INTO v_atk_inf_atk, v_atk_arm_atk, v_atk_art_atk,
       v_atk_inf_hp, v_atk_arm_hp, v_atk_art_hp
  FROM army_units au
  JOIN unit_defs ud ON ud.id = au.unit_def
  WHERE au.army_id = p_attacker_army_id;

  v_atk_hp_start := v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp;

  -- Gather defender unit stats
  IF v_defender_army IS NOT NULL THEN
    SELECT jsonb_agg(jsonb_build_object(
      'unit_def', au.unit_def, 'quantity', au.quantity,
      'hp_percent', au.hp_percent, 'category', ud.category
    ))
    INTO v_def_snapshot
    FROM army_units au
    JOIN unit_defs ud ON ud.id = au.unit_def
    WHERE au.army_id = v_defender_army.id;

    SELECT
      COALESCE(SUM(CASE WHEN ud.category = 'infantry'  THEN au.quantity * ud.attack * au.hp_percent / 100.0 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'armor'     THEN au.quantity * ud.attack * au.hp_percent / 100.0 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.attack * au.hp_percent / 100.0 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'infantry'  THEN au.quantity * ud.hp * au.hp_percent / 100.0 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'armor'     THEN au.quantity * ud.hp * au.hp_percent / 100.0 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ud.category = 'artillery' THEN au.quantity * ud.hp * au.hp_percent / 100.0 ELSE 0 END), 0)
    INTO v_def_inf_atk, v_def_arm_atk, v_def_art_atk,
         v_def_inf_hp, v_def_arm_hp, v_def_art_hp
    FROM army_units au
    JOIN unit_defs ud ON ud.id = au.unit_def
    WHERE au.army_id = v_defender_army.id;
  ELSE
    v_def_snapshot := '[]'::jsonb;
    v_def_inf_atk := 0; v_def_arm_atk := 0; v_def_art_atk := 0;
    v_def_inf_hp := 0; v_def_arm_hp := 0; v_def_art_hp := 0;
  END IF;

  v_def_hp_start := v_def_inf_hp + v_def_arm_hp + v_def_art_hp;

  -- Multi-round combat loop
  FOR v_round IN 1..v_max_rounds LOOP
    IF (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp) <= 0 THEN EXIT; END IF;
    IF (v_def_inf_hp + v_def_arm_hp + v_def_art_hp) <= 0 THEN EXIT; END IF;
    IF v_atk_morale <= 0 OR v_def_morale <= 0 THEN EXIT; END IF;

    -- Attacker damage (with category effectiveness)
    v_atk_total_atk := (
      v_atk_inf_atk * (CASE WHEN v_def_art_hp > 0 THEN 1.25 ELSE 1.0 END * CASE WHEN v_def_arm_hp > 0 THEN 0.75 ELSE 1.0 END)
      + v_atk_arm_atk * (CASE WHEN v_def_inf_hp > 0 THEN 1.25 ELSE 1.0 END * CASE WHEN v_def_art_hp > 0 THEN 0.75 ELSE 1.0 END)
      + v_atk_art_atk * (CASE WHEN v_def_arm_hp > 0 THEN 1.25 ELSE 1.0 END * CASE WHEN v_def_inf_hp > 0 THEN 0.75 ELSE 1.0 END)
    ) * v_terrain_atk_mod;

    -- Defender damage (with terrain/fort/city bonuses)
    v_def_total_atk := (
      v_def_inf_atk * (CASE WHEN v_atk_art_hp > 0 THEN 1.25 ELSE 1.0 END * CASE WHEN v_atk_arm_hp > 0 THEN 0.75 ELSE 1.0 END)
      + v_def_arm_atk * (CASE WHEN v_atk_inf_hp > 0 THEN 1.25 ELSE 1.0 END * CASE WHEN v_atk_art_hp > 0 THEN 0.75 ELSE 1.0 END)
      + v_def_art_atk * (CASE WHEN v_atk_arm_hp > 0 THEN 1.25 ELSE 1.0 END * CASE WHEN v_atk_inf_hp > 0 THEN 0.75 ELSE 1.0 END)
    ) * v_terrain_def_mod * (1.0 + v_fort_bonus + v_city_bonus);

    -- Apply 10% of attack power as damage per round
    v_damage_dealt := v_atk_total_atk * 0.1;
    IF (v_def_inf_hp + v_def_arm_hp + v_def_art_hp) > 0 THEN
      DECLARE v_def_total_hp REAL := v_def_inf_hp + v_def_arm_hp + v_def_art_hp;
      BEGIN
        v_def_inf_hp := GREATEST(v_def_inf_hp - v_damage_dealt * v_def_inf_hp / v_def_total_hp, 0);
        v_def_arm_hp := GREATEST(v_def_arm_hp - v_damage_dealt * v_def_arm_hp / v_def_total_hp, 0);
        v_def_art_hp := GREATEST(v_def_art_hp - v_damage_dealt * v_def_art_hp / v_def_total_hp, 0);
      END;
    END IF;

    v_damage_dealt := v_def_total_atk * 0.1;
    IF (v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp) > 0 THEN
      DECLARE v_atk_total_hp REAL := v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp;
      BEGIN
        v_atk_inf_hp := GREATEST(v_atk_inf_hp - v_damage_dealt * v_atk_inf_hp / v_atk_total_hp, 0);
        v_atk_arm_hp := GREATEST(v_atk_arm_hp - v_damage_dealt * v_atk_arm_hp / v_atk_total_hp, 0);
        v_atk_art_hp := GREATEST(v_atk_art_hp - v_damage_dealt * v_atk_art_hp / v_atk_total_hp, 0);
      END;
    END IF;

    -- Morale
    v_atk_morale := v_atk_morale - (v_def_total_atk * 0.05);
    v_def_morale := v_def_morale - (v_atk_total_atk * 0.05);

    -- Recalculate attack values based on remaining HP (diminishing returns)
    v_atk_inf_atk := v_atk_inf_atk * GREATEST(v_atk_inf_hp / GREATEST(v_atk_hp_start * 0.5, 1), 0.1);
    v_atk_arm_atk := v_atk_arm_atk * GREATEST(v_atk_arm_hp / GREATEST(v_atk_hp_start * 0.5, 1), 0.1);
    v_atk_art_atk := v_atk_art_atk * GREATEST(v_atk_art_hp / GREATEST(v_atk_hp_start * 0.5, 1), 0.1);
    v_def_inf_atk := v_def_inf_atk * GREATEST(v_def_inf_hp / GREATEST(v_def_hp_start * 0.5, 1), 0.1);
    v_def_arm_atk := v_def_arm_atk * GREATEST(v_def_arm_hp / GREATEST(v_def_hp_start * 0.5, 1), 0.1);
    v_def_art_atk := v_def_art_atk * GREATEST(v_def_art_hp / GREATEST(v_def_hp_start * 0.5, 1), 0.1);

    -- Record round
    v_round_data := v_round_data || jsonb_build_object(
      'round', v_round,
      'atk_hp', jsonb_build_object('infantry', ROUND(v_atk_inf_hp::numeric, 1), 'armor', ROUND(v_atk_arm_hp::numeric, 1), 'artillery', ROUND(v_atk_art_hp::numeric, 1)),
      'def_hp', jsonb_build_object('infantry', ROUND(v_def_inf_hp::numeric, 1), 'armor', ROUND(v_def_arm_hp::numeric, 1), 'artillery', ROUND(v_def_art_hp::numeric, 1)),
      'atk_morale', ROUND(v_atk_morale::numeric, 1),
      'def_morale', ROUND(v_def_morale::numeric, 1)
    );
  END LOOP;

  -- Determine winner
  v_atk_hp_end := v_atk_inf_hp + v_atk_arm_hp + v_atk_art_hp;
  v_def_hp_end := v_def_inf_hp + v_def_arm_hp + v_def_art_hp;

  v_attacker_won := (v_def_hp_end <= 0 OR v_def_morale <= 0)
    AND (v_atk_hp_end > 0 AND v_atk_morale > 0);

  IF v_attacker_won THEN
    v_result_text := 'attacker_wins';
  ELSIF v_atk_hp_end <= 0 OR v_atk_morale <= 0 THEN
    v_result_text := 'defender_wins';
  ELSE
    v_result_text := 'draw';
  END IF;

  -- Calculate loss percentages
  v_atk_loss_pct := CASE WHEN v_atk_hp_start > 0 THEN 1.0 - (v_atk_hp_end / v_atk_hp_start) ELSE 1.0 END;
  v_def_loss_pct := CASE WHEN v_def_hp_start > 0 THEN 1.0 - (v_def_hp_end / v_def_hp_start) ELSE 1.0 END;

  -- Apply casualties to attacker
  UPDATE army_units au
  SET quantity = GREATEST(CEIL(quantity * (1.0 - v_atk_loss_pct)), 0),
      hp_percent = GREATEST(hp_percent * (1.0 - v_atk_loss_pct * 0.5), 10)
  WHERE au.army_id = p_attacker_army_id;
  DELETE FROM army_units WHERE army_id = p_attacker_army_id AND quantity <= 0;

  -- Apply casualties to defender
  IF v_defender_army IS NOT NULL THEN
    UPDATE army_units au
    SET quantity = GREATEST(CEIL(quantity * (1.0 - v_def_loss_pct)), 0),
        hp_percent = GREATEST(hp_percent * (1.0 - v_def_loss_pct * 0.5), 10)
    WHERE au.army_id = v_defender_army.id;
    DELETE FROM army_units WHERE army_id = v_defender_army.id AND quantity <= 0;
  END IF;

  -- Update army states
  IF v_attacker_won THEN
    UPDATE armies
    SET status = 'idle', tile_id = p_tile_id,
        march_path = NULL, march_started_at = NULL,
        march_arrives_at = NULL, destination_tile = NULL
    WHERE id = p_attacker_army_id;

    UPDATE tiles SET owner_id = v_attacker.player_id
    WHERE id = p_tile_id AND server_id = p_server_id;

    IF v_defender_army IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM army_units WHERE army_id = v_defender_army.id
    ) THEN
      DELETE FROM armies WHERE id = v_defender_army.id;
    ELSIF v_defender_army IS NOT NULL THEN
      UPDATE armies SET status = 'retreating' WHERE id = v_defender_army.id;
    END IF;
  ELSE
    UPDATE armies
    SET status = 'retreating',
        march_path = NULL, march_started_at = NULL,
        march_arrives_at = NULL, destination_tile = NULL
    WHERE id = p_attacker_army_id;

    IF NOT EXISTS (SELECT 1 FROM army_units WHERE army_id = p_attacker_army_id) THEN
      DELETE FROM armies WHERE id = p_attacker_army_id;
    END IF;
  END IF;

  -- War damage
  v_war_damage := LEAST(5.0 + (v_atk_hp_start * v_atk_loss_pct + v_def_hp_start * v_def_loss_pct) / 500.0, 25.0);
  UPDATE tiles
  SET war_damage_level = LEAST(war_damage_level + v_war_damage, 100),
      land_quality = GREATEST(land_quality - v_war_damage * 0.5, 0)
  WHERE id = p_tile_id AND server_id = p_server_id;

  -- Battle report (matching actual table schema)
  INSERT INTO battle_reports (
    server_id, tile_id, attacker_id, defender_id,
    attacker_army_snapshot, defender_army_snapshot,
    terrain_type, fortification_type, modifiers_applied,
    rounds, result,
    attacker_losses, defender_losses,
    war_damage_caused, occurred_at
  )
  VALUES (
    p_server_id, p_tile_id,
    v_attacker.player_id,
    CASE WHEN v_defender_army IS NOT NULL THEN v_defender_army.player_id ELSE v_tile.owner_id END,
    COALESCE(v_atk_snapshot, '[]'::jsonb),
    COALESCE(v_def_snapshot, '[]'::jsonb),
    v_tile.terrain_type,
    v_tile.fortification_type,
    jsonb_build_object(
      'terrain_def_mod', v_terrain_def_mod, 'terrain_atk_mod', v_terrain_atk_mod,
      'fort_bonus', v_fort_bonus, 'city_bonus', v_city_bonus
    ),
    v_round_data,
    v_result_text,
    jsonb_build_object('hp_lost_pct', ROUND(v_atk_loss_pct::numeric, 3)),
    jsonb_build_object('hp_lost_pct', ROUND(v_def_loss_pct::numeric, 3)),
    v_war_damage,
    now()
  )
  RETURNING id INTO v_battle_report_id;

  -- Notifications
  INSERT INTO notifications (player_id, notification_type, title, body, data)
  VALUES (
    v_attacker.player_id,
    CASE WHEN v_attacker_won THEN 'battle_victory' ELSE 'battle_defeat' END,
    CASE WHEN v_attacker_won THEN 'Victory!' ELSE 'Defeat!' END,
    'Battle at tile ' || p_tile_id || ': ' ||
      CASE WHEN v_attacker_won THEN 'Your forces prevailed' ELSE 'Your forces were repelled' END,
    jsonb_build_object('battle_report_id', v_battle_report_id, 'tile_id', p_tile_id)
  );

  IF v_defender_army IS NOT NULL OR v_tile.owner_id IS NOT NULL THEN
    INSERT INTO notifications (player_id, notification_type, title, body, data)
    VALUES (
      COALESCE(
        CASE WHEN v_defender_army IS NOT NULL THEN v_defender_army.player_id ELSE NULL END,
        v_tile.owner_id
      ),
      CASE WHEN v_attacker_won THEN 'battle_defeat' ELSE 'battle_victory' END,
      CASE WHEN v_attacker_won THEN 'Territory Lost!' ELSE 'Defense Successful!' END,
      'Battle at tile ' || p_tile_id,
      jsonb_build_object('battle_report_id', v_battle_report_id, 'tile_id', p_tile_id)
    );
  END IF;

  -- Grant experience to survivors
  UPDATE army_units SET experience = LEAST(experience + 10, 400)
  WHERE army_id = p_attacker_army_id;
  IF v_defender_army IS NOT NULL THEN
    UPDATE army_units SET experience = LEAST(experience + 10, 400)
    WHERE army_id = v_defender_army.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix deduct_player_resource and get_player_resource_total
-- owner_id → player_id, REAL → DOUBLE PRECISION signature

DROP FUNCTION IF EXISTS deduct_player_resource(uuid, text, real);

CREATE OR REPLACE FUNCTION deduct_player_resource(
  p_player_id UUID, p_resource_type TEXT, p_amount DOUBLE PRECISION
) RETURNS void AS $$
DECLARE
  v_remaining REAL := p_amount; v_city_row RECORD; v_deduct REAL;
BEGIN
  FOR v_city_row IN
    SELECT cr.city_id, cr.amount, c.is_capital FROM city_resources cr
    JOIN cities c ON c.id = cr.city_id
    WHERE c.player_id = p_player_id AND cr.resource_type = p_resource_type AND cr.amount > 0
    ORDER BY c.is_capital DESC, cr.amount DESC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_deduct := LEAST(v_city_row.amount, v_remaining);
    UPDATE city_resources SET amount = amount - v_deduct
    WHERE city_id = v_city_row.city_id AND resource_type = p_resource_type;
    v_remaining := v_remaining - v_deduct;
  END LOOP;
  IF v_remaining > 0.01 THEN
    RAISE EXCEPTION 'Insufficient % (short by %)', p_resource_type, ROUND(v_remaining::numeric, 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_player_resource_total(
  p_player_id UUID, p_resource_type TEXT
) RETURNS REAL AS $$
  SELECT COALESCE(SUM(cr.amount), 0) FROM city_resources cr
  JOIN cities c ON c.id = cr.city_id
  WHERE c.player_id = p_player_id AND cr.resource_type = p_resource_type;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

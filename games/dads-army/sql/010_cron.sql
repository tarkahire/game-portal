-- ============================================================================
-- 010_cron.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- pg_cron job registration for game tick processing
-- ============================================================================
-- Depends on: 001_extensions.sql (pg_cron), 009_functions.sql
-- ============================================================================
-- The game tick runs every minute. For each active server, it processes
-- building/training/research completion, army arrivals, resource depletion,
-- resource materialization (every 5th tick), supply chains, and
-- fortification degradation.
--
-- On Supabase, pg_cron jobs run as the postgres role with full privileges,
-- which is why process_game_tick is SECURITY DEFINER — it needs to bypass
-- RLS to update all player data during the tick.
-- ============================================================================

-- Unschedule existing job if re-running this migration
SELECT cron.unschedule('game-tick')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'game-tick'
);

-- Schedule the game tick to run every minute
-- Iterates over all active servers and processes each one
SELECT cron.schedule(
  'game-tick',
  '* * * * *',
  $$SELECT process_game_tick(id) FROM game_servers WHERE status = 'active'$$
);

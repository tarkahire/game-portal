-- ============================================================================
-- 001_extensions.sql
-- Dad's Army — WW2 Persistent Strategy Game
-- Enable required PostgreSQL extensions for Supabase
-- ============================================================================
-- Run this FIRST before any other migration files.
-- Some extensions (pg_cron, pg_net) require superuser or Supabase dashboard
-- enablement. If running via Supabase SQL Editor, these should already be
-- available — just ensure they are created in the correct schema.
-- ============================================================================

-- pgcrypto: provides gen_random_uuid() for UUID primary key generation.
-- On Supabase (PG 15+), gen_random_uuid() is built-in, but we enable
-- pgcrypto anyway for broader compatibility and additional crypto functions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_cron: allows scheduling recurring SQL jobs directly inside PostgreSQL.
-- Used for game tick processing (resource production, army movement,
-- construction completion, supply checks, etc.).
-- NOTE: On Supabase, pg_cron must be enabled via the Dashboard under
-- Database > Extensions before this statement will succeed.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pg_net: enables asynchronous HTTP requests from within PostgreSQL.
-- Used for triggering Edge Functions, sending webhooks on game events
-- (battle results, alliance notifications), and push notification dispatch.
-- NOTE: On Supabase, pg_net must be enabled via the Dashboard under
-- Database > Extensions before this statement will succeed.
CREATE EXTENSION IF NOT EXISTS pg_net;

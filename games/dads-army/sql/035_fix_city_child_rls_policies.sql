-- ============================================================================
-- 035_fix_city_child_rls_policies.sql
-- Fix RLS policies on buildings, city_resources, and training_queue.
-- These tables join cities on c.owner_id, but the cities column was renamed
-- to player_id in 016_fix_is_garrison_column.sql. The child table policies
-- were never updated, blocking all access to buildings/resources/training.
-- Run in Supabase SQL Editor.
-- ============================================================================

-- =========================================================================
-- 1. Fix buildings RLS policies (c.owner_id → c.player_id)
-- =========================================================================
DROP POLICY IF EXISTS "buildings_select" ON buildings;
DROP POLICY IF EXISTS "buildings_insert" ON buildings;
DROP POLICY IF EXISTS "buildings_update" ON buildings;
DROP POLICY IF EXISTS "buildings_delete" ON buildings;

CREATE POLICY "buildings_select" ON buildings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_insert" ON buildings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_update" ON buildings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "buildings_delete" ON buildings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = buildings.city_id
      AND p.user_id = auth.uid()
    )
  );

-- =========================================================================
-- 2. Fix city_resources RLS policies (c.owner_id → c.player_id)
-- =========================================================================
DROP POLICY IF EXISTS "city_resources_select" ON city_resources;
DROP POLICY IF EXISTS "city_resources_update" ON city_resources;

CREATE POLICY "city_resources_select" ON city_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = city_resources.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "city_resources_update" ON city_resources
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = city_resources.city_id
      AND p.user_id = auth.uid()
    )
  );

-- =========================================================================
-- 3. Fix training_queue RLS policies (c.owner_id → c.player_id)
-- =========================================================================
DROP POLICY IF EXISTS "training_queue_select" ON training_queue;
DROP POLICY IF EXISTS "training_queue_insert" ON training_queue;
DROP POLICY IF EXISTS "training_queue_update" ON training_queue;
DROP POLICY IF EXISTS "training_queue_delete" ON training_queue;

CREATE POLICY "training_queue_select" ON training_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "training_queue_insert" ON training_queue
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "training_queue_update" ON training_queue
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "training_queue_delete" ON training_queue
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cities c
      JOIN players p ON p.id = c.player_id
      WHERE c.id = training_queue.city_id
      AND p.user_id = auth.uid()
    )
  );

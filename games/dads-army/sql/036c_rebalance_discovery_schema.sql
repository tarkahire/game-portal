-- ============================================================================
-- 036c: Discovery system schema — new columns, tables, indexes
-- Run THIRD in Supabase SQL Editor.
-- ============================================================================

-- New columns on tiles for secondary and deep resources
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS secondary_resource TEXT;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS secondary_reserves_total REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS secondary_reserves_remaining REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS deep_resource TEXT;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS deep_reserves_total REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS deep_reserves_remaining REAL;
ALTER TABLE tiles ADD COLUMN IF NOT EXISTS discovery_stage_completed INT NOT NULL DEFAULT 1;

-- New table for active discoveries
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

-- Add resource_layer column to resource_fields
ALTER TABLE resource_fields ADD COLUMN IF NOT EXISTS resource_layer TEXT NOT NULL DEFAULT 'primary'
    CHECK (resource_layer IN ('primary', 'secondary', 'deep'));

-- Drop old unique constraint and create new one with resource_layer
ALTER TABLE resource_fields DROP CONSTRAINT IF EXISTS resource_fields_tile_id_server_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_fields_tile_layer
    ON resource_fields (tile_id, server_id, resource_layer);

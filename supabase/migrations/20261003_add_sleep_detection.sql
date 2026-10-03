-- ============================================
-- Migration: Add Sleep Detection Support
-- Extends classroom_telemetry & pedagogical_insights
-- ============================================

-- 1. Add sleep_detected_count to classroom_telemetry
ALTER TABLE classroom_telemetry
  ADD COLUMN IF NOT EXISTS sleep_detected_count INT NOT NULL DEFAULT 0;

-- 2. Expand insight_type CHECK constraint to include 'sleeping'
-- Must drop + recreate the constraint (ALTER CHECK not supported in PG)
DO $$ BEGIN
  ALTER TABLE pedagogical_insights
    DROP CONSTRAINT IF EXISTS pedagogical_insights_insight_type_check;
  ALTER TABLE pedagogical_insights
    ADD CONSTRAINT pedagogical_insights_insight_type_check
    CHECK (insight_type IN ('participation', 'mobility', 'group_work', 'pacing', 'sleeping'));
END $$;

-- 3. Add composite index for fast sleep-alert queries
CREATE INDEX IF NOT EXISTS idx_telemetry_sleep_alerts
  ON classroom_telemetry(session_id, sleep_detected_count)
  WHERE sleep_detected_count > 0;

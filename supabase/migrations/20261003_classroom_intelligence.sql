-- ============================================
-- Migration: AI Classroom Intelligence Telemetry & Insights
-- Idempotent Supabase PostgreSQL Migration
-- ============================================

-- 1. Ensure uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CLASSROOM_DEVICES
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'edge_camera', -- 'edge_camera', 'mobile_ip_cam', 'laptop_webcam'
    api_secret_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_devices_class ON classroom_devices(classroom_id);

-- ============================================
-- 3. CLASSROOM_TELEMETRY
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    timestamp_bucket TIMESTAMPTZ NOT NULL,
    frame_sequence BIGINT DEFAULT 0,
    detected_students_count INT NOT NULL DEFAULT 0,
    sitting_count INT NOT NULL DEFAULT 0,
    standing_count INT NOT NULL DEFAULT 0,
    hand_raise_count INT NOT NULL DEFAULT 0,
    desk_focused_count INT NOT NULL DEFAULT 0,
    active_clusters_count INT NOT NULL DEFAULT 0,
    teacher_zone TEXT, -- 'front_center', 'front_left', 'front_right', 'aisle', 'back'
    spatial_distribution_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_session_bucket 
    ON classroom_telemetry(session_id, timestamp_bucket DESC);

-- ============================================
-- 4. PEDAGOGICAL_INSIGHTS
-- ============================================
CREATE TABLE IF NOT EXISTS pedagogical_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    phase_start_time TIMESTAMPTZ,
    phase_end_time TIMESTAMPTZ,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('participation', 'mobility', 'group_work', 'pacing')),
    observation_summary TEXT NOT NULL,
    pedagogical_prompt TEXT NOT NULL,
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
    is_reviewed_by_teacher BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedagogical_insights_session 
    ON pedagogical_insights(session_id);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE classroom_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Admin can manage classroom_devices" ON classroom_devices;
  DROP POLICY IF EXISTS "Admin can manage classroom_telemetry" ON classroom_telemetry;
  DROP POLICY IF EXISTS "Teachers can view own session telemetry" ON classroom_telemetry;
  DROP POLICY IF EXISTS "Admin can manage pedagogical_insights" ON pedagogical_insights;
  DROP POLICY IF EXISTS "Teachers can view own session pedagogical_insights" ON pedagogical_insights;
  DROP POLICY IF EXISTS "Admin can manage school_settings" ON school_settings;
  DROP POLICY IF EXISTS "Users can read school_settings" ON school_settings;
END $$;

-- CLASSROOM_DEVICES
CREATE POLICY "Admin can manage classroom_devices"
  ON classroom_devices FOR ALL
  USING (get_user_role() = 'admin');

-- CLASSROOM_TELEMETRY
CREATE POLICY "Admin can manage classroom_telemetry"
  ON classroom_telemetry FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can view own session telemetry"
  ON classroom_telemetry FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM attendance_sessions
      WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
    )
  );

-- PEDAGOGICAL_INSIGHTS
CREATE POLICY "Admin can manage pedagogical_insights"
  ON pedagogical_insights FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can view own session pedagogical_insights"
  ON pedagogical_insights FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM attendance_sessions
      WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
    )
  );

-- SCHOOL_SETTINGS
CREATE POLICY "Admin can manage school_settings"
  ON school_settings FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can read school_settings"
  ON school_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- Migration: Smart AI Cognitive Memory & Study Notes
-- Supports:
-- 1. Student Personal Study Notes (Pin from Smart AI Socratic Dialog)
-- 2. Student AI Long-Term Cognitive Profile (Personalized Learning Strategy)
-- 3. Student Cognitive Episodic Memories (Cross-Session & Telemetry Insights)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. STUDENT_STUDY_NOTES
-- ============================================
CREATE TABLE IF NOT EXISTS student_study_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES material_topics(id) ON DELETE CASCADE,
    material_id UUID REFERENCES course_materials(id) ON DELETE CASCADE,
    note_content TEXT NOT NULL,
    highlighted_text TEXT,
    socratic_context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_study_notes_student ON student_study_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_study_notes_topic ON student_study_notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_student_study_notes_material ON student_study_notes(material_id);

-- ============================================
-- 2. STUDENT_AI_PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS student_ai_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    learning_persona TEXT DEFAULT 'balanced', -- 'visual_analogy', 'logical_math', 'balanced', 'step_by_step'
    master_summary TEXT,
    weak_concepts JSONB DEFAULT '[]'::jsonb,
    mastered_concepts JSONB DEFAULT '[]'::jsonb,
    pacing_rate NUMERIC(3,2) DEFAULT 1.00,
    total_socratic_sessions INT DEFAULT 0,
    defense_success_rate NUMERIC(5,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_ai_profiles_student ON student_ai_profiles(student_id);

-- ============================================
-- 3. STUDENT_COGNITIVE_MEMORIES
-- ============================================
CREATE TABLE IF NOT EXISTS student_cognitive_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'notebook_session', -- 'physical_telemetry', 'notebook_session', 'defense'
    key_insight TEXT NOT NULL,
    emotional_state TEXT DEFAULT 'neutral', -- 'confident', 'confused', 'fatigued', 'curious'
    topic_reference TEXT,
    importance_weight INT DEFAULT 5 CHECK (importance_weight BETWEEN 1 AND 10),
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_cognitive_memories_student ON student_cognitive_memories(student_id);
CREATE INDEX IF NOT EXISTS idx_student_cognitive_memories_resolved ON student_cognitive_memories(is_resolved);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE student_study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_ai_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_cognitive_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own study notes"
    ON student_study_notes FOR ALL TO authenticated
    USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()))
    WITH CHECK (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Teachers and admins view student notes"
    ON student_study_notes FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Students read own AI profile"
    ON student_ai_profiles FOR SELECT TO authenticated
    USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Service and teachers manage student AI profiles"
    ON student_ai_profiles FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Students read own cognitive memories"
    ON student_cognitive_memories FOR SELECT TO authenticated
    USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Service and teachers manage cognitive memories"
    ON student_cognitive_memories FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

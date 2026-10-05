-- ============================================
-- Migration: Smart LMS & NotebookLM Platform
-- Supports:
-- 1. Closed-Loop Telemetry to Notebook (Korelasi Kamera Kelas ke Materi)
-- 2. Assignments & Socratic Oral Defense (Integritas Tugas Siswa)
-- 3. Dynamic Interactive Concept Graph (Peta Konsep Hidup)
-- 4. Exam Readiness & Weak-Spot Radar (Radar Kesiapan Ujian)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. COURSE_MATERIALS (Materi Modul Guru)
-- ============================================
CREATE TABLE IF NOT EXISTS course_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'application/pdf', -- 'pdf', 'docx', 'pptx', 'markdown'
    file_size_bytes BIGINT DEFAULT 0,
    page_count INT DEFAULT 1,
    ai_summary TEXT,
    ai_status TEXT NOT NULL DEFAULT 'ready' CHECK (ai_status IN ('processing', 'ready', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_materials_subject ON course_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_class ON course_materials(class_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_teacher ON course_materials(teacher_id);

-- ============================================
-- 2. MATERIAL_TOPICS (Bab & Rentang Halaman)
-- Termasuk Flag "Zona Kritis" dari Telemetri Kamera Kelas
-- ============================================
CREATE TABLE IF NOT EXISTS material_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    topic_order INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    page_start INT NOT NULL DEFAULT 1,
    page_end INT NOT NULL DEFAULT 1,
    key_concepts JSONB DEFAULT '[]'::jsonb, -- Array of string concepts
    avg_confusion_score NUMERIC(5,2) DEFAULT 0.00, -- 0 to 100%
    inattention_event_count INT DEFAULT 0,
    is_critical_zone BOOLEAN DEFAULT false, -- True jika di kelas terdeteksi drop atensi/kebingungan massal
    ai_socratic_prompt TEXT, -- Panduan bagi AI untuk membedah konsep sulit ini
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_topics_material ON material_topics(material_id);
CREATE INDEX IF NOT EXISTS idx_material_topics_critical ON material_topics(is_critical_zone);

-- ============================================
-- 3. MATERIAL_TELEMETRY_LINKS
-- Korelasi Sesi Kelas Kamera Fisik ke Bab Materi
-- ============================================
CREATE TABLE IF NOT EXISTS material_telemetry_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES material_topics(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    observed_drop_percentage NUMERIC(5,2) DEFAULT 0.00,
    ai_correlation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_links_topic ON material_telemetry_links(topic_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_links_session ON material_telemetry_links(session_id);

-- ============================================
-- 4. ASSIGNMENTS (Tugas Guru)
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    material_id UUID REFERENCES course_materials(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    instructions TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    max_score INT DEFAULT 100,
    submission_format TEXT NOT NULL DEFAULT 'any' CHECK (submission_format IN ('pdf', 'text', 'any')),
    rubric_guidelines JSONB DEFAULT '[]'::jsonb,
    is_oral_defense_required BOOLEAN DEFAULT true, -- Wajib melewati micro-defense AI sebelum submit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);

-- ============================================
-- 5. ASSIGNMENT_SUBMISSIONS (Pengumpulan Siswa)
-- ============================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    file_url TEXT,
    text_content TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'defense_passed', 'submitted', 'graded', 'returned')),
    oral_defense_passed BOOLEAN DEFAULT false,
    oral_defense_score NUMERIC(5,2) DEFAULT 0.00,
    ai_pre_score NUMERIC(5,2),
    ai_feedback TEXT,
    teacher_score NUMERIC(5,2),
    teacher_notes TEXT,
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_student_assignment UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);

-- ============================================
-- 6. ORAL_DEFENSE_SESSIONS (Micro-Defense AI)
-- Menguji Pemahaman Siswa dari Tugas yang Dibuat
-- ============================================
CREATE TABLE IF NOT EXISTS oral_defense_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, question, target_claim, expected_keywords }
    responses JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { question_id, student_answer, audio_url, evaluation, score }
    overall_understanding_score NUMERIC(5,2) DEFAULT 0.00, -- 0 to 100
    integrity_verdict TEXT DEFAULT 'high_understanding' CHECK (integrity_verdict IN ('high_understanding', 'assisted_learning', 'inconsistent_logic', 'suspected_copy_paste')),
    defense_summary TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_defense_submission ON oral_defense_sessions(submission_id);

-- ============================================
-- 7. CONCEPT_NODES & CONCEPT_EDGES (Peta Konsep Hidup)
-- Knowledge Graph Interaktif
-- ============================================
CREATE TABLE IF NOT EXISTS concept_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    material_id UUID REFERENCES course_materials(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'concept', -- 'chapter', 'concept', 'formula', 'methodology'
    summary TEXT,
    difficulty_level INT DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    reference_page INT DEFAULT 1,
    coordinates_hint JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_nodes_subject ON concept_nodes(subject_id);
CREATE INDEX IF NOT EXISTS idx_concept_nodes_material ON concept_nodes(material_id);

CREATE TABLE IF NOT EXISTS concept_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL DEFAULT 'prerequisite_of' CHECK (relation_type IN ('prerequisite_of', 'relates_to', 'part_of', 'applies_to')),
    strength NUMERIC(3,2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_concept_edge UNIQUE (source_node_id, target_node_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_concept_edges_source ON concept_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_target ON concept_edges(target_node_id);

-- ============================================
-- 8. STUDENT_CONCEPT_MASTERY (Radar Kesiapan Ujian & Titik Lemah)
-- ============================================
CREATE TABLE IF NOT EXISTS student_concept_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concept_nodes(id) ON DELETE CASCADE,
    mastery_score NUMERIC(5,2) NOT NULL DEFAULT 50.00, -- 0 to 100
    practice_count INT DEFAULT 0,
    last_evaluated_at TIMESTAMPTZ DEFAULT now(),
    needs_remediation BOOLEAN DEFAULT false,
    recommended_action TEXT,
    CONSTRAINT uq_student_concept UNIQUE (student_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_student ON student_concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_mastery_weak ON student_concept_mastery(needs_remediation);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_telemetry_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oral_defense_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_concept_mastery ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read on materials, topics, assignments, concepts
CREATE POLICY "Public read for authenticated users on course materials"
    ON course_materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public read for authenticated users on material topics"
    ON material_topics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public read for authenticated users on assignments"
    ON assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public read for authenticated users on concept nodes"
    ON concept_nodes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public read for authenticated users on concept edges"
    ON concept_edges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students manage own submissions"
    ON assignment_submissions FOR ALL TO authenticated
    USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()))
    WITH CHECK (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Teachers and admins manage submissions"
    ON assignment_submissions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Teachers and admins manage course materials"
    ON course_materials FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Teachers and admins manage assignments"
    ON assignments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Students read and update own concept mastery"
    ON student_concept_mastery FOR ALL TO authenticated
    USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()))
    WITH CHECK (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

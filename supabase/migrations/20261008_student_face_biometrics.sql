-- ==============================================================================
-- MIGRATION: STUDENT FACE BIOMETRICS & ROSTER EMBEDDINGS (P4 ENTERPRISE)
-- ==============================================================================
-- Menyimpan vektor biometrik wajah siswa (128-d atau 512-d) dari hasil scan profil,
-- terikat langsung dengan foreign key student_id dan nis definitif.

CREATE TABLE IF NOT EXISTS student_face_biometrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  quality_score NUMERIC(5, 2) DEFAULT 98.50,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_student_face_biometrics_student UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_face_biometrics_student_id 
  ON student_face_biometrics(student_id);

-- RLS Policies
ALTER TABLE student_face_biometrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access to student_face_biometrics'
  ) THEN
    CREATE POLICY "Allow service_role full access to student_face_biometrics"
      ON student_face_biometrics
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow students to view their own biometric record'
  ) THEN
    CREATE POLICY "Allow students to view their own biometric record"
      ON student_face_biometrics
      FOR SELECT
      TO authenticated
      USING (
        student_id IN (
          SELECT id FROM students WHERE profile_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow students to upsert their own biometric record'
  ) THEN
    CREATE POLICY "Allow students to upsert their own biometric record"
      ON student_face_biometrics
      FOR ALL
      TO authenticated
      USING (
        student_id IN (
          SELECT id FROM students WHERE profile_id = auth.uid()
        )
      )
      WITH CHECK (
        student_id IN (
          SELECT id FROM students WHERE profile_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow teachers to read class student biometrics'
  ) THEN
    CREATE POLICY "Allow teachers to read class student biometrics"
      ON student_face_biometrics
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
      );
  END IF;
END $$;

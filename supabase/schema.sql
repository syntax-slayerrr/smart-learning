-- ============================================
-- AbsenSMK — Complete Database Schema (Idempotent)
-- Safe to run multiple times in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- 2. CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2025/2026',
  homeroom_teacher_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);

-- ============================================
-- 3. TEACHERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nip TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teachers_profile_id ON teachers(profile_id);

-- Add foreign key for classes.homeroom_teacher_id (skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_classes_homeroom_teacher'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT fk_classes_homeroom_teacher
      FOREIGN KEY (homeroom_teacher_id) REFERENCES teachers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nis TEXT NOT NULL UNIQUE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_nis ON students(nis);

-- ============================================
-- 5. PARENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_wa TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parents_profile_id ON parents(profile_id);

-- ============================================
-- 6. CLASS_STUDENTS (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);

-- ============================================
-- 7. STUDENT_PARENTS (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS student_parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('ayah', 'ibu', 'wali')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parents_student_id ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id ON student_parents(parent_id);

-- ============================================
-- 8. ATTENDANCE_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_start_time TEXT, -- Stores "HH:mm" from schedule
  verification_code TEXT, -- 4-digit code written on the whiteboard
  qr_token TEXT UNIQUE NOT NULL,
  qr_expires_at TIMESTAMPTZ NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  teacher_present_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher_id ON attendance_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_token ON attendance_sessions(qr_token);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON attendance_sessions(status);

-- ============================================
-- 9. ATTENDANCE_RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'sick', 'excused', 'absent')),
  scanned_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

-- ============================================
-- 10. SCHEDULES TABLE (For Automation)
-- ============================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0: Sun, 1: Mon, ...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_class_day ON schedules(class_id, day_of_week);

-- ============================================
-- 11. HOLIDAYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  holiday_date DATE NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- ============================================
-- 12. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_parent_id ON notifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- ============================================
-- 11. AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  address TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION DEFAULT -6.1754, -- Default Jakarta/Indo
  longitude DOUBLE PRECISION DEFAULT 106.8272,
  radius_meters INTEGER DEFAULT 100, -- Default radius 100 meter
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- 12. FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- DROP existing policies first (idempotent)
-- ============================================
DO $$ BEGIN
  -- PROFILES
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admin can manage profiles" ON profiles;
  DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  -- STUDENTS
  DROP POLICY IF EXISTS "Admin can manage students" ON students;
  DROP POLICY IF EXISTS "Teachers can view students" ON students;
  DROP POLICY IF EXISTS "Students can view own record" ON students;
  -- TEACHERS
  DROP POLICY IF EXISTS "Admin can manage teachers" ON teachers;
  DROP POLICY IF EXISTS "Teachers can view own record" ON teachers;
  -- PARENTS
  DROP POLICY IF EXISTS "Admin can manage parents" ON parents;
  DROP POLICY IF EXISTS "Parents can view own record" ON parents;
  -- CLASSES
  DROP POLICY IF EXISTS "Admin can manage classes" ON classes;
  DROP POLICY IF EXISTS "Teachers can view classes" ON classes;
  DROP POLICY IF EXISTS "Students can view classes" ON classes;
  -- CLASS_STUDENTS
  DROP POLICY IF EXISTS "Admin can manage class_students" ON class_students;
  DROP POLICY IF EXISTS "Teachers can view class_students" ON class_students;
  -- STUDENT_PARENTS
  DROP POLICY IF EXISTS "Admin can manage student_parents" ON student_parents;
  DROP POLICY IF EXISTS "Parents can view own relations" ON student_parents;
  -- ATTENDANCE_SESSIONS
  DROP POLICY IF EXISTS "Admin can manage attendance_sessions" ON attendance_sessions;
  DROP POLICY IF EXISTS "Teachers can manage own sessions" ON attendance_sessions;
  DROP POLICY IF EXISTS "Students can view active sessions" ON attendance_sessions;
  -- ATTENDANCE_RECORDS
  DROP POLICY IF EXISTS "Admin can manage attendance_records" ON attendance_records;
  DROP POLICY IF EXISTS "Teachers can manage records for own sessions" ON attendance_records;
  DROP POLICY IF EXISTS "Students can view own records" ON attendance_records;
  DROP POLICY IF EXISTS "Students can insert own attendance" ON attendance_records;
  DROP POLICY IF EXISTS "Parents can view children records" ON attendance_records;
  -- NOTIFICATIONS
  DROP POLICY IF EXISTS "Admin can manage notifications" ON notifications;
  DROP POLICY IF EXISTS "Parents can view own notifications" ON notifications;
  -- AUDIT_LOGS
  DROP POLICY IF EXISTS "Admin can view audit_logs" ON audit_logs;
  DROP POLICY IF EXISTS "System can insert audit_logs" ON audit_logs;
END $$;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage profiles"
  ON profiles FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can view all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() = 'teacher');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- STUDENTS policies
CREATE POLICY "Admin can manage students"
  ON students FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can view students"
  ON students FOR SELECT
  USING (get_user_role() = 'teacher');

CREATE POLICY "Students can view own record"
  ON students FOR SELECT
  USING (profile_id = auth.uid());

-- TEACHERS policies
CREATE POLICY "Admin can manage teachers"
  ON teachers FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can view own record"
  ON teachers FOR SELECT
  USING (profile_id = auth.uid());

-- PARENTS policies
CREATE POLICY "Admin can manage parents"
  ON parents FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Parents can view own record"
  ON parents FOR SELECT
  USING (profile_id = auth.uid());

-- CLASSES policies
CREATE POLICY "Admin can manage classes"
  ON classes FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can view classes"
  ON classes FOR SELECT
  USING (get_user_role() = 'teacher');

CREATE POLICY "Students can view classes"
  ON classes FOR SELECT
  USING (get_user_role() = 'student');

-- CLASS_STUDENTS policies
CREATE POLICY "Admin can manage class_students"
  ON class_students FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can view class_students"
  ON class_students FOR SELECT
  USING (get_user_role() = 'teacher');

-- STUDENT_PARENTS policies
CREATE POLICY "Admin can manage student_parents"
  ON student_parents FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Parents can view own relations"
  ON student_parents FOR SELECT
  USING (
    parent_id IN (SELECT id FROM parents WHERE profile_id = auth.uid())
  );

-- ATTENDANCE_SESSIONS policies
CREATE POLICY "Admin can manage attendance_sessions"
  ON attendance_sessions FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can manage own sessions"
  ON attendance_sessions FOR ALL
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can view active sessions"
  ON attendance_sessions FOR SELECT
  USING (get_user_role() = 'student' AND status = 'active');

-- ATTENDANCE_RECORDS policies
CREATE POLICY "Admin can manage attendance_records"
  ON attendance_records FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Teachers can manage records for own sessions"
  ON attendance_records FOR ALL
  USING (
    session_id IN (
      SELECT id FROM attendance_sessions
      WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Students can view own records"
  ON attendance_records FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Students can insert own attendance"
  ON attendance_records FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

CREATE POLICY "Parents can view children records"
  ON attendance_records FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM student_parents
      WHERE parent_id IN (SELECT id FROM parents WHERE profile_id = auth.uid())
    )
  );

-- SCHEDULES policies
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage schedules" ON schedules;
CREATE POLICY "Admin can manage schedules"
  ON schedules FOR ALL
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Teachers can view schedules" ON schedules;
CREATE POLICY "Teachers can view schedules"
  ON schedules FOR SELECT
  USING (get_user_role() = 'teacher');

DROP POLICY IF EXISTS "Students can view schedules" ON schedules;
CREATE POLICY "Students can view schedules"
  ON schedules FOR SELECT
  USING (get_user_role() = 'student');

-- NOTIFICATIONS policies
CREATE POLICY "Admin can manage notifications"
  ON notifications FOR ALL
  USING (get_user_role() = 'admin');

CREATE POLICY "Parents can view own notifications"
  ON notifications FOR SELECT
  USING (
    parent_id IN (SELECT id FROM parents WHERE profile_id = auth.uid())
  );

-- AUDIT_LOGS policies
CREATE POLICY "Admin can view audit_logs"
  ON audit_logs FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "System can insert audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 14. SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);

-- RLS for subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage subjects" ON subjects;
CREATE POLICY "Admin can manage subjects"
  ON subjects FOR ALL
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Teachers can view subjects" ON subjects;
CREATE POLICY "Teachers can view subjects"
  ON subjects FOR SELECT
  USING (get_user_role() = 'teacher');

DROP POLICY IF EXISTS "Students can view subjects" ON subjects;
CREATE POLICY "Students can view subjects"
  ON subjects FOR SELECT
  USING (get_user_role() = 'student');

-- ============================================
-- 14.5. TEACHER_SUBJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_id ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage teacher_subjects" ON teacher_subjects;
CREATE POLICY "Admin can manage teacher_subjects"
  ON teacher_subjects FOR ALL
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Teachers can view teacher_subjects" ON teacher_subjects;
CREATE POLICY "Teachers can view teacher_subjects"
  ON teacher_subjects FOR SELECT
  USING (get_user_role() = 'teacher');

-- ============================================
-- 15. SCHOOL_SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT DEFAULT 'SMK Negeri 1',
    address TEXT,
    phone TEXT,
    latitude DOUBLE PRECISION DEFAULT -6.1754, 
    longitude DOUBLE PRECISION DEFAULT 106.8272,
    radius_meters INTEGER DEFAULT 100,
    max_students_per_device INTEGER DEFAULT 1,
    late_tolerance_minutes INTEGER DEFAULT 15,
    wa_token TEXT,
    wa_provider TEXT DEFAULT 'fonnte',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default settings if empty
INSERT INTO school_settings (school_name)
SELECT 'SMK Negeri 1'
WHERE NOT EXISTS (SELECT 1 FROM school_settings);

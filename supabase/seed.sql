-- ============================================
-- AbsenSMK — Development Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================
-- IMPORTANT: This script creates test users via Supabase Auth.
-- Passwords default to 'password123' for all test accounts.
-- DO NOT run this in production without modifying credentials.
-- ============================================

-- ============================================
-- 1. CREATE TEST USERS VIA SUPABASE AUTH
-- The handle_new_user() trigger will auto-create profiles.
-- ============================================

-- Admin account
SELECT supabase_admin_create_user(
  'admin@absensmk.test',
  'password123',
  '{"full_name": "Administrator Sekolah", "role": "admin"}'
);

-- Teacher accounts
SELECT supabase_admin_create_user(
  'guru.matematika@absensmk.test',
  'password123',
  '{"full_name": "Budi Santoso", "role": "teacher"}'
);

SELECT supabase_admin_create_user(
  'guru.bahasa@absensmk.test',
  'password123',
  '{"full_name": "Siti Rahayu", "role": "teacher"}'
);

-- Student accounts
SELECT supabase_admin_create_user(
  'siswa.andi@absensmk.test',
  'password123',
  '{"full_name": "Andi Pratama", "role": "student"}'
);

SELECT supabase_admin_create_user(
  'siswa.budi@absensmk.test',
  'password123',
  '{"full_name": "Budi Setiawan", "role": "student"}'
);

SELECT supabase_admin_create_user(
  'siswa.citra@absensmk.test',
  'password123',
  '{"full_name": "Citra Dewi", "role": "student"}'
);

-- Parent accounts
SELECT supabase_admin_create_user(
  'ortu.andi@absensmk.test',
  'password123',
  '{"full_name": "Pak Pratama", "role": "parent"}'
);

SELECT supabase_admin_create_user(
  'ortu.budi@absensmk.test',
  'password123',
  '{"full_name": "Ibu Setiawan", "role": "parent"}'
);

-- ============================================
-- NOTE: If `supabase_admin_create_user` is not available
-- in your Supabase version, create users manually via the
-- Supabase Dashboard (Authentication → Users → Add User)
-- with these emails and metadata, then run the SQL below.
-- ============================================

-- ============================================
-- 2. ALTERNATIVE: Manual Seed (if users created via Dashboard)
-- Uncomment and run AFTER creating users manually.
-- Replace the UUIDs below with real auth.users IDs.
-- ============================================

/*
-- Wait for trigger-created profiles, then insert role data:

-- Get profile IDs
DO $$
DECLARE
  admin_id UUID;
  teacher1_id UUID;
  teacher2_id UUID;
  student1_id UUID;
  student2_id UUID;
  student3_id UUID;
  parent1_id UUID;
  parent2_id UUID;
  subject1_id UUID;
  subject2_id UUID;
  teacher1_record_id UUID;
  teacher2_record_id UUID;
  student1_record_id UUID;
  student2_record_id UUID;
  student3_record_id UUID;
  parent1_record_id UUID;
  parent2_record_id UUID;
  class1_id UUID;
  class2_id UUID;
BEGIN
  -- Fetch profile IDs by email
  SELECT id INTO admin_id FROM profiles WHERE email = 'admin@absensmk.test';
  SELECT id INTO teacher1_id FROM profiles WHERE email = 'guru.matematika@absensmk.test';
  SELECT id INTO teacher2_id FROM profiles WHERE email = 'guru.bahasa@absensmk.test';
  SELECT id INTO student1_id FROM profiles WHERE email = 'siswa.andi@absensmk.test';
  SELECT id INTO student2_id FROM profiles WHERE email = 'siswa.budi@absensmk.test';
  SELECT id INTO student3_id FROM profiles WHERE email = 'siswa.citra@absensmk.test';
  SELECT id INTO parent1_id FROM profiles WHERE email = 'ortu.andi@absensmk.test';
  SELECT id INTO parent2_id FROM profiles WHERE email = 'ortu.budi@absensmk.test';

  -- Create subjects
  INSERT INTO subjects (id, name, code)
  VALUES
    (uuid_generate_v4(), 'Matematika', 'MAT'),
    (uuid_generate_v4(), 'Bahasa Indonesia', 'BIN');
  
  SELECT id INTO subject1_id FROM subjects WHERE code = 'MAT';
  SELECT id INTO subject2_id FROM subjects WHERE code = 'BIN';

  -- Create teachers
  INSERT INTO teachers (id, profile_id, nip)
  VALUES
    (uuid_generate_v4(), teacher1_id, '198501012010011001'),
    (uuid_generate_v4(), teacher2_id, '199002152015022001');

  SELECT id INTO teacher1_record_id FROM teachers WHERE profile_id = teacher1_id;
  SELECT id INTO teacher2_record_id FROM teachers WHERE profile_id = teacher2_id;

  -- Link teachers to subjects
  INSERT INTO teacher_subjects (teacher_id, subject_id)
  VALUES
    (teacher1_record_id, subject1_id),
    (teacher2_record_id, subject2_id);

  -- Create classes
  INSERT INTO classes (id, name, grade, academic_year, homeroom_teacher_id)
  VALUES
    (uuid_generate_v4(), 'X RPL 1', '10', '2025/2026', teacher1_record_id),
    (uuid_generate_v4(), 'XI RPL 1', '11', '2025/2026', teacher2_record_id);

  SELECT id INTO class1_id FROM classes WHERE name = 'X RPL 1';
  SELECT id INTO class2_id FROM classes WHERE name = 'XI RPL 1';

  -- Create students
  INSERT INTO students (id, profile_id, nis, class_id)
  VALUES
    (uuid_generate_v4(), student1_id, '20250001', class1_id),
    (uuid_generate_v4(), student2_id, '20250002', class1_id),
    (uuid_generate_v4(), student3_id, '20250003', class2_id);

  SELECT id INTO student1_record_id FROM students WHERE profile_id = student1_id;
  SELECT id INTO student2_record_id FROM students WHERE profile_id = student2_id;
  SELECT id INTO student3_record_id FROM students WHERE profile_id = student3_id;

  -- Add students to class_students junction
  INSERT INTO class_students (class_id, student_id)
  VALUES
    (class1_id, student1_record_id),
    (class1_id, student2_record_id),
    (class2_id, student3_record_id);

  -- Create parents
  INSERT INTO parents (id, profile_id, phone_wa)
  VALUES
    (uuid_generate_v4(), parent1_id, '6281234567890'),
    (uuid_generate_v4(), parent2_id, '6281234567891');

  SELECT id INTO parent1_record_id FROM parents WHERE profile_id = parent1_id;
  SELECT id INTO parent2_record_id FROM parents WHERE profile_id = parent2_id;

  -- Link parents to students
  INSERT INTO student_parents (student_id, parent_id, relationship)
  VALUES
    (student1_record_id, parent1_record_id, 'ayah'),
    (student2_record_id, parent2_record_id, 'ibu');

  RAISE NOTICE 'Seed data created successfully!';
  RAISE NOTICE 'Admin: admin@absensmk.test / password123';
  RAISE NOTICE 'Teacher 1: guru.matematika@absensmk.test / password123';
  RAISE NOTICE 'Teacher 2: guru.bahasa@absensmk.test / password123';
  RAISE NOTICE 'Student 1: siswa.andi@absensmk.test / password123';
  RAISE NOTICE 'Student 2: siswa.budi@absensmk.test / password123';
  RAISE NOTICE 'Student 3: siswa.citra@absensmk.test / password123';
  RAISE NOTICE 'Parent 1: ortu.andi@absensmk.test / password123';
  RAISE NOTICE 'Parent 2: ortu.budi@absensmk.test / password123';
END $$;
*/

-- ============================================
-- 3. VERIFICATION QUERIES
-- Run these to confirm schema + seed integrity
-- ============================================

-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

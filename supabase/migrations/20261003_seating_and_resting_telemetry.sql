-- ============================================
-- Migration: Seating Layout, Seat Binding, and Prolonged Resting Telemetry
-- ============================================

-- 1. Add seating_layout to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS seating_layout JSONB DEFAULT '{"rows": 4, "cols": 8, "grid_prefix": "Meja"}'::jsonb;

-- 2. Add seat_code and student engagement metrics to attendance_records
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS seat_code TEXT,
ADD COLUMN IF NOT EXISTS resting_posture_minutes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS hand_raise_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_notes TEXT;

-- 3. Add head_down_resting_count to classroom_telemetry
ALTER TABLE classroom_telemetry
ADD COLUMN IF NOT EXISTS head_down_resting_count INT DEFAULT 0;

-- 4. Create index for fast seating and student record queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_seat 
ON attendance_records(session_id, seat_code);

-- 5. Comments for documentation
COMMENT ON COLUMN attendance_records.seat_code IS 'Kode meja tempat duduk siswa di kelas (contoh: A-1, B-3)';
COMMENT ON COLUMN attendance_records.resting_posture_minutes IS 'Durasi menit siswa terpantau telungkup/beristirahat di atas meja';
COMMENT ON COLUMN attendance_records.hand_raise_count IS 'Total frekuensi siswa mengangkat tangan pada sesi tersebut';
COMMENT ON COLUMN classroom_telemetry.head_down_resting_count IS 'Jumlah siswa yang terdeteksi telungkup di meja pada bucket waktu ini';

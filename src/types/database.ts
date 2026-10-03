// ============================================
// Database Types — AbsenSMK
// Mirrors the Supabase PostgreSQL schema
// ============================================

export type UserRole = "admin" | "teacher" | "student" | "parent";

export type AttendanceStatus =
  | "present"
  | "late"
  | "sick"
  | "excused"
  | "absent";

export type SessionStatus = "active" | "closed";

export type NotificationStatus = "pending" | "sent" | "failed";

// ============================================
// Core Tables
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  profile_id: string;
  nis: string; // Nomor Induk Siswa
  class_id: string | null;
  created_at: string;
  // Relations
  profile?: Profile;
  class?: SchoolClass;
}

export interface Teacher {
  id: string;
  profile_id: string;
  nip: string; // Nomor Induk Pegawai
  created_at: string;
  // Relations
  profile?: Profile;
  teacher_subjects?: TeacherSubject[];
}

export interface Parent {
  id: string;
  profile_id: string;
  phone_wa: string; // WhatsApp number
  created_at: string;
  // Relations
  profile?: Profile;
  children?: Student[];
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: string;
  academic_year: string;
  homeroom_teacher_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  homeroom_teacher?: Teacher;
  students?: Student[];
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

// ============================================
// Junction Tables
// ============================================

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  created_at: string;
  // Relations
  subject?: Subject;
  teacher?: Teacher;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  created_at: string;
}

export interface StudentParent {
  id: string;
  student_id: string;
  parent_id: string;
  relationship: string; // 'ayah', 'ibu', 'wali'
  created_at: string;
}

// ============================================
// Attendance Tables
// ============================================

export interface AttendanceSession {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  qr_token: string;
  qr_expires_at: string;
  session_date: string;
  status: SessionStatus;
  teacher_present_at?: string | null;
  created_at: string;
  // Relations
  teacher?: Teacher & { profile?: Profile };
  class?: SchoolClass;
  subject?: Subject;
  records?: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  scanned_at: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  // Relations
  session?: AttendanceSession;
  student?: Student & { profile?: Profile };
}

// ============================================
// Notification & Audit
// ============================================

export interface Notification {
  id: string;
  parent_id: string;
  student_id: string;
  attendance_record_id: string;
  message: string;
  status: NotificationStatus;
  sent_at: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number;
  page: number;
  limit: number;
}

// ============================================
// Dashboard Stats Types
// ============================================

export interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayAttendanceRate: number;
  todaySessions: number;
}

export interface TeacherStats {
  totalClasses: number;
  todaySessions: number;
  totalStudents: number;
  averageAttendance: number;
}

export interface StudentStats {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalSick: number;
  totalExcused: number;
  attendanceRate: number;
}

export interface ParentStats {
  childName: string;
  attendanceRate: number;
  totalPresent: number;
  totalAbsent: number;
  recentRecords: AttendanceRecord[];
}

// ============================================
// Classroom Intelligence Tables
// ============================================

export interface ClassroomDevice {
  id: string;
  classroom_id: string;
  device_name: string;
  device_type: "edge_camera" | "mobile_ip_cam" | "laptop_webcam";
  api_secret_hash: string;
  is_active: boolean;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassroomTelemetry {
  id: string;
  session_id: string;
  timestamp_bucket: string;
  frame_sequence: number;
  detected_students_count: number;
  sitting_count: number;
  standing_count: number;
  hand_raise_count: number;
  desk_focused_count: number;
  sleep_detected_count: number;
  active_clusters_count: number;
  teacher_zone: string | null;
  spatial_distribution_json: Record<string, unknown>;
  created_at: string;
}

export interface PedagogicalInsight {
  id: string;
  session_id: string;
  phase_start_time: string | null;
  phase_end_time: string | null;
  insight_type: "participation" | "mobility" | "group_work" | "pacing" | "sleeping";
  observation_summary: string;
  pedagogical_prompt: string;
  confidence_level: "low" | "medium" | "high";
  is_reviewed_by_teacher: boolean;
  created_at: string;
}


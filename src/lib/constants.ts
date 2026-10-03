// ============================================
// Application Constants — Smart Learning
// ============================================

export const APP_NAME = "Smart Learning";
export const APP_DESCRIPTION =
  "Next-Generation AI-Powered Smart Learning & Campus Ecosystem";

// QR Code Configuration
export const QR_EXPIRATION_MINUTES = 30;
export const QR_REFRESH_INTERVAL_MS = 5000; // 5 seconds

// Attendance Configuration
export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Hadir", color: "emerald" },
  { value: "late", label: "Terlambat", color: "amber" },
  { value: "sick", label: "Sakit", color: "blue" },
  { value: "excused", label: "Izin", color: "purple" },
  { value: "absent", label: "Tidak Hadir", color: "red" },
] as const;

// Role Configuration
export const ROLES = [
  { value: "admin", label: "Admin", path: "/admin" },
  { value: "teacher", label: "Guru", path: "/teacher" },
  { value: "student", label: "Siswa", path: "/student" },
  { value: "parent", label: "Orang Tua", path: "/parent" },
] as const;

// Navigation Items per Role
export const NAV_ITEMS = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
    { label: "Siswa", href: "/admin/students", icon: "Users" },
    { label: "Guru", href: "/admin/teachers", icon: "GraduationCap" },
    { label: "Kelas", href: "/admin/classes", icon: "School" },
    { label: "Mata Pelajaran", href: "/admin/subjects", icon: "BookOpen" },
    { label: "Jadwal Pelajaran", href: "/admin/schedules", icon: "Calendar" },
    { label: "Orang Tua", href: "/admin/parents", icon: "Users" },
    { label: "Absensi Siswa", href: "/admin/attendance", icon: "ClipboardCheck" },
    { label: "Absensi Guru", href: "/admin/attendance/teachers", icon: "ClipboardList" },
    { label: "Laporan", href: "/admin/reports", icon: "BarChart3" },
    { label: "Log Notifikasi", href: "/admin/notifications", icon: "Bell" },
    { label: "Pengaturan", href: "/admin/settings", icon: "Settings" },
    { label: "Profil", href: "/admin/profile", icon: "UserCircle" },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher", icon: "LayoutDashboard" },
    { label: "Scan QR", href: "/teacher/scan", icon: "QrCode" },
    { label: "Riwayat", href: "/teacher/history", icon: "History" },
    { label: "Rekap", href: "/teacher/recap", icon: "BarChart3" },
    { label: "Profil", href: "/teacher/profile", icon: "UserCircle" },
  ],
  student: [
    { label: "Dashboard", href: "/student", icon: "LayoutDashboard" },
    { label: "Scan QR", href: "/student/scan", icon: "QrCode" },
    { label: "Riwayat", href: "/student/history", icon: "History" },
    { label: "Profil", href: "/student/profile", icon: "UserCircle" },
  ],
  parent: [
    { label: "Dashboard", href: "/parent", icon: "LayoutDashboard" },
    { label: "Absensi Anak", href: "/parent/attendance", icon: "ClipboardCheck" },
    { label: "Riwayat", href: "/parent/history", icon: "History" },
    { label: "Notifikasi", href: "/parent/notifications", icon: "Bell" },
  ],
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Academic Year
export const CURRENT_ACADEMIC_YEAR = "2025/2026";

// Relationship Types
export const RELATIONSHIP_TYPES = [
  { value: "ayah", label: "Ayah" },
  { value: "ibu", label: "Ibu" },
  { value: "wali", label: "Wali" },
] as const;

// Grade Levels (SMK)
export const GRADE_LEVELS = [
  { value: "X", label: "Kelas X" },
  { value: "XI", label: "Kelas XI" },
  { value: "XII", label: "Kelas XII" },
] as const;

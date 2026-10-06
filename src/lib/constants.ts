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

// Navigation Items per Role with Semantic Categorization
export const NAV_ITEMS = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", group: "OPERASIONAL" },
    { label: "Pantauan Kelas", href: "/admin/camera-monitor", icon: "Video", group: "OPERASIONAL" },
    { label: "Absensi Siswa", href: "/admin/attendance", icon: "ClipboardCheck", group: "OPERASIONAL" },
    { label: "Absensi Guru", href: "/admin/attendance/teachers", icon: "ClipboardList", group: "OPERASIONAL" },
    { label: "Laporan & Rekap", href: "/admin/reports", icon: "BarChart3", group: "OPERASIONAL" },
    
    { label: "Kelas", href: "/admin/classes", icon: "School", group: "AKADEMIK & JADWAL" },
    { label: "Mata Pelajaran", href: "/admin/subjects", icon: "BookOpen", group: "AKADEMIK & JADWAL" },
    { label: "Jadwal Pelajaran", href: "/admin/schedules", icon: "Calendar", group: "AKADEMIK & JADWAL" },
    
    { label: "Direktori Siswa", href: "/admin/students", icon: "Users", group: "DATA MASTER" },
    { label: "Direktori Guru", href: "/admin/teachers", icon: "GraduationCap", group: "DATA MASTER" },
    { label: "Orang Tua / Wali", href: "/admin/parents", icon: "Users", group: "DATA MASTER" },
    
    { label: "Pemberitahuan", href: "/admin/notifications", icon: "Bell", group: "SISTEM" },
    { label: "Pengaturan", href: "/admin/settings", icon: "Settings", group: "SISTEM" },
    { label: "Profil Akun", href: "/admin/profile", icon: "UserCircle", group: "SISTEM" },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher", icon: "LayoutDashboard", group: "AKTIVITAS" },
    { label: "Bahan Ajar & Modul", href: "/teacher/materials", icon: "BookOpen", group: "PEMBELAJARAN" },
    { label: "Tugas & Uji Pemahaman", href: "/teacher/assignments", icon: "ClipboardList", group: "PEMBELAJARAN" },
    { label: "Scan QR Absensi", href: "/teacher/scan", icon: "QrCode", group: "AKTIVITAS" },
    { label: "Riwayat Sesi", href: "/teacher/history", icon: "History", group: "DATA KELAS" },
    { label: "Rekap Kehadiran", href: "/teacher/recap", icon: "BarChart3", group: "DATA KELAS" },
    { label: "Profil Guru", href: "/teacher/profile", icon: "UserCircle", group: "AKUN" },
  ],
  student: [
    { label: "Dashboard", href: "/student", icon: "LayoutDashboard", group: "UTAMA" },
    { label: "Buku Catatan Digital", href: "/student/notebook", icon: "BookOpen", group: "PEMBELAJARAN" },
    { label: "Tugas & Uji Pemahaman", href: "/student/assignments", icon: "ClipboardList", group: "PEMBELAJARAN" },
    { label: "Scan Kartu / QR", href: "/student/scan", icon: "QrCode", group: "UTAMA" },
    { label: "Riwayat Absensi", href: "/student/history", icon: "History", group: "CATATAN" },
    { label: "Profil Siswa", href: "/student/profile", icon: "UserCircle", group: "AKUN" },
  ],
  parent: [
    { label: "Pantauan Belajar Anak", href: "/parent", icon: "LayoutDashboard", group: "STATUS ANAK" },
    { label: "Kehadiran & Keaktifan", href: "/parent/attendance", icon: "ClipboardCheck", group: "STATUS ANAK" },
    { label: "Riwayat Bulanan", href: "/parent/history", icon: "History", group: "CATATAN" },
    { label: "Pemberitahuan", href: "/parent/notifications", icon: "Bell", group: "INFORMASI" },
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

// Grade Levels / Tingkat Pembelajaran
export const GRADE_LEVELS = [
  { value: "X", label: "Kelas X" },
  { value: "XI", label: "Kelas XI" },
  { value: "XII", label: "Kelas XII" },
] as const;

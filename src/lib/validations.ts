import { z } from "zod";

// ============================================
// Authentication Schemas
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email wajib diisi" })
    .email({ message: "Format email tidak valid" }),
  password: z
    .string()
    .min(6, { message: "Password minimal 6 karakter" }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================
// Student Schemas
// ============================================

export const studentSchema = z.object({
  full_name: z.string().min(2, { message: "Nama minimal 2 karakter" }),
  email: z.string().email({ message: "Format email tidak valid" }),
  nis: z.string().min(1, { message: "NIS wajib diisi" }),
  class_id: z.string().optional(),
  phone: z.string().optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;

// ============================================
// Teacher Schemas
// ============================================

export const teacherSchema = z.object({
  full_name: z.string().min(2, { message: "Nama minimal 2 karakter" }),
  email: z.string().email({ message: "Format email tidak valid" }),
  nip: z.string().min(1, { message: "NIP wajib diisi" }),
  subject_ids: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

export type TeacherFormData = z.infer<typeof teacherSchema>;

// ============================================
// Class Schemas
// ============================================

export const classSchema = z.object({
  name: z.string().min(1, { message: "Nama kelas wajib diisi" }),
  grade: z.string().min(1, { message: "Tingkat wajib dipilih" }),
  academic_year: z.string().min(1, { message: "Tahun ajaran wajib diisi" }),
  homeroom_teacher_id: z.string().optional(),
});

export type ClassFormData = z.infer<typeof classSchema>;

// ============================================
// Attendance Session Schemas
// ============================================

export const attendanceSessionSchema = z.object({
  class_id: z.string().min(1, { message: "Kelas wajib dipilih" }),
  subject_id: z.string().min(1, { message: "Mata pelajaran wajib dipilih" }),
  duration_minutes: z
    .number()
    .min(5, { message: "Durasi minimal 5 menit" })
    .max(120, { message: "Durasi maksimal 120 menit" })
    .default(30),
});

export type AttendanceSessionFormData = z.infer<
  typeof attendanceSessionSchema
>;

// ============================================
// Attendance Record Schemas
// ============================================

export const attendanceRecordSchema = z.object({
  session_id: z.string().min(1),
  student_id: z.string().min(1),
  status: z.enum(["present", "late", "sick", "excused", "absent"]),
  notes: z.string().optional(),
});

export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;

// ============================================
// Parent Schemas
// ============================================

export const parentSchema = z.object({
  full_name: z.string().min(2, { message: "Nama minimal 2 karakter" }),
  email: z.string().email({ message: "Format email tidak valid" }),
  phone_wa: z
    .string()
    .min(10, { message: "Nomor WhatsApp minimal 10 digit" }),
  student_id: z.string().min(1, { message: "Siswa wajib dipilih" }),
  relationship: z.enum(["ayah", "ibu", "wali"], {
    message: "Hubungan wajib dipilih",
  }),
});

export type ParentFormData = z.infer<typeof parentSchema>;

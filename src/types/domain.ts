/**
 * Domain Types & Enums for Smart Learning Enterprise System
 * Provides single source of truth for statuses, roles, and classroom states.
 */

export type UserRole = "admin" | "teacher" | "student" | "parent";

export type AttendanceStatus = "present" | "late" | "excused" | "sick" | "absent";

export type AttendanceMethod = "face" | "qr" | "manual" | "system";

export type SessionStatus = "active" | "closed" | "archived";

export type StudentPostureState =
  | "sitting"
  | "standing"
  | "raising_hand"
  | "writing"
  | "sleeping"
  | "unknown";

export type InteractionStatus =
  | "focused"
  | "distracted"
  | "participating"
  | "inactive";

export interface AttendanceRecordPayload {
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  scanned_at?: string;
  notes?: string;
  confidence?: number;
  method?: AttendanceMethod;
}

export interface TelemetrySummary {
  total: number;
  sitting: number;
  standing: number;
  hands_raised: number;
  desk_focused?: number;
  sleep_detected?: number;
  active_clusters?: number;
  teacher_zone?: string | null;
}

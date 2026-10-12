export interface NetworkCameraDevice {
  ip: string;
  port: number;
  url: string;
  name: string;
  isStreaming?: boolean;
  battery?: number;
  resolution?: string | null;
}

export interface CameraChannel {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  streamUrl: string;
  statusUrl: string;
  ipAddress: string;
  port: number;
  studentsCount: number;
  sittingCount: number;
  standingCount: number;
  handRaiseCount: number;
  sleepCount: number;
  isOnline: boolean;
  battery?: number;
  isCharging?: boolean;
}

export interface TelemetryPoint {
  id?: string;
  session_id?: string;
  timestamp_bucket: string;
  detected_students_count: number;
  sitting_count: number;
  standing_count: number;
  hand_raise_count: number;
  desk_focused_count: number;
  sleep_detected_count: number;
  active_clusters_count: number;
  teacher_zone?: string;
  spatial_distribution?: Record<string, unknown>;
  anonymized_tracks?: any[];
}

export interface DetectedSubject {
  id: string;
  anonymous_id: string;
  label: string;
  student_name?: string;
  is_recognized?: boolean;
  student_id?: string;
  seat_latched?: boolean;
  posture: "sitting" | "standing";
  activity: "attentive" | "writing" | "using_phone" | "distracted" | "sleep" | "hand_raised";
  action_text?: string;
  confidence: number;
  row: string;
  location: string;
  hand_raised?: boolean;
  sleep?: boolean;
  head_tilt_deg?: number;
  gaze_direction?: string;
  attention_score?: number;
}

export interface SchedulePeriod {
  period_number: number;
  schedule_id: string;
  start_time: string;   // "HH:mm"
  end_time: string;     // "HH:mm"
  subject_name: string;
  subject_code: string | null;
  teacher_name: string;
  teacher_nip: string | null;
  is_active: boolean;
}

export interface ScheduleContext {
  class_id?: string;
  class_name?: string;
  active: SchedulePeriod | null;
  active_period_number: number;
  total_periods: number;
  all_periods: SchedulePeriod[];
  server_time: string;
  day_of_week: number;
}

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

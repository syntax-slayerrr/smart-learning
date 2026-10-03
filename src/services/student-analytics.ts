import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================
// Student Analytics Service
// Centralized data layer for classroom intelligence
// ============================================

export interface StudentEngagementProfile {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  attendance_rate: number;
  total_sessions_attended: number;
  total_sessions: number;
  sleep_incidents: number;
  avg_participation_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  recent_sleep_sessions: { session_date: string; subject: string; count: number }[];
}

export interface SessionDynamicsData {
  session_id: string;
  subject_name: string;
  class_name: string;
  session_date: string;
  status: string;
  timeline: {
    timestamp: string;
    sitting: number;
    standing: number;
    hand_raises: number;
    desk_focused: number;
    sleep_detected: number;
    teacher_zone: string | null;
  }[];
  totals: {
    avg_students: number;
    total_hand_raises: number;
    total_sleep_incidents: number;
    avg_sitting_pct: number;
    avg_desk_focused_pct: number;
    peak_sleep_count: number;
  };
  insights: {
    id: string;
    type: string;
    summary: string;
    prompt: string;
    confidence: string;
    reviewed: boolean;
  }[];
}

export interface StudentRiskItem {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  attendance_rate: number;
  absent_count: number;
  sleep_incidents: number;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
}

export interface SchoolOverview {
  total_sessions_with_telemetry: number;
  total_sleep_incidents: number;
  avg_hand_raises_per_session: number;
  classes_with_highest_sleep: { class_name: string; count: number }[];
  at_risk_students: StudentRiskItem[];
  recent_sleep_alerts: {
    session_date: string;
    subject: string;
    class_name: string;
    sleep_count: number;
  }[];
}

// ============================================
// Compute risk level from composite score
// ============================================
function computeRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 0.75) return "critical";
  if (score >= 0.5) return "high";
  if (score >= 0.25) return "medium";
  return "low";
}

// ============================================
// Get session dynamics — timeline + insights
// ============================================
export async function getSessionDynamics(sessionId: string): Promise<SessionDynamicsData | null> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("attendance_sessions")
    .select("id, session_date, status, subjects(name), classes(name)")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return null;

  const [telemetryRes, insightsRes] = await Promise.all([
    admin
      .from("classroom_telemetry")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp_bucket", { ascending: true })
      .limit(200),
    admin
      .from("pedagogical_insights")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false }),
  ]);

  const telemetry = telemetryRes.data || [];
  const insights = insightsRes.data || [];

  const timeline = telemetry.map((t: Record<string, unknown>) => ({
    timestamp: t.timestamp_bucket as string,
    sitting: (t.sitting_count as number) || 0,
    standing: (t.standing_count as number) || 0,
    hand_raises: (t.hand_raise_count as number) || 0,
    desk_focused: (t.desk_focused_count as number) || 0,
    sleep_detected: (t.sleep_detected_count as number) || 0,
    teacher_zone: (t.teacher_zone as string) || null,
  }));

  const totalSlices = timeline.length;
  const sumStudents = telemetry.reduce((a: number, t: Record<string, unknown>) => a + ((t.detected_students_count as number) || 0), 0);
  const sumHandRaises = telemetry.reduce((a: number, t: Record<string, unknown>) => a + ((t.hand_raise_count as number) || 0), 0);
  const sumSleepDetected = telemetry.reduce((a: number, t: Record<string, unknown>) => a + ((t.sleep_detected_count as number) || 0), 0);
  const sumSitting = telemetry.reduce((a: number, t: Record<string, unknown>) => a + ((t.sitting_count as number) || 0), 0);
  const sumDeskFocused = telemetry.reduce((a: number, t: Record<string, unknown>) => a + ((t.desk_focused_count as number) || 0), 0);
  const peakSleep = telemetry.reduce((max: number, t: Record<string, unknown>) => Math.max(max, (t.sleep_detected_count as number) || 0), 0);

  const avgStudents = totalSlices > 0 ? Math.round(sumStudents / totalSlices) : 0;
  const avgSittingPct = totalSlices > 0 && sumStudents > 0 ? Math.round((sumSitting / sumStudents) * 100) : 0;
  const avgDeskFocusedPct = totalSlices > 0 && sumStudents > 0 ? Math.round((sumDeskFocused / sumStudents) * 100) : 0;

  return {
    session_id: sessionId,
    subject_name: (session.subjects as any)?.name || "—",
    class_name: (session.classes as any)?.name || "—",
    session_date: session.session_date,
    status: session.status,
    timeline,
    totals: {
      avg_students: avgStudents,
      total_hand_raises: sumHandRaises,
      total_sleep_incidents: sumSleepDetected,
      avg_sitting_pct: avgSittingPct,
      avg_desk_focused_pct: avgDeskFocusedPct,
      peak_sleep_count: peakSleep,
    },
    insights: insights.map((i: Record<string, unknown>) => ({
      id: i.id as string,
      type: i.insight_type as string,
      summary: i.observation_summary as string,
      prompt: i.pedagogical_prompt as string,
      confidence: i.confidence_level as string,
      reviewed: (i.is_reviewed_by_teacher as boolean) || false,
    })),
  };
}

// ============================================
// Get at-risk students (for admin & teachers)
// Composite Risk Score formula from PRD:
// Risk = w1*(1-AttendanceRate) + w2*SleepFrequency
// ============================================
export async function getAtRiskStudents(options?: {
  classId?: string;
  teacherId?: string;
  limit?: number;
}): Promise<StudentRiskItem[]> {
  const admin = createAdminClient();
  const limit = options?.limit || 20;

  // Get all students with attendance data
  let studentsQuery = admin
    .from("students")
    .select("id, nis, class_id, profiles(full_name), classes(name)");

  if (options?.classId) {
    studentsQuery = studentsQuery.eq("class_id", options.classId);
  }

  const { data: students } = await studentsQuery;
  if (!students || students.length === 0) return [];

  const studentIds = students.map((s: Record<string, unknown>) => s.id as string);

  // Get attendance records for all these students
  const { data: records } = await admin
    .from("attendance_records")
    .select("student_id, status")
    .in("student_id", studentIds);

  // Get sleep incidents from telemetry (aggregated by session)
  // We check for sessions where sleep was detected and the session belongs to classes these students are in
  const classIds = [...new Set(students.map((s: Record<string, unknown>) => s.class_id as string).filter(Boolean))];

  const { data: sleepSessions } = await admin
    .from("classroom_telemetry")
    .select("session_id, sleep_detected_count, attendance_sessions(class_id, session_date)")
    .gt("sleep_detected_count", 0)
    .limit(500);

  // Build per-student metrics
  const results: StudentRiskItem[] = students.map((s: Record<string, unknown>) => {
    const studentRecords = (records || []).filter((r: Record<string, unknown>) => r.student_id === s.id);
    const totalRecords = studentRecords.length;
    const presentCount = studentRecords.filter(
      (r: Record<string, unknown>) => r.status === "present" || r.status === "late"
    ).length;
    const absentCount = studentRecords.filter(
      (r: Record<string, unknown>) => r.status === "absent"
    ).length;
    const attendanceRate = totalRecords > 0 ? presentCount / totalRecords : 1;

    // Count sleep incidents for this student's class
    const studentClassId = s.class_id as string;
    const sleepIncidents = (sleepSessions || []).filter((ss: Record<string, unknown>) => {
      const sessionData = ss.attendance_sessions as Record<string, unknown> | null;
      return sessionData && (sessionData.class_id as string) === studentClassId;
    }).reduce((sum: number, ss: Record<string, unknown>) => sum + ((ss.sleep_detected_count as number) || 0), 0);

    // Normalized sleep frequency (capped at 1.0)
    const sleepFrequency = Math.min(sleepIncidents / Math.max(totalRecords, 1), 1);

    // Composite risk score
    const w1 = 0.6; // attendance weight
    const w2 = 0.4; // sleep weight
    const riskScore = w1 * (1 - attendanceRate) + w2 * sleepFrequency;

    return {
      student_id: s.id as string,
      student_name: ((s.profiles as any)?.full_name as string) || "—",
      nis: s.nis as string,
      class_name: ((s.classes as any)?.name as string) || "—",
      attendance_rate: Math.round(attendanceRate * 100),
      absent_count: absentCount,
      sleep_incidents: sleepIncidents,
      risk_score: Math.round(riskScore * 100) / 100,
      risk_level: computeRiskLevel(riskScore),
    };
  });

  // Sort by risk_score descending, take top N
  return results
    .filter((r) => r.risk_level !== "low")
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, limit);
}

// ============================================
// Get teacher's own session analytics summary
// ============================================
export async function getTeacherSessionsAnalytics(teacherId: string) {
  const admin = createAdminClient();

  // Get all sessions with telemetry for this teacher
  const { data: sessions } = await admin
    .from("attendance_sessions")
    .select("id, session_date, status, subjects(name), classes(name)")
    .eq("teacher_id", teacherId)
    .order("session_date", { ascending: false })
    .limit(30);

  if (!sessions || sessions.length === 0) {
    return {
      total_sessions: 0,
      sessions_with_telemetry: 0,
      total_sleep_alerts: 0,
      total_hand_raises: 0,
      recent_sessions: [],
    };
  }

  const sessionIds = sessions.map((s: Record<string, unknown>) => s.id as string);

  // Get telemetry stats for all these sessions
  const { data: telemetry } = await admin
    .from("classroom_telemetry")
    .select("session_id, hand_raise_count, sleep_detected_count")
    .in("session_id", sessionIds);

  // Aggregate per-session
  const sessionMap = new Map<string, { hand_raises: number; sleep_count: number; slices: number }>();
  (telemetry || []).forEach((t: Record<string, unknown>) => {
    const sid = t.session_id as string;
    const existing = sessionMap.get(sid) || { hand_raises: 0, sleep_count: 0, slices: 0 };
    existing.hand_raises += (t.hand_raise_count as number) || 0;
    existing.sleep_count += (t.sleep_detected_count as number) || 0;
    existing.slices += 1;
    sessionMap.set(sid, existing);
  });

  const totalSleepAlerts = Array.from(sessionMap.values()).reduce((sum, v) => sum + v.sleep_count, 0);
  const totalHandRaises = Array.from(sessionMap.values()).reduce((sum, v) => sum + v.hand_raises, 0);

  const recentSessions = sessions.slice(0, 10).map((s: Record<string, unknown>) => {
    const stats = sessionMap.get(s.id as string);
    return {
      id: s.id as string,
      date: s.session_date as string,
      subject: (s.subjects as any)?.name || "—",
      class_name: (s.classes as any)?.name || "—",
      has_telemetry: !!stats,
      hand_raises: stats?.hand_raises || 0,
      sleep_incidents: stats?.sleep_count || 0,
    };
  });

  return {
    total_sessions: sessions.length,
    sessions_with_telemetry: sessionMap.size,
    total_sleep_alerts: totalSleepAlerts,
    total_hand_raises: totalHandRaises,
    recent_sessions: recentSessions,
  };
}

// ============================================
// Get school-wide overview for Admin dashboard
// ============================================
export async function getSchoolOverview(): Promise<SchoolOverview> {
  const admin = createAdminClient();

  // Get aggregate telemetry stats
  const { data: allTelemetry } = await admin
    .from("classroom_telemetry")
    .select("session_id, hand_raise_count, sleep_detected_count, attendance_sessions(session_date, classes(name), subjects(name))")
    .order("created_at", { ascending: false })
    .limit(1000);

  const uniqueSessions = new Set((allTelemetry || []).map((t: Record<string, unknown>) => t.session_id as string));
  const totalSleepIncidents = (allTelemetry || []).reduce((sum: number, t: Record<string, unknown>) => sum + ((t.sleep_detected_count as number) || 0), 0);
  const totalHandRaises = (allTelemetry || []).reduce((sum: number, t: Record<string, unknown>) => sum + ((t.hand_raise_count as number) || 0), 0);

  // Sleep by class
  const classSleepMap = new Map<string, number>();
  (allTelemetry || []).forEach((t: Record<string, unknown>) => {
    const session = t.attendance_sessions as Record<string, unknown> | null;
    const className = (session?.classes as any)?.name || "Unknown";
    const sleepCount = (t.sleep_detected_count as number) || 0;
    if (sleepCount > 0) {
      classSleepMap.set(className, (classSleepMap.get(className) || 0) + sleepCount);
    }
  });

  const classesWithHighestSleep = Array.from(classSleepMap.entries())
    .map(([class_name, count]) => ({ class_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent sleep alerts
  const sleepAlerts = (allTelemetry || [])
    .filter((t: Record<string, unknown>) => ((t.sleep_detected_count as number) || 0) > 0)
    .slice(0, 10)
    .map((t: Record<string, unknown>) => {
      const session = t.attendance_sessions as Record<string, unknown> | null;
      return {
        session_date: (session?.session_date as string) || "—",
        subject: ((session?.subjects as any)?.name as string) || "—",
        class_name: ((session?.classes as any)?.name as string) || "—",
        sleep_count: (t.sleep_detected_count as number) || 0,
      };
    });

  // At-risk students
  const atRiskStudents = await getAtRiskStudents({ limit: 10 });

  return {
    total_sessions_with_telemetry: uniqueSessions.size,
    total_sleep_incidents: totalSleepIncidents,
    avg_hand_raises_per_session: uniqueSessions.size > 0 ? Math.round(totalHandRaises / uniqueSessions.size) : 0,
    classes_with_highest_sleep: classesWithHighestSleep,
    at_risk_students: atRiskStudents,
    recent_sleep_alerts: sleepAlerts,
  };
}

// ============================================
// Get parent's child engagement data
// ============================================
export async function getChildEngagement(parentId: string) {
  const admin = createAdminClient();

  // Get linked children
  const { data: links } = await admin
    .from("student_parents")
    .select("student_id, relationship, students(id, nis, class_id, profiles(full_name), classes(name))")
    .eq("parent_id", parentId);

  if (!links || links.length === 0) return [];

  const children = links.map((l: Record<string, unknown>) => {
    const s = l.students as unknown as Record<string, unknown>;
    return {
      student_id: s.id as string,
      student_name: ((s.profiles as any)?.full_name as string) || "—",
      nis: s.nis as string,
      class_id: s.class_id as string,
      class_name: ((s.classes as any)?.name as string) || "—",
      relationship: l.relationship as string,
    };
  });

  // Get attendance and engagement data for each child
  const enrichedChildren = await Promise.all(
    children.map(async (child) => {
      // Attendance records
      const { data: records } = await admin
        .from("attendance_records")
        .select("status")
        .eq("student_id", child.student_id);

      const total = (records || []).length;
      const present = (records || []).filter((r: Record<string, unknown>) => r.status === "present" || r.status === "late").length;
      const absent = (records || []).filter((r: Record<string, unknown>) => r.status === "absent").length;
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

      // Sleep incidents for this class
      const { data: classSessions } = await admin
        .from("attendance_sessions")
        .select("id")
        .eq("class_id", child.class_id);

      const classSessionIds = (classSessions || []).map((s: Record<string, unknown>) => s.id as string);

      let sleepIncidents = 0;
      if (classSessionIds.length > 0) {
        const { data: sleepData } = await admin
          .from("classroom_telemetry")
          .select("sleep_detected_count")
          .in("session_id", classSessionIds)
          .gt("sleep_detected_count", 0);

        sleepIncidents = (sleepData || []).reduce(
          (sum: number, d: Record<string, unknown>) => sum + ((d.sleep_detected_count as number) || 0), 0
        );
      }

      // Risk computation
      const sleepFrequency = Math.min(sleepIncidents / Math.max(total, 1), 1);
      const riskScore = 0.6 * (1 - attendanceRate / 100) + 0.4 * sleepFrequency;

      return {
        ...child,
        attendance_rate: attendanceRate,
        total_sessions: total,
        present_count: present,
        absent_count: absent,
        sleep_incidents: sleepIncidents,
        risk_score: Math.round(riskScore * 100) / 100,
        risk_level: computeRiskLevel(riskScore),
      };
    })
  );

  return enrichedChildren;
}

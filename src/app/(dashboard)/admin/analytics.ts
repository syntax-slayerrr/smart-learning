"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAttendanceTrend() {
  const supabase = await createClient();

  // Get date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: records, error } = await supabase
    .from("attendance_records")
    .select(`
      status,
      attendance_sessions!inner(session_date)
    `)
    .gte("attendance_sessions.session_date", startDateStr)
    .order("attendance_sessions(session_date)", { ascending: true });

  if (error || !records) {
    console.error("Error fetching trend:", error);
    return [];
  }

  // Aggregate by date
  const dateMap = new Map<string, { present: number; absent: number; late: number }>();
  
  for (const r of records) {
    const session = Array.isArray(r.attendance_sessions) ? r.attendance_sessions[0] : r.attendance_sessions;
    if (!session?.session_date) continue;
    
    const date = session.session_date;
    if (!dateMap.has(date)) {
      dateMap.set(date, { present: 0, absent: 0, late: 0 });
    }
    
    const stats = dateMap.get(date)!;
    if (r.status === "present") stats.present++;
    else if (r.status === "absent") stats.absent++;
    else if (r.status === "late") stats.late++;
  }

  // Convert map to array and calculate percentage
  const chartData = Array.from(dateMap.entries()).map(([date, stats]) => {
    const total = stats.present + stats.absent + stats.late;
    const presentRate = total > 0 ? Math.round((stats.present / total) * 100) : 0;
    
    return {
      date, // Format: YYYY-MM-DD
      presentRate,
      hadir: stats.present,
      alpa: stats.absent,
      terlambat: stats.late,
    };
  });

  // Sort by date ascending
  chartData.sort((a, b) => a.date.localeCompare(b.date));

  return chartData;
}

export async function getTopAbsentees() {
  const supabase = await createClient();

  // Get date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = thirtyDaysAgo.toISOString().split("T")[0];

  // We need to count 'absent' status for each student
  const { data: records, error } = await supabase
    .from("attendance_records")
    .select(`
      student_id,
      status,
      attendance_sessions!inner(session_date),
      students(profiles(full_name, avatar_url), nis)
    `)
    .gte("attendance_sessions.session_date", startDateStr)
    .eq("status", "absent");

  if (error || !records) {
    return [];
  }

  // Count absences per student
  const absentCountMap = new Map<string, { count: number, name: string, nis: string, avatar: string }>();

  for (const r of records) {
    const sId = r.student_id;
    if (!sId) continue;

    if (!absentCountMap.has(sId)) {
      const student = r.students as any;
      absentCountMap.set(sId, {
        count: 0,
        name: student?.profiles?.full_name || "Unknown",
        nis: student?.nis || "-",
        avatar: student?.profiles?.avatar_url || "",
      });
    }
    
    absentCountMap.get(sId)!.count++;
  }

  // Sort and take top 5
  const topAbsentees = Array.from(absentCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return topAbsentees;
}

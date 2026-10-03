import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM

  if (!month) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // 1. Get all teachers
  const { data: teachers, error: teacherError } = await adminClient
    .from("teachers")
    .select("id, profiles(full_name)");

  if (teacherError) {
    return NextResponse.json({ error: teacherError.message }, { status: 500 });
  }

  // 2. Define date range for the month accurately (YYYY-MM-01 to YYYY-MM-lastDay)
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const startDate = `${yearStr}-${monthStr.padStart(2, "0")}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${yearStr}-${monthStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // 3. Fetch attendance sessions in this month with pagination
  const sessions: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: sessData, error: sessionError } = await adminClient
      .from("attendance_sessions")
      .select("id, teacher_id, teacher_present_at, status")
      .gte("session_date", startDate)
      .lte("session_date", endDate)
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    if (sessData && sessData.length > 0) {
      sessions.push(...sessData);
      if (sessData.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }

    if (page > 30) hasMore = false;
  }

  // 4. Aggregate data per teacher
  const aggregated = (teachers as any[]).map(t => {
    const teacherSessions = sessions.filter(s => s.teacher_id === t.id);
    const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
    
    let presentCount = 0;
    let absentCount = 0; // count as absent if it's closed and teacher wasn't present

    teacherSessions.forEach(s => {
      if (s.teacher_present_at) {
        presentCount++;
      } else if (s.status !== "active") {
        absentCount++;
      }
    });

    return {
      teacher_id: t.id,
      full_name: profile?.full_name || "Tanpa Nama",
      total_sessions: teacherSessions.length,
      present: presentCount,
      absent: absentCount,
    };
  });

  return NextResponse.json({ records: aggregated });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM
  const classId = searchParams.get("class_id");

  if (!month || !classId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // 1. Get all students in the class
  const { data: students, error: studentError } = await adminClient
    .from("students")
    .select("id, nis, profiles(full_name)")
    .eq("class_id", classId);

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  // 2. Define date range for the month accurately (YYYY-MM-01 to YYYY-MM-lastDay)
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const startDate = `${yearStr}-${monthStr.padStart(2, "0")}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${yearStr}-${monthStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // 3. Fetch attendance records for these students in this month using pagination to bypass 1000 rows limit
  const studentIds = students.map((s) => s.id);
  const records: any[] = [];

  if (studentIds.length > 0) {
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: recordsData, error: attendanceError } = await adminClient
        .from("attendance_records")
        .select("student_id, status, session_id, attendance_sessions!inner(session_date)")
        .in("student_id", studentIds)
        .gte("attendance_sessions.session_date", startDate)
        .lte("attendance_sessions.session_date", endDate)
        .order("id", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (attendanceError) {
        return NextResponse.json({ error: attendanceError.message }, { status: 500 });
      }

      if (recordsData && recordsData.length > 0) {
        records.push(...recordsData);
        if (recordsData.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }

      // Safety limit max 50 pages (50,000 records)
      if (page > 50) hasMore = false;
    }
  }

  // 4. Aggregate data per student
  const aggregated = (students as any[]).map(s => {
    const studentRecords = records.filter(r => r.student_id === s.id);
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    
    return {
      student_id: s.id,
      full_name: profile?.full_name || "Tanpa Nama",
      nis: s.nis,
      present: studentRecords.filter(r => r.status === "present").length,
      late: studentRecords.filter(r => r.status === "late").length,
      sick: studentRecords.filter(r => r.status === "sick").length,
      excused: studentRecords.filter(r => r.status === "excused").length,
      absent: studentRecords.filter(r => r.status === "absent").length,
    };
  });

  return NextResponse.json({ records: aggregated });
}

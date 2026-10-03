import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ClipboardCheck, Search, Filter, Download } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { AttendanceClient } from "./attendance-client";

export const dynamic = "force-dynamic";

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; classId?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const selectedDate = resolvedParams.date || format(new Date(), "yyyy-MM-dd");

  // Fetch Classes for filter
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  // Fetch Students with pagination to bypass PostgREST max-rows (1000)
  const students: any[] = [];
  let sPage = 0;
  let sHasMore = true;

  while (sHasMore) {
    let studentsQuery = supabase
      .from("students")
      .select(`
        id,
        nis,
        class_id,
        profiles ( full_name, email ),
        classes ( name )
      `)
      .order("nis", { ascending: true })
      .range(sPage * 1000, (sPage + 1) * 1000 - 1);

    if (resolvedParams.classId) {
      studentsQuery = studentsQuery.eq("class_id", resolvedParams.classId);
    }
    
    const { data: sData } = await studentsQuery;
    if (sData && sData.length > 0) {
      students.push(...sData);
      if (sData.length < 1000) sHasMore = false;
      else sPage++;
    } else {
      sHasMore = false;
    }
    
    if (sPage > 10) sHasMore = false; // Safety max 10000 students
  }

  // Fetch Sessions for the date with pagination
  const sessions: any[] = [];
  let sessPage = 0;
  let sessHasMore = true;

  while (sessHasMore) {
    let sessionsQuery = supabase
      .from("attendance_sessions")
      .select(`
        id,
        class_id,
        subject_start_time,
        subjects ( name )
      `)
      .eq("session_date", selectedDate)
      .order("subject_start_time", { ascending: true })
      .order("id", { ascending: true })
      .range(sessPage * 1000, (sessPage + 1) * 1000 - 1);

    if (resolvedParams.classId) {
      sessionsQuery = sessionsQuery.eq("class_id", resolvedParams.classId);
    }
    
    const { data: sessData } = await sessionsQuery;
    if (sessData && sessData.length > 0) {
      sessions.push(...sessData);
      if (sessData.length < 1000) sessHasMore = false;
      else sessPage++;
    } else {
      sessHasMore = false;
    }
    
    if (sessPage > 10) sessHasMore = false; // Safety max 10000 sessions
  }

  // Fetch Records for these sessions
  const sessionIds = sessions?.map(s => s.id) || [];
  // Fetch Records for these sessions using an inner join and pagination to bypass PostgREST max-rows limits (1000)
  const records: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let recordsQuery = supabase
      .from("attendance_records")
      .select(`
        id,
        student_id, 
        session_id, 
        status, 
        created_at, 
        scanned_at,
        attendance_sessions!inner ( session_date, class_id )
      `)
      .eq("attendance_sessions.session_date", selectedDate)
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (resolvedParams.classId) {
      recordsQuery = recordsQuery.eq("attendance_sessions.class_id", resolvedParams.classId);
    }

    const { data: recordsData } = await recordsQuery;
    
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
    
    // Safety break to prevent infinite loops (max 30 pages = 30000 records per day)
    if (page > 30) hasMore = false;
  }

  return (
    <div className="dashboard-container animate-fade-in">
      <AttendanceClient 
        students={students || []} 
        sessions={sessions || []} 
        records={records}
        classes={classes || []} 
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { TeachersClient } from "./teachers-client";

export default async function AdminTeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; classId?: string; teacherName?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const selectedDate = resolvedParams.date || format(new Date(), "yyyy-MM-dd");

  // Fetch Classes for filter
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  // Fetch Teacher Attendance Records (attendance_sessions)
  let query = supabase
    .from("attendance_sessions")
    .select(`
      id,
      session_date,
      class_id,
      subjects(name),
      teacher_present_at,
      subject_start_time,
      qr_expires_at,
      status,
      teachers:teacher_id (
        id,
        profiles:profile_id (
          full_name
        )
      ),
      classes:class_id (
        name
      )
    `)
    .eq("session_date", selectedDate)
    .order("subject_start_time", { ascending: true });

  if (resolvedParams.classId) {
    query = query.eq("class_id", resolvedParams.classId);
  }

  const { data: sessions } = await query;
  const safeSessions = sessions || [];

  // Filter by teacher name in memory
  let filteredSessions = safeSessions;
  if (resolvedParams.teacherName) {
    filteredSessions = safeSessions.filter((s: any) => 
      s.teachers?.profiles?.full_name?.toLowerCase().includes(resolvedParams.teacherName!.toLowerCase())
    );
  }

  // Format data for Excel export
  const exportData = filteredSessions.map((session: any) => {
    let status = "Tidak Hadir";
    if (session.teacher_present_at) {
      status = "Hadir";
    } else if (session.status === "active") {
      const isExpired = new Date(session.qr_expires_at).getTime() < new Date().getTime();
      if (!isExpired) {
        status = "Sedang Berjalan";
      }
    }

    return {
      "Tanggal": format(new Date(session.session_date), "dd/MM/yyyy"),
      "Nama Guru": session.teachers?.profiles?.full_name || "N/A",
      "Pelajaran": (session.subjects as any)?.name || "-",
      "Kelas": session.classes?.name || "N/A",
      "Jam Jadwal": session.subject_start_time || "-",
      "Jam Hadir": session.teacher_present_at ? new Date(session.teacher_present_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ':') : "-",
      "Status Kehadiran": status
    };
  });

  return (
    <div className="dashboard-container animate-fade-in">
      <TeachersClient initialData={filteredSessions} classes={classes || []} />
    </div>
  );
}

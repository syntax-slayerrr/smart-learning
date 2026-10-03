import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import MatrixRecapClient from "./matrix-recap";

export default async function TeacherRecapPage() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get teacher record
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!teacher) return <div>Data guru tidak ditemukan.</div>;

  // Fetch all sessions by this teacher
  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("*, subjects(name)")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  // Get unique classes and subjects from sessions
  const classIds = Array.from(new Set(sessions?.map(s => s.class_id) || []));
  const subjects = Array.from(new Set(sessions?.map(s => (s.subjects as any)?.name).filter(Boolean) || []));

  // Fetch class details
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);

  // Fetch students for these classes
  const { data: students } = await supabase
    .from("students")
    .select("id, class_id, profiles(full_name)")
    .in("class_id", classIds);

  // Fetch attendance records for these sessions
  const sessionIds = sessions?.map(s => s.id) || [];
  const { data: records } = await supabase
    .from("attendance_records")
    .select("student_id, session_id, status")
    .in("session_id", sessionIds);

  // Format data for client component
  const formattedStudents = students?.map(s => ({
    id: s.id,
    full_name: (s.profiles as any)?.full_name || "Siswa",
    class_id: s.class_id
  })) || [];

  const formattedSessions = sessions?.map(s => ({
    id: s.id,
    date: s.created_at,
    subject: (s.subjects as any)?.name || "Pelajaran",
    class_id: s.class_id
  })) || [];

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader 
        title="Rekapitulasi Matriks" 
        description="Analisis kehadiran siswa secara menyeluruh per semester"
      />

      <MatrixRecapClient 
        students={formattedStudents}
        sessions={formattedSessions}
        records={records || []}
        classes={classes || []}
        subjects={subjects || []}
      />
    </div>
  );
}

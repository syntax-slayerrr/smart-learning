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

  // 1. Fetch available classes (all active classes, or fallback to all classes)
  let { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  // Filter or unique classes
  const classList = classes || [];

  // 2. Fetch available subjects
  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");
  
  const subjects = subjectsData?.map(s => s.name).filter(Boolean) || [];

  // 3. Fetch students for all classes
  const classIds = classList.map(c => c.id);
  const { data: students } = classIds.length > 0 
    ? await supabase
        .from("students")
        .select("id, class_id, profiles(full_name)")
        .in("class_id", classIds)
    : { data: [] };

  // 4. Fetch attendance sessions
  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("*, subjects(name)")
    .order("created_at", { ascending: false });

  // 5. Fetch attendance records for sessions
  const sessionIds = sessions?.map(s => s.id) || [];
  const { data: records } = sessionIds.length > 0
    ? await supabase
        .from("attendance_records")
        .select("student_id, session_id, status")
        .in("session_id", sessionIds)
    : { data: [] };

  // Format data for client component
  const formattedStudents = students?.map(s => ({
    id: s.id,
    full_name: (s.profiles as any)?.full_name || "Siswa",
    class_id: s.class_id
  })) || [];

  const formattedSessions = sessions?.map(s => ({
    id: s.id,
    date: s.session_date || s.created_at,
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
        classes={classList}
        subjects={subjects}
      />
    </div>
  );
}

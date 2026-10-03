import { createClient } from "@/lib/supabase/server";
import { User, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default async function ParentAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get parent record
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", user?.id || "")
    .single();

  if (!parent) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border border-dashed text-center">
        <AlertCircle className="mb-2 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-medium">Profil Orang Tua Tidak Ditemukan</h3>
        <p className="text-sm text-muted-foreground">Silakan hubungi admin sekolah.</p>
      </div>
    );
  }

  // Get linked children with profile, class, and homeroom teacher
  const { data: links } = await supabase
    .from("student_parents")
    .select(`
      relationship,
      students (
        id,
        nis,
        profiles ( full_name ),
        classes ( 
          name,
          teachers (
            profiles ( full_name )
          )
        )
      )
    `)
    .eq("parent_id", parent.id);

  if (!links || links.length === 0) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border border-dashed text-center">
        <User className="mb-2 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-medium">Belum Ada Anak Terdaftar</h3>
        <p className="text-sm text-muted-foreground">Profil Anda belum terhubung dengan data siswa manapun.</p>
      </div>
    );
  }

  // For now, take the first child
  const firstLink = links[0];
  const student = firstLink.students as any;
  const studentProfile = student?.profiles as any;
  const studentClass = student?.classes as any;
  const homeroomTeacher = studentClass?.teachers?.profiles as any;

  // Get today's attendance record
  const today = new Date().toISOString().split('T')[0];
  const { data: todayRecords } = await supabase
    .from("attendance_records")
    .select("scanned_at, status")
    .eq("student_id", student.id)
    .gte("scanned_at", `${today}T00:00:00Z`)
    .lte("scanned_at", `${today}T23:59:59Z`)
    .order("scanned_at", { ascending: false })
    .limit(1);

  const todayRecord = todayRecords?.[0];

  // Calculate attendance statistics
  const { count: totalSessions } = await supabase
    .from("attendance_records")
    .select("*", { count: 'exact', head: true })
    .eq("student_id", student.id);

  const { count: presentSessions } = await supabase
    .from("attendance_records")
    .select("*", { count: 'exact', head: true })
    .eq("student_id", student.id)
    .in("status", ["present", "late"]);

  const attendanceRate = totalSessions && totalSessions > 0 
    ? Math.round(((presentSessions || 0) / totalSessions) * 100) 
    : 0;

  return (
    <div className="dashboard-container space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Absensi Anak</h1>
        <p className="text-muted-foreground">
          Pantau kehadiran anak Anda di sekolah secara real-time.
        </p>
      </div>

      {/* Attendance Status Card */}
      <div className={`rounded-xl p-6 flex items-center gap-4 border transition-colors ${
        todayRecord 
          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
          : "bg-slate-50 border-slate-200 text-slate-900"
      }`}>
        <div className={`p-3 rounded-full ${todayRecord ? "bg-emerald-100" : "bg-slate-200"}`}>
          <Clock className={`h-6 w-6 ${todayRecord ? "text-emerald-600" : "text-slate-500"}`} />
        </div>
        <div>
          <p className="font-semibold text-lg">
            {todayRecord ? (todayRecord.status === 'late' ? 'Hadir (Terlambat)' : 'Hadir Hari Ini') : 'Belum Melakukan Absen'}
          </p>
          <p className="text-sm opacity-80">
            {todayRecord 
              ? `Anak Anda sudah melakukan scan QR pada pukul ${format(new Date(todayRecord.scanned_at), "HH:mm", { locale: id })} WIB.`
              : "Anak Anda belum tercatat melakukan scan QR hari ini."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="h-4 w-4" /> Profil Anak
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b py-2 text-muted-foreground">
              <span>Nama:</span>
              <span className="font-medium text-foreground">{studentProfile?.full_name || "—"}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-muted-foreground">
              <span>Kelas:</span>
              <span className="font-medium text-foreground">{studentClass?.name || "—"}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-muted-foreground">
              <span>Wali Kelas:</span>
              <span className="font-medium text-foreground">{homeroomTeacher?.full_name || "Guru Pembimbing"}</span>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Statistik Kehadiran</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Persentase Kehadiran</span>
                <span className="font-bold">{attendanceRate}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                  style={{ width: `${attendanceRate}%` }} 
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                * Dihitung dari total {totalSessions} sesi absensi yang diikuti.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

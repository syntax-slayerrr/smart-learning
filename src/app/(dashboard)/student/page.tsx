import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/attendance/status-badge";
import { CheckCircle, Clock, XCircle, QrCode, CalendarDays, BookOpen, User } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard Siswa" };

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, nis, class_id, classes ( name )")
    .eq("profile_id", user!.id)
    .single();

  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
  const dayOfWeek = nowWib.getUTCDay();

  // Fetch all related records concurrently for huge performance boost
  const [
    { data: records },
    { data: recentRecords },
    { data: todaySchedules }
  ] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("status")
      .eq("student_id", student?.id || ""),
    supabase
      .from("attendance_records")
      .select("id, status, scanned_at, attendance_sessions ( subjects ( name ), session_date, classes ( name ) )")
      .eq("student_id", student?.id || "")
      .order("scanned_at", { ascending: false })
      .limit(10),
    supabase
      .from("schedules")
      .select("id, start_time, end_time, subjects(name), teachers(profiles(full_name))")
      .eq("class_id", student?.class_id)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true })
  ]);

  const stats = {
    present: records?.filter((r) => r.status === "present").length || 0,
    late: records?.filter((r) => r.status === "late").length || 0,
    sick: records?.filter((r) => r.status === "sick").length || 0,
    excused: records?.filter((r) => r.status === "excused").length || 0,
    absent: records?.filter((r) => r.status === "absent").length || 0,
  };
  const total = records?.length || 0;
  const rate = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0;

  const currentWibTime = nowWib.getUTCHours().toString().padStart(2, '0') + ':' + nowWib.getUTCMinutes().toString().padStart(2, '0');

  const cls = (student?.classes as unknown) as unknown as Record<string, unknown> | null;

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard Siswa"
        description={cls ? `${cls.name as string} • NIS: ${student?.nis}` : "Selamat datang"}
        action={
          <Link href="/student/scan" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            <QrCode className="h-4 w-4" />
            Scan QR
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tingkat Kehadiran</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{rate}%</p>
            <p className="text-xs text-muted-foreground">{stats.present + stats.late} hadir dari {total} sesi</p>
          </div>
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${rate >= 80 ? "bg-emerald-100 text-emerald-600" : rate >= 60 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
            <span className="text-lg font-bold">{rate}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Hadir" value={stats.present} icon={CheckCircle} />
        <StatCard title="Terlambat" value={stats.late} icon={Clock} />
        <StatCard title="Sakit" value={stats.sick} icon={CalendarDays} />
        <StatCard title="Izin" value={stats.excused} icon={CalendarDays} />
        <StatCard title="Tidak Hadir" value={stats.absent} icon={XCircle} />
      </div>

      <Link href="/student/scan" className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 hover:border-primary/50 sm:hidden">
        <QrCode className="h-8 w-8 text-primary" />
        <div>
          <p className="text-sm font-semibold">Scan QR Absensi</p>
          <p className="text-xs text-muted-foreground">Ketuk untuk membuka scanner</p>
        </div>
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Jadwal Pelajaran Hari Ini */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Jadwal Hari Ini
            </h3>
          </div>
          {todaySchedules && todaySchedules.length > 0 ? (
            <div className="p-2">
              {todaySchedules.map((schedule: any) => {
                const startTime = schedule.start_time.substring(0, 5);
                const endTime = schedule.end_time.substring(0, 5);
                const isPast = currentWibTime > endTime;
                const isCurrent = currentWibTime >= startTime && currentWibTime <= endTime;
                const isFuture = currentWibTime < startTime;
                
                const subj = Array.isArray(schedule.subjects) ? schedule.subjects[0] : schedule.subjects;
                const teacher = Array.isArray(schedule.teachers) ? schedule.teachers[0] : schedule.teachers;
                const profile = Array.isArray(teacher?.profiles) ? teacher?.profiles[0] : teacher?.profiles;
                
                return (
                  <div 
                    key={schedule.id} 
                    className={`relative flex gap-4 rounded-lg p-3 transition-colors ${isCurrent ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex flex-col items-center justify-center min-w-[60px]">
                      <span className={`text-sm font-bold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{startTime}</span>
                      <span className="text-xs text-muted-foreground">{endTime}</span>
                    </div>
                    <div className="w-1 rounded-full bg-border relative">
                      {isCurrent && <div className="absolute inset-0 bg-primary rounded-full animate-pulse" />}
                    </div>
                    <div className="flex-1 py-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold ${isCurrent ? 'text-primary' : (isPast ? 'text-muted-foreground' : 'text-foreground')}`}>
                          {subj?.name || "Mata Pelajaran"}
                        </p>
                        {isCurrent && <span className="text-[10px] uppercase font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Sekarang</span>}
                        {isFuture && <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Nanti</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{profile?.full_name || "Guru"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {dayOfWeek === 0 ? "Hari Libur. Selamat beristirahat!" : "Tidak ada jadwal pelajaran hari ini."}
            </div>
          )}
        </div>

        {/* Riwayat Absensi */}
        <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Riwayat Absensi</h3>
          <Link href="/student/history" className="text-xs font-medium text-primary hover:underline">Lihat Semua</Link>
        </div>
        {recentRecords && recentRecords.length > 0 ? (
          <div className="divide-y divide-border">
            {recentRecords.map((r: Record<string, unknown>) => {
              const s = Array.isArray(r.attendance_sessions) ? r.attendance_sessions[0] : r.attendance_sessions as unknown as Record<string, unknown> | null;
              const c = Array.isArray(s?.classes) ? s?.classes[0] : s?.classes as unknown as Record<string, unknown> | null;
              const subj = Array.isArray(s?.subjects) ? s?.subjects[0] : s?.subjects as unknown as Record<string, unknown> | null;
              return (
                <div key={r.id as string} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{(subj?.name as string) || "—"}</p>
                    <p className="text-xs text-muted-foreground">{(c?.name as string) || "—"} • {(s?.session_date as string) || "—"}</p>
                  </div>
                  <StatusBadge status={r.status as string} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada riwayat absensi</div>
        )}
        </div>
      </div>
    </div>
  );
}

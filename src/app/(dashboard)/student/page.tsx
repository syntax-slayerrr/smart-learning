import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/attendance/status-badge";
import { CheckCircle, Clock, XCircle, QrCode, CalendarDays, User, ArrowUpRight, Award, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard Siswa — Smart Learning" };

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

  // Fetch all related records concurrently
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
      .limit(8),
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
        description={cls ? `Kelas ${cls.name as string} • NIS: ${student?.nis}` : "Portal Akademik & Presensi Cerdas"}
        action={
          <Link
            href="/student/scan"
            className="apple-press inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover"
          >
            <QrCode className="h-4 w-4" />
            <span>Scan QR Sesi</span>
          </Link>
        }
      />

      {/* Hero Overview & Attendance Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Percentage Card */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Indeks Kehadiran Terverifikasi</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Tingkat Kehadiran Akademik
              </h2>
              <p className="text-xs text-muted-foreground">
                {stats.present + stats.late} kehadiran tervalidasi dari total {total} sesi pembelajaran aktif
              </p>
            </div>

            <div className="text-right">
              <span className="text-4xl font-extrabold tracking-tight font-mono text-foreground">
                {rate}%
              </span>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                {rate >= 80 ? "Sangat Tertib" : rate >= 60 ? "Cukup" : "Perlu Peringatan"}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 space-y-2">
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rate >= 80 ? "bg-primary" : rate >= 60 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>Batas Minimal: 75%</span>
              <span className="font-mono">{rate >= 75 ? "✓ Memenuhi Standar Kelulusan" : "⚠️ Di Bawah Standar Kelulusan"}</span>
            </div>
          </div>
        </div>

        {/* Quick Identity / Smart Badge Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Digital Student ID
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aktif
              </span>
            </div>
            <p className="text-base font-bold text-foreground">
              {(student?.classes as any)?.name ? `Siswa Kelas ${(student?.classes as any).name}` : "Siswa Aktif"}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              NIS: {student?.nis || "—"}
            </p>
          </div>

          <div className="pt-4 border-t border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="h-4 w-4 text-primary" />
              <span>Status Akademik Baik</span>
            </div>
            <Link
              href="/student/scan"
              className="apple-press inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
            >
              <span>Scan QR</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5 High-Density Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Hadir Tepat" value={stats.present} icon={CheckCircle} />
        <StatCard title="Terlambat" value={stats.late} icon={Clock} />
        <StatCard title="Sakit" value={stats.sick} icon={CalendarDays} />
        <StatCard title="Izin" value={stats.excused} icon={CalendarDays} />
        <StatCard title="Tanpa Keterangan" value={stats.absent} icon={XCircle} />
      </div>

      {/* Schedules & Attendance History */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Jadwal Pelajaran Hari Ini */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Jadwal Pelajaran Hari Ini
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">
              {nowWib.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
            </span>
          </div>

          {todaySchedules && todaySchedules.length > 0 ? (
            <div className="p-3 space-y-2">
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
                    className={`relative flex items-center gap-3.5 rounded-xl p-3 border transition-all ${
                      isCurrent 
                        ? 'bg-primary/5 border-primary/30 shadow-xs' 
                        : 'bg-card border-border/70 hover:border-border'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center min-w-[58px] text-center font-mono">
                      <span className={`text-xs font-bold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{startTime}</span>
                      <span className="text-[10px] text-muted-foreground">{endTime}</span>
                    </div>

                    <div className="h-8 w-0.5 rounded-full bg-border relative">
                      {isCurrent && <div className="absolute inset-0 bg-primary rounded-full animate-pulse" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-primary' : (isPast ? 'text-muted-foreground' : 'text-foreground')}`}>
                          {subj?.name || "Mata Pelajaran"}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full shrink-0">
                            Berlangsung
                          </span>
                        )}
                        {isFuture && (
                          <span className="text-[10px] uppercase font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                            Mendatang
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{profile?.full_name || "Guru Pengampu"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              {dayOfWeek === 0 ? "Hari Libur. Selamat beristirahat!" : "Tidak ada jadwal pelajaran untuk hari ini."}
            </div>
          )}
        </div>

        {/* Riwayat Absensi */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
            <h3 className="text-sm font-semibold text-foreground">Riwayat Presensi Terbaru</h3>
            <Link href="/student/history" className="apple-press text-xs font-semibold text-primary hover:text-primary-hover">
              Lihat Semua
            </Link>
          </div>
          {recentRecords && recentRecords.length > 0 ? (
            <div className="divide-y divide-border">
              {recentRecords.map((r: Record<string, unknown>) => {
                const s = Array.isArray(r.attendance_sessions) ? r.attendance_sessions[0] : r.attendance_sessions as unknown as Record<string, unknown> | null;
                const c = Array.isArray(s?.classes) ? s?.classes[0] : s?.classes as unknown as Record<string, unknown> | null;
                const subj = Array.isArray(s?.subjects) ? s?.subjects[0] : s?.subjects as unknown as Record<string, unknown> | null;
                return (
                  <div key={r.id as string} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium text-foreground truncate">{(subj?.name as string) || "Mata Pelajaran"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(c?.name as string) || "—"} • <span className="font-mono">{(s?.session_date as string) || "—"}</span>
                      </p>
                    </div>
                    <StatusBadge status={r.status as string} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada riwayat absensi tercatat</div>
          )}
        </div>
      </div>
    </div>
  );
}


import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  ClipboardCheck,
  Users,
  School,
  BarChart3,
  Plus,
  QrCode,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { getTeacherSessionsAnalytics } from "@/services/student-analytics";
import { TeacherSessionsAnalytics } from "@/components/dashboard/teacher-sessions-analytics";

export const metadata: Metadata = {
  title: "Dashboard Guru",
};

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get teacher record
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, profiles(push_subscription)")
    .eq("profile_id", user!.id)
    .single();

  const teacherId = teacher?.id;
  const hasPushSubscription = !!(teacher?.profiles as any)?.push_subscription;

  // 1. Get current time in WIB
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
  const dayOfWeek = nowWib.getUTCDay();
  const currentTime = nowWib.getUTCHours().toString().padStart(2, '0') + ':' +
    nowWib.getUTCMinutes().toString().padStart(2, '0');
  const today = nowWib.toISOString().split("T")[0];

  // 2. RUN ALL INDEPENDENT QUERIES CONCURRENTLY (HUGE PERFORMANCE BOOST)
  const [
    scheduleRes,
    todaySessionsRes,
    totalSessionsRes,
    activeSessionsRes,
    recentSessionsRes
  ] = await Promise.all([
    // 2a. Current Schedule
    supabase
      .from("schedules")
      .select(`
        id, class_id, subject_id, start_time, end_time,
        classes ( name ),
        subjects ( name )
      `)
      .eq("teacher_id", teacherId || "")
      .eq("day_of_week", dayOfWeek)
      .lte("start_time", currentTime)
      .gte("end_time", currentTime)
      .maybeSingle(),
      
    // 2b. Today Sessions Count
    supabase
      .from("attendance_sessions")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId || "")
      .eq("session_date", today),
      
    // 2c. Total Sessions Count
    supabase
      .from("attendance_sessions")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId || ""),
      
    // 2d. Active Sessions
    supabase
      .from("attendance_sessions")
      .select(`id, subjects(name), session_date, status, qr_expires_at, created_at, classes(name)`)
      .eq("teacher_id", teacherId || "")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
      
    // 2e. Recent Sessions
    supabase
      .from("attendance_sessions")
      .select(`id, subjects(name), session_date, status, qr_expires_at, created_at, classes(name)`)
      .eq("teacher_id", teacherId || "")
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  const currentSchedule = scheduleRes.data;
  
  const nowTime = new Date().getTime();
  // Filter out expired sessions from activeSessions
  const activeSessions = (activeSessionsRes.data || []).filter(
    (s: any) => new Date(s.qr_expires_at).getTime() >= nowTime
  );
  
  const recentSessions = recentSessionsRes.data;

  // 4. Fetch AI classroom analytics for this teacher
  let teacherAnalytics = null;
  if (teacherId) {
    teacherAnalytics = await getTeacherSessionsAnalytics(teacherId);
  }

  // 3. Fetch activeScheduleSession sequentially ONLY if currentSchedule exists
  let activeScheduleSession = null;
  if (currentSchedule) {
    const { data: sess } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("class_id", currentSchedule.class_id)
      .eq("session_date", today)
      .eq("subject_id", currentSchedule.subject_id)
      .eq("status", "active")
      .maybeSingle();
    activeScheduleSession = sess;
  }

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard Guru"
        description="Portal Manajemen Sesi & Analitika Telemetri Kelas"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/teacher/scan"
              className="apple-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/60"
            >
              <QrCode className="h-4 w-4 text-primary" />
              <span>Scan QR</span>
            </Link>
            <Link
              href="/teacher/attendance/new"
              className="apple-press inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>Buka Sesi Baru</span>
            </Link>
          </div>
        }
      />

      {/* Push Notification Reminder Banner */}
      {!hasPushSubscription && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-2xs relative overflow-hidden flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="absolute -right-4 -top-4 text-primary/10 pointer-events-none">
            <Bell className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 animate-pulse" />
              Pengingat Jadwal Mengajar Otomatis
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed font-medium">
              Aktifkan push notification untuk mendapatkan reminder presensi 30 menit sebelum sesi kelas dimulai.
            </p>
          </div>
          <Link
            href="/teacher?setup=notif"
            className="apple-press relative z-10 shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm shadow-primary/20 whitespace-nowrap w-full sm:w-auto"
          >
            Aktifkan Sekarang
          </Link>
        </div>
      )}

      {/* Current Schedule / Verification Code Section */}
      {currentSchedule && (
        <div className="overflow-hidden rounded-xl border-2 border-amber-200 bg-white shadow-md">
          <div className="bg-[#FBF9F5] px-5 py-3 border-b border-[#E7E2DA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EA580C]" />
              </span>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Jadwal Mengajar Aktif Saat Ini</h3>
            </div>
            <span className="text-xs font-mono font-semibold text-stone-700 bg-white px-2.5 py-0.5 rounded-md border border-[#E7E2DA] shadow-2xs">
              {currentSchedule.start_time} - {currentSchedule.end_time} WIB
            </span>
          </div>
          <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
            <div>
              <p className="text-lg font-bold text-stone-900 tracking-tight">{(currentSchedule.subjects as any)?.name}</p>
              <p className="text-xs text-stone-500 mt-0.5">Kelas: <span className="font-semibold text-stone-700">{(currentSchedule.classes as any)?.name}</span></p>
            </div>

            {activeScheduleSession ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-[#EA580C] p-4 min-w-[160px] text-white shadow-xs apple-press">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Sesi Aktif</span>
                <span className="text-base font-bold mt-0.5">SIAP SCAN</span>
                <Link href={`/teacher/attendance/${activeScheduleSession.id}`} className="mt-2 text-xs font-semibold underline underline-offset-2 opacity-95 hover:opacity-100">
                  Buka Konsol Sesi →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl bg-[#FBF9F5] p-5 min-w-[160px] border border-[#E7E2DA]">
                <Link
                  href="/teacher/scan"
                  className="w-full text-center rounded-lg bg-[#EA580C] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#C2410C] active:scale-[0.97] uppercase tracking-wider apple-press"
                >
                  Mulai Sesi Mengajar
                </Link>
                <p className="text-[10px] text-stone-500 font-medium mt-1.5 font-mono">Scan QR & Kamera AI</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Sesi Hari Ini"
          value={todaySessionsRes.count || 0}
          description="Sesi absensi hari ini"
          icon={ClipboardCheck}
        />
        <StatCard
          title="Total Sesi"
          value={totalSessionsRes.count || 0}
          description="Sesi dibuat sepanjang waktu"
          icon={BarChart3}
        />
        <StatCard
          title="Sesi Aktif"
          value={activeSessions?.length || 0}
          description="Sesi yang sedang berjalan"
          icon={QrCode}
        />
      </div>

      {/* Active Sessions */}
      {activeSessions && activeSessions.length > 0 && (
        <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 shadow-2xs">
          <div className="mb-3.5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              Sesi Mengajar yang Sedang Berjalan
            </h3>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {activeSessions.length} Berlangsung
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeSessions.map((session: Record<string, unknown>) => {
              const classes = session.classes as unknown as Record<string, unknown> | null;
              return (
                <Link
                  key={session.id as string}
                  href={`/teacher/attendance/${session.id}`}
                  className="flex items-center justify-between rounded-xl border border-[#E7E2DA] bg-white p-4 shadow-2xs card-hover apple-press"
                >
                  <div>
                    <p className="text-xs font-bold text-stone-900">
                      {(session.subjects as any)?.name || "—"}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {(classes?.name as string) || "—"} • Klik untuk kelola
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-emerald-700">
                    <QrCode className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Classroom Analytics */}
      {teacherAnalytics && teacherAnalytics.total_sessions > 0 && (
        <TeacherSessionsAnalytics data={teacherAnalytics} />
      )}

      {/* Recent Sessions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">
            Riwayat Sesi Terkini
          </h3>
          <Link
            href="/teacher/history"
            className="text-xs font-medium text-primary hover:underline"
          >
            Lihat Semua
          </Link>
        </div>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="divide-y divide-border">
            {recentSessions.map((session: Record<string, unknown>) => {
              const classes = session.classes as unknown as Record<string, unknown> | null;
              return (
                <Link
                  key={session.id as string}
                  href={`/teacher/attendance/${session.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {(session.subjects as any)?.name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(classes?.name as string) || "—"} •{" "}
                      {session.session_date as string}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${session.status === "active" && new Date(session.qr_expires_at as string).getTime() >= nowTime
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {session.status === "active" && new Date(session.qr_expires_at as string).getTime() >= nowTime ? "Aktif" : "Selesai"}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Belum ada sesi absensi. Buat sesi pertama Anda!
          </div>
        )}
      </div>
    </div>
  );
}

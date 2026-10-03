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
        description="Kelola absensi kelas Anda"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/teacher/scan"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <QrCode className="h-4 w-4" />
              Scan QR
            </Link>
            <Link
              href="/teacher/attendance/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Buat Absensi
            </Link>
          </div>
        }
      />

      {/* Push Notification Reminder Banner */}
      {!hasPushSubscription && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="absolute -right-4 -top-4 text-blue-100 opacity-50">
            <Bell className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 animate-pulse" />
              Pengingat Jadwal Mengajar (Baru!)
            </h3>
            <p className="text-xs text-blue-700 mt-1 max-w-lg leading-relaxed">
              Aktifkan notifikasi aplikasi untuk mendapatkan pengingat otomatis di HP Anda 30 menit sebelum jam kelas dimulai. Bebas dari risiko WA diblokir!
            </p>
          </div>
          <Link
            href="/teacher?setup=notif"
            className="relative z-10 shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm active:scale-95 whitespace-nowrap w-full sm:w-auto"
          >
            Aktifkan Sekarang
          </Link>
        </div>
      )}

      {/* Current Schedule / Verification Code Section */}
      {currentSchedule && (
        <div className="overflow-hidden rounded-xl border-2 border-amber-200 bg-white shadow-md">
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <h3 className="text-sm font-bold text-amber-800 uppercase tracking-tight">Jadwal Aktif Saat Ini</h3>
            </div>
            <span className="text-xs font-medium text-amber-600 bg-white px-2 py-0.5 rounded-full border border-amber-200">
              {currentSchedule.start_time} - {currentSchedule.end_time}
            </span>
          </div>
          <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xl font-black text-foreground">{(currentSchedule.subjects as any)?.name}</p>
              <p className="text-sm text-muted-foreground">Kelas: {(currentSchedule.classes as any)?.name}</p>
            </div>

            {activeScheduleSession ? (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-600 p-4 min-w-[160px] text-white shadow-lg shadow-amber-600/30">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Sesi Aktif</span>
                <span className="text-xl font-black mt-1">SIAP SCAN</span>
                <Link href={`/teacher/attendance/${activeScheduleSession.id}`} className="mt-2 text-[10px] font-bold underline opacity-90 hover:opacity-100">
                  Lihat Daftar Hadir
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 p-6 min-w-[160px] border-2 border-amber-200 shadow-sm">
                <Link
                  href="/teacher/scan"
                  className="w-full text-center rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white shadow-md transition-all hover:bg-amber-700 active:scale-95 uppercase tracking-widest"
                >
                  Mulai Scan
                </Link>
                <p className="text-[10px] text-amber-600/70 font-medium mt-2">Otomatis Catat Hadir</p>
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
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Sesi Aktif
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeSessions.map((session: Record<string, unknown>) => {
              const classes = session.classes as unknown as Record<string, unknown> | null;
              return (
                <Link
                  key={session.id as string}
                  href={`/teacher/attendance/${session.id}`}
                  className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {(session.subjects as any)?.name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(classes?.name as string) || "—"}
                    </p>
                  </div>
                  <QrCode className="h-5 w-5 text-emerald-600" />
                </Link>
              );
            })}
          </div>
        </div>
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

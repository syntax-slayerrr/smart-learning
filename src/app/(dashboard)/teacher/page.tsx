import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  ClipboardCheck,
  School,
  BarChart3,
  Plus,
  QrCode,
  Bell,
  PlayCircle,
  Clock,
  ChevronRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Camera,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getTeacherSessionsAnalytics } from "@/services/student-analytics";
import { TeacherSessionsAnalytics } from "@/components/dashboard/teacher-sessions-analytics";
import { SearchPill } from "@/components/ui/search-pill";
import { AsymmetricMetricDeck } from "@/components/dashboard/asymmetric-metric-deck";
import { RadialIntelligenceGauge } from "@/components/dashboard/radial-intelligence-gauge";
import {
  TriMetricMatrix,
  TriMetricItem,
} from "@/components/dashboard/tri-metric-matrix";

export const metadata: Metadata = {
  title: "Dashboard Guru — Smart Learning",
};

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get teacher record
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, profiles(full_name, push_subscription)")
    .eq("profile_id", user.id)
    .single();

  const teacherId = teacher?.id;
  const teacherProfile = (teacher?.profiles as unknown) as Record<
    string,
    unknown
  > | null;
  const teacherName = (teacherProfile?.full_name as string) || "Bapak/Ibu Guru";
  const hasPushSubscription = !!teacherProfile?.push_subscription;

  // 1. Get current time in WIB
  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
  const dayOfWeek = nowWib.getUTCDay();
  const currentTime =
    nowWib.getUTCHours().toString().padStart(2, "0") +
    ":" +
    nowWib.getUTCMinutes().toString().padStart(2, "0");
  const today = nowWib.toISOString().split("T")[0];

  const hour = nowWib.getUTCHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
      ? "Selamat siang"
      : hour < 18
      ? "Selamat sore"
      : "Selamat malam";

  // 2. RUN ALL INDEPENDENT QUERIES CONCURRENTLY
  const [
    scheduleRes,
    todaySessionsRes,
    totalSessionsRes,
    activeSessionsRes,
    recentSessionsRes,
  ] = await Promise.all([
    // 2a. Current Schedule
    supabase
      .from("schedules")
      .select(
        `
        id, class_id, subject_id, start_time, end_time,
        classes ( name ),
        subjects ( name )
      `
      )
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
      .select(
        `id, subjects(name), session_date, status, qr_expires_at, created_at, classes(name)`
      )
      .eq("teacher_id", teacherId || "")
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    // 2e. Recent Sessions
    supabase
      .from("attendance_sessions")
      .select(
        `id, subjects(name), session_date, status, qr_expires_at, created_at, classes(name)`
      )
      .eq("teacher_id", teacherId || "")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const currentSchedule = scheduleRes.data;
  const nowTime = new Date().getTime();

  // Filter out expired sessions from activeSessions
  const activeSessions = (activeSessionsRes.data || []).filter(
    (s: Record<string, unknown>) =>
      new Date(s.qr_expires_at as string).getTime() >= nowTime
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

  const teacherMetrics: TriMetricItem[] = [
    {
      id: "active-sessions",
      label: "Sesi Aktif",
      value: activeSessions.length,
      sublabel: "Bisa Di-scan",
      icon: PlayCircle,
      variant: activeSessions.length > 0 ? "success" : "primary",
    },
    {
      id: "today-total",
      label: "Sesi Hari Ini",
      value: todaySessionsRes.count || 0,
      sublabel: "Tuntas Terjadwal",
      icon: Clock,
      variant: "primary",
    },
    {
      id: "total-history",
      label: "Total Sesi",
      value: totalSessionsRes.count || 0,
      sublabel: "Sepanjang Masa",
      icon: CheckCircle2,
      variant: "primary",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      {/* 1. Mobile Contextual Greeting & Atmosphere */}
      <div className="flex items-center justify-between pt-1 sm:hidden">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-950 text-white font-bold text-sm shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)] border border-white/20">
            <span>{teacherName.charAt(0)}</span>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                Guru Pengajar
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[11px] text-slate-400">
                {activeSessions.length > 0
                  ? `${activeSessions.length} sesi aktif`
                  : "Standby"}
              </span>
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {greeting}, {teacherName.split(" ")[0]}
            </h1>
          </div>
        </div>

        {/* Quick New Session Action */}
        <Link
          href="/teacher/attendance/new"
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)] active:scale-95 transition-transform"
          aria-label="Buka Sesi Baru"
        >
          <Plus className="h-5 w-5 stroke-[2.2]" />
        </Link>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:block">
        <PageHeader
          eyebrow="RUANG KERJA GURU"
          title={`${greeting}, ${teacherName}`}
          description="Jadwal mengajar, absensi kelas, dan rekap keaktifan siswa"
          action={
            <div className="flex items-center gap-2.5">
              <Link
                href="/teacher/scan"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors apple-press min-h-[44px]"
              >
                <QrCode className="h-4 w-4 text-blue-600" />
                <span>Scan QR</span>
              </Link>
              <Link
                href="/teacher/attendance/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors apple-press min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                <span>Mulai Jam Pelajaran</span>
              </Link>
            </div>
          }
        />
      </div>

      {/* Push Notification Reminder Banner */}
      {!hasPushSubscription && (
        <div className="card-3d-ceramic p-4 relative overflow-hidden flex flex-col sm:flex-row gap-4 items-center justify-between border-blue-200/80 bg-gradient-to-r from-blue-50/70 to-indigo-50/50">
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Bell className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                Pengingat Jadwal Mengajar
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 max-w-lg leading-relaxed font-medium">
                Aktifkan push notification untuk mendapatkan reminder presensi
                30 menit sebelum sesi kelas dimulai.
              </p>
            </div>
          </div>
          <Link
            href="/teacher?setup=notif"
            className="card-3d-chip shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm whitespace-nowrap w-full sm:w-auto"
          >
            Aktifkan Sekarang
          </Link>
        </div>
      )}

      {/* Current Active Schedule Banner (Elevated 3D) */}
      {currentSchedule && (
        <div className="card-3d-navy p-5 text-white relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Kelas Sedang Berlangsung
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-white bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/15">
              {currentSchedule.start_time} - {currentSchedule.end_time} WIB
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-lg font-extrabold text-white tracking-tight">
                {((Array.isArray(currentSchedule.subjects)
                  ? currentSchedule.subjects[0]
                  : currentSchedule.subjects) as unknown as Record<string, unknown>)?.name as string}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Kelas:{" "}
                <span className="font-bold text-white">
                  {((Array.isArray(currentSchedule.classes)
                    ? currentSchedule.classes[0]
                    : currentSchedule.classes) as unknown as Record<string, unknown>)?.name as string}
                </span>
              </p>
            </div>

            {activeScheduleSession ? (
              <Link
                href={`/teacher/attendance/${activeScheduleSession.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all apple-press"
              >
                <PlayCircle className="h-4 w-4" />
                <span>Buka Lembar Kelas Sekarang →</span>
              </Link>
            ) : (
              <Link
                href="/teacher/scan"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 active:scale-95 transition-all apple-press"
              >
                <QrCode className="h-4 w-4" />
                <span>Mulai Jam Mengajar</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 2. Tactile Search Capsule Bar */}
      <SearchPill placeholder="Cari nama mata pelajaran, riwayat kelas, atau sesi..." />

      {/* 3. Asymmetric Dual Metric Deck */}
      <AsymmetricMetricDeck
        attendanceRate={
          teacherAnalytics?.total_sessions
            ? Math.round(
                (teacherAnalytics.sessions_with_telemetry /
                  teacherAnalytics.total_sessions) *
                  100
              )
            : 0
        }
        leftCard={{
          label: "Total Sesi Mengajar",
          value: totalSessionsRes.count || 0,
          unit: "Sesi",
          sublabel:
            (todaySessionsRes.count || 0) > 0
              ? `${todaySessionsRes.count || 0} sesi kelas aktif hari ini`
              : "Siap membuka sesi jam pelajaran",
          href: "/teacher/attendance",
          statusText: "Jadwal Aktif",
          icon: "book",
        }}
        rightCard={{
          label: "Presensi Rata-rata",
          href: "/teacher/attendance",
          sublabel: "kehadiran siswa",
          actionText: "Riwayat Sesi",
        }}
      />

      {/* Flagship: AI Classroom Vision & Live Monitor */}
      <div className="card-3d-ceramic relative overflow-hidden p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-blue-200/80 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-2xs">
            <Camera className="h-6 w-6 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                AI Classroom Vision & Live Monitor
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream & AI
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
              Pantau atensi, fokus, dan interaksi siswa di kelas secara real-time. Sinkronisasi presensi otomatis dan visual bounding box berbasis AI Edge.
            </p>
          </div>
        </div>
        <Link
          href="/teacher/camera-monitor"
          className="apple-press inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <span>Buka Live Monitor Kelas</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 4. Quick Access Squircle Chips */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            Menu Tindakan Cepat
          </span>
          <span className="text-[11px] text-slate-400">Akses Cepat</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          <Link
            href="/teacher/attendance/new"
            className="card-3d-chip flex items-center gap-3 p-3 text-left sm:flex-col sm:items-center sm:text-center sm:p-3.5 group active:scale-95 transition-all"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 sm:mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5 stroke-[2]" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col sm:items-center">
              <span className="text-xs sm:text-xs font-bold text-slate-900 tracking-tight truncate sm:line-clamp-1">
                Buka Sesi
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full mt-0.5 sm:mt-1 border border-blue-100/60 w-fit">
                Baru
              </span>
            </div>
          </Link>

          <Link
            href="/teacher/materials"
            className="card-3d-chip flex items-center gap-3 p-3 text-left sm:flex-col sm:items-center sm:text-center sm:p-3.5 group active:scale-95 transition-all"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/60 sm:mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col sm:items-center">
              <span className="text-xs sm:text-xs font-bold text-slate-900 tracking-tight truncate sm:line-clamp-1">
                Bahan Ajar
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-0.5 sm:mt-1 border border-amber-100/60 w-fit">
                Modul AI
              </span>
            </div>
          </Link>

          <Link
            href="/teacher/scan"
            className="card-3d-chip flex items-center gap-3 p-3 text-left sm:flex-col sm:items-center sm:text-center sm:p-3.5 group active:scale-95 transition-all"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 sm:mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <QrCode className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col sm:items-center">
              <span className="text-xs sm:text-xs font-bold text-slate-900 tracking-tight truncate sm:line-clamp-1">
                Scan Siswa
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full mt-0.5 sm:mt-1 border border-slate-100 w-fit">
                Kamera
              </span>
            </div>
          </Link>

          <Link
            href="/teacher/schedule"
            className="card-3d-chip flex items-center gap-3 p-3 text-left sm:flex-col sm:items-center sm:text-center sm:p-3.5 group active:scale-95 transition-all"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100/60 sm:mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <Calendar className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col sm:items-center">
              <span className="text-xs sm:text-xs font-bold text-slate-900 tracking-tight truncate sm:line-clamp-1">
                Jadwal Mengajar
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full mt-0.5 sm:mt-1 border border-sky-100/60 w-fit">
                Mingguan
              </span>
            </div>
          </Link>

          <Link
            href="/teacher/history"
            className="card-3d-chip flex items-center gap-3 p-3 text-left sm:flex-col sm:items-center sm:text-center sm:p-3.5 group active:scale-95 transition-all"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 sm:mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <ClipboardCheck className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col sm:items-center">
              <span className="text-xs sm:text-xs font-bold text-slate-900 tracking-tight truncate sm:line-clamp-1">
                Riwayat Sesi
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-0.5 sm:mt-1 border border-emerald-100/60 w-fit">
                {totalSessionsRes.count || 0}
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 5. Concentric Health Gauge & Diagnostics */}
      <div className="grid gap-4 md:grid-cols-2">
        <RadialIntelligenceGauge
          score={
            teacherAnalytics?.total_sessions
              ? Math.round(
                  (teacherAnalytics.sessions_with_telemetry /
                    teacherAnalytics.total_sessions) *
                    100
                )
              : 0
          }
          title="Telemetri AI Terintegrasi"
          subtitle="Persentase sesi kelas yang telah dilengkapi telemetri kamera & sensor visual AI"
        />

        <div className="flex flex-col justify-between space-y-4">
          <TriMetricMatrix metrics={teacherMetrics} />

          {/* Active Sessions Mini Card */}
          <div className="card-3d-ceramic p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Sesi Sedang Berjalan
                </h3>
              </div>
              <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                {activeSessions.length} Berlangsung
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {activeSessions && activeSessions.length > 0 ? (
                activeSessions.slice(0, 3).map((session: Record<string, unknown>) => {
                  const sub = session.subjects as Record<string, unknown> | null;
                  const cls = session.classes as Record<string, unknown> | null;
                  return (
                    <Link
                      key={session.id as string}
                      href={`/teacher/attendance/${session.id}`}
                      className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-slate-50/60 rounded-lg px-1 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {(sub?.name as string) || "Mata Pelajaran"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {(cls?.name as string) || "Kelas"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <span>Kelola Sesi</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  Tidak ada sesi yang sedang berlangsung saat ini
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Classroom Analytics (if available) */}
      {teacherAnalytics && teacherAnalytics.total_sessions > 0 && (
        <TeacherSessionsAnalytics data={teacherAnalytics} />
      )}

      {/* 6. Recent Sessions Activity Feed */}
      <div className="card-3d-ceramic overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Riwayat Sesi Terkini
            </h3>
          </div>
          <Link
            href="/teacher/history"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
          >
            <span>Semua Riwayat</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentSessions && recentSessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentSessions.map((session: Record<string, unknown>) => {
              const sub = session.subjects as Record<string, unknown> | null;
              const cls = session.classes as Record<string, unknown> | null;
              const isActive =
                session.status === "active" &&
                new Date(session.qr_expires_at as string).getTime() >= nowTime;

              return (
                <Link
                  key={session.id as string}
                  href={`/teacher/attendance/${session.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                      <BookOpen className="h-4 w-4 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {(sub?.name as string) || "Mata Pelajaran"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {(cls?.name as string) || "Kelas"} •{" "}
                        {session.session_date as string}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : "bg-slate-100 text-slate-600 border-slate-200/60"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {isActive ? "Aktif" : "Selesai"}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-slate-400">
            Belum ada sesi absensi tercatat
          </div>
        )}
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { LiveCameraMonitor } from "@/components/dashboard/live-camera-monitor";
import { ClassroomIntelligenceOverview } from "@/components/dashboard/classroom-intelligence-overview";
import {
  Users,
  GraduationCap,
  School,
  ClipboardCheck,
  Plus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { AdminScannerTrigger } from "./scanner-trigger";
import { DailyRecapTrigger } from "./rekap-trigger";
import { AccreditationExportTrigger } from "./accreditation-trigger";
import { getAttendanceTrend, getTopAbsentees } from "./analytics";
import { getSchoolOverview } from "@/services/student-analytics";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    studentsRes,
    teachersRes,
    classesRes,
    todaySessionsRes,
    recentSessionsRes,
    trendData,
    topAbsentees,
    schoolOverview
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("attendance_sessions")
      .select("id", { count: "exact", head: true })
      .eq("session_date", new Date().toISOString().split("T")[0]),
    supabase
      .from("attendance_sessions")
      .select(`
        id,
        subjects ( name ),
        session_date,
        status,
        created_at,
        classes ( name ),
        teachers ( profiles ( full_name ) )
      `)
      .order("created_at", { ascending: false })
      .limit(5),
    getAttendanceTrend(),
    getTopAbsentees(),
    getSchoolOverview()
  ]);

  const stats = {
    totalStudents: studentsRes.count || 0,
    totalTeachers: teachersRes.count || 0,
    totalClasses: classesRes.count || 0,
    todaySessions: todaySessionsRes.count || 0,
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
      ? "Selamat siang"
      : hour < 18
      ? "Selamat sore"
      : "Selamat malam";

  const recentSessions = recentSessionsRes.data;
  const activeSessionsCount = recentSessions?.filter((s: any) => s.status === "active").length || 0;

  const todayDateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="dashboard-container space-y-6">
      {/* Operational Command Header */}
      <PageHeader
        eyebrow="PUSAT KENDALI OPERASIONAL • SMK TI SYNTAX SLAYER"
        title={`${greeting}, Administrator`}
        description={`${todayDateFormatted} • Tahun Ajaran 2025/2026 — Pantau presensi, aktivitas AI classroom, dan telemetri akademik secara langsung`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AccreditationExportTrigger />
            <DailyRecapTrigger />
            <AdminScannerTrigger />
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 active:scale-[0.98] transition-all min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </Link>
          </div>
        }
      />

      {/* Operational Pulse Strip - Asymmetrical Bento Grid */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Module 1: Daily Learning & Presence Pulse (Span 6) */}
        <div className="md:col-span-6 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                STATUS HARIAN KELAS
              </span>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-0.5">
                Sesi Pembelajaran & Presensi
              </h2>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-zinc-800 px-3 py-1 text-xs font-mono font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{activeSessionsCount} Sesi Berlangsung</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4 pt-2 border-t border-stone-100 dark:border-white/5">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Total Sesi Terjadwal Hari Ini</p>
              <p className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-mono mt-0.5">
                {stats.todaySessions}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Rombel Aktif Terdaftar</p>
              <p className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-mono mt-0.5">
                {stats.totalClasses}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-white/5">
            <Link
              href="/admin/attendance"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1 group"
            >
              <span>Buka Monitor Presensi Siswa Lengkap</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="text-[11px] font-mono text-stone-400">Real-time sync</span>
          </div>
        </div>

        {/* Module 2: School Directory Strength (Span 3) */}
        <div className="md:col-span-3 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                CIVITAS AKADEMIK
              </span>
              <Users className="h-4 w-4 text-stone-400" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
              Populasi Terdaftar
            </h3>
          </div>

          <div className="space-y-3 my-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-600 dark:text-stone-400">Siswa Aktif</span>
              <span className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                {stats.totalStudents}
              </span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-600 h-full rounded-full" style={{ width: "100%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-600 dark:text-stone-400">Guru Pengampu</span>
              <span className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                {stats.totalTeachers}
              </span>
            </div>
          </div>

          <Link
            href="/admin/students"
            className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-white/5"
          >
            <span>Kelola Direktori Siswa</span>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          </Link>
        </div>

        {/* Module 3: AI Telemetry Engine Overview (Span 3) */}
        <div className="md:col-span-3 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                EDGE AI ENGINE
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
              AI Classroom Telemetry
            </h3>
          </div>

          <div className="my-3 space-y-1.5">
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Analisis postur, fokus & atensi siswa secara simultan berbasis computer vision.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              RTSP Stream Active
            </div>
          </div>

          <a
            href="#ai-classroom-workspace"
            className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-white/5"
          >
            <span>Lihat Monitor Langsung</span>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          </a>
        </div>
      </div>

      {/* AI Live Command Center */}
      <div id="ai-classroom-workspace" className="space-y-6 pt-2">
        <LiveCameraMonitor />
        <ClassroomIntelligenceOverview data={schoolOverview} />
      </div>

      {/* Analytics Dashboard (Kehadiran & Anomali) */}
      <AnalyticsDashboard trendData={trendData || []} topAbsentees={topAbsentees || []} />

      {/* Recent Sessions Table & Operational Gateways */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Sessions (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 px-5 py-3.5 bg-stone-50 dark:bg-zinc-800/50">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                Sesi Pembelajaran Terkini
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Aktivitas pembelajaran yang aktif maupun selesai hari ini
              </p>
            </div>
            <Link
              href="/admin/attendance"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Lihat Semua Sesi →
            </Link>
          </div>
          {recentSessions && recentSessions.length > 0 ? (
            <div className="divide-y divide-stone-100 dark:divide-white/5">
              {recentSessions.map((session: Record<string, unknown>) => {
                const classes = Array.isArray(session.classes) ? session.classes[0] : session.classes as unknown as Record<string, unknown> | null;
                const teachers = Array.isArray(session.teachers) ? session.teachers[0] : session.teachers as unknown as Record<string, unknown> | null;
                const profiles = Array.isArray(teachers?.profiles) ? teachers?.profiles[0] : teachers?.profiles as unknown as Record<string, unknown> | null;
                const subjects = Array.isArray(session.subjects) ? session.subjects[0] : session.subjects as unknown as Record<string, unknown> | null;
                const isActive = session.status === "active";
                return (
                  <div
                    key={session.id as string}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {(subjects?.name as string) || "—"}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">{(classes?.name as string) || "—"}</span> • Guru:{" "}
                        <span className="text-stone-900 dark:text-stone-100">{(profiles?.full_name as string) || "—"}</span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold"
                          : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-white/10"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                        }`}
                      />
                      {isActive ? "Aktif Berlangsung" : "Selesai"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-xs text-stone-500 dark:text-stone-400">
              Belum ada sesi absensi hari ini
            </div>
          )}
        </div>

        {/* Quick Operational Gateways (1 Col) */}
        <div className="space-y-3">
          <Link
            href="/admin/students"
            className="group flex items-center justify-between rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs hover:border-orange-500/40 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5 text-orange-600 dark:text-orange-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Direktori Siswa & Kartu Pintar
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Data induk, reset HP & cetak kartu
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-orange-600" />
          </Link>

          <Link
            href="/admin/teachers"
            className="group flex items-center justify-between rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs hover:border-orange-500/40 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-white/10 p-2.5 text-stone-800 dark:text-stone-200">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Direktori & Absensi Guru
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Guru pengampu & rekap jam kerja
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-orange-600" />
          </Link>

          <Link
            href="/admin/classes"
            className="group flex items-center justify-between rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs hover:border-orange-500/40 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-white/10 p-2.5 text-stone-800 dark:text-stone-200">
                <School className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Rombel & Denah Tempat Duduk
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Atur denah meja & binding AI camera
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-orange-600" />
          </Link>
        </div>
      </div>
    </div>
  );
}

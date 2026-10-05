import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AnalyticsDashboard } from "./analytics-dashboard";
import {
  Users,
  GraduationCap,
  School,
  ClipboardCheck,
  Plus,
  ArrowRight,
  Video,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Bell,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AdminScannerTrigger } from "./scanner-trigger";
import { DailyRecapTrigger } from "./rekap-trigger";
import { AccreditationExportTrigger } from "./accreditation-trigger";
import { getAttendanceTrend, getTopAbsentees } from "./analytics";
import { getSchoolOverview } from "@/services/student-analytics";

import { SearchPill } from "@/components/ui/search-pill";
import { AsymmetricMetricDeck } from "@/components/dashboard/asymmetric-metric-deck";
import { QuickAccessGrid } from "@/components/dashboard/quick-access-grid";
import {
  ActivityFeedCard,
  ActivitySessionItem,
} from "@/components/dashboard/activity-feed-card";
import { RadialIntelligenceGauge } from "@/components/dashboard/radial-intelligence-gauge";
import {
  TriMetricMatrix,
  TriMetricItem,
} from "@/components/dashboard/tri-metric-matrix";

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
    schoolOverview,
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
      .limit(6),
    getAttendanceTrend(),
    getTopAbsentees(),
    getSchoolOverview(),
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

  const latestTrend =
    trendData && trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const attendanceRate = latestTrend?.presentRate ?? 94.2;

  // Format recent sessions for modern activity feed
  const mappedSessions: ActivitySessionItem[] = (
    recentSessionsRes.data || []
  ).map((session: Record<string, unknown>) => {
    const classes = Array.isArray(session.classes)
      ? session.classes[0]
      : (session.classes as Record<string, unknown> | null);
    const teachers = Array.isArray(session.teachers)
      ? session.teachers[0]
      : (session.teachers as Record<string, unknown> | null);
    const profiles = Array.isArray(teachers?.profiles)
      ? teachers?.profiles[0]
      : (teachers?.profiles as Record<string, unknown> | null);
    const subjects = Array.isArray(session.subjects)
      ? session.subjects[0]
      : (session.subjects as Record<string, unknown> | null);
    const isActive = session.status === "active";

    const timeStr = session.created_at
      ? new Date(session.created_at as string).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "08:00";

    return {
      id: session.id as string,
      subject: (subjects?.name as string) || "Mata Pelajaran",
      className: (classes?.name as string) || "Kelas",
      teacherName: (profiles?.full_name as string) || "Guru Pengampu",
      time: timeStr,
      status: isActive ? "active" : "completed",
    };
  });

  // Tri-Metric telemetry stats for Screen 3 matrix
  const triMetrics: TriMetricItem[] = [
    {
      id: "attendance",
      label: "Tepat Waktu",
      value: `${Math.round(attendanceRate)}%`,
      sublabel: "Kehadiran",
      icon: "check",
      variant: "success",
    },
    {
      id: "attention",
      label: "Perlu Atensi",
      value:
        schoolOverview?.at_risk_students?.length ||
        topAbsentees?.length ||
        0,
      sublabel: "Siswa Pantau",
      icon: "warning",
      variant: "warning",
    },
    {
      id: "ai-sensor",
      label: "Kamera AI",
      value: schoolOverview?.total_sessions_with_telemetry
        ? `${schoolOverview.total_sessions_with_telemetry} Sesi`
        : "Aktif",
      sublabel: "Monitoring",
      icon: "video",
      variant: "primary",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      {/* 1. Mobile Contextual Greeting & Atmosphere (Proton Vault Header Style) */}
      <div className="flex items-center justify-between pt-1 sm:hidden">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white font-bold text-sm shadow-[0_4px_12px_-2px_rgba(15,23,42,0.3)] border border-white/20">
            <span>A</span>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                Admin Portal
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[11px] text-slate-400">ITG</span>
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {greeting}, Admin
            </h1>
          </div>
        </div>

        {/* Action / Notification Pill */}
        <Link
          href="/admin/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 border border-slate-200/80 shadow-[var(--shadow-3d-chip)] active:scale-95 transition-transform"
          aria-label="Notifikasi"
        >
          <Bell className="h-4 w-4 stroke-[1.8]" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600" />
        </Link>
      </div>

      {/* Desktop Page Header */}
      <div className="hidden sm:block">
        <PageHeader
          eyebrow="PORTAL ADMINISTRASI SEKOLAH"
          title={`${greeting}, Admin`}
          description="Ringkasan sekolah hari ini — pantau presensi, aktivitas AI classroom, dan telemetri akademik secara real-time"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <AccreditationExportTrigger />
              <DailyRecapTrigger />
              <AdminScannerTrigger />
              <Link
                href="/admin/students"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors apple-press min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                Tambah Siswa
              </Link>
            </div>
          }
        />
      </div>

      {/* 2. Tactile Search Capsule Bar (Proton Vault Pill Style) */}
      <SearchPill placeholder="Cari siswa, kelas, guru, atau modul..." />

      {/* 3. Asymmetric Dual Summary Deck (Proton Vault 50:50 Hero Cards) */}
      <AsymmetricMetricDeck
        totalStudents={stats.totalStudents}
        attendanceRate={attendanceRate}
        totalSessionsToday={stats.todaySessions}
      />

      {/* 4. Quick Access Squircle Chips (4-Column Floating Pods) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            Akses Cepat
          </span>
          <span className="text-[11px] text-slate-400">Pintasan Fitur</span>
        </div>
        <QuickAccessGrid />
      </div>

      {/* 5. Telemetry & Concentric Intelligence Visualizer (Proton Vault Screen 3) */}
      <div className="grid gap-4 md:grid-cols-2">
        <RadialIntelligenceGauge
          score={Math.round(attendanceRate)}
          title="Kesehatan Presensi & Pembelajaran"
          subtitle="Indeks gabungan ketertiban hadir dan keaktifan kelas"
        />

        <div className="space-y-4 flex flex-col justify-between">
          {/* Tri-Metric Diagnostic Matrix */}
          <TriMetricMatrix metrics={triMetrics} />

          {/* AI Classroom Vision Banner */}
          <div className="card-3d-ceramic p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)]">
                  <Video className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      AI Classroom Vision
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sensor interaksi & gesture keaktifan kelas
                  </p>
                </div>
              </div>

              <Link
                href="/admin/camera-monitor"
                className="apple-press inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors shrink-0"
              >
                <span>Buka</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Rata-rata interaksi per sesi</span>
              <span className="font-bold text-slate-900">
                {schoolOverview?.avg_hand_raises_per_session
                  ? `${schoolOverview.avg_hand_raises_per_session}x bertanya`
                  : "Aktif menyimak"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Structured Activity Feed (Recent Learning Sessions) */}
      <ActivityFeedCard
        sessions={mappedSessions}
        title="Pembelajaran Terkini"
        viewAllHref="/admin/attendance"
      />

      {/* 7. Comprehensive 30-Day Trend Chart & Siswa Butuh Perhatian */}
      <div className="pt-2">
        <AnalyticsDashboard
          trendData={trendData || []}
          topAbsentees={topAbsentees || []}
        />
      </div>

      {/* 8. Desktop Quick Management Cards */}
      <div className="grid gap-3.5 sm:grid-cols-3 pt-1">
        <Link
          href="/admin/students"
          className="card-3d-ceramic group flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60">
              <Users className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Kelola Siswa</p>
              <p className="text-[11px] text-slate-500">
                Data induk & kartu pintar
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
        </Link>

        <Link
          href="/admin/teachers"
          className="card-3d-ceramic group flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60">
              <GraduationCap className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Kelola Guru</p>
              <p className="text-[11px] text-slate-500">
                Pengampu & jadwal mengajar
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
        </Link>

        <Link
          href="/admin/classes"
          className="card-3d-ceramic group flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60">
              <School className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Kelola Kelas & Denah
              </p>
              <p className="text-[11px] text-slate-500">
                Denah meja & bangku siswa
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
        </Link>
      </div>
    </div>
  );
}

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

  return (
    <div className="dashboard-container space-y-6">
      {/* Page Header (Section 11 Page Shell) */}
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#007AFF] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0062CC] transition-colors apple-press min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </Link>
          </div>
        }
      />

      {/* Stats Grid (Section 23 & 6) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Siswa"
          value={stats.totalStudents}
          description="Siswa aktif terdaftar"
          icon={Users}
        />
        <StatCard
          title="Total Guru"
          value={stats.totalTeachers}
          description="Guru aktif terdaftar"
          icon={GraduationCap}
        />
        <StatCard
          title="Kelas Aktif"
          value={stats.totalClasses}
          description="Kelas tahun ajaran ini"
          icon={School}
        />
        <StatCard
          title="Sesi Hari Ini"
          value={stats.todaySessions}
          description="Sesi absensi dibuat hari ini"
          icon={ClipboardCheck}
        />
      </div>

      {/* Analytics Dashboard (Section 24) */}
      <AnalyticsDashboard trendData={trendData || []} topAbsentees={topAbsentees || []} />

      {/* AI Live Command Center (Section 22) */}
      <LiveCameraMonitor />

      {/* AI Classroom Intelligence */}
      <ClassroomIntelligenceOverview data={schoolOverview} />

      {/* Quick Actions (Section 12 Buttons / Cards) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/students"
          className="group flex items-center justify-between rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white p-4 shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-card)] transition-all apple-press"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#007AFF]/10 border border-[rgba(0,122,255,0.15)] p-2.5 text-[#007AFF]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1D1D1F]">
                Kelola Siswa
              </p>
              <p className="text-[11px] text-[#6E6E73]">
                Data induk & cetak kartu pintar
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#8E8E93] transition-transform group-hover:translate-x-1 group-hover:text-[#007AFF]" />
        </Link>

        <Link
          href="/admin/teachers"
          className="group flex items-center justify-between rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white p-4 shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-card)] transition-all apple-press"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#F2F2F0] border border-[rgba(60,60,67,0.10)] p-2.5 text-[#1D1D1F]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1D1D1F]">
                Kelola Guru
              </p>
              <p className="text-[11px] text-[#6E6E73]">
                Guru pengampu & rekap presensi
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#8E8E93] transition-transform group-hover:translate-x-1 group-hover:text-[#007AFF]" />
        </Link>

        <Link
          href="/admin/classes"
          className="group flex items-center justify-between rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white p-4 shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-card)] transition-all apple-press"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#F2F2F0] border border-[rgba(60,60,67,0.10)] p-2.5 text-[#1D1D1F]">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1D1D1F]">
                Kelola Kelas & Denah
              </p>
              <p className="text-[11px] text-[#6E6E73]">
                Atur meja & binding tempat duduk
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#8E8E93] transition-transform group-hover:translate-x-1 group-hover:text-[#007AFF]" />
        </Link>
      </div>

      {/* Recent Sessions Table (Section 16 & 20) */}
      <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgba(60,60,67,0.12)] px-5 py-3.5 bg-[#F7F7F5]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
            Sesi Pembelajaran Terkini
          </h3>
          <Link
            href="/admin/attendance"
            className="text-xs font-semibold text-[#007AFF] hover:underline"
          >
            Lihat Semua Sesi →
          </Link>
        </div>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="divide-y divide-[rgba(60,60,67,0.08)]">
            {recentSessions.map((session: Record<string, unknown>) => {
              const classes = Array.isArray(session.classes) ? session.classes[0] : session.classes as unknown as Record<string, unknown> | null;
              const teachers = Array.isArray(session.teachers) ? session.teachers[0] : session.teachers as unknown as Record<string, unknown> | null;
              const profiles = Array.isArray(teachers?.profiles) ? teachers?.profiles[0] : teachers?.profiles as unknown as Record<string, unknown> | null;
              const subjects = Array.isArray(session.subjects) ? session.subjects[0] : session.subjects as unknown as Record<string, unknown> | null;
              const isActive = session.status === "active";
              return (
                <div
                  key={session.id as string}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#F7F7F5] transition-colors duration-75"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#1D1D1F]">
                      {(subjects?.name as string) || "—"}
                    </p>
                    <p className="text-[11px] text-[#6E6E73]">
                      {(classes?.name as string) || "—"} • Guru:{" "}
                      <span className="text-[#1D1D1F]">{(profiles?.full_name as string) || "—"}</span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      isActive ? "text-[#34C759] font-semibold" : "text-[#6E6E73]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? "bg-[#34C759] animate-pulse" : "bg-[#AEAEB2]"
                      }`}
                    />
                    {isActive ? "Aktif Berlangsung" : "Selesai"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-[#8E8E93]">
            Belum ada sesi absensi hari ini
          </div>
        )}
      </div>
    </div>
  );
}

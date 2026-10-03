import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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
import { AnalyticsDashboard } from "./analytics-dashboard";
import { getSchoolOverview } from "@/services/student-analytics";
import { ClassroomIntelligenceOverview } from "@/components/dashboard/classroom-intelligence-overview";
import { LiveCameraMonitor } from "@/components/dashboard/live-camera-monitor";

export const metadata: Metadata = {
  title: "Dashboard Admin",
};

export const maxDuration = 60; // Allow server actions to run up to 60 seconds


export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch all stats and recent sessions concurrently for maximum speed
  const [
    studentsRes, 
    teachersRes, 
    classesRes, 
    todaySessionsRes, 
    recentSessionsRes,
    trendData,
    topAbsentees,
    schoolOverview
  ] =
    await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("teachers").select("id", { count: "exact", head: true }),
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

  const recentSessions = recentSessionsRes.data;
  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard Admin"
        description="Ringkasan data sekolah dan aktivitas terkini"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AccreditationExportTrigger />
            <DailyRecapTrigger />
            <AdminScannerTrigger />
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </Link>
          </div>
        }
      />

      {/* Stats Grid */}
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

      {/* Analytics Dashboard */}
      <AnalyticsDashboard trendData={trendData || []} topAbsentees={topAbsentees || []} />

      {/* AI Live Command Center (USB Smartphone Camera & Real-Time Telemetry) */}
      <LiveCameraMonitor />

      {/* AI Classroom Intelligence */}
      <ClassroomIntelligenceOverview data={schoolOverview} />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/students"
          className="group flex items-center justify-between rounded-xl border border-[#E7E2DA] bg-white p-4 shadow-2xs card-hover apple-press"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2.5 text-[#EA580C]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">
                Kelola Siswa
              </p>
              <p className="text-[11px] text-stone-500">
                Data induk & cetak kartu pintar
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-[#EA580C]" />
        </Link>

        <Link
          href="/admin/teachers"
          className="group flex items-center justify-between rounded-xl border border-[#E7E2DA] bg-white p-4 shadow-2xs card-hover apple-press"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-stone-100 border border-[#E7E2DA] p-2.5 text-stone-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">
                Kelola Guru
              </p>
              <p className="text-[11px] text-stone-500">
                Guru pengampu & rekap presensi
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-[#EA580C]" />
        </Link>

        <Link
          href="/admin/classes"
          className="group flex items-center justify-between rounded-xl border border-[#E7E2DA] bg-white p-4 shadow-2xs card-hover apple-press"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-stone-100 border border-[#E7E2DA] p-2.5 text-stone-700">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">
                Kelola Kelas & Denah
              </p>
              <p className="text-[11px] text-stone-500">
                Atur meja & binding tempat duduk
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-[#EA580C]" />
        </Link>
      </div>

      {/* Recent Sessions Table */}
      <div className="rounded-xl border border-[#E7E2DA] bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] px-5 py-3.5 bg-[#FBF9F5]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
            Sesi Pembelajaran Terkini
          </h3>
          <Link
            href="/admin/attendance"
            className="text-xs font-semibold text-[#EA580C] hover:underline"
          >
            Lihat Semua Sesi →
          </Link>
        </div>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="divide-y divide-[#E7E2DA]/60">
            {recentSessions.map((session: Record<string, unknown>) => {
              const classes = Array.isArray(session.classes) ? session.classes[0] : session.classes as unknown as Record<string, unknown> | null;
              const teachers = Array.isArray(session.teachers) ? session.teachers[0] : session.teachers as unknown as Record<string, unknown> | null;
              const profiles = Array.isArray(teachers?.profiles) ? teachers?.profiles[0] : teachers?.profiles as unknown as Record<string, unknown> | null;
              const subjects = Array.isArray(session.subjects) ? session.subjects[0] : session.subjects as unknown as Record<string, unknown> | null;
              const isActive = session.status === "active";
              return (
                <div
                  key={session.id as string}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#FBF9F5] transition-colors duration-75"
                >
                  <div>
                    <p className="text-xs font-semibold text-stone-900">
                      {(subjects?.name as string) || "—"}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {(classes?.name as string) || "—"} • Guru:{" "}
                      <span className="text-stone-700">{(profiles?.full_name as string) || "—"}</span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      isActive ? "text-emerald-700 font-semibold" : "text-stone-500"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? "bg-emerald-600 animate-pulse" : "bg-stone-400"
                      }`}
                    />
                    {isActive ? "Aktif Berlangsung" : "Selesai"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-stone-400">
            Belum ada sesi absensi hari ini
          </div>
        )}
      </div>
    </div>
  );
}

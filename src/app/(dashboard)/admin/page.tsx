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
import { getAttendanceTrend, getTopAbsentees } from "./analytics";
import { AnalyticsDashboard } from "./analytics-dashboard";

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
    topAbsentees
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
      getTopAbsentees()
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

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/students"
          className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Kelola Siswa
              </p>
              <p className="text-xs text-muted-foreground">
                Tambah, edit, hapus siswa
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="/admin/teachers"
          className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Kelola Guru
              </p>
              <p className="text-xs text-muted-foreground">
                Tambah, edit, hapus guru
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="/admin/classes"
          className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <School className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Kelola Kelas
              </p>
              <p className="text-xs text-muted-foreground">
                Atur kelas dan wali kelas
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Recent Sessions Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">
            Sesi Absensi Terkini
          </h3>
          <Link
            href="/admin/attendance"
            className="text-xs font-medium text-primary hover:underline"
          >
            Lihat Semua
          </Link>
        </div>
        {recentSessions && recentSessions.length > 0 ? (
          <div className="divide-y divide-border">
            {recentSessions.map((session: Record<string, unknown>) => {
              const classes = Array.isArray(session.classes) ? session.classes[0] : session.classes as unknown as Record<string, unknown> | null;
              const teachers = Array.isArray(session.teachers) ? session.teachers[0] : session.teachers as unknown as Record<string, unknown> | null;
              const profiles = Array.isArray(teachers?.profiles) ? teachers?.profiles[0] : teachers?.profiles as unknown as Record<string, unknown> | null;
              const subjects = Array.isArray(session.subjects) ? session.subjects[0] : session.subjects as unknown as Record<string, unknown> | null;
              return (
                <div
                  key={session.id as string}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {(subjects?.name as string) || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(classes?.name as string) || "—"} •{" "}
                      {(profiles?.full_name as string) || "—"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      session.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {session.status === "active" ? "Aktif" : "Selesai"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Belum ada sesi absensi hari ini
          </div>
        )}
      </div>
    </div>
  );
}

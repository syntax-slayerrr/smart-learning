import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { SearchPill } from "@/components/ui/search-pill";
import { AsymmetricMetricDeck } from "@/components/dashboard/asymmetric-metric-deck";
import { RadialIntelligenceGauge } from "@/components/dashboard/radial-intelligence-gauge";
import {
  TriMetricMatrix,
  TriMetricItem,
} from "@/components/dashboard/tri-metric-matrix";

export const metadata: Metadata = {
  title: "Dashboard Siswa — Smart Learning",
};

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, nis, class_id, classes ( name ), profiles ( full_name )")
    .eq("profile_id", user!.id)
    .single();

  const nowUtc = new Date();
  const nowWib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
  const dayOfWeek = nowWib.getUTCDay();

  // Fetch all related records concurrently
  const [{ data: records }, { data: recentRecords }, { data: todaySchedules }] =
    await Promise.all([
      supabase
        .from("attendance_records")
        .select("status")
        .eq("student_id", student?.id || ""),
      supabase
        .from("attendance_records")
        .select(
          `
        id, 
        status, 
        scanned_at, 
        attendance_sessions ( 
          subjects ( name ), 
          session_date, 
          classes ( name ),
          teachers ( profiles ( full_name ) )
        )
      `
        )
        .eq("student_id", student?.id || "")
        .order("scanned_at", { ascending: false })
        .limit(6),
      supabase
        .from("schedules")
        .select(
          "id, start_time, end_time, subjects(name), teachers(profiles(full_name))"
        )
        .eq("class_id", student?.class_id)
        .eq("day_of_week", dayOfWeek)
        .order("start_time", { ascending: true }),
    ]);

  const stats = {
    present: records?.filter((r) => r.status === "present").length || 0,
    late: records?.filter((r) => r.status === "late").length || 0,
    sick: records?.filter((r) => r.status === "sick").length || 0,
    excused: records?.filter((r) => r.status === "excused").length || 0,
    absent: records?.filter((r) => r.status === "absent").length || 0,
  };
  const total = records?.length || 0;
  const rate =
    total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 100;

  const hour = nowWib.getUTCHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
      ? "Selamat siang"
      : hour < 18
      ? "Selamat sore"
      : "Selamat malam";

  const cls = (student?.classes as unknown) as Record<string, unknown> | null;
  const profile = (student?.profiles as unknown) as Record<
    string,
    unknown
  > | null;
  const studentName = (profile?.full_name as string) || "Siswa";

  // Diagnostic items for student
  const studentMetrics: TriMetricItem[] = [
    {
      id: "present-count",
      label: "Hadir Tepat",
      value: `${stats.present} Sesi`,
      sublabel: "Disiplin Tinggi",
      icon: CheckCircle2,
      variant: "success",
    },
    {
      id: "late-count",
      label: "Terlambat",
      value: stats.late,
      sublabel: "Perlu Evaluasi",
      icon: Clock,
      variant: stats.late > 0 ? "warning" : "primary",
    },
    {
      id: "absent-count",
      label: "Alpa / Izin",
      value: stats.absent + stats.sick + stats.excused,
      sublabel: "Total Catatan",
      icon: XCircle,
      variant: stats.absent > 0 ? "warning" : "primary",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      {/* 1. Mobile Contextual Greeting & Atmosphere */}
      <div className="flex items-center justify-between pt-1 sm:hidden">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 text-white font-bold text-sm shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)] border border-white/20">
            <span>{studentName.charAt(0)}</span>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                Siswa Aktif
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[11px] text-slate-400">
                {cls?.name ? (cls.name as string) : "Kelas"}
              </span>
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {greeting}, {studentName.split(" ")[0]}
            </h1>
          </div>
        </div>

        {/* Scan Quick Action */}
        <Link
          href="/student/scan"
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.35)] active:scale-95 transition-transform"
          aria-label="Scan QR Presensi"
        >
          <QrCode className="h-4 w-4 stroke-[2]" />
        </Link>
      </div>

      {/* Desktop Page Header */}
      <div className="hidden sm:block">
        <PageHeader
          eyebrow="PORTAL AKADEMIK SISWA"
          title={`${greeting}, ${studentName}`}
          description={
            cls
              ? `Kelas ${cls.name as string} • NIS: ${student?.nis || "—"}`
              : "Portal Akademik & Presensi Cerdas"
          }
          action={
            <Link
              href="/student/scan"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors apple-press min-h-[44px]"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan QR Sesi</span>
            </Link>
          }
        />
      </div>

      {/* 2. Tactile Search Capsule Bar */}
      <SearchPill placeholder="Cari mata pelajaran, riwayat sesi, atau guru..." />

      {/* 3. Asymmetric Dual Summary Deck */}
      <AsymmetricMetricDeck
        totalStudents={stats.present + stats.late}
        attendanceRate={rate}
        totalSessionsToday={todaySchedules?.length || 0}
      />

      {/* 4. Quick Access Squircle Chips for Student */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            Menu Utama
          </span>
          <span className="text-[11px] text-slate-400">Pintasan Cepat</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
          <Link
            href="/student/scan"
            className="card-3d-chip flex flex-col items-center justify-between p-2.5 sm:p-3 text-center group active:scale-95 transition-transform"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <QrCode className="h-5 w-5 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 tracking-tight line-clamp-1">
              Scan Presensi
            </span>
            <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full mt-1 border border-blue-100/60">
              Kamera
            </span>
          </Link>

          <Link
            href="/student/schedule"
            className="card-3d-chip flex flex-col items-center justify-between p-2.5 sm:p-3 text-center group active:scale-95 transition-transform"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <CalendarDays className="h-5 w-5 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 tracking-tight line-clamp-1">
              Jadwal Kelas
            </span>
            <span className="text-[9px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full mt-1 border border-slate-100">
              {todaySchedules?.length || 0} Mapel
            </span>
          </Link>

          <Link
            href="/student/attendance"
            className="card-3d-chip flex flex-col items-center justify-between p-2.5 sm:p-3 text-center group active:scale-95 transition-transform"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-5 w-5 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 tracking-tight line-clamp-1">
              Rekap Hadir
            </span>
            <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 border border-emerald-100/60">
              {rate}%
            </span>
          </Link>

          <Link
            href="/student/notifications"
            className="card-3d-chip flex flex-col items-center justify-between p-2.5 sm:p-3 text-center group active:scale-95 transition-transform"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/60 mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <Bell className="h-5 w-5 stroke-[1.8]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 tracking-tight line-clamp-1">
              Notifikasi
            </span>
            <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full mt-1 border border-slate-100">
              Pengumuman
            </span>
          </Link>
        </div>
      </div>

      {/* 5. Health & Diagnostic Gauge */}
      <div className="grid gap-4 md:grid-cols-2">
        <RadialIntelligenceGauge
          score={rate}
          title="Indeks Kehadiran Akademik"
          subtitle="Tingkat ketepatan dan kedisiplinan hadir di seluruh mata pelajaran"
        />

        <div className="space-y-4 flex flex-col justify-between">
          <TriMetricMatrix metrics={studentMetrics} />

          {/* Today's Schedule Card */}
          <div className="card-3d-ceramic p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60">
                  <CalendarDays className="h-4 w-4 stroke-[1.8]" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Jadwal Belajar Hari Ini
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                {todaySchedules?.length || 0} Sesi
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {todaySchedules && todaySchedules.length > 0 ? (
                todaySchedules.slice(0, 3).map((sched: Record<string, unknown>) => {
                  const sub = sched.subjects as Record<string, unknown> | null;
                  const teach = sched.teachers as Record<string, unknown> | null;
                  const teachProf = teach?.profiles as Record<
                    string,
                    unknown
                  > | null;
                  return (
                    <div
                      key={sched.id as string}
                      className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {(sub?.name as string) || "Mata Pelajaran"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {(teachProf?.full_name as string) || "Guru Pengampu"}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/60">
                        {sched.start_time as string} -{" "}
                        {sched.end_time as string}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  Tidak ada jadwal kelas untuk hari ini
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Recent Attendance Records (Activity Feed) */}
      <div className="card-3d-ceramic overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Riwayat Presensi Terkini
            </h3>
          </div>
          <Link
            href="/student/attendance"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
          >
            <span>Semua Riwayat</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentRecords && recentRecords.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentRecords.map((record: Record<string, unknown>) => {
              const session = record.attendance_sessions as Record<
                string,
                unknown
              > | null;
              const sub = session?.subjects as Record<string, unknown> | null;
              const teach = session?.teachers as Record<
                string,
                unknown
              > | null;
              const teachProf = teach?.profiles as Record<
                string,
                unknown
              > | null;
              const isPresent = record.status === "present";
              const isLate = record.status === "late";

              return (
                <div
                  key={record.id as string}
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
                        {(teachProf?.full_name as string) || "Guru"} •{" "}
                        {record.scanned_at
                          ? new Date(
                              record.scanned_at as string
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Hari ini"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      isPresent
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : isLate
                        ? "bg-amber-50 text-amber-700 border-amber-200/60"
                        : "bg-rose-50 text-rose-700 border-rose-200/60"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isPresent
                          ? "bg-emerald-500"
                          : isLate
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                    {isPresent
                      ? "Hadir"
                      : isLate
                      ? "Terlambat"
                      : (record.status as string)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-slate-400">
            Belum ada data presensi yang tercatat
          </div>
        )}
      </div>
    </div>
  );
}

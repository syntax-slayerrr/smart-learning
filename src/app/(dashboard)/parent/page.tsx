import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/attendance/status-badge";
import { CheckCircle2, XCircle, Bell, CalendarDays, Brain, GraduationCap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getChildEngagement } from "@/services/student-analytics";
import { ChildEngagementCard } from "@/components/dashboard/child-engagement-card";

export const metadata: Metadata = { title: "Dashboard Orang Tua" };

export default async function ParentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  // Get linked children
  const { data: links } = await supabase
    .from("student_parents")
    .select("student_id, relationship, students ( id, nis, profiles ( full_name ), classes ( name ) )")
    .eq("parent_id", parent?.id || "");

  const childIds = links?.map((l: Record<string, unknown>) => {
    const s = l.students as unknown as Record<string, unknown> | null;
    return s?.id as string;
  }).filter(Boolean) || [];

  // Get attendance records for all children
  const { data: records } = childIds.length > 0
    ? await supabase
        .from("attendance_records")
        .select("id, status, scanned_at, student_id, attendance_sessions ( subjects(name), session_date, classes ( name ) )")
        .in("student_id", childIds)
        .order("scanned_at", { ascending: false })
        .limit(15)
    : { data: [] };

  const totalRecords = records?.length || 0;
  const presentCount = records?.filter((r) => r.status === "present" || r.status === "late").length || 0;
  const absentCount = records?.filter((r) => r.status === "absent").length || 0;
  const rate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  // Get notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, message, status, created_at")
    .eq("parent_id", parent?.id || "")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="PORTAL ORANG TUA"
        title="Pantauan Belajar Anak"
        description="Pantau kehadiran, keaktifan kelas, dan perkembangan belajar anak Anda secara real-time"
      />

      {/* Children Summary Cards */}
      {links && links.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            Anak Terdaftar
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((link: Record<string, unknown>) => {
              const s = link.students as unknown as Record<string, unknown> | null;
              const p = s?.profiles as unknown as Record<string, unknown> | null;
              const c = s?.classes as unknown as Record<string, unknown> | null;
              const fullName = (p?.full_name as string) || "Siswa";
              const initials = fullName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "S";

              return (
                <div
                  key={s?.id as string}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs card-hover flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs border border-blue-100">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 tracking-tight">{fullName}</p>
                      <p className="text-xs text-slate-500">
                        {(c?.name as string) || "Kelas"} • Hubungan: <span className="capitalize font-medium text-slate-700">{link.relationship as string}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-full">
                    Terhubung
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatCard title="Tingkat Kehadiran" value={`${rate}%`} description="Persentase semester aktif" icon={CheckCircle2} />
        <StatCard title="Total Hadir" value={`${presentCount} sesi`} description="Akumulasi kehadiran kelas" icon={CalendarDays} />
        <StatCard title="Tidak Hadir" value={`${absentCount} hari`} description="Perlu perhatian & konfirmasi" icon={XCircle} />
      </div>

      {/* AI Engagement Analytics */}
      {parent?.id && <ChildEngagementSection parentId={parent.id} />}

      {/* Recent Attendance Timeline */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Riwayat Kehadiran Terakhir</h3>
          <Link href="/parent/attendance" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 apple-press">
            <span>Lihat Semua</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {records && records.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {records.slice(0, 8).map((r: Record<string, unknown>) => {
              const s = r.attendance_sessions as unknown as Record<string, unknown> | null;
              const c = s?.classes as unknown as Record<string, unknown> | null;
              return (
                <div key={r.id as string} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{((s?.subjects as any)?.name as string) || "Mata Pelajaran"}</p>
                    <p className="text-[11px] text-slate-500">{(c?.name as string) || "Kelas"} • <span className="font-mono">{(s?.session_date as string) || "—"}</span></p>
                  </div>
                  <StatusBadge status={r.status as string} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-slate-400">Belum ada data kehadiran tercatat</div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Bell className="h-4 w-4 text-blue-600" /> Pemberitahuan Sekolah
          </h3>
          <Link href="/parent/notifications" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 apple-press">
            <span>Semua Notifikasi</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {notifications && notifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {notifications.map((n: Record<string, unknown>) => (
              <div key={n.id as string} className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <p className="text-xs font-medium text-slate-800">{n.message as string}</p>
                <p className="mt-1 text-[10px] text-slate-400 font-mono">{new Date(n.created_at as string).toLocaleString("id-ID")}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-slate-400">Belum ada pemberitahuan baru</div>
        )}
      </div>
    </div>
  );
}

async function ChildEngagementSection({ parentId }: { parentId: string }) {
  const childrenData = await getChildEngagement(parentId);

  if (!childrenData || childrenData.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-xs font-bold tracking-tight text-slate-900 uppercase">
            Pantauan Fokus & Keaktifan di Kelas
          </h2>
          <p className="text-[11px] text-slate-500">
            Metrik keaktifan dan atensi belajar dari sesi kelas
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {childrenData.map((child) => (
          <ChildEngagementCard key={child.student_id} child={child} />
        ))}
      </div>
    </div>
  );
}

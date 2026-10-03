import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/attendance/status-badge";
import { CheckCircle, XCircle, Bell, CalendarDays, Brain } from "lucide-react";
import Link from "next/link";
import { getChildEngagement } from "@/services/student-analytics";
import { ChildEngagementCard } from "@/components/dashboard/child-engagement-card";

export const metadata: Metadata = { title: "Dashboard Orang Tua" };

export default async function ParentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", user!.id)
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
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader title="Dashboard Orang Tua" description="Pantau kehadiran anak Anda" />

      {/* Children Cards */}
      {links && links.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link: Record<string, unknown>) => {
            const s = link.students as unknown as Record<string, unknown> | null;
            const p = s?.profiles as unknown as Record<string, unknown> | null;
            const c = s?.classes as unknown as Record<string, unknown> | null;
            return (
              <div key={s?.id as string} className="rounded-xl border border-[#E7E2DA] bg-white p-3.5 shadow-2xs card-hover flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-stone-900">{(p?.full_name as string) || "—"}</p>
                  <p className="text-[11px] text-stone-500">{(c?.name as string) || "—"} • Hubungan: <span className="capitalize">{link.relationship as string}</span></p>
                </div>
                <span className="text-[10px] font-mono text-[#EA580C] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md font-semibold">
                  Terdaftar
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Tingkat Kehadiran" value={`${rate}%`} description="Persentase semester ini" icon={CheckCircle} />
        <StatCard title="Total Hadir" value={`${presentCount} sesi`} description="Akumulasi kehadiran" icon={CalendarDays} />
        <StatCard title="Tidak Hadir" value={`${absentCount} hari`} description="Perlu perhatian" icon={XCircle} />
      </div>

      {/* AI Engagement Analytics */}
      {parent?.id && <ChildEngagementSection parentId={parent.id} />}

      {/* Recent Attendance */}
      <div className="rounded-xl border border-[#E7E2DA] bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] px-5 py-3.5 bg-[#FBF9F5]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">Catatan Absensi Terkini</h3>
          <Link href="/parent/attendance" className="text-xs font-semibold text-[#EA580C] hover:underline">Lihat Semua →</Link>
        </div>
        {records && records.length > 0 ? (
          <div className="divide-y divide-[#E7E2DA]/60">
            {records.slice(0, 8).map((r: Record<string, unknown>) => {
              const s = r.attendance_sessions as unknown as Record<string, unknown> | null;
              const c = s?.classes as unknown as Record<string, unknown> | null;
              return (
                <div key={r.id as string} className="flex items-center justify-between px-5 py-3 hover:bg-[#FBF9F5] transition-colors duration-75">
                  <div>
                    <p className="text-xs font-semibold text-stone-900">{((s?.subjects as any)?.name as string) || "—"}</p>
                    <p className="text-[11px] text-stone-500">{(c?.name as string) || "—"} • <span className="font-mono">{(s?.session_date as string) || "—"}</span></p>
                  </div>
                  <StatusBadge status={r.status as string} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-stone-400">Belum ada data absensi tercatat</div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-[#E7E2DA] bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] px-5 py-3.5 bg-[#FBF9F5]">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">
            <Bell className="h-4 w-4 text-[#EA580C]" /> Notifikasi & Informasi Sekolah
          </h3>
          <Link href="/parent/notifications" className="text-xs font-semibold text-[#EA580C] hover:underline">Semua Notifikasi →</Link>
        </div>
        {notifications && notifications.length > 0 ? (
          <div className="divide-y divide-[#E7E2DA]/60">
            {notifications.map((n: Record<string, unknown>) => (
              <div key={n.id as string} className="px-5 py-3 hover:bg-[#FBF9F5] transition-colors duration-75">
                <p className="text-xs font-medium text-stone-900">{n.message as string}</p>
                <p className="mt-0.5 text-[10px] text-stone-400 font-mono">{new Date(n.created_at as string).toLocaleString("id-ID")}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-xs text-stone-400">Belum ada notifikasi</div>
        )}
      </div>
    </div>
  );
}

async function ChildEngagementSection({ parentId }: { parentId: string }) {
  const childrenData = await getChildEngagement(parentId);

  if (!childrenData || childrenData.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Analitik Engagement Anak
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Data AI dari kamera kelas
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

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/attendance/status-badge";
import { CheckCircle, XCircle, Bell, CalendarDays } from "lucide-react";
import Link from "next/link";

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
              <div key={s?.id as string} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">{(p?.full_name as string) || "—"}</p>
                <p className="text-xs text-muted-foreground">{(c?.name as string) || "—"} • {link.relationship as string}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Kehadiran" value={`${rate}%`} description="Tingkat kehadiran" icon={CheckCircle} />
        <StatCard title="Hadir" value={presentCount} description="Total hadir" icon={CalendarDays} />
        <StatCard title="Tidak Hadir" value={absentCount} description="Total absen" icon={XCircle} />
      </div>

      {/* Recent Attendance */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Absensi Terbaru</h3>
          <Link href="/parent/attendance" className="text-xs font-medium text-primary hover:underline">Lihat Semua</Link>
        </div>
        {records && records.length > 0 ? (
          <div className="divide-y divide-border">
            {records.slice(0, 8).map((r: Record<string, unknown>) => {
              const s = r.attendance_sessions as unknown as Record<string, unknown> | null;
              const c = s?.classes as unknown as Record<string, unknown> | null;
              return (
                <div key={r.id as string} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{((s?.subjects as any)?.name as string) || "—"}</p>
                    <p className="text-xs text-muted-foreground">{(c?.name as string) || "—"} • {(s?.session_date as string) || "—"}</p>
                  </div>
                  <StatusBadge status={r.status as string} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada data absensi</div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4" /> Notifikasi
          </h3>
          <Link href="/parent/notifications" className="text-xs font-medium text-primary hover:underline">Lihat Semua</Link>
        </div>
        {notifications && notifications.length > 0 ? (
          <div className="divide-y divide-border">
            {notifications.map((n: Record<string, unknown>) => (
              <div key={n.id as string} className="px-5 py-3">
                <p className="text-sm text-foreground">{n.message as string}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(n.created_at as string).toLocaleString("id-ID")}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi</div>
        )}
      </div>
    </div>
  );
}

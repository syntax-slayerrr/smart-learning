import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/attendance/status-badge";

export const metadata: Metadata = { title: "Riwayat Absensi" };

export default async function StudentHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, status, scanned_at, notes, attendance_sessions ( subjects ( name ), session_date, classes ( name ) )")
    .eq("student_id", student?.id || "")
    .order("scanned_at", { ascending: false });

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader title="Riwayat Absensi" description="Semua catatan kehadiran Anda" />
      <div className="rounded-xl border border-border bg-card">
        {records && records.length > 0 ? (
          <div className="divide-y divide-border">
            {records.map((r: Record<string, unknown>) => {
              const s = r.attendance_sessions as unknown as Record<string, unknown> | null;
              const c = s?.classes as unknown as Record<string, unknown> | null;
              return (
                <div key={r.id as string} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{((s?.subjects as any)?.name as string) || "—"}</p>
                    <p className="text-xs text-muted-foreground">{(c?.name as string) || "—"} • {(s?.session_date as string) || "—"}</p>
                    {typeof r.notes === "string" && r.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">{r.notes}</p>}
                  </div>
                  <StatusBadge status={r.status as string} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada riwayat absensi</div>
        )}
      </div>
    </div>
  );
}

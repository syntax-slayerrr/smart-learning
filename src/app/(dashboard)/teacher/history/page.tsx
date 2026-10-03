import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import Link from "next/link";

export const metadata: Metadata = { title: "Riwayat Sesi" };

export default async function TeacherHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("id, subjects(name), session_date, status, created_at, classes ( name )")
    .eq("teacher_id", teacher?.id || "")
    .order("created_at", { ascending: false });

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <PageHeader title="Riwayat Sesi" description="Semua sesi absensi yang pernah Anda buat" />
      <div className="rounded-xl border border-border bg-card">
        {sessions && sessions.length > 0 ? (
          <div className="divide-y divide-border">
            {sessions.map((s: Record<string, unknown>) => {
              const c = s.classes as unknown as Record<string, unknown> | null;
              return (
                <Link key={s.id as string} href={`/teacher/attendance/${s.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{(s.subjects as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">{(c?.name as string) || "—"} • {s.session_date as string}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {s.status === "active" ? "Aktif" : "Selesai"}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada riwayat sesi</div>
        )}
      </div>
    </div>
  );
}

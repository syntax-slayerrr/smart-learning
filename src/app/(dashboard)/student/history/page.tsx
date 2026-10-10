import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Riwayat Absensi & Kehadiran — Smart Learning",
};

export default async function StudentHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, nis, classes ( name ), profiles ( full_name )")
    .eq("profile_id", user.id)
    .single();

  const { data: records } = await supabase
    .from("attendance_records")
    .select(
      `
      id,
      status,
      scanned_at,
      seat_code,
      hand_raise_count,
      resting_posture_minutes,
      notes,
      attendance_sessions (
        id,
        session_date,
        subjects ( name ),
        classes ( name ),
        teachers ( profiles ( full_name ) )
      )
    `
    )
    .eq("student_id", student?.id || "")
    .order("scanned_at", { ascending: false });

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

  const cls = (student?.classes as unknown) as Record<string, unknown> | null;
  const profile = (student?.profiles as unknown) as Record<
    string,
    unknown
  > | null;
  const studentName = (profile?.full_name as string) || "Siswa";

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 animate-fade-in pb-10">
      {/* Back button & Header */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      <PageHeader
        eyebrow="REKAPITULASI PRESENSI BELAJAR"
        title="Riwayat Absensi & Kehadiran"
        description={`${studentName} • ${cls?.name ? (cls.name as string) : "Kelas"} • NIS: ${student?.nis || "—"}`}
      />

      {/* 4-Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Tingkat Hadir</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {rate}%
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Dari {total} total sesi</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Hadir Tepat</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
            {stats.present}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sesi terjadwal</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Terlambat</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 tabular-nums">
            {stats.late}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Perlu ditingkatkan</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Alpa / Izin</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
            {stats.absent + stats.sick + stats.excused}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total tidak hadir</p>
        </div>
      </div>

      {/* Daftar Riwayat Presensi Lengkap */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Daftar Sesi Pembelajaran & Telemetri
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {records?.length || 0} Catatan
          </span>
        </div>

        {records && records.length > 0 ? (
          <div className="divide-y divide-border/60">
            {records.map((r: Record<string, unknown>) => {
              const session = r.attendance_sessions as Record<
                string,
                unknown
              > | null;
              const sub = session?.subjects as Record<string, unknown> | null;
              const teach = session?.teachers as Record<string, unknown> | null;
              const teachProf = teach?.profiles as Record<
                string,
                unknown
              > | null;
              const isPresent = r.status === "present";
              const isLate = r.status === "late";
              const handRaises = (r.hand_raise_count as number) || 0;
              const seatCode = r.seat_code as string | undefined;

              return (
                <div
                  key={r.id as string}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-5 sm:py-4 gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-foreground">
                          {(sub?.name as string) || "Mata Pelajaran"}
                        </p>
                        {seatCode && (
                          <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 border border-orange-500/25 px-1.5 py-0.2 text-[9px] font-mono font-bold text-orange-600 dark:text-orange-400">
                            AI Latch: {seatCode}
                          </span>
                        )}
                        {handRaises > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-600">
                            ✋ {handRaises}x Tanya
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{(teachProf?.full_name as string) || "Guru Pengampu"}</span>
                        <span>•</span>
                        <span>
                          {r.scanned_at
                            ? new Date(r.scanned_at as string).toLocaleDateString(
                                "id-ID",
                                {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : (session?.session_date as string) || "Hari ini"}
                        </span>
                        {Boolean(r.scanned_at) && (
                          <span className="font-mono text-[10px]">
                            {new Date(r.scanned_at as string).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" }
                            )}{" "}
                            WIB
                          </span>
                        )}
                      </p>
                      {typeof r.notes === "string" && r.notes && (
                        <p className="text-[10px] text-muted-foreground/80 italic mt-1">
                          Catatan: {r.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                        isPresent
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : isLate
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
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
                        ? "Hadir Tepat"
                        : isLate
                        ? "Terlambat"
                        : (r.status as string)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-xs text-muted-foreground">
            Belum ada catatan presensi belajar yang tersimpan.
          </div>
        )}
      </div>
    </div>
  );
}

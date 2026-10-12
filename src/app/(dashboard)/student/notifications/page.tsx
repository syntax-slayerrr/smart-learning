import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Award,
  ShieldCheck,
  Info,
  AlertCircle,
  Clock,
  ArrowRight,
  FileText,
  UploadCloud,
  Check,
} from "lucide-react";
import Link from "next/link";
import { SCHOOL_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pusat Notifikasi & Aktivitas — Smart Learning",
};

interface AssignmentRecord {
  id: string;
  title: string;
  due_date: string;
  is_oral_defense_required?: boolean;
  subjects?: { name: string } | null;
}

interface SubmissionRecord {
  id: string;
  assignment_id: string;
  status: "draft" | "submitted" | "defense_passed" | "graded" | "returned";
  teacher_score?: number | null;
  teacher_notes?: string | null;
  oral_defense_score?: number | null;
  submitted_at?: string | null;
  graded_at?: string | null;
  assignments?: {
    id: string;
    title: string;
    due_date: string;
    subjects?: { name: string } | null;
  } | null;
}

export default async function StudentNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Ambil profil siswa & kelas
  const { data: student } = await supabase
    .from("students")
    .select("id, nis, class_id, classes ( name ), profiles ( full_name )")
    .eq("profile_id", user.id)
    .single();

  const studentId = student?.id || "";
  const classId = student?.class_id || "";
  const cls = (student?.classes as unknown) as Record<string, unknown> | null;
  const profile = (student?.profiles as unknown) as Record<string, unknown> | null;
  const studentName = (profile?.full_name as string) || "Siswa";
  const className = (cls?.name as string) || "Kelas";

  // 2. Query Submissions Siswa (Revisi & Nilai)
  const { data: rawSubmissions } = await supabase
    .from("assignment_submissions")
    .select(`
      id,
      assignment_id,
      status,
      teacher_score,
      teacher_notes,
      oral_defense_score,
      submitted_at,
      graded_at,
      assignments:assignment_id (
        id,
        title,
        due_date,
        subjects:subject_id ( name )
      )
    `)
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });

  const submissions = (rawSubmissions || []) as unknown as SubmissionRecord[];

  // 3. Query Seluruh Tugas Terbit untuk Kelas Siswa
  const { data: rawClassAssignments } = classId
    ? await supabase
        .from("assignments")
        .select(`
          id,
          title,
          due_date,
          is_oral_defense_required,
          subjects:subject_id ( name )
        `)
        .eq("class_id", classId)
        .order("due_date", { ascending: true })
    : { data: [] };

  const classAssignments = (rawClassAssignments || []) as unknown as AssignmentRecord[];

  // 4. Query Riwayat Presensi Terkini
  const { data: recentRecords } = await supabase
    .from("attendance_records")
    .select(`
      id,
      status,
      scanned_at,
      seat_code,
      notes,
      attendance_sessions (
        session_date,
        subjects ( name ),
        teachers ( profiles ( full_name ) )
      )
    `)
    .eq("student_id", studentId)
    .order("scanned_at", { ascending: false })
    .limit(5);

  // Filter Kategori Notifikasi
  // A. Tugas yang butuh Revisi Segera (Returned)
  const returnedSubmissions = submissions.filter((s) => s.status === "returned");

  // B. Tugas yang Baru Dinilai (Graded)
  const gradedSubmissions = submissions.filter((s) => s.status === "graded");

  // C. Tugas Belum Dikumpulkan
  const submittedAssignmentIds = new Set(submissions.map((s) => s.assignment_id));
  const pendingAssignments = classAssignments.filter((a) => !submittedAssignmentIds.has(a.id));

  // Hitung total notifikasi aktif
  const actionItemsCount = returnedSubmissions.length + pendingAssignments.length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 animate-fade-in pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda Siswa</span>
        </Link>

        {actionItemsCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-orange-600/10 text-orange-600 dark:text-orange-400 border border-orange-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-600 animate-pulse" />
            {actionItemsCount} Perlu Perhatian
          </span>
        )}
      </div>

      <PageHeader
        eyebrow="PUSAT NOTIFIKASI & AKTIVITAS PEMBELAJARAN"
        title="Pusat Notifikasi Akademik"
        description={`${studentName} • ${className} • ${SCHOOL_NAME}`}
      />

      {/* 1. SEKSI TUGAS PERLU REVISI (URGENT / HIGHEST PRIORITY) */}
      {returnedSubmissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Tugas Dikembalikan — Perlu Revisi ({returnedSubmissions.length})
            </h3>
          </div>

          <div className="space-y-3">
            {returnedSubmissions.map((sub) => {
              const asg = sub.assignments;
              const subjectName = asg?.subjects?.name || "Mata Pelajaran";

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-amber-300/80 bg-amber-50/70 dark:bg-amber-950/20 p-4 sm:p-5 space-y-3 shadow-2xs transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-300/60 shrink-0 mt-0.5">
                        <UploadCloud className="h-4 w-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-300/60 font-mono">
                            {subjectName}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300">
                            Revisi Diminta Guru
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-1">
                          {asg?.title || "Tugas Mandiri"}
                        </h4>
                      </div>
                    </div>

                    <Link
                      href="/student/assignments"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-[0.98] shrink-0"
                    >
                      <span>Unggah Revisi</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {/* Feedback Guru */}
                  {sub.teacher_notes ? (
                    <div className="p-3 rounded-xl bg-white dark:bg-background border border-amber-200/90 dark:border-amber-800/50 text-xs space-y-1">
                      <span className="font-bold text-[11px] text-amber-900 dark:text-amber-300 block">
                        Catatan Perbaikan dari Guru Pengampu:
                      </span>
                      <p className="text-foreground/90 leading-relaxed font-sans">
                        "{sub.teacher_notes}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Guru meminta perbaikan atas berkas tugas Anda. Silakan periksa instruksi tugas dan unggah kembali berkas yang telah diperbaiki.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SEKSI TUGAS AKTIF BELUM DIKUMPULKAN */}
      {pendingAssignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Tugas Aktif Menunggu Pengumpulan ({pendingAssignments.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingAssignments.map((asg) => {
              const subjectName = asg.subjects?.name || "Mata Pelajaran";
              const isOverdue = asg.due_date && new Date(asg.due_date) < new Date();

              return (
                <div
                  key={asg.id}
                  className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 font-mono">
                        {subjectName}
                      </span>
                      {isOverdue ? (
                        <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 px-1.5 py-0.5 rounded">
                          Lewat Tenggat
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Tenggat:{" "}
                          {asg.due_date
                            ? new Date(asg.due_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })
                            : "-"}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2">
                      {asg.title}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-border/70 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {asg.is_oral_defense_required ? "Wajib Uji Lisan" : "Reguler"}
                    </span>
                    <Link
                      href="/student/assignments"
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span>Kerjakan</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SEKSI NILAI & MASUKAN RESMI GURU (GRADED) */}
      {gradedSubmissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Hasil Evaluasi & Nilai Resmi Diumumkan
            </h3>
          </div>

          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
            {gradedSubmissions.map((sub) => {
              const asg = sub.assignments;
              const subjectName = asg?.subjects?.name || "Mata Pelajaran";

              return (
                <div
                  key={sub.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 font-mono">
                        {subjectName}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground">
                        {asg?.title || "Tugas Mandiri"}
                      </h4>
                    </div>
                    {sub.teacher_notes && (
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        "{sub.teacher_notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        Nilai Akhir
                      </span>
                      <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                        {sub.teacher_score}/100
                      </span>
                    </div>

                    <Link
                      href="/student/assignments"
                      className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      title="Lihat Detail Nilai"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SEKSI TELEMETRI & APRESIASI JURNAL MINGGUAN */}
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
          <Award className="h-4 w-4 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Jurnal Keaktifan Belajar Mingguan
            </h4>
            <span className="rounded bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-orange-600 dark:text-orange-400">
              Telemetri AI
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Data keaktifan, fokus pengamatan, dan frekuensi angkat tangan Anda diakumulasikan secara otomatis selama jam pelajaran di kelas berlangsung.
          </p>
        </div>
      </div>

      {/* 5. SEKSI NOTIFIKASI PRESENSI TERKINI (KAMERA) */}
      {recentRecords && recentRecords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Riwayat Pemindaian Presensi Terkini
              </h3>
            </div>
            <Link
              href="/student/history"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Semua Presensi</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
            {recentRecords.map((r: Record<string, unknown>) => {
              const session = r.attendance_sessions as Record<string, unknown> | null;
              const sub = session?.subjects as Record<string, unknown> | null;
              const isPresent = r.status === "present";

              return (
                <div
                  key={r.id as string}
                  className="p-4 sm:px-5 flex items-start gap-3.5 hover:bg-muted/15 transition-colors"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                      isPresent
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}
                  >
                    {isPresent ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground truncate">
                        Presensi {isPresent ? "Tercatat Hadir" : (r.status as string)}: {(sub?.name as string) || "Mata Pelajaran"}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {r.scanned_at
                          ? new Date(r.scanned_at as string).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Terkini"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {r.seat_code ? `Terverifikasi pada ${r.seat_code}. ` : ""}
                      {r.notes ? `Catatan: ${r.notes}` : "Presensi berhasil disinkronkan secara otomatis oleh kamera kelas."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

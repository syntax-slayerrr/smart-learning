import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import {
  History,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Calendar,
  User,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Riwayat Kehadiran Anak — Smart Learning",
};

interface AttendanceRecord {
  id: string;
  status: "present" | "late" | "sick" | "excused" | "absent";
  scanned_at: string;
  notes?: string | null;
  seat_code?: string | null;
  attendance_sessions?: {
    id: string;
    session_date: string;
    subjects?: { name: string } | null;
    classes?: { name: string } | null;
    teachers?: { profiles?: { full_name: string } | null } | null;
  } | null;
}

export default async function ParentHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Ambil parent record
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!parent) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
          <AlertCircle className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-800">Profil Orang Tua Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1">Silakan hubungi admin sekolah untuk verifikasi akun.</p>
        </div>
      </div>
    );
  }

  // 2. Ambil anak-anak yang terhubung
  const { data: links } = await supabase
    .from("student_parents")
    .select(`
      student_id,
      relationship,
      students (
        id,
        nis,
        profiles ( full_name ),
        classes ( name )
      )
    `)
    .eq("parent_id", parent.id);

  const studentLinks = (links || []) as unknown as Array<{
    student_id: string;
    relationship: string;
    students: {
      id: string;
      nis: string;
      profiles: { full_name: string } | null;
      classes: { name: string } | null;
    } | null;
  }>;

  if (studentLinks.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
        <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
          <User className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-800">Belum Ada Anak Terdaftar</h3>
          <p className="text-xs text-slate-500 mt-1">Akun orang tua Anda belum terhubung dengan data siswa manapun.</p>
        </div>
      </div>
    );
  }

  const childIds = studentLinks.map((l) => l.student_id).filter(Boolean);
  const primaryChild = studentLinks[0]?.students;
  const childName = primaryChild?.profiles?.full_name || "Siswa";
  const childClass = primaryChild?.classes?.name || "Kelas";
  const childNis = primaryChild?.nis || "—";

  // 3. Query riwayat presensi riil dari attendance_records
  const { data: rawRecords } = await supabase
    .from("attendance_records")
    .select(`
      id,
      status,
      scanned_at,
      seat_code,
      notes,
      attendance_sessions (
        id,
        session_date,
        subjects ( name ),
        classes ( name ),
        teachers ( profiles ( full_name ) )
      )
    `)
    .in("student_id", childIds)
    .order("scanned_at", { ascending: false });

  const records = (rawRecords || []) as unknown as AttendanceRecord[];

  const stats = {
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    sick: records.filter((r) => r.status === "sick").length,
    excused: records.filter((r) => r.status === "excused").length,
    absent: records.filter((r) => r.status === "absent").length,
  };
  const total = records.length;
  const attendanceRate = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 100;

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 animate-fade-in pb-12">
      {/* Back button */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href="/parent"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-white transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Pantauan Belajar</span>
        </Link>
      </div>

      <PageHeader
        eyebrow="PORTAL ORANG TUA • REKAPITULASI"
        title="Riwayat Kehadiran Anak"
        description={`${childName} • ${childClass} • NIS: ${childNis}`}
      />

      {/* 4-Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Tingkat Hadir</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 tabular-nums">
            {attendanceRate}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Dari {total} total sesi kelas</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Tepat Waktu</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.present}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Sesi tepat waktu</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Terlambat</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.late}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Masuk setelah sesi mulai</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Tidak Hadir / Izin</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.sick + stats.excused + stats.absent}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {stats.sick} Sakit • {stats.excused} Izin • {stats.absent} Alfa
          </p>
        </div>
      </div>

      {/* Tabel & Daftar Riwayat Presensi */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Catatan Presensi & Waktu Masuk</h3>
              <p className="text-[11px] text-slate-500">Log kehadiran terverifikasi sistem barcode & CCTV</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {total} Catatan
          </span>
        </div>

        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50/70 text-slate-600 font-semibold border-b border-slate-100 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Tanggal & Waktu Masuk</th>
                  <th className="px-4 py-3.5">Mata Pelajaran</th>
                  <th className="px-4 py-3.5">Status Hadir</th>
                  <th className="px-4 py-3.5">Posisi / Meja</th>
                  <th className="px-5 py-3.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => {
                  const session = rec.attendance_sessions;
                  const subjectName = session?.subjects?.name || "Sesi Mandiri / Apel";
                  const teacherName = session?.teachers?.profiles?.full_name || "Guru Pengampu";
                  const scannedDate = new Date(rec.scanned_at);

                  const statusConfig = {
                    present: { label: "Hadir", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/70" },
                    late: { label: "Terlambat", bg: "bg-amber-50 text-amber-700 border-amber-200/70" },
                    sick: { label: "Sakit", bg: "bg-blue-50 text-blue-700 border-blue-200/70" },
                    excused: { label: "Izin", bg: "bg-purple-50 text-purple-700 border-purple-200/70" },
                    absent: { label: "Tidak Hadir", bg: "bg-rose-50 text-rose-700 border-rose-200/70" },
                  }[rec.status] || { label: rec.status, bg: "bg-slate-100 text-slate-700 border-slate-200" };

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{format(scannedDate, "EEEE, dd MMM yyyy", { locale: id })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>Pukul {format(scannedDate, "HH:mm", { locale: id })} WIB</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>{subjectName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{teacherName}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bg}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">
                        {rec.seat_code ? `Kursi ${rec.seat_code}` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {rec.notes || "Hadir dan terverifikasi"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <History className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">Belum ada riwayat presensi tercatat untuk anak Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

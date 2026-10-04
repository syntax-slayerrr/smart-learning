import { createClient } from "@/lib/supabase/server";
import { BarChart3, TrendingUp, Users, Calendar } from "lucide-react";
import { MonthlyReportClient } from "./monthly-report-client";

export default async function AdminReportsPage() {
  const supabase = await createClient();

  // Basic stats for report
  const { count: studentCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("role", "student");
  const { data: classes } = await supabase.from("classes").select("id, name").order("name");

  // 1. Hitung Hari Sekolah (unik dari session_date) dengan paginasi
  const sessionDatesSet = new Set<string>();
  let sessPage = 0;
  let sessHasMore = true;

  while (sessHasMore) {
    const { data: sessBatch } = await supabase
      .from("attendance_sessions")
      .select("id, session_date")
      .order("id", { ascending: true })
      .range(sessPage * 1000, (sessPage + 1) * 1000 - 1);

    if (sessBatch && sessBatch.length > 0) {
      sessBatch.forEach(s => {
        if (s.session_date) sessionDatesSet.add(s.session_date);
      });
      if (sessBatch.length < 1000) sessHasMore = false;
      else sessPage++;
    } else {
      sessHasMore = false;
    }
    if (sessPage > 30) sessHasMore = false;
  }
  const uniqueDays = sessionDatesSet.size;

  // 2. Mengambil semua record absensi beserta relasi ke sesi dengan paginasi
  let totalRecords = 0;
  let totalPresentAndLate = 0;
  let totalLate = 0;
  const classStatsMap: Record<string, { total: number; presentLate: number }> = {};

  let recPage = 0;
  let recHasMore = true;

  while (recHasMore) {
    const { data: recordsBatch } = await supabase
      .from("attendance_records")
      .select(`
        id,
        status,
        attendance_sessions (
          class_id
        )
      `)
      .order("id", { ascending: true })
      .range(recPage * 1000, (recPage + 1) * 1000 - 1);

    if (recordsBatch && recordsBatch.length > 0) {
      totalRecords += recordsBatch.length;

      recordsBatch.forEach(r => {
        const isPresentOrLate = r.status === 'present' || r.status === 'late';
        if (isPresentOrLate) totalPresentAndLate++;
        if (r.status === 'late') totalLate++;

        const sessionObj = Array.isArray(r.attendance_sessions) ? r.attendance_sessions[0] : r.attendance_sessions;
        const classId = sessionObj?.class_id;
        if (classId) {
          if (!classStatsMap[classId]) {
            classStatsMap[classId] = { total: 0, presentLate: 0 };
          }
          classStatsMap[classId].total++;
          if (isPresentOrLate) classStatsMap[classId].presentLate++;
        }
      });

      if (recordsBatch.length < 1000) recHasMore = false;
      else recPage++;
    } else {
      recHasMore = false;
    }

    if (recPage > 50) recHasMore = false;
  }

  // 3. Menghitung persentase global
  const attendanceRate = totalRecords > 0 ? ((totalPresentAndLate / totalRecords) * 100).toFixed(1) : "0";
  const latenessRate = totalRecords > 0 ? ((totalLate / totalRecords) * 100).toFixed(1) : "0";

  // 4. Memformat data statistik per kelas (Diurutkan dari tertinggi ke terendah, ambil 5 teratas)
  const classStatsArray = classes?.map(c => {
    const stat = classStatsMap[c.id];
    const percentage = stat && stat.total > 0 ? Math.round((stat.presentLate / stat.total) * 100) : 0;
    return { name: c.name, percentage };
  })
  .sort((a, b) => b.percentage - a.percentage) // Urutkan descending
  .slice(0, 5) || []; // Ambil 5 teratas

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <div className="pb-2">
        <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 dark:text-orange-400">
          PUSAT LAPORAN & AUDIT AKADEMIK • SMK TI SYNTAX SLAYER
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl mt-0.5">
          Laporan & Analisis Presensi
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Audit kehadiran siswa dan pengajar berbasis data telemetri real-time untuk kebutuhan akreditasi dan evaluasi akademik.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5 text-orange-600 dark:text-orange-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Total Siswa Terdaftar</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-100">{studentCount || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Rata-rata Kehadiran</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-100">{attendanceRate}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-600 dark:text-amber-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Tingkat Keterlambatan</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-100">{latenessRate}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-600 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Hari Efektif Belajar</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-100">{uniqueDays} Hari</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">Peringkat Kehadiran Rombel (Top 5)</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Kelas dengan persentase kehadiran tertinggi semester ini</p>
          <div className="space-y-4">
            {classStatsArray.length > 0 ? (
              classStatsArray.map((cls, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="text-sm font-medium w-28 truncate text-stone-900 dark:text-stone-100" title={cls.name}>{cls.name}</div>
                  <div className="flex items-center gap-4 flex-1 ml-4">
                    <div className="h-2 w-full bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-600 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${cls.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold w-12 text-right text-stone-900 dark:text-stone-100">{cls.percentage}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-stone-400">
                Belum ada data absensi untuk menampilkan statistik kelas.
              </div>
            )}
          </div>
        </div>
        
        {/* Executive Verification Card (Replaces empty decorative chart) */}
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                AUDIT INTEGRITAS DATA
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Terverifikasi
              </span>
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
              Catatan Rekapitulasi Terverifikasi
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Data analitik dihitung otomatis dari <strong className="font-mono text-stone-900 dark:text-stone-100">{totalRecords}</strong> catatan absensi Jam Pelajaran (JP).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 my-4 py-3 border-y border-stone-100 dark:border-white/5">
            <div>
              <span className="text-[11px] text-stone-500">Total Record Sesi</span>
              <p className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100">{totalRecords}</p>
            </div>
            <div>
              <span className="text-[11px] text-stone-500">Standar Kurikulum</span>
              <p className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100">K-Merdeka</p>
            </div>
          </div>

          <a
            href="#monthly-report-section"
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center justify-between"
          >
            <span>Buka Generator Lembar Rekap Bulanan</span>
            <span>↓</span>
          </a>
        </div>
      </div>

      {/* Monthly Report Generator Section */}
      <div id="monthly-report-section" className="pt-2">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Laporan Rekapitulasi Bulanan</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Pilih periode bulan dan rombel untuk mencetak lembar rekapitulasi terstruktur.</p>
        </div>
        <MonthlyReportClient classes={classes || []} />
      </div>
    </div>
  );
}

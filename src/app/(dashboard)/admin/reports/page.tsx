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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan & Analitik</h1>
        <p className="text-muted-foreground">
          Ringkasan performa kehadiran siswa di AbsenSMK berdasarkan data riil (real-time).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Siswa Terdaftar</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{studentCount || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rata-rata Kehadiran</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{attendanceRate}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tingkat Keterlambatan</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{latenessRate}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hari Efektif Belajar</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{uniqueDays}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Statistik Per Kelas (Top 5)</h3>
          <div className="space-y-4">
            {classStatsArray.length > 0 ? (
              classStatsArray.map((cls, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="text-sm font-medium w-24 truncate" title={cls.name}>{cls.name}</div>
                  <div className="flex items-center gap-4 flex-1 ml-4">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000 ease-out" 
                        style={{ width: `${cls.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-10 text-right">{cls.percentage}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Belum ada data absensi untuk menampilkan statistik kelas.
              </div>
            )}
          </div>
        </div>
        
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[250px]">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground text-sm max-w-xs">
            Data statistik di atas dihitung secara real-time dari seluruh riwayat absensi (Hadir, Telat, Sakit, Izin, Alpa) yang tercatat di database.
          </p>
        </div>
      </div>

      {/* Monthly Report Generator Section */}
      <div id="monthly-report-section">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Laporan Rekap Bulanan</h2>
          <p className="text-sm text-muted-foreground">Pilih bulan dan kelas untuk mencetak rekapitulasi absensi.</p>
        </div>
        <MonthlyReportClient classes={classes || []} />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Download, FileText, UserCheck, Users } from "lucide-react";
import { exportProfessionalExcel } from "@/lib/excel-utils";

interface MonthlyReportClientProps {
  classes: { id: string; name: string }[];
}

export function MonthlyReportClient({ classes }: MonthlyReportClientProps) {
  const [reportType, setReportType] = useState<"siswa" | "guru">("siswa");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerate = async () => {
    if (reportType === "siswa" && !selectedClass) return;
    setLoading(true);
    setHasSearched(true);
    
    try {
      let endpoint = "";
      if (reportType === "siswa") {
        endpoint = `/api/reports/monthly?month=${selectedMonth}&class_id=${selectedClass}`;
      } else {
        endpoint = `/api/reports/monthly-teachers?month=${selectedMonth}`;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Gagal mengambil data dari server");
      }
      const data = await response.json();
      setReportData(data.records || []);
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Gagal mengambil data laporan. Pastikan koneksi dan parameter sudah benar.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const monthName = new Date(selectedMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    if (reportType === "siswa") {
      const className = classes.find(c => c.id === selectedClass)?.name || "";
      const exportReadyData = reportData.map(row => {
        const total = row.present + row.late + row.sick + row.excused + row.absent;
        const percent = total > 0 ? Math.round(((row.present + row.late) / total) * 100) : 0;
        return {
          nama: row.full_name,
          nis: row.nis,
          h: row.present,
          t: row.late,
          s: row.sick,
          i: row.excused,
          a: row.absent,
          pct: `${percent}%`
        };
      });

      await exportProfessionalExcel({
        title: "LAPORAN REKAPITULASI PRESENSI SISWA",
        subtitle: `SMK TI SYNTAX SLAYER — Kelas: ${className}`,
        period: `Periode Rekapitulasi: ${monthName}`,
        filename: `Rekap_Siswa_${className}_${selectedMonth}.xlsx`,
        withPrintFooter: true,
        columns: [
          { header: "Nama Siswa", key: "nama", width: 35 },
          { header: "NIS", key: "nis", width: 15 },
          { header: "H", key: "h", width: 6 },
          { header: "T", key: "t", width: 6 },
          { header: "S", key: "s", width: 6 },
          { header: "I", key: "i", width: 6 },
          { header: "A", key: "a", width: 6 },
          { header: "%", key: "pct", width: 10 },
        ],
        data: exportReadyData
      });
    } else {
      const exportReadyData = reportData.map(row => {
        const percent = row.total_sessions > 0 ? Math.round((row.present / row.total_sessions) * 100) : 0;
        return {
          nama: row.full_name,
          total: row.total_sessions,
          hadir: row.present,
          alpa: row.absent,
          pct: `${percent}%`
        };
      });

      await exportProfessionalExcel({
        title: "LAPORAN REKAPITULASI KEHADIRAN GURU",
        subtitle: `SMK TI SYNTAX SLAYER — Seluruh Pendidik & Tenaga Pengajar`,
        period: `Periode Rekapitulasi: ${monthName}`,
        filename: `Rekap_Guru_${selectedMonth}.xlsx`,
        withPrintFooter: true,
        columns: [
          { header: "Nama Guru", key: "nama", width: 35 },
          { header: "Total Sesi", key: "total", width: 15 },
          { header: "Hadir (H)", key: "hadir", width: 15 },
          { header: "Alpa (A)", key: "alpa", width: 15 },
          { header: "Persentase", key: "pct", width: 15 },
        ],
        data: exportReadyData
      });
    }
  };

  // Derived metrics from real data
  const summaryMetrics = reportData.length > 0 ? (() => {
    if (reportType === "siswa") {
      let totalH = 0;
      let totalT = 0;
      let totalS = 0;
      let totalI = 0;
      let totalA = 0;
      let totalPresents = 0;
      let totalPossible = 0;

      reportData.forEach((row) => {
        totalH += row.present || 0;
        totalT += row.late || 0;
        totalS += row.sick || 0;
        totalI += row.excused || 0;
        totalA += row.absent || 0;
        const total = (row.present || 0) + (row.late || 0) + (row.sick || 0) + (row.excused || 0) + (row.absent || 0);
        totalPossible += total;
        totalPresents += (row.present || 0) + (row.late || 0);
      });

      const avgPercent = totalPossible > 0 ? Math.round((totalPresents / totalPossible) * 100) : 0;
      return { type: "siswa" as const, totalH, totalT, totalS, totalI, totalA, avgPercent, totalCount: reportData.length };
    } else {
      let totalSessions = 0;
      let totalPresent = 0;
      let totalAbsent = 0;
      reportData.forEach((row) => {
        totalSessions += row.total_sessions || 0;
        totalPresent += row.present || 0;
        totalAbsent += row.absent || 0;
      });
      const avgPercent = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
      return { type: "guru" as const, totalSessions, totalPresent, totalAbsent, avgPercent, totalCount: reportData.length };
    }
  })() : null;

  return (
    <div className="space-y-6">
      {/* Type Toggle & Mode Segmented Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => { setReportType("siswa"); setReportData([]); setHasSearched(false); }}
            className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${
              reportType === "siswa"
                ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-2xs font-bold"
                : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
            }`}
          >
            <Users className="h-4 w-4 text-primary" />
            <span>Rekap Siswa (Per Kelas)</span>
          </button>
          <button
            type="button"
            onClick={() => { setReportType("guru"); setReportData([]); setHasSearched(false); }}
            className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${
              reportType === "guru"
                ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-2xs font-bold"
                : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
            }`}
          >
            <UserCheck className="h-4 w-4 text-primary" />
            <span>Rekap Guru & Pendidik</span>
          </button>
        </div>

        <div className="text-xs text-stone-500">
          Format audit resmi standar kurikulum vokasi SMK
        </div>
      </div>

      {/* Filter & Parameters Hub */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-white/5">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-stone-900 dark:text-white">
            Konfigurasi Periode & Target Rekapitulasi
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Pilih Bulan & Tahun
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setReportData([]); setHasSearched(false); }}
              className="w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {reportType === "siswa" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                Pilih Kelas Target
              </label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setReportData([]); setHasSearched(false); }}
                className="w-full rounded-lg border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- Pilih Rombel / Kelas --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5 flex flex-col justify-end">
              <p className="text-xs text-stone-500 bg-stone-50 dark:bg-stone-900 p-2.5 rounded-lg border border-stone-200 dark:border-white/10 leading-relaxed">
                Merekap seluruh jam mengajar pendidik di seluruh kelas selama periode terpilih.
              </p>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading || (reportType === "siswa" && !selectedClass)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-2xs"
            >
              {loading ? "Menghitung Rekapitulasi..." : "Tampilkan Pratinjau Rekap"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Data Preview & Analysis */}
      {reportData.length > 0 && summaryMetrics && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Real-time Summary Pulse Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Subjek</p>
              <p className="text-xl font-black font-mono tracking-tight text-stone-900 dark:text-white mt-1">
                {summaryMetrics.totalCount} <span className="text-xs font-sans font-normal text-stone-500">{reportType === "siswa" ? "Siswa" : "Guru"}</span>
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Rata-rata Kehadiran</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black font-mono tracking-tight text-emerald-600">
                  {summaryMetrics.avgPercent}%
                </span>
                <span className="text-[10px] font-medium text-stone-500">keseluruhan</span>
              </div>
            </div>

            {summaryMetrics.type === "siswa" && (
              <>
                <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Alpa (A)</p>
                  <p className="text-xl font-black font-mono tracking-tight text-red-600 mt-1">
                    {summaryMetrics.totalA} <span className="text-xs font-sans font-normal text-stone-500">kali</span>
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Izin & Sakit (S+I)</p>
                  <p className="text-xl font-black font-mono tracking-tight text-amber-600 mt-1">
                    {summaryMetrics.totalS + summaryMetrics.totalI} <span className="text-xs font-sans font-normal text-stone-500">kali</span>
                  </p>
                </div>
              </>
            )}

            {summaryMetrics.type === "guru" && (
              <>
                <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Sesi Mengajar</p>
                  <p className="text-xl font-black font-mono tracking-tight text-stone-900 dark:text-white mt-1">
                    {summaryMetrics.totalSessions} <span className="text-xs font-sans font-normal text-stone-500">sesi</span>
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Alpa Mengajar</p>
                  <p className="text-xl font-black font-mono tracking-tight text-red-600 mt-1">
                    {summaryMetrics.totalAbsent} <span className="text-xs font-sans font-normal text-stone-500">sesi</span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Action Ribbon & Export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs font-medium text-stone-500">
              Menampilkan <span className="font-mono font-bold text-stone-900 dark:text-white">{reportData.length}</span> baris data terverifikasi.
            </p>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              <span>Export Dokumen Excel Resmi (.xlsx)</span>
            </button>
          </div>

          {/* Adaptive Collection — Mobile View (Cards) */}
          <div className="md:hidden space-y-3">
            {reportData.map((row, idx) => {
              if (reportType === "siswa") {
                const total = row.present + row.late + row.sick + row.excused + row.absent;
                const percent = total > 0 ? Math.round(((row.present + row.late) / total) * 100) : 0;
                return (
                  <div key={row.student_id || idx} className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-stone-900 dark:text-white truncate">{row.full_name}</p>
                        <p className="text-[10px] font-mono text-stone-500">NIS: {row.nis || "-"}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                        percent >= 85 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        percent >= 75 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {percent}%
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 pt-1 border-t border-stone-100 dark:border-white/5 text-center text-[10px]">
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">H</div>
                        <div className="font-mono font-bold text-emerald-600">{row.present}</div>
                      </div>
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">T</div>
                        <div className="font-mono font-bold text-amber-600">{row.late}</div>
                      </div>
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">S</div>
                        <div className="font-mono font-bold text-blue-600">{row.sick}</div>
                      </div>
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">I</div>
                        <div className="font-mono font-bold text-purple-600">{row.excused}</div>
                      </div>
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">A</div>
                        <div className="font-mono font-bold text-red-600">{row.absent}</div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const percent = row.total_sessions > 0 ? Math.round((row.present / row.total_sessions) * 100) : 0;
                return (
                  <div key={row.teacher_id || idx} className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-3.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-stone-900 dark:text-white truncate">{row.full_name}</p>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                        percent >= 90 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {percent}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-stone-100 dark:border-white/5 text-center text-[10px]">
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">Total Sesi</div>
                        <div className="font-mono font-bold text-stone-700 dark:text-stone-300">{row.total_sessions}</div>
                      </div>
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">Hadir</div>
                        <div className="font-mono font-bold text-emerald-600">{row.present}</div>
                      </div>
                      <div className="p-1 rounded bg-stone-50 dark:bg-stone-900">
                        <div className="text-stone-400 font-bold">Alpa</div>
                        <div className="font-mono font-bold text-red-600">{row.absent}</div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>

          {/* Desktop Data Table */}
          <div className="hidden md:block rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              {reportType === "siswa" ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-white/10 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-3 w-28">NIS</th>
                      <th className="py-3 px-2 text-center w-12 text-emerald-700">H</th>
                      <th className="py-3 px-2 text-center w-12 text-amber-700">T</th>
                      <th className="py-3 px-2 text-center w-12 text-blue-700">S</th>
                      <th className="py-3 px-2 text-center w-12 text-purple-700">I</th>
                      <th className="py-3 px-2 text-center w-12 text-red-700">A</th>
                      <th className="py-3 px-3 text-center w-20">Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                    {reportData.map((row, idx) => {
                      const total = row.present + row.late + row.sick + row.excused + row.absent;
                      const percent = total > 0 ? Math.round(((row.present + row.late) / total) * 100) : 0;
                      return (
                        <tr key={row.student_id || idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-stone-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold text-stone-900 dark:text-white">{row.full_name}</td>
                          <td className="py-2.5 px-3 font-mono text-stone-500">{row.nis || "-"}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-medium text-emerald-600">{row.present}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-medium text-amber-600">{row.late}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-medium text-blue-600">{row.sick}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-medium text-purple-600">{row.excused}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-red-600">{row.absent}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                              percent >= 85 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                              percent >= 75 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                              "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            }`}>
                              {percent}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-white/10 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-4">Nama Guru / Pendidik</th>
                      <th className="py-3 px-3 text-center w-28">Total Sesi</th>
                      <th className="py-3 px-3 text-center w-28 text-emerald-700">Hadir</th>
                      <th className="py-3 px-3 text-center w-28 text-red-700">Alpa</th>
                      <th className="py-3 px-3 text-center w-28">% Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                    {reportData.map((row, idx) => {
                      const percent = row.total_sessions > 0 ? Math.round((row.present / row.total_sessions) * 100) : 0;
                      return (
                        <tr key={row.teacher_id || idx} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-stone-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold text-stone-900 dark:text-white">{row.full_name}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-stone-600 dark:text-stone-300">{row.total_sessions}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">{row.present}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-red-600">{row.absent}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                              percent >= 90 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                              "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            }`}>
                              {percent}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hasSearched && !loading && reportData.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-stone-950 p-12 text-center">
          <p className="text-sm font-bold text-stone-900 dark:text-white">Tidak Ada Data Absensi</p>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
            Belum ada catatan sesi absensi yang terekam untuk {reportType === "siswa" ? "kelas" : "guru"} pada bulan terpilih ({selectedMonth}).
          </p>
        </div>
      )}
    </div>
  );
}

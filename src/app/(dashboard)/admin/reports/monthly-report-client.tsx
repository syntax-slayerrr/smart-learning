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
        subtitle: `SYNTAX SLAYER — Kelas: ${className}`,
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
        subtitle: `SYNTAX SLAYER — Seluruh Pendidik & Tenaga Pengajar`,
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

  return (
    <div className="space-y-6">
      {/* Type Toggle */}
      <div className="flex p-1 space-x-1 bg-muted/50 rounded-lg max-w-sm">
        <button
          onClick={() => { setReportType("siswa"); setReportData([]); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${reportType === "siswa" ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/80'}`}
        >
          <Users className="h-4 w-4" /> Siswa
        </button>
        <button
          onClick={() => { setReportType("guru"); setReportData([]); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${reportType === "guru" ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/80'}`}
        >
          <UserCheck className="h-4 w-4" /> Guru
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Generator Laporan Bulanan {reportType === "siswa" ? "Siswa" : "Guru"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Pilih Bulan</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setReportData([]); }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          {reportType === "siswa" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pilih Kelas</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setReportData([]); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
             <div className="space-y-1.5 flex flex-col justify-end">
               <p className="text-xs text-muted-foreground bg-muted p-2 rounded border border-dashed">
                 Laporan guru akan merekap semua data kehadiran mengajar di seluruh kelas.
               </p>
             </div>
          )}

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading || (reportType === "siswa" && !selectedClass)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Memproses..." : "Tampilkan Pratinjau"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      {reportData.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Menampilkan {reportData.length} baris data untuk diekspor.
            </p>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 shadow-sm transition-transform active:scale-95"
            >
              <Download className="h-4 w-4" />
              Export Excel Profesional
            </button>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm overflow-auto">
            {reportType === "siswa" ? (
               <table className="w-full caption-bottom text-sm">
                 <thead className="[&_tr]:border-b">
                   <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                     <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-10">No</th>
                     <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Nama Siswa</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground w-12">H</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground w-12">T</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground w-12">S</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground w-12">I</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground w-12">A</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground w-16">%</th>
                   </tr>
                 </thead>
                 <tbody className="[&_tr:last-child]:border-0">
                   {reportData.map((row, idx) => {
                     const total = row.present + row.late + row.sick + row.excused + row.absent;
                     const percent = total > 0 ? Math.round(((row.present + row.late) / total) * 100) : 0;
                     return (
                       <tr key={row.student_id} className="border-b transition-colors hover:bg-muted/50">
                         <td className="p-2 align-middle">{idx + 1}</td>
                         <td className="p-2 align-middle font-medium">{row.full_name}</td>
                         <td className="p-2 align-middle text-center">{row.present}</td>
                         <td className="p-2 align-middle text-center">{row.late}</td>
                         <td className="p-2 align-middle text-center">{row.sick}</td>
                         <td className="p-2 align-middle text-center">{row.excused}</td>
                         <td className="p-2 align-middle text-center font-bold text-red-500">{row.absent}</td>
                         <td className="p-2 align-middle text-center font-bold">{percent}%</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            ) : (
               <table className="w-full caption-bottom text-sm">
                 <thead className="[&_tr]:border-b">
                   <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                     <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-10">No</th>
                     <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Nama Guru</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground">Total Sesi</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground text-emerald-600">Hadir</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground text-red-600">Alpa</th>
                     <th className="h-10 px-2 text-center align-middle font-medium text-muted-foreground">% Hadir</th>
                   </tr>
                 </thead>
                 <tbody className="[&_tr:last-child]:border-0">
                   {reportData.map((row, idx) => {
                     const percent = row.total_sessions > 0 ? Math.round((row.present / row.total_sessions) * 100) : 0;
                     return (
                       <tr key={row.teacher_id} className="border-b transition-colors hover:bg-muted/50">
                         <td className="p-2 align-middle">{idx + 1}</td>
                         <td className="p-2 align-middle font-medium">{row.full_name}</td>
                         <td className="p-2 align-middle text-center">{row.total_sessions}</td>
                         <td className="p-2 align-middle text-center font-bold text-emerald-600">{row.present}</td>
                         <td className="p-2 align-middle text-center font-bold text-red-600">{row.absent}</td>
                         <td className="p-2 align-middle text-center font-bold">{percent}%</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            )}
          </div>
        </div>
      )}

      {hasSearched && !loading && reportData.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground animate-in fade-in">
          <p className="text-base font-semibold text-foreground">Tidak Ada Data Absensi</p>
          <p className="text-sm mt-1">
            Belum ada catatan sesi absensi yang tercatat untuk {reportType === "siswa" ? "kelas" : "guru"} pada bulan yang dipilih ({selectedMonth}).
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Printer, X, CheckCircle2, ShieldCheck, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportAccreditationExcel, type AccreditationReportData } from "@/lib/accreditation-export";

const MOCK_REPORT_DATA: AccreditationReportData = {
  schoolName: "Smart Learning AI Ecosystem",
  npsn: "20224151",
  academicYear: "2025/2026",
  semester: "Semester Ganjil",
  generatedDate: new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  totalSessions: 48,
  avgFocusScore: 88,
  totalStudents: 250,
  totalAtRisk: 3,
  students: [
    { nis: "2025001", name: "Andi Pratama", className: "10-IPA-1", attendanceRate: 98, avgFocusRate: 94, handRaises: 28, phoneViolations: 0, sleepIncidents: 0, riskLevel: "low" },
    { nis: "2025002", name: "Budi Santoso", className: "10-IPA-1", attendanceRate: 96, avgFocusRate: 88, handRaises: 16, phoneViolations: 0, sleepIncidents: 0, riskLevel: "low" },
    { nis: "2025003", name: "Citra Dewi", className: "10-IPA-1", attendanceRate: 100, avgFocusRate: 96, handRaises: 34, phoneViolations: 0, sleepIncidents: 0, riskLevel: "low" },
    { nis: "2025004", name: "Doni Kusuma", className: "10-IPA-2", attendanceRate: 92, avgFocusRate: 85, handRaises: 12, phoneViolations: 1, sleepIncidents: 0, riskLevel: "low" },
    { nis: "2025005", name: "Eka Putri", className: "10-IPA-2", attendanceRate: 95, avgFocusRate: 90, handRaises: 22, phoneViolations: 0, sleepIncidents: 0, riskLevel: "low" },
    { nis: "2025006", name: "Fajar Nugraha", className: "11-RPL-1", attendanceRate: 90, avgFocusRate: 82, handRaises: 10, phoneViolations: 2, sleepIncidents: 0, riskLevel: "medium" },
    { nis: "2025007", name: "Gita Savitri", className: "11-RPL-1", attendanceRate: 98, avgFocusRate: 93, handRaises: 26, phoneViolations: 0, sleepIncidents: 0, riskLevel: "low" },
    { nis: "2025008", name: "Hadi Purnomo", className: "11-RPL-1", attendanceRate: 88, avgFocusRate: 78, handRaises: 8, phoneViolations: 1, sleepIncidents: 1, riskLevel: "medium" },
    { nis: "2025009", name: "Indah Lestari", className: "12-TKJ-1", attendanceRate: 96, avgFocusRate: 91, handRaises: 19, phoneViolations: 0, sleepIncidents: 0, riskLevel: "low" },
    { nis: "2025010", name: "Putra Pratama", className: "10-IPA-1", attendanceRate: 82, avgFocusRate: 72, handRaises: 4, phoneViolations: 4, sleepIncidents: 1, riskLevel: "high" },
    { nis: "2025011", name: "Rian Ardianto", className: "10-IPA-1", attendanceRate: 78, avgFocusRate: 68, handRaises: 2, phoneViolations: 1, sleepIncidents: 4, riskLevel: "critical" },
  ],
  sessions: [
    { date: "03/10/2026", subject: "Fisika Terapan", className: "10-IPA-1", teacher: "Budi Santoso, M.Pd", focusScore: 88, insightSummary: "Dinamika kelas aktif, 14 interaksi tanya jawab. Terdeteksi 1 insiden kelelahan." },
    { date: "02/10/2026", subject: "Matematika Diskrit", className: "10-IPA-2", teacher: "Siti Rahma, S.Pd", focusScore: 85, insightSummary: "Penyampaian materi terstruktur. Konsentrasi stabil sepanjang 75 menit pertama." },
    { date: "01/10/2026", subject: "Pemrograman Web", className: "11-RPL-1", teacher: "Ahmad Zaldy, S.Kom", focusScore: 92, insightSummary: "Tingkat keterlibatan praktikum tinggi. Seluruh kelompok aktif mengerjakan proyek." },
    { date: "30/09/2026", subject: "Jaringan Komputer", className: "12-TKJ-1", teacher: "Dewi Lestari, M.T", focusScore: 89, insightSummary: "Kombinasi teori dan demonstrasi lab berjalan efektif." },
  ],
};

export function AccreditationExportTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    toast.loading("Menyusun Workbook Excel Akreditasi...", { id: "export-excel" });
    try {
      await exportAccreditationExcel(MOCK_REPORT_DATA);
      toast.success("Dokumen Excel Berhasil Diunduh!", { id: "export-excel" });
      setIsOpen(false);
    } catch (err: any) {
      toast.error(`Gagal mengunduh: ${err.message}`, { id: "export-excel" });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = () => {
    setIsOpen(false);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="apple-press inline-flex items-center gap-1.5 rounded-xl border border-[rgba(60,60,67,0.12)] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F0] shadow-sm transition-all min-h-[44px]"
      >
        <FileText className="h-4 w-4 text-[#007AFF]" />
        <span>Dokumen Akreditasi</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#E7E2DA] bg-white p-6 shadow-xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E7E2DA] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#EA580C]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 tracking-tight">
                    Ekspor Dokumen Akreditasi Resmi
                  </h3>
                  <p className="text-xs text-stone-500">
                    Standar BAN-S/M • Butir Mutu & Iklim Pembelajaran AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] p-3">
                <span className="text-[10px] uppercase text-stone-400 block font-sans font-bold">
                  Total Sesi AI Terverifikasi
                </span>
                <span className="text-xl font-bold text-stone-900">{MOCK_REPORT_DATA.totalSessions} Sesi</span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">100% Memenuhi Kriteria</span>
              </div>
              <div className="rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] p-3">
                <span className="text-[10px] uppercase text-stone-400 block font-sans font-bold">
                  Indeks Fokus Kelas Rata-Rata
                </span>
                <span className="text-xl font-bold text-emerald-700">{MOCK_REPORT_DATA.avgFocusScore}%</span>
                <span className="text-[10px] text-stone-500 block mt-0.5">Predikat: Sangat Baik (A)</span>
              </div>
            </div>

            {/* Format Description */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 text-xs text-stone-600 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-stone-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Format yang Disertakan dalam Dokumen:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-stone-500 text-[11.5px]">
                <li>Lembar Ringkasan Eksekutif & Capaian Indikator Kinerja BAN-S/M</li>
                <li>Tabel Rincian Evaluasi Individual Keterlibatan Siswa per Kelas</li>
                <li>Log Mutu Sesi Pembelajaran & Analisis Rekomendasi Pedagogik AI Guru</li>
                <li>Lembar Pengesahan Resmi Kepala Sekolah & Pengawas Pembina Dinas</li>
              </ul>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDownloadExcel}
                disabled={isExporting}
                className="apple-press flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-sm transition-all disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span>Unduh Excel (.xlsx)</span>
              </button>

              <button
                onClick={handlePrintPDF}
                className="apple-press flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C2410C] shadow-sm transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Resmi (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

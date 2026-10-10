"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  FileSpreadsheet,
  Printer,
  X,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  exportAccreditationExcel,
  type AccreditationReportData,
} from "@/lib/accreditation-export";

export function AccreditationExportTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<AccreditationReportData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Ambil data agregasi akreditasi riil dari database Supabase saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchAccreditationData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/reports/accreditation", {
          cache: "no-store",
        });
        const json = await res.json();

        if (!json.success || !json.data) {
          throw new Error(json.error || "Gagal mengagregasi data akreditasi dari basis data.");
        }

        if (isMounted) {
          setReportData(json.data);
        }
      } catch (err: any) {
        console.error("Fetch accreditation error:", err);
        if (isMounted) {
          setLoadError(err.message || "Terjadi kesalahan saat memuat data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAccreditationData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleDownloadExcel = async () => {
    if (!reportData) {
      toast.error("Data akreditasi belum siap diekspor.");
      return;
    }

    setIsExporting(true);
    toast.loading("Menyusun Workbook Excel Akreditasi dari Basis Data...", { id: "export-excel" });
    try {
      await exportAccreditationExcel(reportData);
      toast.success("Dokumen Excel Akreditasi Berhasil Diunduh!", { id: "export-excel" });
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all active:scale-[0.98] min-h-[40px]"
      >
        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <span>Dokumen Akreditasi</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/70 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    Ekspor Dokumen Akreditasi Resmi
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Standar BAN-S/M • Berbasis Agregasi Basis Data Supabase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Loading / Error / Data States */}
            {isLoading ? (
              <div className="p-8 text-center rounded-xl border border-border bg-muted/20 space-y-2">
                <Loader2 className="h-6 w-6 text-orange-600 animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">
                  Mengagregasi catatan sesi, absensi, dan telemetri siswa...
                </p>
              </div>
            ) : loadError ? (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loadError}</span>
              </div>
            ) : reportData ? (
              <>
                {/* Quick Summary Cards (Real Database Data) */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="rounded-xl border border-border bg-muted/30 p-3.5 shadow-2xs">
                    <span className="text-[10px] uppercase text-muted-foreground block font-sans font-bold">
                      Total Sesi Terverifikasi
                    </span>
                    <span className="text-xl font-bold text-foreground font-mono tabular-nums">
                      {reportData.totalSessions} Sesi
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      {reportData.totalStudents} Siswa Terdaftar
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3.5 shadow-2xs">
                    <span className="text-[10px] uppercase text-muted-foreground block font-sans font-bold">
                      Indeks Fokus Rata-Rata
                    </span>
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400 font-mono tabular-nums">
                      {reportData.avgFocusScore}%
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {reportData.totalAtRisk} Siswa Perlu Pendampingan
                    </span>
                  </div>
                </div>

                {/* Format Description */}
                <div className="rounded-xl border border-border bg-muted/15 p-3.5 text-xs text-foreground/80 space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Cakupan Dokumen Laporan Resmi:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11.5px]">
                    <li>Lembar Ringkasan Eksekutif Mutu Pembelajaran BAN-S/M</li>
                    <li>Evaluasi Individual Seluruh Siswa Berdasarkan Kehadiran Nyata</li>
                    <li>Log Sesi Pembelajaran & Analisis Rekomendasi Pedagogik Guru</li>
                    <li>Lembar Pengesahan Kepala Sekolah & Pengawas Pembina</li>
                  </ul>
                </div>
              </>
            ) : null}

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDownloadExcel}
                disabled={isExporting || isLoading || !reportData}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50"
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
                disabled={isLoading || !reportData}
                className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.98] px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50"
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

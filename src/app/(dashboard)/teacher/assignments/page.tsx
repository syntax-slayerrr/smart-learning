"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Award,
  Plus,
  Sparkles,
  Download,
  PenTool,
  Clock,
} from "lucide-react";

export default function TeacherAssignmentsPage() {
  const [submissions] = useState([
    {
      id: "sub-1",
      studentName: "Zaldy Muhammad Fazri",
      studentNIM: "2506066",
      className: "XII RPL 1",
      assignmentTitle: "Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid",
      submittedAt: "15 Menit lalu",
      fileUrl: "Laporan_Tugas_VLSM_Zaldy.pdf",
      defenseStatus: "passed",
      defenseScore: 95,
      defenseSummary:
        "Mahasiswa memahami konsep subnetting dan perhitungan host valid secara mendalam. Argumentasi oral membuktikan originalitas pengerjaan tugas.",
      teacherGrade: null,
    },
    {
      id: "sub-2",
      studentName: "Ahmad Fauzi",
      studentNIM: "2506012",
      className: "XII RPL 1",
      assignmentTitle: "Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid",
      submittedAt: "1 Jam lalu",
      fileUrl: "Tugas_Ahmad_VLSM.pdf",
      defenseStatus: "passed",
      defenseScore: 82,
      defenseSummary:
        "Pemahaman dasar baik, namun terdapat keraguan minor saat menjelaskan alokasi prefix /28.",
      teacherGrade: 85,
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-32 sm:pb-24">
      <PageHeader
        title="Tugas & Verifikasi AI Defense"
        description="Pantau penyerahan tugas siswa yang telah lolos verifikasi pemahaman dan integritas AI."
        action={
          <Button
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5 shadow-xs rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Buat Tugas Baru
          </Button>
        }
      />

      {/* Overview Stat Cards - Responsive Compact Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shrink-0">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Lolos Defense
            </span>
            <span className="text-base sm:text-xl font-black text-slate-900 font-mono tracking-tight block">
              24 / 28
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium hidden sm:inline-block">
              85.7% dari total siswa
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0">
            <Award className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Rata-rata Skor
            </span>
            <span className="text-base sm:text-xl font-black text-emerald-600 font-mono tracking-tight block">
              88.5%
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-medium hidden sm:inline-block">
              Tingkat pemahaman tinggi
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80 shrink-0">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Perlu Review
            </span>
            <span className="text-base sm:text-xl font-black text-amber-600 font-mono tracking-tight block">
              4 Siswa
            </span>
            <span className="text-[9px] sm:text-[10px] text-amber-600 font-medium hidden sm:inline-block">
              Perlu intervensi guru
            </span>
          </div>
        </div>
      </div>

      {/* Submissions Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-semibold">
              Pengumpulan Tugas Terbaru & Catatan Defense
            </h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 border border-slate-200/60">
              {submissions.length} Tugas
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
            Terverifikasi AI Socratic Scaffold
          </span>
        </div>

        <div className="space-y-3.5">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-slate-300/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all space-y-3.5"
            >
              {/* Header: Student Info & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-tr from-blue-50 to-indigo-100 text-blue-700 flex items-center justify-center font-bold text-xs sm:text-sm border border-blue-200/70 shrink-0">
                    {sub.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                      {sub.studentName}{" "}
                      <span className="text-xs font-normal text-slate-500 font-mono">
                        ({sub.studentNIM})
                      </span>
                    </h5>
                    <p className="text-xs text-slate-500">
                      {sub.className} • Dikumpulkan {sub.submittedAt}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    AI Defense: {sub.defenseScore}%
                  </span>
                  {sub.teacherGrade ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                      Nilai: {sub.teacherGrade}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                      <Clock className="h-3 w-3 text-amber-500" />
                      Menunggu Penilaian
                    </span>
                  )}
                </div>
              </div>

              {/* AI Defense Validation Summary Box */}
              <div className="rounded-xl border border-indigo-100/90 bg-gradient-to-r from-indigo-50/70 via-sky-50/40 to-blue-50/40 p-3 sm:p-3.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
                  <div className="p-1 rounded-md bg-indigo-100 text-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span>Ringkasan Pemahaman AI (Defense Logic)</span>
                </div>
                <p className="text-xs text-indigo-950/85 leading-relaxed font-normal pl-0.5">
                  "{sub.defenseSummary}"
                </p>
              </div>

              {/* Footer Attachment & Actions (Mobile Responsive) */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                {/* File Attachment Pill */}
                <div className="flex items-center gap-2 p-2 sm:p-1.5 rounded-xl bg-slate-50 sm:bg-transparent border border-slate-200/60 sm:border-0 min-w-0 max-w-full">
                  <div className="h-7 w-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/80">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate font-mono">
                    {sub.fileUrl}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 font-sans">
                    • PDF
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-xs h-9 font-medium text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Unduh Berkas</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto text-xs h-9 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>Beri Nilai & Masukan</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

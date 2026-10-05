"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Award,
  Plus,
  ArrowRight,
} from "lucide-react";

export default function TeacherAssignmentsPage() {
  const [submissions] = useState([
    {
      id: "sub-1",
      studentName: "Zaldy Muhammad Fazri",
      studentNIM: "2506066",
      className: "XII RPL 1",
      assignmentTitle: "Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid",
      submittedAt: "Hari ini, 14:15 WIB",
      fileUrl: "Laporan_Tugas_VLSM_Zaldy.pdf",
      defenseStatus: "passed",
      defenseScore: 95,
      defenseSummary:
        "Siswa mampu membuktikan penguasaan logika formula 2^n - 2 pada prefix /28 dan pemisahan domain broadcast menggunakan VLAN secara konsisten.",
      teacherGrade: null,
    },
    {
      id: "sub-2",
      studentName: "Ahmad Fauzi",
      studentNIM: "2506012",
      className: "XII RPL 1",
      assignmentTitle: "Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid",
      submittedAt: "Kemarin, 21:00 WIB",
      fileUrl: "Tugas_Ahmad_VLSM.pdf",
      defenseStatus: "passed",
      defenseScore: 82,
      defenseSummary:
        "Pemahaman konsep dasar baik, namun sempat ragu pada perhitungan broadcast ID.",
      teacherGrade: 85,
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Tugas & Verifikasi AI Oral Defense"
        description="Pantau penyerahan tugas siswa yang telah lolos verifikasi pemahaman dan integritas AI."
        action={
          <Button
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Buat Tugas Baru
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 border-slate-200/80 bg-white/90">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Tugas Lolos Defense
              </span>
              <span className="text-xl font-black text-slate-900 font-mono">
                24 / 28 Siswa
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-slate-200/80 bg-white/90">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Rata-Rata Skor Orisinalitas
              </span>
              <span className="text-xl font-black text-emerald-600 font-mono">
                88.5%
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-slate-200/80 bg-white/90">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Perlu Intervensi Remedial
              </span>
              <span className="text-xl font-black text-amber-600 font-mono">
                4 Siswa
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Submissions Feed */}
      <div className="space-y-3">
        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500">
          Pengumpulan Tugas Terbaru & Catatan Defense
        </h4>

        <div className="space-y-3">
          {submissions.map((sub) => (
            <GlassCard key={sub.id} className="p-5 border-slate-200/80 bg-white/90 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {sub.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">
                      {sub.studentName} ({sub.studentNIM})
                    </h5>
                    <p className="text-xs text-slate-500">
                      {sub.className} • Dikumpulkan {sub.submittedAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="success" className="text-xs py-0.5 px-2.5 gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    AI Defense: {sub.defenseScore}%
                  </Badge>
                  {sub.teacherGrade ? (
                    <Badge variant="default" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Nilai: {sub.teacherGrade}
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs">
                      Menunggu Penilaian
                    </Badge>
                  )}
                </div>
              </div>

              {/* Defense reasoning and audit log */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/60 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Rangkuman Validasi Pemahaman AI:
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  "{sub.defenseSummary}"
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  {sub.fileUrl}
                </span>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Unduh Berkas
                  </Button>
                  <Button variant="primary" size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white">
                    Beri Nilai & Masukan
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

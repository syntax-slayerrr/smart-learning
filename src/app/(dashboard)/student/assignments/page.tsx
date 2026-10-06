"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  Award,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

type FilterTab = "all" | "pending" | "completed";

export default function StudentAssignmentsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const assignments = [
    {
      id: "asg-2",
      title: "Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid",
      subject: "Administrasi Infrastruktur Jaringan",
      teacher: "Budi Santoso, S.Kom.",
      dueDate: "Jumat, 23:59 WIB",
      status: "pending_defense",
      points: 100,
      description:
        "Rancang skema pengalamatan IP menggunakan metode VLSM untuk sebuah institusi dengan 4 subnet dan dokumentasikan tabel routing.",
    },
    {
      id: "asg-1",
      title: "Tugas 01: Pengenalan Protokol Routing RIP v2",
      subject: "Administrasi Infrastruktur Jaringan",
      teacher: "Budi Santoso, S.Kom.",
      dueDate: "Sudah Ditutup",
      status: "submitted",
      points: 100,
      defenseScore: 92,
      teacherGrade: 95,
      description:
        "Analisis kelemahan RIP v1 dan alasan digunakannya subnet mask dinamis pada implementasi routing jaringan skala menengah.",
    },
  ];

  const filteredAssignments = assignments.filter((item) => {
    if (filter === "pending") return item.status === "pending_defense";
    if (filter === "completed") return item.status === "submitted";
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28 sm:pb-20">
      {/* 1. Page Header (Semantic & Clean) */}
      <PageHeader
        eyebrow="PORTAL AKADEMIK SISWA"
        title="Tugas & Lembar Kerja"
        description="Pantau penugasan aktif, tenggat waktu pengumpulan, dan hasil uji pemahaman materi."
        action={
          <Link href="/student/notebook">
            <Button
              variant="outline"
              className="border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 px-3.5 gap-2 rounded-xl shadow-2xs font-medium"
            >
              <BookOpen className="h-4 w-4 text-slate-500" />
              <span>Buka Catatan Belajar</span>
            </Button>
          </Link>
        }
      />

      {/* 2. Overview Stat Grid (Semantic App Colors: Blue, Emerald, Slate) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Tugas Aktif */}
        <div className="card-3d-ceramic p-3 sm:p-4 rounded-2xl border border-slate-200/80 bg-white/95 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/70 shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Tugas Aktif
            </span>
            <span className="text-base sm:text-xl font-bold text-slate-900 font-mono tracking-tight block">
              1
            </span>
            <span className="text-[9px] sm:text-[10px] text-amber-600 font-medium truncate block">
              Tenggat Jumat ini
            </span>
          </div>
        </div>

        {/* Selesai */}
        <div className="card-3d-ceramic p-3 sm:p-4 rounded-2xl border border-slate-200/80 bg-white/95 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/70 shrink-0">
            <FileCheck2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Selesai
            </span>
            <span className="text-base sm:text-xl font-bold text-emerald-600 font-mono tracking-tight block">
              1
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate block">
              Terverifikasi
            </span>
          </div>
        </div>

        {/* Rata-rata Nilai */}
        <div className="card-3d-ceramic p-3 sm:p-4 rounded-2xl border border-slate-200/80 bg-white/95 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/70 shrink-0">
            <Award className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Rata-rata Nilai
            </span>
            <span className="text-base sm:text-xl font-bold text-slate-900 font-mono tracking-tight block">
              95.0
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-medium truncate block">
              Predikat Sangat Baik
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Segment & Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Daftar Penugasan
          </h3>
          <span className="text-[11px] font-medium text-slate-400">
            ({filteredAssignments.length} Tugas)
          </span>
        </div>

        {/* Tactile Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filter === "all"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filter === "pending"
                ? "bg-white text-blue-700 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Perlu Dikerjakan
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filter === "completed"
                ? "bg-white text-emerald-700 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* 4. Assignment Cards (Tactile Ceramic, No AI Slop / No Box-in-Box) */}
      <div className="space-y-3.5">
        {filteredAssignments.map((item) => {
          const isPending = item.status === "pending_defense";

          return (
            <div
              key={item.id}
              className="card-3d-ceramic p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white/95 transition-all space-y-3.5"
            >
              {/* Header: Subject Chip, Teacher & Semantic Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                    {item.subject}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    • Guru: {item.teacher}
                  </span>
                </div>

                <div className="self-start sm:self-auto">
                  {isPending ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Perlu Uji Pemahaman
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Selesai • Nilai: {item.teacherGrade}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Clean Description */}
              <div className="space-y-1.5">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {item.title}
                </h4>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Footer: Due Date Meta & Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    Batas Pengumpulan:{" "}
                    <strong className="text-slate-700 font-semibold">
                      {item.dueDate}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/student/notebook"
                    className="w-full sm:w-auto"
                  >
                    {isPending ? (
                      <Button
                        variant="primary"
                        className="w-full sm:w-auto bg-[#007AFF] hover:bg-blue-600 text-white text-xs h-9 px-4 rounded-xl gap-1.5 font-semibold shadow-2xs apple-press"
                      >
                        <span>Kerjakan di Catatan Belajar</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 px-4 rounded-xl gap-1.5 font-medium shadow-2xs"
                      >
                        <span>Lihat Hasil Uji Pemahaman ({item.defenseScore}%)</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

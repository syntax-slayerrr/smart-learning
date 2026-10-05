"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Sparkles,
} from "lucide-react";

export default function StudentAssignmentsPage() {
  const assignments = [
    {
      id: "asg-2",
      title: "Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid",
      subject: "Administrasi Infrastruktur Jaringan",
      teacher: "Budi Santoso, S.Kom.",
      dueDate: "Jumat, 23:59 WIB",
      status: "pending_defense",
      points: 100,
      description: "Rancang skema pengalamatan IP menggunakan metode VLSM untuk sebuah SMK dengan 4 subnet.",
    },
    {
      id: "asg-1",
      title: "Tugas 01: Pengenalan Protokol Routing RIP v2",
      subject: "Administrasi Infrastruktur Jaringan",
      teacher: "Budi Santoso, S.Kom.",
      dueDate: "Sudah Berakhir",
      status: "submitted",
      points: 100,
      defenseScore: 92,
      teacherGrade: 95,
      description: "Analisis kelemahan RIP v1 dan alasan digunakannya subnet mask dinamis pada RIP v2.",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Tugas & Bimbingan Mandiri"
        description="Kerjakan tugas dengan bimbingan Smart AI dan verifikasi orisinalitas melalui AI Oral Defense."
        action={
          <Link href="/student/notebook">
            <Button
              variant="primary"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 gap-1.5 shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Buka Smart Notebook AI
            </Button>
          </Link>
        }
      />

      <div className="space-y-3">
        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500">
          Daftar Tugas Aktif
        </h4>

        <div className="space-y-3">
          {assignments.map((item) => (
            <GlassCard key={item.id} className="p-5 border-slate-200/80 bg-white/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">
                      {item.title}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.subject} • Pengajar: {item.teacher}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {item.status === "pending_defense" ? (
                    <Badge variant="warning" className="text-xs">
                      Perlu AI Defense
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Defense: {item.defenseScore}%
                      </Badge>
                      <Badge variant="default" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Nilai: {item.teacherGrade}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {item.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Batas Waktu: <strong>{item.dueDate}</strong>
                </span>

                <Link href="/student/notebook">
                  <Button variant="primary" size="sm" className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                    <span>Buka & Kerjakan di Notebook</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

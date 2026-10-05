"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  UploadCloud,
  FileText,
  Video,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  Eye,
  Plus,
} from "lucide-react";

export default function TeacherMaterialsPage() {
  const [materials] = useState([
    {
      id: "mat-1",
      title: "Modul Administrasi Jaringan Komputer & VLSM",
      subject: "Infrastruktur Jaringan",
      className: "XII RPL 1",
      pageCount: 45,
      fileSize: "4.2 MB",
      uploadDate: "3 hari yang lalu",
      aiStatus: "ready",
      criticalZones: 1, // Bab 2
      confusionScore: 42,
    },
    {
      id: "mat-2",
      title: "Buku Saku Pemrograman Web Modern & Next.js",
      subject: "Pemrograman Web",
      className: "XII RPL 1",
      pageCount: 62,
      fileSize: "8.7 MB",
      uploadDate: "1 minggu yang lalu",
      aiStatus: "ready",
      criticalZones: 0,
      confusionScore: 18,
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="LMS & Modul Materi AI"
        description="Kelola modul pembelajaran, pantau korelasi telemetri kelas fisik, dan analisis titik bingung siswa."
        action={
          <Button
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Upload Dokumen Modul Baru
          </Button>
        }
      />

      {/* Closed-Loop Telemetry Summary Card for Teacher */}
      <GlassCard className="p-5 border-amber-200/80 bg-gradient-to-r from-amber-50/70 to-orange-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-950">
                  Closed-Loop Telemetry: Titik Bingung Massal Terdeteksi
                </h3>
                <Badge variant="warning" className="text-[10px]">
                  Bab 2: Subnetting
                </Badge>
              </div>
              <p className="text-xs text-amber-900/80 mt-1 leading-relaxed max-w-2xl">
                Kamera AI kelas mendeteksi penurunan atensi signifikan (42% bingung) pada sesi Rabu kemarin saat Anda menjelaskan <strong>Notasi CIDR & Perhitungan Host VLSM</strong>. Smart AI telah otomatis mengaktifkan modul analogi interaktif di Smart Notebook para siswa.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="text-xs h-8 bg-white border-amber-300 text-amber-900 hover:bg-amber-100/60 shrink-0 self-start sm:self-auto"
          >
            Lihat Rekaman Zona Atensi
          </Button>
        </div>
      </GlassCard>

      {/* Materials List */}
      <div className="space-y-3">
        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500">
          Daftar Modul & Materi Aktif
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((item) => (
            <GlassCard key={item.id} className="p-5 border-slate-200/80 bg-white/90 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h5>
                    <p className="text-xs text-slate-500">
                      {item.subject} • {item.className}
                    </p>
                  </div>
                </div>

                <Badge variant={item.criticalZones > 0 ? "warning" : "success"} className="text-[10px]">
                  {item.criticalZones > 0 ? "1 Zona Kritis" : "Pemahaman Stabil"}
                </Badge>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] text-slate-600 block">Halaman</span>
                  <span className="text-xs font-bold text-slate-800">{item.pageCount} Hal</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block">Ukuran File</span>
                  <span className="text-xs font-bold text-slate-800">{item.fileSize}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block">AI RAG & Graph</span>
                  <span className="text-xs font-bold text-emerald-600">Siap & Terindeks</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 text-[11px]">Diunggah {item.uploadDate}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Buka Viewer
                  </Button>
                  <Button variant="primary" size="sm" className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white">
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Peta Konsep AI
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

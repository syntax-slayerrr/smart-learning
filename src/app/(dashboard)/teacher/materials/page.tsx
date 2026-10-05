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
  X,
  Loader2,
  BrainCircuit,
  BarChart3,
  Lightbulb,
} from "lucide-react";

export default function TeacherMaterialsPage() {
  const [materials, setMaterials] = useState([
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Infrastruktur Jaringan");
  const [contentSample, setContentSample] = useState("");
  const [extractSuccessData, setExtractSuccessData] = useState<{
    topicsCount: number;
    nodesCount: number;
    summary: string;
  } | null>(null);

  const handleRunAiExtract = async () => {
    if (!title.trim()) return;

    setIsExtracting(true);
    setExtractSuccessData(null);

    try {
      const response = await fetch("/api/lms/materials/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: "temp-mat-" + Date.now(),
          title: title,
          fullText:
            contentSample ||
            `Bab 1: Konsep Dasar dan Fondasi Jaringan.
Bab 2: Pembagian Subnetting, Notasi CIDR, dan Magic Number.
Bab 3: Arsitektur Variable Length Subnet Mask (VLSM) dan Alokasi IP Adaptif.`,
          pageCount: 28,
        }),
      });

      const resJson = await response.json();

      if (resJson.success) {
        setExtractSuccessData({
          topicsCount: resJson.data?.topics?.length || 3,
          nodesCount: resJson.data?.concept_nodes?.length || 6,
          summary: resJson.data?.summary || "Ekstraksi AI Berhasil.",
        });

        const newMat = {
          id: "mat-" + Date.now(),
          title: title,
          subject: subject,
          className: "XII RPL 1",
          pageCount: 28,
          fileSize: "3.4 MB",
          uploadDate: "Baru saja",
          aiStatus: "ready",
          criticalZones: 0,
          confusionScore: 12,
        };

        setMaterials((prev) => [newMat, ...prev]);
      }
    } catch (err) {
      console.error("Extraction error:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="LMS & Modul Materi AI"
        description="Kelola modul pembelajaran, pantau korelasi telemetri kelas fisik, dan analisis titik bingung siswa."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setIsModalOpen(true);
              setExtractSuccessData(null);
            }}
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

      {/* Teacher Cognitive Heatmap & AI Dialectic Feedback */}
      <GlassCard className="p-5 border-slate-200/80 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Teacher Cognitive Heatmap & Dialog Smart AI
                <span className="text-[10px] font-normal bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  Agregat Kelas Terkini
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Peta titik kesulitan konsep berdasarkan interaksi dialektis siswa dengan Smart AI saat menelaah materi.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Total 182 Dialog Sokratik Minggu Ini</span>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Rumus 2^n - 2 (Host VLSM)</span>
              <Badge variant="destructive" className="text-[9px]">Tinggi (84 Tanya)</Badge>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Rata-rata 4.2 giliran dialog sebelum siswa memahami alasan angka 2 dikurangkan.
            </p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full w-[88%]" />
            </div>
            <span className="text-[10px] text-slate-400 block text-right font-mono">88% Capai Checkpoint</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">OSPF Link-State vs RIP</span>
              <Badge variant="warning" className="text-[9px]">Sedang (52 Tanya)</Badge>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Rata-rata 3.1 giliran dialog. Kebanyakan butuh analogi peta GPS vs rambu manual.
            </p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-[92%]" />
            </div>
            <span className="text-[10px] text-slate-400 block text-right font-mono">92% Capai Checkpoint</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Hierarki Prefix /28 vs /29</span>
              <Badge variant="success" className="text-[9px]">Ringan (46 Tanya)</Badge>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Rata-rata 2.4 giliran dialog. Cepat dipahami setelah panduan visual graf konsep.
            </p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[95%]" />
            </div>
            <span className="text-[10px] text-slate-400 block text-right font-mono">95% Capai Checkpoint</span>
          </div>
        </div>

        {/* Actionable Classroom Prescription */}
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950">
          <Lightbulb className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Rekomendasi Ulasan Kelas Tatap Muka:</strong> Alokasikan 5-10 menit di awal perkuliahan tatap muka berikutnya untuk mendrill perhitungan rumus <code>2^n - 2</code> pada notasi biner di papan tulis. Sebanyak 14 siswa sempat salah mengira rumus tersebut berpangkat <code>2^(n-2)</code> sebelum diluruskan oleh Smart AI.
          </p>
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

      {/* Upload & AI Extraction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Upload & AI Document Extraction
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ekstraksi bab, takeaways, dan bangun graf konsep node secara otomatis.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Judul Modul Pembelajaran
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Modul Pemodelan Basis Data Relasional & Normalisasi"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Infrastruktur Jaringan">Infrastruktur Jaringan (TKJ)</option>
                  <option value="Pemrograman Web">Pemrograman Web & Basis Data</option>
                  <option value="Sistem Keamanan Jaringan">Sistem Keamanan Jaringan</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Naskah Dokumen / Ringkasan Materi (Opsional)
                </label>
                <textarea
                  value={contentSample}
                  onChange={(e) => setContentSample(e.target.value)}
                  rows={3}
                  placeholder="Ketik atau tempel cuplikan materi PDF untuk diekstraksi AI (jika kosong, template kurikulum standar akan diproses)..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {extractSuccessData && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>AI Extraction Berhasil Diproses!</span>
                </div>
                <div className="flex gap-4 text-[11px] text-emerald-700">
                  <span><strong>{extractSuccessData.topicsCount}</strong> Bab Topik Terbentuk</span>
                  <span><strong>{extractSuccessData.nodesCount}</strong> Simpul Node Graf Dipetakan</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                className="text-xs h-9"
                onClick={() => setIsModalOpen(false)}
              >
                {extractSuccessData ? "Selesai" : "Batal"}
              </Button>
              <Button
                variant="primary"
                disabled={!title.trim() || isExtracting}
                onClick={handleRunAiExtract}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mengekstraksi AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Jalankan Ekstraksi AI & Peta Konsep</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

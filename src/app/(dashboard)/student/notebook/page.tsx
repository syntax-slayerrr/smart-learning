"use client";

import React, { useState, useEffect } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { InteractiveConceptGraph } from "@/components/lms/interactive-concept-graph";
import { ExamReadinessRadar } from "@/components/lms/exam-readiness-radar";
import { SocraticDocumentViewer } from "@/components/lms/socratic-document-viewer";
import { OralDefenseModal } from "@/components/lms/oral-defense-modal";
import {
  BookOpen,
  Network,
  ClipboardList,
  Target,
  Sparkles,
  FileCheck,
  CheckCircle2,
  Clock,
  Upload,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import {
  useOfflineStatus,
  cacheActiveMaterial,
  getCachedActiveMaterial,
} from "@/lib/offline-lms-cache";

type TabMode = "reader" | "concept_graph" | "assignments" | "readiness_radar";

export default function StudentNotebookPage() {
  const [activeTab, setActiveTab] = useState<TabMode>("reader");
  const [selectedPageFromGraph, setSelectedPageFromGraph] = useState<number>(13);
  const [selectedPromptFromGraph, setSelectedPromptFromGraph] = useState<string | undefined>(undefined);
  const [isDefenseModalOpen, setIsDefenseModalOpen] = useState<boolean>(false);
  const [submissionCompleted, setSubmissionCompleted] = useState<boolean>(false);
  const [notebookData, setNotebookData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isOnline, offlineQueueCount, isSyncing, triggerSync } = useOfflineStatus();

  useEffect(() => {
    async function fetchNotebookData() {
      try {
        setIsLoading(true);
        if (!navigator.onLine) {
          const cached = await getCachedActiveMaterial();
          if (cached) {
            setNotebookData(cached);
            setIsLoading(false);
            return;
          }
        }

        const res = await fetch("/api/lms/student/notebook-data");
        const json = await res.json();
        if (json.success && json.data) {
          setNotebookData(json.data);
          // Auto-cache into client IndexedDB for offline resilience
          cacheActiveMaterial(json.data);
        } else {
          const cached = await getCachedActiveMaterial();
          if (cached) setNotebookData(cached);
        }
      } catch (err) {
        console.warn("Jaringan offline atau lambat, memuat modul dari IndexedDB cache:", err);
        const cached = await getCachedActiveMaterial();
        if (cached) setNotebookData(cached);
      } finally {
        setIsLoading(false);
      }
    }
    fetchNotebookData();
  }, [isOnline]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <PageHeader
        title={notebookData?.material?.title ? `Smart Notebook: ${notebookData.material.title}` : "Smart Notebook & AI Studio"}
        description={notebookData?.material?.description || "Workspace pembelajaran mandiri bertenaga AI dengan korelasi telemetri kelas fisik dan verifikasi oral defense."}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!isOnline ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs py-1 px-2.5 flex items-center gap-1.5 shadow-sm">
                <WifiOff className="h-3 w-3 text-amber-600" />
                Mode Offline (Modul Tersimpan Lokal)
              </Badge>
            ) : offlineQueueCount > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={triggerSync}
                disabled={isSyncing}
                className="text-xs h-7 gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                Sinkronisasi ({offlineQueueCount} Catatan)
              </Button>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-1 px-2.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                PWA Offline Sync Siap
              </Badge>
            )}

            {isLoading && (
              <span className="text-xs text-slate-500 animate-pulse">Menyinkronkan AI...</span>
            )}
            <Badge variant="default" className="bg-purple-100 text-purple-700 border-purple-200">
              <Sparkles className="h-3 w-3 mr-1" />
              NotebookLM Engine Active
            </Badge>
          </div>
        }
      />

      {/* Segmented Control Bar (Apple HIG Touch) */}
      <div className="flex justify-center sm:justify-start">
        <SegmentedControl<TabMode>
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
          options={[
            {
              value: "reader",
              label: "Materi & Smart AI",
              icon: <BookOpen className="h-3.5 w-3.5" />,
            },
            {
              value: "concept_graph",
              label: "Peta Konsep (Graph)",
              icon: <Network className="h-3.5 w-3.5" />,
            },
            {
              value: "assignments",
              label: "Tugas & Oral Defense",
              icon: <ClipboardList className="h-3.5 w-3.5" />,
            },
            {
              value: "readiness_radar",
              label: "Radar Kesiapan Ujian",
              icon: <Target className="h-3.5 w-3.5" />,
            },
          ]}
        />
      </div>

      {/* Tab 1: Socratic Reader & Closed-Loop Telemetry */}
      {activeTab === "reader" && (
        <div className="space-y-4 animate-fade-in">
          <SocraticDocumentViewer
            chapters={notebookData?.chapters}
            materialTitle={notebookData?.material?.title}
            materialId={notebookData?.material?.id}
            initialPage={selectedPageFromGraph}
            initialPrompt={selectedPromptFromGraph}
          />
        </div>
      )}

      {/* Tab 2: Interactive Concept Graph */}
      {activeTab === "concept_graph" && (
        <div className="space-y-4 animate-fade-in">
          <InteractiveConceptGraph
            nodes={notebookData?.conceptGraph?.nodes}
            edges={notebookData?.conceptGraph?.edges}
            onSelectConceptPage={(page) => {
              setSelectedPageFromGraph(page);
              setActiveTab("reader");
            }}
            onAskSmartAI={(conceptName) => {
              setSelectedPromptFromGraph(`Bagaimana hubungan dan logika dasar dari konsep "${conceptName}" dalam modul ini?`);
              setActiveTab("reader");
            }}
          />
        </div>
      )}

      {/* Tab 3: Assignments & AI Oral Defense */}
      {activeTab === "assignments" && (
        <div className="space-y-4 animate-fade-in">
          <GlassCard className="p-5 border-slate-200/80 bg-white/90">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid
                  </h3>
                  <Badge variant={submissionCompleted ? "success" : "warning"}>
                    {submissionCompleted ? "Sudah Di-defense & Dikirim" : "Perlu Verifikasi Defense"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Mata Pelajaran: <strong>Administrasi Infrastruktur Jaringan</strong> • Batas Pengumpulan: <strong>Jumat, 23:59 WIB</strong>
                </p>
              </div>

              {!submissionCompleted ? (
                <Button
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 px-4 gap-2 shadow-md shadow-indigo-600/20"
                  onClick={() => setIsDefenseModalOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  Mulai Micro-Defense & Submit Tugas
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">
                    Tugas Terkirim Resmi (Skor Defense: 95%)
                  </span>
                </div>
              )}
            </div>

            {/* Assignment Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="md:col-span-2 space-y-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Petunjuk Pengerjaan:
                </span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  1. Rancang skema pengalamatan IP menggunakan metode VLSM untuk sebuah kampus/laboratorium dengan 4 subnet: Lab Komputer (14 PC), Ruang Dosen/Guru (6 PC), Administrasi (4 PC), dan Server Utama (2 host).
                  <br />
                  2. Tentukan Network ID, Subnet Mask, Alamat Host Pertama, Host Terakhir, dan Broadcast ID untuk tiap segmen.
                  <br />
                  3. Unggah file dokumen naskah (PDF/Word). Sebelum terkirim ke guru, sistem AI akan mengajukan 2 pertanyaan verifikasi pemahaman (Oral Defense) untuk memastikan keaslian pemikiran Anda.
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Kriteria Penilaian Guru:
                  </span>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                    <li>Akurasi perhitungan bit pinjaman (40%)</li>
                    <li>Efisiensi alokasi subnet VLSM (30%)</li>
                    <li>Konsistensi AI Oral Defense (30%)</li>
                  </ul>
                </div>

                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100/80 text-[11px] text-indigo-900 leading-relaxed">
                  🛡️ <strong>Integritas AI</strong>: Jawaban tidak bisa disalin mentah dari chatbot lain, karena Anda wajib mempertahankan logika jawaban Anda di sesi Micro-Defense.
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 4: Exam Readiness Radar */}
      {activeTab === "readiness_radar" && (
        <div className="space-y-4 animate-fade-in">
          <ExamReadinessRadar axes={notebookData?.examReadiness?.axes} />
        </div>
      )}

      {/* Oral Defense Modal Trigger */}
      <OralDefenseModal
        isOpen={isDefenseModalOpen}
        onClose={() => setIsDefenseModalOpen(false)}
        assignmentTitle="Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid"
        submissionFilename="Laporan_Tugas_VLSM_Zaldy.pdf"
        onConfirmOfficialSubmit={(data) => {
          setSubmissionCompleted(true);
        }}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InteractiveConceptGraph } from "@/components/lms/interactive-concept-graph";
import { ExamReadinessRadar } from "@/components/lms/exam-readiness-radar";
import { SocraticDocumentViewer } from "@/components/lms/socratic-document-viewer";
import { OralDefenseModal } from "@/components/lms/oral-defense-modal";
import { ErrorBoundary } from "@/components/shared/error-boundary";
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
  FileText,
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

  const tabs: { value: TabMode; label: string; icon: React.ReactNode }[] = [
    {
      value: "reader",
      label: "Materi & Smart AI",
      icon: <BookOpen className="h-3.5 w-3.5" />,
    },
    {
      value: "concept_graph",
      label: "Peta Konsep",
      icon: <Network className="h-3.5 w-3.5" />,
    },
    {
      value: "assignments",
      label: "Tugas & Defense",
      icon: <ClipboardList className="h-3.5 w-3.5" />,
    },
    {
      value: "readiness_radar",
      label: "Radar Ujian",
      icon: <Target className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-24 sm:pb-16 px-1 sm:px-2">
      {/* Top Header - Compact Apple HIG Studio Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Smart Notebook
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
              <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              NotebookLM Grounded
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl line-clamp-1">
            {notebookData?.material?.title
              ? `Modul: ${notebookData.material.title}`
              : "Workspace pembelajaran mandiri bertenaga AI dengan korelasi telemetri kelas fisik."}
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isOnline ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] py-1 px-2.5 flex items-center gap-1.5 shadow-sm">
              <WifiOff className="h-3 w-3 text-amber-600" />
              Mode Offline
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
              Sinkronisasi ({offlineQueueCount})
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              PWA Sync Aktif
            </span>
          )}

          {isLoading && (
            <span className="text-[11px] text-slate-400 animate-pulse">Menghubungkan AI...</span>
          )}
        </div>
      </div>

      {/* Segmented Control Bar (Horizontal Scrollable Apple Pill Bar) */}
      <div className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-slate-200/60 dark:bg-[#2C2C2E]/80 backdrop-blur-xl rounded-2xl border border-black/[0.04] dark:border-white/10 gap-1 min-w-full sm:min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-1 sm:flex-initial min-h-[38px] ${
                  isActive
                    ? "bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Socratic Reader & Closed-Loop Telemetry (Unified Full-Screen Studio) */}
      {activeTab === "reader" && (
        <div className="animate-fade-in">
          <ErrorBoundary fallbackTitle="Gagal Menampilkan Reader & AI Tutor">
            <SocraticDocumentViewer
              chapters={notebookData?.chapters}
              materialTitle={notebookData?.material?.title}
              materialId={notebookData?.material?.id}
              fileUrl={notebookData?.material?.fileUrl}
              fileName={notebookData?.material?.fileName}
              initialPage={selectedPageFromGraph}
              initialPrompt={selectedPromptFromGraph}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Tab 2: Interactive Concept Graph */}
      {activeTab === "concept_graph" && (
        <div className="space-y-4 animate-fade-in">
          <ErrorBoundary fallbackTitle="Gagal Menampilkan Peta Konsep (Graph)">
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
          </ErrorBoundary>
        </div>
      )}

      {/* Tab 3: Assignments & AI Oral Defense */}
      {activeTab === "assignments" && (
        <div className="space-y-4 animate-fade-in">
          <ErrorBoundary fallbackTitle="Gagal Menampilkan Tugas & Defense">
            <GlassCard className="p-4 sm:p-5 border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1C1C1E]/95">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid
                    </h3>
                    <Badge variant={submissionCompleted ? "success" : "warning"}>
                      {submissionCompleted ? "Sudah Di-defense & Dikirim" : "Perlu Verifikasi Defense"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Mata Pelajaran: <strong>Administrasi Infrastruktur Jaringan</strong> • Batas Pengumpulan: <strong>Jumat, 23:59 WIB</strong>
                  </p>
                </div>

                {!submissionCompleted ? (
                  <Button
                    variant="primary"
                    className="bg-[#007AFF] hover:bg-[#0062cc] text-white text-xs h-10 px-4 gap-2 shadow-sm rounded-xl"
                    onClick={() => setIsDefenseModalOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Mulai Micro-Defense & Submit
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Tugas Terkirim Resmi (Skor Defense: 95%)
                    </span>
                  </div>
                )}
              </div>

              {/* Assignment Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="md:col-span-2 space-y-3">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Petunjuk Pengerjaan:
                  </span>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
                    <p>1. Rancang skema pengalamatan IP menggunakan metode VLSM untuk sebuah kampus/laboratorium dengan 4 subnet: Lab Komputer (14 PC), Ruang Dosen/Guru (6 PC), Administrasi (4 PC), dan Server Utama (2 host).</p>
                    <p>2. Tentukan Network ID, Subnet Mask, Alamat Host Pertama, Host Terakhir, dan Broadcast ID untuk tiap segmen.</p>
                    <p>3. Unggah file dokumen naskah (PDF/Word). Sebelum terkirim ke guru, sistem AI akan mengajukan 2 pertanyaan verifikasi pemahaman (Oral Defense) untuk memastikan keaslian pemikiran Anda.</p>
                  </div>
                </div>

                <div className="bg-slate-50/70 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Kriteria Penilaian Guru:
                    </span>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                      <li>Akurasi perhitungan bit pinjaman (40%)</li>
                      <li>Efisiensi alokasi subnet VLSM (30%)</li>
                      <li>Konsistensi AI Oral Defense (30%)</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-100/80 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
                    🛡️ <strong>Integritas AI</strong>: Jawaban tidak bisa disalin mentah dari chatbot lain, karena Anda wajib mempertahankan logika jawaban Anda di sesi Micro-Defense.
                  </div>
                </div>
              </div>
            </GlassCard>
          </ErrorBoundary>
        </div>
      )}

      {/* Tab 4: Exam Readiness Radar */}
      {activeTab === "readiness_radar" && (
        <div className="space-y-4 animate-fade-in">
          <ErrorBoundary fallbackTitle="Gagal Menampilkan Radar Kesiapan Ujian">
            <ExamReadinessRadar
              axes={notebookData?.examReadiness?.axes}
              overallReadinessScore={notebookData?.examReadiness?.averageScore}
              onSelectFocusTopic={(topic) => {
                setSelectedPromptFromGraph(`Saya ingin memperdalam materi titik lemah: "${topic}". Berikan soal latihan adaptif beserta pembahasannya.`);
                setActiveTab("reader");
              }}
            />
          </ErrorBoundary>
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
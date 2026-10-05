"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InteractiveConceptGraph } from "@/components/lms/interactive-concept-graph";
import { ExamReadinessRadar } from "@/components/lms/exam-readiness-radar";
import { SocraticDocumentViewer } from "@/components/lms/socratic-document-viewer";
import { OralDefenseModal } from "@/components/lms/oral-defense-modal";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import {
  ArrowLeft,
  BookOpen,
  Network,
  ClipboardList,
  Target,
  Sparkles,
  FileCheck,
  CheckCircle2,
  Clock,
  WifiOff,
  RefreshCw,
  FileText,
  Lightbulb,
  HelpCircle,
  Layers,
  ChevronRight,
  GraduationCap,
  X,
  Send,
  Headphones,
  Lock,
  Play,
  RotateCcw,
  Award,
  Check,
  Zap,
} from "lucide-react";
import {
  useOfflineStatus,
  cacheActiveMaterial,
  getCachedActiveMaterial,
} from "@/lib/offline-lms-cache";

type StudySubMode = "reader" | "mindmap" | "quiz" | "chat" | "pdf";

interface MaterialItem {
  id: string;
  title: string;
  description?: string;
  pageCount?: number;
  readingTime?: string;
  status: "completed" | "in_progress" | "locked";
  topicsCount?: number;
}

interface AssignmentItem {
  id: string;
  title: string;
  deadline: string;
  status: "submitted" | "need_defense" | "pending";
  score?: number;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  materialsCount: number;
  materials: MaterialItem[];
  assignments: AssignmentItem[];
}

export default function StudentNotebookPage() {
  const router = useRouter();

  // Navigation & Hierarchy State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [studyMode, setStudyMode] = useState<StudySubMode>("reader");

  // Interactive Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Pop-up Explanation Modal State
  const [isAnalogyModalOpen, setIsAnalogyModalOpen] = useState<boolean>(false);

  // Oral Defense Modal State
  const [isDefenseModalOpen, setIsDefenseModalOpen] = useState<boolean>(false);
  const [defenseTopic, setDefenseTopic] = useState<string>("Desain Subnetting & VLSM Topologi Hybrid");

  // Data & Network State
  const [notebookData, setNotebookData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isOnline, offlineQueueCount, isSyncing, triggerSync } = useOfflineStatus();

  // Initial Data Fetch
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
          cacheActiveMaterial(json.data);
          if (json.data.subjects && json.data.subjects.length > 0) {
            setSelectedSubjectId(json.data.subjects[0].id);
          }
        } else {
          const cached = await getCachedActiveMaterial();
          if (cached) setNotebookData(cached);
        }
      } catch (err) {
        console.warn("Jaringan offline atau lambat, memuat dari cache:", err);
        const cached = await getCachedActiveMaterial();
        if (cached) setNotebookData(cached);
      } finally {
        setIsLoading(false);
      }
    }
    fetchNotebookData();
  }, [isOnline]);

  // Derived Active Subject
  const activeSubject: SubjectItem | undefined = useMemo(() => {
    if (!notebookData?.subjects?.length) return undefined;
    return (
      notebookData.subjects.find((s: SubjectItem) => s.id === selectedSubjectId) ||
      notebookData.subjects[0]
    );
  }, [notebookData, selectedSubjectId]);

  // Fallback active material details
  const activeMaterialDetails = notebookData?.material;
  const chapters = notebookData?.chapters || [];
  const conceptGraph = notebookData?.conceptGraph || { nodes: [], edges: [] };
  const examReadiness = notebookData?.examReadiness || { axes: [], averageScore: 75 };

  // Sample Interactive Quiz Questions (Derived from Extracted Material)
  const quizQuestions = [
    {
      id: 1,
      question: "Mengapa pada perhitungan usable host selalu dikurangi 2 (2ⁿ - 2)?",
      options: [
        "Karena 1 alamat untuk gateway dan 1 alamat untuk DNS server",
        "Karena alamat pertama untuk Network ID dan alamat terakhir untuk Broadcast ID",
        "Karena dialokasikan untuk protokol routing dinamis OSPF dan BGP",
        "Hanya standar formalitas IEEE tanpa fungsi teknis spesifik",
      ],
      correctIndex: 1,
      explanation:
        "Tepat! Alamat biner semua 0 dicadangkan sebagai Network ID (alamat jaringan), sedangkan semua 1 adalah Broadcast ID untuk mengirim paket ke seluruh host dalam subnet.",
    },
    {
      id: 2,
      question: "Jika sebuah divisi membutuhkan 14 host, prefix CIDR manakah yang paling efisien?",
      options: ["/27 (Maks 30 host)", "/28 (Maks 14 host)", "/29 (Maks 6 host)", "/26 (Maks 62 host)"],
      correctIndex: 1,
      explanation:
        "Tepat! /28 memiliki 4 host bit (2⁴ - 2 = 14 host). Ini adalah alokasi 100% presisi tanpa membuang IP address secara sia-sia.",
    },
    {
      id: 3,
      question: "Berapa Broadcast Address dari subnet 192.168.10.0/28?",
      options: ["192.168.10.14", "192.168.10.15", "192.168.10.16", "192.168.10.31"],
      correctIndex: 1,
      explanation:
        "Tepat! Blok ukuran /28 adalah 16 IP (0-15). Network ID = 192.168.10.0, usable host = .1 s/d .14, dan Broadcast ID = 192.168.10.15.",
    },
  ];

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleCalculateScore = () => {
    setQuizSubmitted(true);
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const quizScore = useMemo(() => {
    let correct = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) correct++;
    });
    return Math.round((correct / quizQuestions.length) * 100);
  }, [quizAnswers, quizQuestions]);

  // Loading State
  if (isLoading && !notebookData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 text-center animate-fade-in">
        <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mb-4 text-[#007AFF] shadow-sm animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-[#1D1D1F]">Memuat Buku Pintar Siswa...</h2>
        <p className="text-xs text-[#6E6E73] max-w-xs mt-1">
          Menyiapkan silabus materi, ekstraksi AI, dan peta konsep bebas gangguan.
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: LEVEL 1 — SHELF VIEW (TABEL MATA PELAJARAN, MATERI & TUGAS)
  // =========================================================================
  if (!selectedMaterial) {
    return (
      <div className="min-h-full bg-transparent text-[#1D1D1F] flex flex-col pb-16">
        {/* Top Minimalist Header */}
        <header className="sticky top-0 z-30 bg-white/50 backdrop-blur-2xl border-b border-white/40 px-4 sm:px-6 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/student")}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/70 text-[#1D1D1F] active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                title="Kembali ke Dashboard Utama Siswa"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-[#1D1D1F] tracking-tight">
                    Buku Pintar Siswa
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#007AFF] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-2.5 w-2.5" /> Smart Focus
                  </span>
                </div>
                <p className="text-[11px] text-[#6E6E73]">
                  Pilih materi & tugas untuk belajar terarah bersama Smart AI
                </p>
              </div>
            </div>

            {/* Offline / Online Status Indicator */}
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Mode Offline</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span className="hidden sm:inline">Tersinkronisasi</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-6">
          {/* 1. Subject Selector Horizontal Pills (Apple HIG Style) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6E6E73] font-medium px-1">
              <span>PILIH MATA PELAJARAN</span>
              <span>{notebookData?.subjects?.length || 4} Mapel Terdaftar</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(notebookData?.subjects || [
                { id: "tkj-1", name: "Jaringan Komputer & Subnetting", code: "TKJ" },
                { id: "rpl-1", name: "Pemrograman Web (RPL)", code: "RPL" },
                { id: "mat-1", name: "Matematika", code: "MAT" },
                { id: "bin-1", name: "Bahasa Indonesia", code: "BIN" },
              ]).map((sub: any) => {
                const isActive = (activeSubject?.id || selectedSubjectId) === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`px-4 py-2.5 rounded-2xl whitespace-nowrap text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                      isActive
                        ? "bg-[#007AFF] text-white shadow-md shadow-blue-500/25 border border-blue-400/40"
                        : "bg-white/50 hover:bg-white/75 text-[#1D1D1F] border border-white/60 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? "bg-white" : "bg-[#007AFF]"
                      }`}
                    />
                    <span>{sub.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isActive ? "bg-white/20 text-white" : "bg-black/[0.04] text-[#6E6E73]"
                      }`}
                    >
                      {sub.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Active Subject Hero Card (Frosted Apple Glass) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] transition-all space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-200/60">
                  {activeSubject?.code || "MAPEL"} • Kurikulum Terpadu
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1F] mt-2 tracking-tight">
                  {activeSubject?.name || "Jaringan Komputer & Subnetting"}
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] mt-1 leading-relaxed">
                  Pelajari modul resmi, uji pemahaman melalui kuis adaptif, dan eksplorasi peta konsep interaktif.
                </p>
              </div>

              {/* Quick Metrics */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3.5 py-2 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 text-center min-w-[70px] shadow-2xs">
                  <p className="text-xs font-bold text-[#1D1D1F]">
                    {activeSubject?.materials?.length || 2}
                  </p>
                  <p className="text-[10px] text-[#6E6E73]">Modul</p>
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-emerald-50/70 backdrop-blur-md border border-emerald-200/60 text-center min-w-[70px] shadow-2xs">
                  <p className="text-xs font-bold text-emerald-600">92%</p>
                  <p className="text-[10px] text-emerald-700/80">Rerata</p>
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-blue-50/70 backdrop-blur-md border border-blue-200/60 text-center min-w-[70px] shadow-2xs">
                  <p className="text-xs font-bold text-[#007AFF]">1</p>
                  <p className="text-[10px] text-blue-700/80">Tugas</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Section: Daftar Materi (Silabus Bab) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#007AFF]" />
                Daftar Materi Pembelajaran
              </h3>
              <span className="text-xs text-[#6E6E73]">Pilih untuk mulai belajar</span>
            </div>

            <div className="space-y-2.5">
              {(
                activeSubject?.materials || [
                  {
                    id: "374668a0-6b09-4e1f-9993-fa8bf2a781d8",
                    title: "Modul Praktis Subnetting IPv4 & VLSM Jaringan Komputer",
                    description: "Perhitungan Network ID, Broadcast, Subnet Mask /24 s/d /30, dan topologi hierarkis.",
                    readingTime: "15 mnt",
                    status: "in_progress",
                    pageCount: 32,
                    topicsCount: 3,
                  },
                  {
                    id: "5aaa3233-0fe1-486a-951e-9dfdd11262a6",
                    title: "Konfigurasi Dynamic Routing OSPF & Multi-Area Backbone",
                    description: "Implementasi protokol Link-State, pembagian Area 0, dan kalkulasi Cost Metric.",
                    readingTime: "25 mnt",
                    status: "completed",
                    pageCount: 28,
                    topicsCount: 4,
                  },
                ]
              ).map((mat: any, idx: number) => {
                const isSelected = (selectedMaterial as any)?.id === mat.id;
                return (
                  <div
                    key={mat.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white/60 hover:bg-white/80 backdrop-blur-2xl border border-white/65 hover:border-[#007AFF]/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,122,255,0.08)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 text-sm font-bold ${
                          mat.status === "completed"
                            ? "bg-emerald-50 text-[#34C759] border border-emerald-200/60"
                            : "bg-blue-50 text-[#007AFF] border border-blue-200/60"
                        }`}
                      >
                        {mat.status === "completed" ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <span>0{idx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors line-clamp-1">
                            {mat.title}
                          </h4>
                          {mat.status === "completed" && (
                            <span className="text-[10px] font-semibold text-[#34C759] bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                              Selesai
                            </span>
                          )}
                          {mat.status === "in_progress" && (
                            <span className="text-[10px] font-semibold text-[#007AFF] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                              Aktif Dipelajari
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6E6E73] line-clamp-1 leading-relaxed">
                          {mat.description || "Ekstraksi AI komprehensif, visualisasi diagram, dan uji pemahaman."}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-[#6E6E73] pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {mat.readingTime || "15 mnt"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {mat.pageCount || 24} Halaman
                          </span>
                          <span>•</span>
                          <span className="text-[#007AFF] font-medium flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Ekstrak AI Siap
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => {
                          setSelectedMaterial(mat);
                          setStudyMode("reader");
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-[0_4px_12px_rgba(0,122,255,0.3)] active:scale-95 transition-all"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Pelajari Materi</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Section: Daftar Tugas & Oral Defense Terkait */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#007AFF]" />
                Tugas Mata Pelajaran Ini
              </h3>
              <span className="text-xs text-[#6E6E73]">Verifikasi pemahaman mandiri</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/65 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-blue-50/80 text-[#007AFF] border border-blue-200/60 flex items-center justify-center shrink-0">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-[#1D1D1F]">
                      Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid
                    </h4>
                    <span className="text-[10px] font-semibold text-[#007AFF] bg-blue-50/80 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                      Perlu Oral Defense
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E73]">
                    Batas waktu: <span className="font-semibold text-[#1D1D1F]">Jumat, 23:59 WIB</span> • Bobot: 25% Nilai Akhir
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDefenseTopic("Desain Subnetting & Simulasi Topologi Hybrid");
                  setIsDefenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-white/80 text-[#1D1D1F] text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-all self-end sm:self-center"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
                <span>Ikuti Micro-Defense</span>
              </button>
            </div>
          </div>
        </main>

        {/* Oral Defense Modal */}
        <OralDefenseModal
          isOpen={isDefenseModalOpen}
          onClose={() => setIsDefenseModalOpen(false)}
          assignmentTitle={defenseTopic}
          submissionFilename="dokumen_tugas_subnetting_vlsm.pdf"
          onConfirmOfficialSubmit={(data) => {
            console.log("Defense confirmed:", data);
            setIsDefenseModalOpen(false);
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW B: LEVEL 2 — RUANG BELAJAR MATERI (FOCUS WORKSPACE)
  // =========================================================================
  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent text-[#1D1D1F]">
      {/* 1. TOP BAR MINIMALIS DENGAN TOMBOL BACK PANAH */}
      <header className="shrink-0 z-30 bg-white/50 backdrop-blur-2xl border-b border-white/40 px-3.5 sm:px-6 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Tombol Back Panah Minimalist */}
            <button
              onClick={() => setSelectedMaterial(null)}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/70 text-[#1D1D1F] active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] shrink-0"
              title="Kembali ke Daftar Materi & Tugas"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-[#1D1D1F] truncate max-w-[200px] sm:max-w-md">
                  {selectedMaterial.title}
                </h1>
                <span className="hidden sm:inline-flex items-center text-[10px] font-semibold text-[#007AFF] bg-blue-50/80 border border-blue-200/60 px-2 py-0.2 rounded-full shrink-0">
                  Bab 2 • 15 Mnt
                </span>
              </div>
              <p className="text-[10px] text-[#6E6E73] truncate">
                {activeSubject?.name || "Jaringan Komputer"} • Ekstraksi AI
              </p>
            </div>
          </div>

          {/* Quick Actions at Top Right */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsAnalogyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/60 hover:bg-white/80 backdrop-blur-xl text-[#007AFF] text-xs font-semibold border border-white/70 active:scale-95 transition-all shadow-2xs"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pop-up Analogi</span>
            </button>
          </div>
        </div>

        {/* 2. SEGMENTED SWITCHER (APPLE GLASS CAPSULE) */}
        <div className="max-w-5xl mx-auto mt-2 flex items-center justify-start sm:justify-center overflow-x-auto pb-0.5 scrollbar-none">
          <div className="inline-flex items-center p-0.5 sm:p-1 rounded-2xl bg-white/50 backdrop-blur-2xl border border-white/60 gap-1 shadow-xs">
            <button
              onClick={() => setStudyMode("reader")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                studyMode === "reader"
                  ? "bg-white/90 backdrop-blur-md text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-bold border border-white/80"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-[#007AFF]" />
              <span>Teks Materi</span>
            </button>

            <button
              onClick={() => setStudyMode("mindmap")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                studyMode === "mindmap"
                  ? "bg-white/90 backdrop-blur-md text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-bold border border-white/80"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <Network className="h-3.5 w-3.5 text-[#5E5CE6]" />
              <span>Peta Konsep</span>
            </button>

            <button
              onClick={() => setStudyMode("quiz")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                studyMode === "quiz"
                  ? "bg-white/90 backdrop-blur-md text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-bold border border-white/80"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 text-[#007AFF]" />
              <span>Kuis Interaktif</span>
            </button>

            <button
              onClick={() => setStudyMode("chat")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                studyMode === "chat"
                  ? "bg-white/90 backdrop-blur-md text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-bold border border-white/80"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
              <span>Tanya Smart AI</span>
            </button>

            <button
              onClick={() => setStudyMode("pdf")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                studyMode === "pdf"
                  ? "bg-white/90 backdrop-blur-md text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-bold border border-white/80"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-[#34C759]" />
              <span>Modul Asli</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. DYNAMIC WORKSPACE VIEW CONTENT */}
      <main
        className={`flex-1 flex flex-col min-h-0 w-full max-w-5xl mx-auto ${
          studyMode === "chat"
            ? "p-0 sm:p-4 overflow-hidden"
            : "overflow-y-auto overscroll-contain p-3 sm:p-6"
        }`}
      >
        {/* =================================================================== */}
        {/* SUB-MODE 1: TEKS MATERI (CLEAN, EYE-FRIENDLY READER & FEATURE HUB) */}
        {/* =================================================================== */}
        {studyMode === "reader" && (
          <div className="space-y-5 animate-fade-in">
            {/* Reading Canvas Card */}
            <div className="p-5 sm:p-8 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] space-y-6">
              {/* Header Bab */}
              <div className="space-y-1.5 border-b border-black/[0.06] pb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#007AFF]">
                  Bab 2 • Subnetting IPv4 & VLSM
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                  Implementasi Alokasi VLSM pada Topologi Router Bertingkat
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">
                  Hasil ekstraksi cerdas dari modul ajar resmi. Menyajikan intisari teknis, rumus matematis alokasi bit host, dan efisiensi pengalamatan IP.
                </p>
              </div>

              {/* Paragraf Materi Inti */}
              <div className="space-y-4 text-sm text-[#1D1D1F] leading-relaxed">
                <p>
                  Dalam merancang arsitektur jaringan komputer modern skala kampus atau korporat, pemborosan alamat IPv4 dapat diminimalisir menggunakan metode <strong>Variable Length Subnet Mask (VLSM)</strong>. Berbeda dengan subnetting kelas standar (FLSM) yang membagi ruang alamat sama rata, VLSM memungkinkan seorang administrator jaringan mengalokasikan subnet dengan ukuran mask yang berbeda sesuai kebutuhan riil masing-masing segmen (LAN).
                </p>

                {/* Box Formula Matematika Elegan & Ramah Mata */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
                      Formula Perhitungan Usable Host Subnet
                    </span>
                    <button
                      onClick={() => setIsAnalogyModalOpen(true)}
                      className="text-[11px] font-semibold text-[#007AFF] hover:underline"
                    >
                      Bongkar Analogi →
                    </button>
                  </div>
                  <div className="py-2 text-center font-mono text-base sm:text-lg font-bold text-[#1D1D1F]">
                    Jumlah Usable Host = 2ⁿ - 2
                  </div>
                  <p className="text-xs text-[#6E6E73] leading-relaxed">
                    di mana <em>n</em> adalah jumlah bit nol (host bit) yang tersisa setelah peminjaman bit network (CIDR). Nilai 2 dikurangkan karena alamat pertama adalah <strong>Network ID</strong> dan alamat terakhir adalah <strong>Broadcast ID</strong>.
                  </p>
                </div>

                <p>
                  Sebagai contoh kasus nyata pada segmen laboratorium dengan kebutuhan 14 komputer host: jika dialokasikan menggunakan subnet mask konvensional <code>/24</code> (254 host), maka terjadi pemborosan sebanyak 240 alamat IP. Melalui pendekatan VLSM, administrator memilih subnet <code>/28</code> (yang menyediakan 16 total IP dan tepat 14 usable host), sehingga tingkat efisiensi alokasi IP mencapai <strong>100% presisi</strong>.
                </p>

                {/* Poin Kunci Belajar */}
                <div className="p-4 rounded-2xl bg-blue-50/70 backdrop-blur-md border border-blue-200/60 space-y-2">
                  <h4 className="text-xs font-bold text-[#007AFF] uppercase tracking-wide">
                    Poin Penting untuk Ujian & Defense:
                  </h4>
                  <ul className="text-xs text-[#1D1D1F] space-y-1.5 list-disc list-inside">
                    <li>Alokasikan subnet mulai dari kebutuhan host terbesar ke kebutuhan terkecil.</li>
                    <li>Untuk sambungan Point-to-Point antar dua router, selalu gunakan subnet <code>/30</code> (2 usable host).</li>
                    <li>Pastikan tidak ada interval IP yang tumpang tindih (overlapping range).</li>
                  </ul>
                </div>
              </div>

              {/* FEATURE HUB 4 KARTU KACA (SESUAI REFERENSI UI LAYAR 4) */}
              <div className="pt-4 border-t border-black/[0.06] space-y-3">
                <span className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                  Alat Bantu Belajar Smart AI
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => setStudyMode("mindmap")}
                    className="p-3 rounded-2xl bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-[#5E5CE6]/50 active:scale-95 transition-all text-left group"
                  >
                    <div className="h-8 w-8 rounded-xl bg-purple-50 text-[#5E5CE6] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Network className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-[#1D1D1F]">Peta Konsep</p>
                    <p className="text-[10px] text-[#6E6E73]">Visual interaktif</p>
                  </button>

                  <button
                    onClick={() => setStudyMode("quiz")}
                    className="p-3 rounded-2xl bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400/50 active:scale-95 transition-all text-left group"
                  >
                    <div className="h-8 w-8 rounded-xl bg-blue-50/80 text-[#007AFF] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-[#1D1D1F]">Kuis Interaktif</p>
                    <p className="text-[10px] text-[#6E6E73]">Uji pemahaman</p>
                  </button>

                  <button
                    onClick={() => setStudyMode("chat")}
                    className="p-3 rounded-2xl bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-[#007AFF]/50 active:scale-95 transition-all text-left group"
                  >
                    <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-[#1D1D1F]">Tanya AI</p>
                    <p className="text-[10px] text-[#6E6E73]">Socratic tutor</p>
                  </button>

                  <button
                    onClick={() => setIsAnalogyModalOpen(true)}
                    className="p-3 rounded-2xl bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-emerald-300 active:scale-95 transition-all text-left group"
                  >
                    <div className="h-8 w-8 rounded-xl bg-emerald-50 text-[#34C759] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-[#1D1D1F]">Pop-up Analogi</p>
                    <p className="text-[10px] text-[#6E6E73]">Penjelasan nyata</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODE 2: MIND MAP VIEW (PETA KONSEP INTERAKTIF)                 */}
        {/* =================================================================== */}
        {studyMode === "mindmap" && (
          <div className="flex-1 flex flex-col min-h-[600px] h-full rounded-3xl overflow-hidden bg-white/60 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] animate-fade-in relative">
            <div className="p-3.5 border-b border-black/[0.06] bg-white/40 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-[#5E5CE6]" />
                <span className="text-xs font-bold text-[#1D1D1F]">
                  Peta Konsep Visual: Hubungan Subnetting, Host Bits & Formula 2ⁿ - 2
                </span>
              </div>
              <span className="text-[11px] text-[#6E6E73]">
                Klik node konsep untuk melihat rangkuman
              </span>
            </div>
            <div className="flex-1 min-h-0 relative">
              <InteractiveConceptGraph
                nodes={conceptGraph.nodes}
                edges={conceptGraph.edges}
                onSelectConceptPage={(page) => {
                  console.log("Selected page:", page);
                }}
                onAskSmartAI={(conceptName) => {
                  setStudyMode("chat");
                }}
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODE 3: KUIS INTERAKTIF (UJI PEMAHAMAN MANDIRI)                */}
        {/* =================================================================== */}
        {studyMode === "quiz" && (
          <div className="space-y-4 max-w-3xl mx-auto w-full animate-fade-in">
            {/* Quiz Header Card */}
            <div className="p-5 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                  Uji Pemahaman Mandiri
                </span>
                <h3 className="text-base font-bold text-[#1D1D1F] mt-1">
                  Kuis Reflektif Materi Subnetting & VLSM
                </h3>
                <p className="text-xs text-[#6E6E73]">
                  {quizQuestions.length} Pertanyaan adaptif berdasarkan modul ajar resmi.
                </p>
              </div>

              {quizSubmitted && (
                <div className="flex items-center gap-3 bg-emerald-50/80 backdrop-blur-md border border-emerald-200 px-4 py-2 rounded-2xl">
                  <Award className="h-6 w-6 text-[#34C759]" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Skor Kamu: {quizScore}%</p>
                    <p className="text-[10px] text-emerald-700">
                      {quizScore >= 70 ? "Pemahaman Kuat! Siap Oral Defense." : "Perlu reviu bab ini lagi."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {quizQuestions.map((q, qIdx) => {
                const selectedOpt = quizAnswers[qIdx];
                const isAnswered = selectedOpt !== undefined;
                const isCorrect = selectedOpt === q.correctIndex;

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.04)] space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="h-6 w-6 rounded-full bg-[#007AFF]/10 text-xs font-bold text-[#007AFF] flex items-center justify-center shrink-0">
                        {qIdx + 1}
                      </span>
                      <p className="text-sm font-bold text-[#1D1D1F] leading-snug">{q.question}</p>
                    </div>

                    {/* Options */}
                    <div className="space-y-1.5 pl-8">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = selectedOpt === optIdx;
                        let optionStyle =
                          "bg-white/70 hover:bg-white/90 backdrop-blur-md text-[#1D1D1F] border-white/60";

                        if (quizSubmitted) {
                          if (optIdx === q.correctIndex) {
                            optionStyle = "bg-emerald-50/90 border-emerald-300 text-emerald-900 font-semibold";
                          } else if (isChosen && !isCorrect) {
                            optionStyle = "bg-rose-50/90 border-rose-300 text-rose-900 line-through";
                          }
                        } else if (isChosen) {
                          optionStyle = "bg-blue-50/90 border-[#007AFF] text-[#007AFF] font-semibold shadow-2xs";
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                            disabled={quizSubmitted}
                            className={`w-full p-3 rounded-2xl border text-xs text-left transition-all flex items-center justify-between gap-2 ${optionStyle}`}
                          >
                            <span>{opt}</span>
                            {quizSubmitted && optIdx === q.correctIndex && (
                              <CheckCircle2 className="h-4 w-4 text-[#34C759] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Socratic Explanation */}
                    {quizSubmitted && (
                      <div className="ml-8 p-3 rounded-2xl bg-white/50 backdrop-blur-md text-xs text-[#6E6E73] space-y-1 border border-white/60">
                        <p className="font-semibold text-[#1D1D1F] flex items-center gap-1">
                          <Lightbulb className="h-3 w-3 text-[#007AFF]" />
                          Pembahasan Konseptual:
                        </p>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiz Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {quizSubmitted ? (
                <button
                  onClick={handleResetQuiz}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/70 text-xs font-semibold text-[#1D1D1F] shadow-2xs active:scale-95 transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Ulangi Kuis</span>
                </button>
              ) : (
                <button
                  onClick={handleCalculateScore}
                  disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all"
                >
                  <Check className="h-4 w-4" />
                  <span>Cek Jawaban & Nilai</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODE 4: TANYA SMART AI (SOCRATIC CHAT & DOCK)                  */}
        {/* =================================================================== */}
        {studyMode === "chat" && (
          <div className="flex-1 flex flex-col min-h-0 h-full w-full overflow-hidden sm:rounded-3xl border-0 sm:border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.04)] animate-fade-in bg-white/40 sm:bg-white/60 backdrop-blur-2xl">
            <SocraticDocumentViewer
              materialId={selectedMaterial.id}
              materialTitle={selectedMaterial.title}
              fileName={activeMaterialDetails?.fileName || "Modul_Subnetting_IPv4.pdf"}
              fileUrl={activeMaterialDetails?.fileUrl || ""}
              chapters={chapters}
              studentId="student-mock-zaldy"
              onNavigateToReader={() => setStudyMode("reader")}
              className="border-0 shadow-none bg-transparent"
            />
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODE 5: MODUL ASLI (PDF ORIGINAL READER)                       */}
        {/* =================================================================== */}
        {studyMode === "pdf" && (
          <div className="flex-1 flex flex-col min-h-[600px] h-full rounded-3xl overflow-hidden bg-white/60 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] animate-fade-in p-6 text-center justify-center items-center">
            <div className="h-14 w-14 rounded-3xl bg-blue-50 text-[#007AFF] flex items-center justify-center mb-3 border border-blue-200/50 shadow-2xs">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[#1D1D1F]">
              Dokumen Asli Modul Praktis Guru
            </h3>
            <p className="text-xs text-[#6E6E73] max-w-sm mt-1 mb-4 leading-relaxed">
              {activeMaterialDetails?.fileName || "Modul_Subnetting_IPv4.pdf"} (32 Halaman)
              Telah tervalidasi dan disinkronkan ke dalam basis data offline siswa.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStudyMode("reader")}
                className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-semibold shadow-2xs hover:bg-blue-600 active:scale-95 transition-all"
              >
                Kembali ke Bacaan AI
              </button>
              <button
                onClick={() => setStudyMode("chat")}
                className="px-4 py-2 rounded-xl bg-white/80 border border-white/70 backdrop-blur-md text-[#1D1D1F] text-xs font-semibold shadow-2xs hover:bg-white active:scale-95 transition-all"
              >
                Bahas via Chat AI
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* 4. POP-UP PENJELASAN & ANALOGI (FROSTED GLASS MODAL SESUAI LAYAR 6)   */}
      {/* ===================================================================== */}
      {isAnalogyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Dimmed backdrop with blur */}
          <div
            onClick={() => setIsAnalogyModalOpen(false)}
            className="absolute inset-0 bg-black/25 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container (Porcelain Apple Glass) */}
          <div className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.12)] rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 text-[#1D1D1F]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-blue-50/80 text-[#007AFF] flex items-center justify-center border border-blue-200/50">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F]">
                    Pop-up Penjelasan: Misteri 2ⁿ - 2
                  </h3>
                  <p className="text-[11px] text-[#6E6E73]">Analogi Dunia Nyata yang Intuitif</p>
                </div>
              </div>
              <button
                onClick={() => setIsAnalogyModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-black/[0.04] hover:bg-black/[0.08] text-[#1D1D1F] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#1D1D1F]">
              <p>
                Bayangkan sebuah <strong>kompleks perumahan baru</strong> yang memiliki total 16 kapling tanah:
              </p>
              <div className="p-3.5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 space-y-2">
                <div className="flex items-center gap-2 text-[#007AFF] font-bold">
                  <Check className="h-4 w-4" />
                  <span>1 Alamat Pertama (Network ID)</span>
                </div>
                <p className="text-[11px] text-[#6E6E73] pl-6">
                  Ibarat <strong>Papan Plang Gerbang Masuk</strong> perumahan. Bukan rumah tinggal siapapun, tetapi tanda pengenal kompleks bagi tukang pos dari luar.
                </p>

                <div className="flex items-center gap-2 text-[#007AFF] font-bold">
                  <Check className="h-4 w-4" />
                  <span>1 Alamat Terakhir (Broadcast ID)</span>
                </div>
                <p className="text-[11px] text-[#6E6E73] pl-6">
                  Ibarat <strong>Pengeras Suara Masjid/Pos Satpam</strong>. Ketika satpam berbicara lewat pelantang ini, seluruh warga dalam perumahan serentak mendengar pesan tersebut.
                </p>
              </div>

              <p className="text-[#6E6E73]">
                Karena gerbang dan pelantang tidak boleh dijadikan tempat tidur warga, maka dari 16 kapling yang tersedia, rumah yang benar-benar bisa dihuni warga (usable host) adalah <strong>16 - 2 = 14 rumah</strong>.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAnalogyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 transition-all shadow-2xs"
              >
                Paham, Terima Kasih!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
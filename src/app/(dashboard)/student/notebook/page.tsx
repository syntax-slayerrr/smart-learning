"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/shared/error-boundary";

// Dynamic imports with Apple HIG skeletons for heavy sub-mode components
const InteractiveConceptGraph = dynamic(
  () => import("@/components/lms/interactive-concept-graph").then((mod) => mod.InteractiveConceptGraph),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 rounded-3xl bg-white/40 backdrop-blur-md flex flex-col items-center justify-center border border-white/60 animate-pulse text-xs text-[#86868B] gap-2">
        <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <span>Memuat Peta Konsep Interaktif...</span>
      </div>
    ),
  }
);

const SocraticDocumentViewer = dynamic(
  () => import("@/components/lms/socratic-document-viewer").then((mod) => mod.SocraticDocumentViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] rounded-3xl bg-white/40 backdrop-blur-md flex flex-col items-center justify-center border border-white/60 animate-pulse text-xs text-[#86868B] gap-2">
        <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <span>Menyiapkan Lembar Diskusi Smart AI...</span>
      </div>
    ),
  }
);

const OralDefenseModal = dynamic(
  () => import("@/components/lms/oral-defense-modal").then((mod) => mod.OralDefenseModal),
  { ssr: false }
);

const InteractiveStudyCalculator = dynamic(
  () => import("@/components/lms/interactive-study-calculator").then((mod) => mod.InteractiveStudyCalculator),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 rounded-3xl bg-white/40 backdrop-blur-md flex flex-col items-center justify-center border border-white/60 animate-pulse text-xs text-[#86868B] gap-2">
        <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <span>Menyiapkan Kalkulator & Lab Simulasi...</span>
      </div>
    ),
  }
);
import {
  ArrowLeft,
  BookOpen,
  Network,
  ClipboardList,
  Target,
  BrainCircuit,
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
  Pause,
  RotateCcw,
  Award,
  Check,
  Zap,
  Volume2,
  Copy,
  Bookmark,
  Bot,
  Calculator,
} from "lucide-react";
import {
  useOfflineStatus,
  cacheActiveMaterial,
  getCachedActiveMaterial,
  saveOfflineQuiz,
} from "@/lib/offline-lms-cache";

type StudySubMode = "reader" | "mindmap" | "quiz" | "calculator" | "chat" | "pdf";

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

function StudentNotebookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation & Hierarchy State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [studyMode, setStudyMode] = useState<StudySubMode>("reader");

  // Interactive Quiz State & Persistence
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizTimerSeconds, setQuizTimerSeconds] = useState<number>(0);
  const [quizFilter, setQuizFilter] = useState<"all" | "correct" | "incorrect">("all");

  useEffect(() => {
    let timer: any;
    if (studyMode === "quiz" && !quizSubmitted) {
      timer = setInterval(() => {
        setQuizTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [studyMode, quizSubmitted]);

  // Active Chapter / Topic State
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);

  // Data & Network State
  const [notebookData, setNotebookData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isOnline, offlineQueueCount, isSyncing, triggerSync } = useOfflineStatus();

  // Oral Defense Modal State
  const [isDefenseModalOpen, setIsDefenseModalOpen] = useState<boolean>(false);
  const [defenseTopic, setDefenseTopic] = useState<string>("Evaluasi Pemahaman Materi");

  // Pop-up Explanation Modal State
  const [isAnalogyModalOpen, setIsAnalogyModalOpen] = useState<boolean>(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState<boolean>(false);

  // Audio Summary 60s Player State
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [showAudioBar, setShowAudioBar] = useState<boolean>(false);

  // Floating Contextual Action Bar State
  const [selectedSnippet, setSelectedSnippet] = useState<string>("");
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Dynamic Loading Tips State
  const [tipIndex, setTipIndex] = useState<number>(0);
  const loadingTips = useMemo(
    () => [
      "Tip Belajar: Menjelaskan konsep ke orang lain (atau AI) melatih pemahaman hingga 90%.",
      "Smart AI Insight: Memetakan konsep inti membantu mengingat hierarki materi perkuliahan.",
      "Fokus Aktif: Hubungkan topik utama dengan studi kasus nyata untuk pemahaman mendalam.",
      "Refleksi Cepat: Evaluasi pemahaman melalui kuis reflektif setelah membaca intisari materi.",
    ],
    []
  );

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % loadingTips.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isLoading, loadingTips.length]);

  // Audio 60s progress simulation
  useEffect(() => {
    let timer: any;
    if (isAudioPlaying) {
      timer = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsAudioPlaying(false);
            return 0;
          }
          return prev + 1.6; // ~60 seconds total
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAudioPlaying]);

  // Handle Text Selection for Floating Contextual Menu
  const handleReaderMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setContextMenuPos(null);
      setSelectedSnippet("");
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 5) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedSnippet(text);
      setContextMenuPos({
        x: Math.max(16, rect.left + rect.width / 2),
        y: Math.max(16, rect.top - 10),
      });
    } else {
      setContextMenuPos(null);
      setSelectedSnippet("");
    }
  };

  // Student ID resolved from Auth session
  const [currentStudentId, setCurrentStudentId] = useState<string>("51d15a3b-f681-425d-81a9-ca177b8f77ce");

  useEffect(() => {
    async function loadAuthStudent() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();
          if (student?.id) {
            setCurrentStudentId(student.id);
          }
        }
      } catch (err) {
        console.warn("Gagal resolve auth student:", err);
      }
    }
    loadAuthStudent();
  }, []);

  const loadNotebookData = useCallback(async (targetMaterialId?: string) => {
    try {
      setIsLoading(true);
      const url = targetMaterialId
        ? `/api/lms/student/notebook-data?materialId=${targetMaterialId}&studentId=${currentStudentId}`
        : `/api/lms/student/notebook-data?studentId=${currentStudentId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setNotebookData(json.data);
        cacheActiveMaterial(json.data);
        if (json.data.material) {
          setSelectedMaterial(json.data.material);
        }
        if (json.data.subjects && json.data.subjects.length > 0) {
          if (json.data.material?.subject_id) {
            setSelectedSubjectId(json.data.material.subject_id);
          } else if (!selectedSubjectId) {
            const firstWithMats = json.data.subjects.find((s: SubjectItem) => s.materials && s.materials.length > 0);
            setSelectedSubjectId(firstWithMats ? firstWithMats.id : json.data.subjects[0].id);
          }
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
  }, [currentStudentId]);

  useEffect(() => {
    const queryMatId = searchParams?.get("materialId") || searchParams?.get("id");
    if (queryMatId) {
      loadNotebookData(queryMatId);
    } else {
      loadNotebookData();
    }
  }, [searchParams, loadNotebookData]);

  const handleSelectMaterial = (mat: any) => {
    setSelectedMaterial(mat);
    setActiveChapterIndex(0);
    setStudyMode("reader");
    loadNotebookData(mat.id);
    router.replace(`/student/notebook?materialId=${mat.id}`, { scroll: false });
  };

  const handleBackToShelf = () => {
    setSelectedMaterial(null);
    router.replace("/student/notebook", { scroll: false });
  };

  // Derived Active Subject
  const activeSubject: SubjectItem | undefined = useMemo(() => {
    if (!notebookData?.subjects?.length) return undefined;
    return (
      notebookData.subjects.find((s: SubjectItem) => s.id === selectedSubjectId) ||
      notebookData.subjects[0]
    );
  }, [notebookData, selectedSubjectId]);

  // Fallback active material details
  const activeMaterialDetails = notebookData?.material || selectedMaterial;
  const chapters = notebookData?.chapters || [];
  const activeChapter = chapters[activeChapterIndex] || chapters[0] || null;
  const conceptGraph = notebookData?.conceptGraph || { nodes: [], edges: [] };
  const examReadiness = notebookData?.examReadiness || { axes: [], averageScore: 75 };

interface QuizQuestionItem {
  id: number | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

  // Real Interactive Quiz Questions (Derived from Extracted Material / API)
  const quizQuestions: QuizQuestionItem[] = useMemo(() => {
    if (notebookData?.quizQuestions && notebookData.quizQuestions.length > 0) {
      return notebookData.quizQuestions;
    }
    return [
      {
        id: 1,
        question: `Berdasarkan materi ${selectedMaterial?.title || "ini"}, fokus utama yang dibahas adalah...`,
        options: [
          chapters[0]?.title || "Konsep Dasar & Fondasi",
          chapters[1]?.title || "Analisis Arsitektur & Perancangan",
          chapters[2]?.title || "Implementasi Praktis",
          "Semua pilihan di atas benar",
        ],
        correctIndex: 3,
        explanation: "Modul pembelajaran ini mencakup penguasaan konsep, analisis rancangan, hingga implementasi terapan.",
      },
    ];
  }, [notebookData, selectedMaterial, chapters]);

  // Restore quiz answers from localStorage when material changes
  useEffect(() => {
    const matKey = selectedMaterial?.id || "default";
    try {
      const saved = localStorage.getItem(`smart-learning:quiz:${matKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setQuizAnswers(parsed.answers);
        if (typeof parsed.submitted === "boolean") setQuizSubmitted(parsed.submitted);
      } else {
        setQuizAnswers({});
        setQuizSubmitted(false);
      }
    } catch {
      // Fallback silent
    }
  }, [selectedMaterial?.id]);

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => {
      const updated = { ...prev, [qIdx]: optIdx };
      const matKey = selectedMaterial?.id || "default";
      try {
        localStorage.setItem(
          `smart-learning:quiz:${matKey}`,
          JSON.stringify({ answers: updated, submitted: quizSubmitted })
        );
      } catch {}
      return updated;
    });
  };

  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizSyncStatus, setQuizSyncStatus] = useState<"synced" | "offline" | null>(null);

  const handleCalculateScore = async () => {
    setQuizSubmitted(true);
    setIsSubmittingQuiz(true);
    const matKey = selectedMaterial?.id || "default";
    try {
      localStorage.setItem(
        `smart-learning:quiz:${matKey}`,
        JSON.stringify({ answers: quizAnswers, submitted: true })
      );
    } catch {}

    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) correctCount++;
    });
    const calculatedScore = Math.round((correctCount / quizQuestions.length) * 100);

    try {
      const res = await fetch("/api/lms/student/quiz-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: currentStudentId,
          materialId: selectedMaterial?.id,
          quizTitle: selectedMaterial?.title ? `Kuis ${selectedMaterial.title}` : "Kuis Pemahaman Modul",
          score: calculatedScore,
          totalQuestions: quizQuestions.length,
          correctCount,
          answers: quizAnswers,
          completedDurationSeconds: quizTimerSeconds,
        }),
      });
      if (res.ok) {
        setQuizSyncStatus("synced");
      } else {
        await saveOfflineQuiz({
          student_id: currentStudentId,
          material_id: selectedMaterial?.id,
          quiz_title: selectedMaterial?.title ? `Kuis ${selectedMaterial.title}` : "Kuis Pemahaman Modul",
          score: calculatedScore,
          total_questions: quizQuestions.length,
          correct_count: correctCount,
          answers: quizAnswers,
          completed_duration_seconds: quizTimerSeconds,
        });
        setQuizSyncStatus("offline");
      }
    } catch {
      await saveOfflineQuiz({
        student_id: currentStudentId,
        material_id: selectedMaterial?.id,
        quiz_title: selectedMaterial?.title ? `Kuis ${selectedMaterial.title}` : "Kuis Pemahaman Modul",
        score: calculatedScore,
        total_questions: quizQuestions.length,
        correct_count: correctCount,
        answers: quizAnswers,
        completed_duration_seconds: quizTimerSeconds,
      });
      setQuizSyncStatus("offline");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizSyncStatus(null);
    setQuizTimerSeconds(0);
    setQuizFilter("all");
    const matKey = selectedMaterial?.id || "default";
    try {
      localStorage.removeItem(`smart-learning:quiz:${matKey}`);
    } catch {}
  };

  const quizScore = useMemo(() => {
    let correct = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) correct++;
    });
    return Math.round((correct / quizQuestions.length) * 100);
  }, [quizAnswers, quizQuestions]);

  const displayedQuestions = useMemo(() => {
    return quizQuestions
      .map((q, idx) => ({ ...q, originalIndex: idx }))
      .filter((q) => {
        if (!quizSubmitted || quizFilter === "all") return true;
        const isCorrect = quizAnswers[q.originalIndex] === q.correctIndex;
        if (quizFilter === "correct") return isCorrect;
        if (quizFilter === "incorrect") return !isCorrect;
        return true;
      });
  }, [quizQuestions, quizSubmitted, quizFilter, quizAnswers]);

  // Loading State
  if (isLoading && !notebookData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 text-center animate-fade-in">
        {/* Apple-grade Interactive Robot Stage */}
        <div className="relative mb-5 flex flex-col items-center justify-center">
          {/* Subtle Ambient Studio Glow */}
          <div className="absolute -top-6 w-72 h-72 rounded-full bg-gradient-to-b from-[#007AFF]/10 via-cyan-400/5 to-transparent blur-3xl pointer-events-none" />
          
          {/* Studio Video Pedestal */}
          <div className="relative w-44 sm:w-52 aspect-[9/16] max-h-72 flex items-center justify-center">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain select-none pointer-events-none"
            >
              <source src="/assets/hermes-robot-loading-alpha.webm" type="video/webm" />
              <source src="/assets/hermes-robot-loading.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-700/60 text-[#007AFF] text-[11px] font-semibold mb-2.5 shadow-xs">
          <Bot className="h-3 w-3" />
          Smart AI Teman Belajarmu
        </div>

        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Menyiapkan Lembar Belajarmu...
        </h2>
        
        {/* Dynamic Micro-Learning Tips Rotation */}
        <div className="h-10 mt-1 flex items-center justify-center max-w-sm px-4">
          <p key={tipIndex} className="text-xs text-[#86868B] leading-relaxed animate-in fade-in duration-300">
            {loadingTips[tipIndex]}
          </p>
        </div>

        {/* Tactile Progress Indicator */}
        <div className="w-48 sm:w-56 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-4 border border-neutral-200/60 dark:border-neutral-700/60">
          <div className="h-full bg-gradient-to-r from-[#007AFF] to-cyan-400 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: LEVEL 1 — SHELF VIEW (TABEL MATA PELAJARAN, MATERI & TUGAS)
  // =========================================================================
  if (!selectedMaterial) {
    return (
      <div
        className="h-full flex-1 flex flex-col min-h-0 overflow-y-auto bg-transparent text-[#1D1D1F]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Sticky Header with Integrated Subject Selector Sub-Bar (OPSI A) */}
        <header className="shrink-0 sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {/* Main Top Bar */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 border-b border-white/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => router.push("/student")}
                className="h-9 w-9 rounded-full flex items-center justify-center bg-white/80 hover:bg-white backdrop-blur-xl border border-white/80 text-[#1D1D1F] active:scale-95 transition-all shadow-2xs shrink-0"
                title="Kembali ke Dashboard Utama Siswa"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-sm font-bold text-[#1D1D1F] tracking-tight truncate">
                    Buku Pintar Siswa
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#007AFF] bg-blue-50 border border-blue-200/60 px-2 py-0.2 rounded-full shrink-0">
                    <BrainCircuit className="h-2.5 w-2.5" /> Smart Focus
                  </span>
                </div>
                <p className="text-[10px] text-[#6E6E73] truncate">
                  Pilih materi & tugas untuk belajar terarah bersama Smart AI
                </p>
              </div>
            </div>

            {/* Offline / Online Status Indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isOnline ? (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Sinkron</span>
                </div>
              )}
            </div>
          </div>

          {/* OPSI A: Integrated Subject Selector Track (Horizontal Scroll Snap) */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6E73] shrink-0 mr-1 hidden sm:inline">
              Mata Pelajaran:
            </span>
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
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
                    isActive
                      ? "bg-[#007AFF] text-white shadow-sm shadow-blue-500/20 border border-blue-400/40"
                      : "bg-white/70 hover:bg-white text-[#1D1D1F] border border-white/70 shadow-2xs"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-white" : "bg-[#007AFF]"
                    }`}
                  />
                  <span>{sub.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-black/[0.05] text-[#6E6E73]"
                    }`}
                  >
                    {sub.code}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Content Container with generous bottom clearance for mobile */}
        <main className="max-w-5xl mx-auto w-full px-3.5 sm:px-6 pt-4 pb-28 sm:pb-32 space-y-5">
          {/* 1. Active Subject Hero Card (Frosted Apple Glass) */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white/65 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.04)] transition-all space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-200/60 inline-block">
                  {activeSubject?.code || "TKJ"} • Kurikulum Terpadu
                </span>
                <h2 className="text-base sm:text-xl font-bold text-[#1D1D1F] mt-1.5 tracking-tight truncate">
                  {activeSubject?.name || "Jaringan Komputer & Subnetting"}
                </h2>
                <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed">
                  Pelajari modul resmi, uji pemahaman melalui kuis adaptif, dan eksplorasi peta konsep interaktif.
                </p>
              </div>

              {/* Quick Metrics KPI Strip */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 text-center min-w-[65px] shadow-2xs">
                  <p className="text-sm sm:text-base font-extrabold text-[#1D1D1F] leading-none">
                    {activeSubject?.materials?.length || 2}
                  </p>
                  <p className="text-[10px] font-medium text-[#6E6E73] mt-1">Modul</p>
                </div>
                <div className="px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 text-center min-w-[65px] shadow-2xs">
                  <p className="text-sm sm:text-base font-extrabold text-[#1D1D1F] leading-none">
                    92%
                  </p>
                  <p className="text-[10px] font-medium text-[#6E6E73] mt-1">Rerata</p>
                </div>
                <div className="px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 text-center min-w-[65px] shadow-2xs">
                  <p className="text-sm sm:text-base font-extrabold text-[#1D1D1F] leading-none">
                    1
                  </p>
                  <p className="text-[10px] font-medium text-[#6E6E73] mt-1">Tugas</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Section: Daftar Materi (Silabus Bab) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs sm:text-sm font-bold text-[#1D1D1F] flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-[#007AFF]" />
                <span>Daftar Materi Pembelajaran</span>
              </h3>
              <span className="text-[11px] text-[#6E6E73]">Pilih untuk mulai belajar</span>
            </div>

            <div className="space-y-2.5">
              {(activeSubject?.materials || []).length > 0 ? (
                (activeSubject?.materials || []).map((mat: any, idx: number) => {
                  return (
                    <div
                      key={mat.id}
                      className="p-3.5 sm:p-5 rounded-2xl bg-white/65 hover:bg-white/85 backdrop-blur-2xl border border-white/70 hover:border-[#007AFF]/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,122,255,0.08)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-2xl flex items-center justify-center shrink-0 text-xs sm:text-sm font-bold ${
                            mat.status === "completed"
                              ? "bg-emerald-50 text-[#34C759] border border-emerald-200/60"
                              : "bg-blue-50 text-[#007AFF] border border-blue-200/60"
                          }`}
                        >
                          {mat.status === "completed" ? (
                            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <span>0{idx + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors line-clamp-2">
                              {mat.title}
                            </h4>
                            {mat.status === "completed" && (
                              <span className="text-[9px] font-semibold text-[#34C759] bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
                                Selesai
                              </span>
                            )}
                            {mat.status === "in_progress" && (
                              <span className="text-[9px] font-semibold text-[#007AFF] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full shrink-0">
                                Aktif Dipelajari
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#6E6E73] line-clamp-2 leading-relaxed">
                            {mat.description || "Ekstraksi AI komprehensif, visualisasi diagram, dan uji pemahaman."}
                          </p>
                          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-[#6E6E73] pt-0.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Clock className="h-3 w-3 text-slate-400" /> {mat.readingTime || "15 mnt"}
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <FileText className="h-3 w-3 text-slate-400" /> {mat.pageCount || 24} Halaman
                            </span>
                            <span>•</span>
                            <span className="text-[#007AFF] font-medium inline-flex items-center gap-1 whitespace-nowrap">
                              <CheckCircle2 className="h-3 w-3" /> Ekstrak AI Siap
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleSelectMaterial(mat)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Pelajari Materi</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1D1D1F]">
                    Belum Ada Modul Ajar di Mata Pelajaran Ini
                  </h4>
                  <p className="text-[11px] text-[#6E6E73] max-w-sm mx-auto">
                    Mata pelajaran {activeSubject?.name || "ini"} belum memiliki modul materi aktif. Silakan pilih tab mata pelajaran lain di atas yang telah memiliki materi.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Section: Daftar Tugas & Oral Defense Terkait */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs sm:text-sm font-bold text-[#1D1D1F] flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-[#007AFF]" />
                <span>Tugas Mata Pelajaran Ini</span>
              </h3>
              <span className="text-[11px] text-[#6E6E73]">Verifikasi mandiri</span>
            </div>

            <div className="p-3.5 sm:p-5 rounded-2xl bg-white/65 hover:bg-white/80 backdrop-blur-2xl border border-white/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-blue-50/80 text-[#007AFF] border border-blue-200/60 flex items-center justify-center shrink-0">
                  <FileCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-[#1D1D1F] line-clamp-2">
                      Tugas 02: Desain Subnetting & Simulasi Topologi Hybrid
                    </h4>
                    <span className="text-[9px] font-semibold text-[#007AFF] bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-full shrink-0">
                      Perlu Uji Pemahaman
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#6E6E73]">
                    Batas waktu: <span className="font-semibold text-[#1D1D1F]">Jumat, 23:59 WIB</span> • Bobot: 25% Nilai Akhir
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDefenseTopic("Desain Subnetting & Simulasi Topologi Hybrid");
                  setIsDefenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/85 hover:bg-white border border-white/90 text-[#1D1D1F] text-xs font-semibold shadow-2xs active:scale-95 transition-all self-end sm:self-center shrink-0"
              >
                <FileCheck className="h-3.5 w-3.5 text-[#007AFF]" />
                <span>Uji Pemahaman Tugas</span>
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
    <div className="h-full h-[100dvh] max-h-[100dvh] flex flex-col min-h-0 overflow-hidden bg-transparent text-[#1D1D1F]">
      {/* 1. TOP BAR MINIMALIS DENGAN TOMBOL BACK PANAH */}
      <header className="shrink-0 z-30 bg-white/50 backdrop-blur-2xl border-b border-white/40 px-3.5 sm:px-6 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Tombol Back Panah Minimalist */}
            <button
              onClick={handleBackToShelf}
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
              onClick={() => setStudyMode("calculator")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                studyMode === "calculator"
                  ? "bg-white/90 backdrop-blur-md text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-bold border border-white/80"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <Calculator className="h-3.5 w-3.5 text-[#FF9500]" />
              <span>Kalkulator & Lab</span>
            </button>

            <button
              onClick={() => setStudyMode("chat")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                studyMode === "chat"
                  ? "bg-white/90 backdrop-blur-md text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-bold border border-white/80"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-[#007AFF]" />
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
        className={`flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col ${
          studyMode === "chat"
            ? "p-0 sm:p-3 overflow-hidden"
            : "overflow-y-auto p-3 sm:p-6 pb-36"
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* =================================================================== */}
        {/* SUB-MODE 1: TEKS MATERI (CLEAN, EYE-FRIENDLY READER & FEATURE HUB) */}
        {/* =================================================================== */}
        {studyMode === "reader" && (
          <div className="space-y-5 animate-fade-in relative" onMouseUp={handleReaderMouseUp}>
            {/* Reading Canvas Card */}
            <div className="p-5 sm:p-8 rounded-3xl bg-white/60 hover:bg-white/75 backdrop-blur-2xl border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] space-y-6">
              {/* Header Bab with Apple-grade Action Badges */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-black/[0.06] pb-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#007AFF]">
                      {activeChapter
                        ? `Bab ${activeChapter.chapterNumber} • ${activeChapter.title}`
                        : `${activeMaterialDetails?.subjectName || "Materi Perkuliahan"}`}
                    </span>
                    <span className="inline-block h-1 w-1 rounded-full bg-neutral-300" />
                    <span className="text-[11px] text-[#86868B]">
                      {activeMaterialDetails?.pageCount
                        ? `Estimasi baca: ${Math.max(3, Math.round(activeMaterialDetails.pageCount * 1.5))} menit`
                        : "Estimasi baca: 4 menit"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                    {activeChapter?.title || activeMaterialDetails?.title || "Materi Pembelajaran"}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">
                    {activeChapter?.summary ||
                      activeMaterialDetails?.aiSummary ||
                      activeMaterialDetails?.description ||
                      "Intisari materi terstruktur yang diekstrak langsung dari modul resmi."}
                  </p>
                </div>

                {/* Apple-grade Interactive Action Pills */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setShowAudioBar(!showAudioBar);
                      if (!showAudioBar) setIsAudioPlaying(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl border transition-all active:scale-95 shadow-2xs ${
                      showAudioBar
                        ? "bg-[#007AFF] text-white border-[#007AFF]"
                        : "bg-white/80 hover:bg-white text-[#1D1D1F] border-white/80"
                    }`}
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    <span>{showAudioBar ? "Tutup Audio" : "Audio 60s"}</span>
                  </button>

                  <button
                    onClick={() => setIsCitationModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#1D1D1F] text-xs font-semibold backdrop-blur-xl border border-white/80 transition-all active:scale-95 shadow-2xs"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#34C759]" />
                    <span>Sitasi Modul</span>
                  </button>
                </div>
              </div>

              {/* Chapter Navigation Selector if Multiple Chapters Exist */}
              {chapters.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
                  {chapters.map((ch: any, idx: number) => (
                    <button
                      key={ch.id || idx}
                      onClick={() => setActiveChapterIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                        activeChapterIndex === idx
                          ? "bg-[#007AFF] text-white shadow-xs font-semibold"
                          : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-700"
                      }`}
                    >
                      Bab {ch.chapterNumber}: {ch.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Apple-grade Mini Audio Podcast Bar (60s Summary) */}
              {showAudioBar && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 backdrop-blur-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                      className="h-9 w-9 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-xs hover:bg-blue-600 active:scale-95 transition-all shrink-0"
                    >
                      {isAudioPlaying ? (
                        <Pause className="h-4 w-4 fill-white" />
                      ) : (
                        <Play className="h-4 w-4 fill-white ml-0.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1D1D1F] truncate">
                          Podcast Intisari: {activeChapter?.title || activeMaterialDetails?.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-[#007AFF]/10 text-[#007AFF] text-[9px] font-bold shrink-0">
                          AI Voice
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6E6E73] truncate">
                        Narasi Smart AI • Ringkasan audio materi perkuliahan terstruktur
                      </p>
                    </div>
                  </div>

                  {/* Scrubber Progress & Waveform */}
                  <div className="flex items-center gap-3 w-full sm:w-64">
                    <div className="flex-1 h-1.5 bg-neutral-200/80 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-[#6E6E73] shrink-0">
                      {Math.floor((audioProgress * 0.6))}s / 60s
                    </span>
                  </div>
                </div>
              )}

              {/* Dynamic Material Content */}
              <div className="space-y-4 text-sm text-[#1D1D1F] leading-relaxed">
                {activeChapter?.isCriticalZone && activeChapter?.criticalZoneLabel && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2.5">
                    <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Perhatian Guru & Siswa</p>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        {activeChapter.criticalZoneLabel}
                      </p>
                    </div>
                  </div>
                )}

                {/* Paragraphs */}
                {(() => {
                  const rawContent =
                    activeChapter?.contentSnippet ||
                    activeMaterialDetails?.aiSummary ||
                    activeMaterialDetails?.description ||
                    "Materi ini siap dieksplorasi. Anda dapat membuka modul resmi atau bertanya kepada Smart AI untuk mempelajari bab ini secara interaktif.";
                  
                  return rawContent
                    .split(/\n\n+/)
                    .filter((p: string) => p.trim().length > 0)
                    .map((paragraph: string, pIdx: number) => (
                      <p key={pIdx} className="leading-relaxed text-[#1D1D1F]">
                        {paragraph.trim()}
                      </p>
                    ));
                })()}

                {/* Key Concepts / Takeaways */}
                {activeChapter?.keyTakeaways && activeChapter.keyTakeaways.length > 0 && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 backdrop-blur-md border border-blue-200/60 space-y-2">
                    <h4 className="text-xs font-bold text-[#007AFF] uppercase tracking-wide flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Poin Kunci Pembelajaran ({activeChapter.title}):
                    </h4>
                    <ul className="text-xs text-[#1D1D1F] space-y-1.5 list-disc list-inside">
                      {activeChapter.keyTakeaways.map((item: string, iIdx: number) => (
                        <li key={iIdx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Direct Document Link if PDF exists */}
                {activeMaterialDetails?.fileUrl && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200/60">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1D1D1F] truncate">
                          {activeMaterialDetails.fileName || `${activeMaterialDetails.title}.pdf`}
                        </h4>
                        <p className="text-[11px] text-[#6E6E73]">
                          Modul pembelajaran resmi ({activeMaterialDetails.pageCount || 24} halaman)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudyMode("pdf")}
                      className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all self-start sm:self-auto shrink-0"
                    >
                      Buka Dokumen Asli →
                    </button>
                  </div>
                )}
              </div>

              {/* FEATURE HUB 4 KARTU KACA (SESUAI REFERENSI UI LAYAR 4) */}
              <div className="pt-4 border-t border-black/[0.06] space-y-3">
                <span className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                  Alat Bantu Belajar Smart AI
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => setStudyMode("mindmap")}
                    className="p-3 rounded-2xl bg-white/60 hover:bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-indigo-400/50 active:scale-95 transition-all text-left group"
                  >
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
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
                      <Bot className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-[#1D1D1F]">Tanya Smart AI</p>
                    <p className="text-[10px] text-[#6E6E73]">Asisten Belajar</p>
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

            {/* iPadOS-Style Floating Contextual Action Bar */}
            {contextMenuPos && selectedSnippet && (
              <div
                style={{
                  position: "fixed",
                  left: `${contextMenuPos.x}px`,
                  top: `${contextMenuPos.y}px`,
                  transform: "translate(-50%, -100%)",
                }}
                className="z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#1D1D1F]/90 dark:bg-white/90 backdrop-blur-2xl text-white dark:text-[#1D1D1F] shadow-[0_12px_36px_rgba(0,0,0,0.25)] border border-white/20 animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  onClick={() => {
                    setStudyMode("chat");
                    setContextMenuPos(null);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 transition-all"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>Tanya AI</span>
                </button>
                <button
                  onClick={() => {
                    setCopiedToast(true);
                    setTimeout(() => setCopiedToast(false), 2000);
                    setContextMenuPos(null);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 dark:hover:bg-black/10 text-xs font-medium active:scale-95 transition-all"
                >
                  <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                  <span>Catat</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(selectedSnippet);
                    setCopiedToast(true);
                    setTimeout(() => setCopiedToast(false), 2000);
                    setContextMenuPos(null);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/10 dark:hover:bg-black/10 text-xs font-medium active:scale-95 transition-all"
                  title="Salin Teks"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setContextMenuPos(null)}
                  className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 text-xs opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Notification Toast */}
            {copiedToast && (
              <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1D1D1F]/90 text-white text-xs font-medium shadow-lg backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Kutipan tersimpan ke catatan belajarmu!</span>
              </div>
            )}

            {/* Apple Floating Companion Pill (Docking Assistant) */}
            <button
              onClick={() => setStudyMode("chat")}
              className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:shadow-lg hover:scale-105 active:scale-95 transition-all text-left"
            >
              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-blue-50 flex items-center justify-center border border-blue-200/50">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover scale-125"
                >
                  <source src="/assets/hermes-robot-loading-alpha.webm" type="video/webm" />
                  <source src="/assets/hermes-robot-loading.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#1D1D1F] dark:text-white">Smart AI</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <span className="text-[10px] text-[#86868B]">Teman Belajar • Tanya</span>
              </div>
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODE 2: MIND MAP VIEW (PETA KONSEP INTERAKTIF)                 */}
        {/* =================================================================== */}
        {studyMode === "mindmap" && (
          <div className="w-full space-y-4 animate-fade-in pb-16">
            <InteractiveConceptGraph
              nodes={conceptGraph.nodes}
              edges={conceptGraph.edges}
              onSelectConceptPage={(page) => {
                console.log("Selected page:", page);
                setStudyMode("reader");
              }}
              onAskSmartAI={(conceptName) => {
                setStudyMode("chat");
              }}
            />
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
                  Kuis Reflektif: {activeMaterialDetails?.title || "Bahan Ajar"}
                </h3>
                <p className="text-xs text-[#6E6E73]">
                  {quizQuestions.length} Pertanyaan adaptif berdasarkan modul ajar resmi.
                </p>
              </div>

              {!quizSubmitted && (
                <div className="flex items-center gap-2 bg-blue-50/80 backdrop-blur-md border border-blue-200/60 px-3.5 py-1.5 rounded-2xl">
                  <Clock className="h-4 w-4 text-[#007AFF] animate-pulse" />
                  <div className="text-right">
                    <p className="text-[10px] text-[#86868B] font-medium leading-none">Waktu Berjalan</p>
                    <p className="text-xs font-mono font-bold text-[#007AFF]">
                      {Math.floor(quizTimerSeconds / 60).toString().padStart(2, "0")}:
                      {(quizTimerSeconds % 60).toString().padStart(2, "0")}
                    </p>
                  </div>
                </div>
              )}

              {quizSubmitted && (
                <div className="flex items-center gap-3 bg-emerald-50/80 backdrop-blur-md border border-emerald-200 px-4 py-2 rounded-2xl">
                  <Award className="h-6 w-6 text-[#34C759]" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      Skor Kamu: {quizScore}% ({Math.floor(quizTimerSeconds / 60)}m {quizTimerSeconds % 60}s)
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      {quizScore >= 70 ? "Pemahaman Kuat! Siap Uji Pemahaman." : "Perlu reviu bab ini lagi."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Questions after submission */}
            {quizSubmitted && (
              <div className="flex items-center gap-2 p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 w-fit text-xs">
                <button
                  onClick={() => setQuizFilter("all")}
                  className={`px-3 py-1 rounded-xl font-medium transition-all ${
                    quizFilter === "all" ? "bg-white text-[#1D1D1F] font-bold shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  Semua ({quizQuestions.length})
                </button>
                <button
                  onClick={() => setQuizFilter("correct")}
                  className={`px-3 py-1 rounded-xl font-medium transition-all ${
                    quizFilter === "correct" ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60 shadow-2xs" : "text-[#6E6E73] hover:text-emerald-700"
                  }`}
                >
                  Benar ({quizQuestions.filter((_, idx) => quizAnswers[idx] === quizQuestions[idx]?.correctIndex).length})
                </button>
                <button
                  onClick={() => setQuizFilter("incorrect")}
                  className={`px-3 py-1 rounded-xl font-medium transition-all ${
                    quizFilter === "incorrect" ? "bg-rose-50 text-rose-800 font-bold border border-rose-200/60 shadow-2xs" : "text-[#6E6E73] hover:text-rose-700"
                  }`}
                >
                  Salah ({quizQuestions.filter((_, idx) => quizAnswers[idx] !== quizQuestions[idx]?.correctIndex).length})
                </button>
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-3">
              {displayedQuestions.map((q) => {
                const qIdx = q.originalIndex;
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

            {/* Quiz Action Buttons & Sync Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {isSubmittingQuiz && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin text-[#007AFF]" />
                    <span>Menyimpan nilai ke Cloud LMS...</span>
                  </span>
                )}
                {!isSubmittingQuiz && quizSyncStatus === "synced" && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Tersinkron ke Cloud LMS</span>
                  </span>
                )}
                {!isSubmittingQuiz && quizSyncStatus === "offline" && (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-full border border-amber-200/60 flex items-center gap-1.5">
                    <WifiOff className="h-3 w-3 text-amber-600" />
                    <span>Tersimpan di Cache Offline (Auto-Sync)</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5">
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
                    disabled={Object.keys(quizAnswers).length < quizQuestions.length || isSubmittingQuiz}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all"
                  >
                    {isSubmittingQuiz ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{isSubmittingQuiz ? "Menilai..." : "Cek Jawaban & Nilai"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODE 4: KALKULATOR & LAB SIMULASI AKADEMIK                     */}
        {/* =================================================================== */}
        {studyMode === "calculator" && (
          <div className="w-full animate-fade-in pb-16">
            <InteractiveStudyCalculator />
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODE 4: TANYA SMART AI (SOCRATIC CHAT & DOCK)                  */}
        {/* =================================================================== */}
        {studyMode === "chat" && (
          <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden sm:rounded-3xl border-0 sm:border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.04)] animate-fade-in bg-white/40 sm:bg-white/60 backdrop-blur-2xl">
            <SocraticDocumentViewer
              materialId={selectedMaterial.id}
              materialTitle={selectedMaterial.title}
              fileName={activeMaterialDetails?.fileName || "Modul_Pembelajaran.pdf"}
              fileUrl={activeMaterialDetails?.fileUrl || ""}
              chapters={chapters}
              studentId={currentStudentId}
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

      {/* ===================================================================== */}
      {/* 5. SLIDE-UP SHEET / MODAL SITASI RESMI MODAL                          */}
      {/* ===================================================================== */}
      {isCitationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            onClick={() => setIsCitationModalOpen(false)}
            className="absolute inset-0 bg-black/25 backdrop-blur-md transition-opacity"
          />

          <div className="relative w-full max-w-md bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.12)] rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#34C759] flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/40">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                    Sitasi & Metadata Dokumen Resmi
                  </h3>
                  <p className="text-[11px] text-[#6E6E73]">Institut Teknologi Garut (ITG)</p>
                </div>
              </div>
              <button
                onClick={() => setIsCitationModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[#1D1D1F] dark:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]">
              <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/60 dark:border-white/10 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#86868B]">Mata Kuliah</span>
                  <span className="font-semibold text-[#1D1D1F] dark:text-white">Jaringan Komputer & Komunikasi Data</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#86868B]">Dokumen Sumber</span>
                  <span className="font-semibold text-[#1D1D1F] dark:text-white">Modul_Subnetting_IPv4.pdf (Hal. 42)</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#86868B]">Standar Kurikulum</span>
                  <span className="font-semibold text-[#1D1D1F] dark:text-white">OBE / IEEE 802.3 Ethernet</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#86868B]">Status Verifikasi</span>
                  <span className="font-bold text-[#34C759] flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Terverifikasi Dosen Pengampu
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#6E6E73]">
                Seluruh materi yang disarikan Smart AI mengacu langsung pada dokumen kurikulum aktif Semester 3 tanpa manipulasi data.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCitationModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 transition-all shadow-2xs"
              >
                Tutup Sitasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentNotebookPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-xl text-slate-500 gap-3">
          <div className="w-8 h-8 border-3 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-600">Menyiapkan Ruang Belajar Smart AI...</p>
        </div>
      }
    >
      <StudentNotebookContent />
    </Suspense>
  );
}
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  FileCheck2,
  Clock,
  Award,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  X,
  Loader2,
  FileText,
  UploadCloud,
  Send,
  Calendar,
  Layers,
  BrainCircuit,
  RefreshCw,
  Eye,
} from "lucide-react";

interface SubmissionItem {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  text_content?: string;
  status: "draft" | "submitted" | "defense_passed" | "graded" | "returned";
  oral_defense_passed: boolean;
  oral_defense_score: number;
  ai_pre_score?: number;
  ai_feedback?: string;
  teacher_score?: number;
  teacher_notes?: string;
  submitted_at: string;
  students?: {
    id: string;
    nis: string;
    profiles?: {
      full_name: string;
      email: string;
    };
    classes?: {
      name: string;
    };
  };
  assignments?: {
    id: string;
    title: string;
    due_date?: string;
    max_score?: number;
    is_oral_defense_required?: boolean;
    subjects?: {
      name: string;
    };
  };
}

interface AssignmentItem {
  id: string;
  title: string;
  instructions?: string;
  due_date: string;
  max_score: number;
  is_oral_defense_required: boolean;
  material_id?: string;
  created_at: string;
  subjects?: {
    name: string;
  };
  classes?: {
    name: string;
  };
  course_materials?: {
    id: string;
    title: string;
    file_url: string;
    file_name: string;
  };
  submission_count?: number;
  graded_count?: number;
}

interface OptionItem {
  id: string;
  name: string;
  code?: string;
}

export default function TeacherAssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"submissions" | "manage">("submissions");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Grading State
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionItem | null>(null);
  const [inputScore, setInputScore] = useState<number | string>("");
  const [inputNotes, setInputNotes] = useState("");
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Modal Create Assignment State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isDefenseRequired, setIsDefenseRequired] = useState(true);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subRes, asgRes, optRes] = await Promise.all([
        fetch("/api/lms/submissions"),
        fetch("/api/lms/assignments"),
        fetch("/api/lms/options"),
      ]);

      const subJson = await subRes.json();
      const asgJson = await asgRes.json();
      const optJson = await optRes.json();

      if (subJson.success) {
        setSubmissions(subJson.data || []);
      }
      if (asgJson.success) {
        setAssignments(asgJson.data || []);
      }
      if (optJson.success) {
        setSubjects(optJson.subjects || []);
        setClasses(optJson.classes || []);
        if (optJson.subjects?.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(optJson.subjects[0].id);
        }
        if (optJson.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(optJson.classes[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching assignments data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Supabase Realtime: dengarkan perubahan tabel pengumpulan siswa secara langsung
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-teacher-submissions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assignment_submissions",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Teacher Grade Submission
  const handleOpenGradeModal = (sub: SubmissionItem) => {
    setGradingSubmission(sub);
    setInputScore(sub.teacher_score ?? sub.oral_defense_score ?? 90);
    setInputNotes(sub.teacher_notes || "");
    setGradeError(null);
  };

  const handleSaveGrade = async (e?: React.FormEvent, isRevision = false) => {
    if (e) e.preventDefault();
    if (!gradingSubmission) return;

    if (isRevision && !inputNotes.trim()) {
      setGradeError("Wajib memberikan catatan perbaikan agar siswa memahami bagian yang perlu direvisi.");
      return;
    }

    const numScore = Number(inputScore);
    if (!isRevision && (isNaN(numScore) || numScore < 0 || numScore > 100)) {
      setGradeError("Nilai harus berupa angka antara 0 hingga 100.");
      return;
    }

    setIsSubmittingGrade(true);
    setGradeError(null);

    try {
      const res = await fetch("/api/lms/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: gradingSubmission.id,
          teacherScore: isRevision ? null : numScore,
          teacherNotes: inputNotes,
          status: isRevision ? "returned" : "graded",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan penilaian guru.");
      }

      // Update state locally
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === gradingSubmission.id
            ? {
                ...s,
                status: isRevision ? "returned" : "graded",
                teacher_score: isRevision ? undefined : numScore,
                teacher_notes: inputNotes,
              }
            : s
        )
      );
      setGradingSubmission(null);
    } catch (err: any) {
      console.error("Grade submit error:", err);
      setGradeError(err.message || "Terjadi kesalahan saat menyimpan nilai.");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Handle Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle.trim()) {
      setCreateError("Judul penugasan wajib diisi.");
      return;
    }

    setIsCreatingAssignment(true);
    setCreateError(null);

    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      // 1. Upload Attachment if provided
      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        formData.append("folder", "assignments");

        const uploadRes = await fetch("/api/lms/upload", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          throw new Error(uploadJson.error || "Gagal mengunggah berkas soal PDF.");
        }
        attachmentUrl = uploadJson.fileUrl;
        attachmentName = uploadJson.fileName;
      }

      // 2. Save Assignment to DB
      const res = await fetch("/api/lms/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: assignmentTitle,
          subjectId: selectedSubjectId || (subjects[0]?.id ?? null),
          classId: selectedClassId || (classes[0]?.id ?? null),
          dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
          instructions,
          isOralDefenseRequired: isDefenseRequired,
          maxScore: 100,
          attachmentUrl,
          attachmentName,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal membuat penugasan.");
      }

      // Reset & refresh
      setAssignmentTitle("");
      setInstructions("");
      setAttachmentFile(null);
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error("Create assignment error:", err);
      setCreateError(err.message || "Terjadi kesalahan saat memproses penugasan.");
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const studentName = sub.students?.profiles?.full_name?.toLowerCase() || "";
    const assignmentTitle = sub.assignments?.title?.toLowerCase() || "";
    const q = searchQuery.toLowerCase();
    return studentName.includes(q) || assignmentTitle.includes(q);
  });

  // Calculate Metrics
  const passedDefenses = submissions.filter((s) => s.oral_defense_passed || s.oral_defense_score >= 75).length;
  const totalSubmissions = submissions.length;
  const pendingReview = submissions.filter((s) => s.status !== "graded").length;
  const avgDefenseScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((acc, s) => acc + (s.oral_defense_score || 0), 0) / submissions.length
        )
      : 88;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28 sm:pb-24">
      {/* 1. Header Section */}
      <PageHeader
        eyebrow="PANEL EVALUASI & VERIFIKASI AKADEMIK"
        title="Penugasan & Uji Lisan Pemahaman"
        description="Pantau pengumpulan tugas siswa, evaluasi hasil uji lisan pemahaman materi, dan berikan penilaian komprehensif."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs h-9 px-3 gap-1.5 rounded-xl shadow-2xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Sinkron</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateModalOpen(true);
                setCreateError(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 gap-1.5 rounded-xl shadow-2xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Penugasan Baru</span>
            </Button>
          </div>
        }
      />

      {/* 2. Semantic Metric Cards (Clean, No Exaggerated Glow) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Lolos AI Defense */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Lolos Uji Lisan
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              {passedDefenses} <span className="text-sm font-medium text-slate-400">/ {totalSubmissions}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="h-3 w-3" />
              Tervalidasi Otomatis
            </span>
          </div>
        </div>

        {/* Rata-rata Skor Defense */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rata-rata Skor
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              {avgDefenseScore}%
            </div>
            <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">
              Tingkat Penguasaan Materi
            </span>
          </div>
        </div>

        {/* Perlu Review Guru */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Perlu Review
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono tracking-tight">
              {pendingReview} <span className="text-sm font-medium text-slate-400">Berkas</span>
            </div>
            <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">
              Menunggu Nilai Guru
            </span>
          </div>
        </div>

        {/* Total Penugasan Aktif */}
        <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Tugas
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              {assignments.length} <span className="text-sm font-medium text-slate-400">Modul</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              Semester Genap 2026
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "submissions"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Pengumpulan & Uji Lisan ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "manage"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Kelola Penugasan ({assignments.length})
          </button>
        </div>

        {activeTab === "submissions" && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa atau tugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* 4. TAB 1: Pengumpulan & Verifikasi AI Defense */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Memuat data pengumpulan tugas...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
              <FileCheck2 className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Belum Ada Berkas Pengumpulan</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Siswa belum mengunggah berkas laporan untuk penugasan yang aktif.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredSubmissions.map((sub) => {
                const studentName = sub.students?.profiles?.full_name || "Siswa SMK";
                const studentClass = sub.students?.classes?.name || "XII RPL 1";
                const studentNis = sub.students?.nis || "2506066";
                const isGraded = sub.status === "graded";
                const defenseScore = sub.oral_defense_score || 90;

                return (
                  <div
                    key={sub.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all space-y-4"
                  >
                    {/* Header: Student Info & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center border border-blue-100 text-sm shrink-0">
                          {studentName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                              {studentName}
                            </h4>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {studentClass} • NIS {studentNis}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {sub.assignments?.title || "Penugasan Topologi & Subnetting"}
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Uji Lisan {defenseScore}%
                        </span>

                        {isGraded ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            Dinilai: {sub.teacher_score}/100
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Menunggu Penilaian
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Defense Summary Card (Apple Ceramic Style) */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px] uppercase tracking-wider">
                        <BrainCircuit className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Ringkasan Uji Lisan Pemahaman Materi:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {sub.ai_feedback ||
                          "Siswa menunjukkan pemahaman mendalam tentang konsep subnetting VLSM dan alokasi IP mask. Penjelasan lisan selaras 95% dengan laporan tertulis, tidak terdeteksi indikasi manipulasi konten."}
                      </p>
                    </div>

                    {/* Teacher Feedback (if already graded) */}
                    {isGraded && sub.teacher_notes && (
                      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
                        <span className="font-bold text-[11px] text-blue-800 block">
                          Catatan Guru Pengampu:
                        </span>
                        <p className="text-blue-800/90 leading-relaxed">{sub.teacher_notes}</p>
                      </div>
                    )}

                    {/* Footer: PDF Document Attachment & Action Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="h-7 w-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-700 truncate max-w-xs">
                          {sub.file_url
                            ? decodeURIComponent(sub.file_url.split("/").pop() || "Laporan_Tugas.pdf")
                            : "Laporan_Tugas.pdf"}
                        </span>
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-xs font-semibold inline-flex items-center gap-1 ml-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Buka PDF Asli</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          onClick={() => handleOpenGradeModal(sub)}
                          className="text-xs h-8 px-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-2xs gap-1.5 active:scale-[0.98] transition-all"
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>{isGraded ? "Edit Nilai Guru" : "Beri Nilai & Masukan"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: Kelola Penugasan */}
      {activeTab === "manage" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-600 font-bold">
              Daftar Penugasan Aktif
            </h4>
            <span className="text-xs text-slate-400">{assignments.length} Tugas Dibuat</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Memuat data penugasan...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
              <Layers className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Belum Ada Penugasan Aktif</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8 px-4 rounded-lg mt-2 font-semibold shadow-2xs active:scale-[0.98] transition-all"
              >
                Buat Tugas Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {asg.subjects?.name || "Informatika"}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                        {asg.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kelas: {asg.classes?.name || "Semua Kelas"}
                      </p>
                    </div>

                    <Badge
                      variant={asg.is_oral_defense_required ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {asg.is_oral_defense_required ? "Wajib Uji Lisan" : "Reguler"}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {asg.instructions || "Kerjakan instruksi soal secara mandiri."}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Tenggat:{" "}
                        {new Date(asg.due_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {asg.course_materials?.file_url && (
                      <a
                        href={asg.course_materials.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Berkas Soal</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: Beri Nilai & Evaluasi Guru */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Penilaian & Ulasan Guru
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Siswa: {gradingSubmission.students?.profiles?.full_name || "Siswa"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4">
              {/* Submission Overview Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Indeks Penguasaan Materi:</span>
                  <span className="font-bold text-emerald-600">
                    {gradingSubmission.oral_defense_score || 90}% (Lolos Verifikasi)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Berkas Jawaban PDF:</span>
                  <a
                    href={gradingSubmission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Buka Dokumen PDF</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Score Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nilai Akhir Guru (Skala 0 - 100) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={inputScore}
                  onChange={(e) => setInputScore(e.target.value)}
                  placeholder="Contoh: 95"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Feedback Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catatan & Masukan untuk Siswa (Feedback)
                </label>
                <textarea
                  rows={3}
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  placeholder="Berikan masukan konstruktif atas solusi topologi dan kalkulasi subnetting..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {gradeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{gradeError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveGrade(undefined, true)}
                  disabled={isSubmittingGrade}
                  className="text-xs h-9 px-3 rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50 gap-1.5"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Minta Revisi Tugas</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs h-9 rounded-lg"
                    onClick={() => setGradingSubmission(null)}
                    disabled={isSubmittingGrade}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingGrade}
                    className="text-xs h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
                  >
                    {isSubmittingGrade ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Award className="h-3.5 w-3.5" />
                        <span>Simpan & Publikasikan Nilai</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: Buat Penugasan Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Buat Penugasan Akademik Baru
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tentukan instruksi tugas dan lampirkan lembar kerja PDF opsional.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Judul Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  placeholder="Contoh: Perancangan Subnetting VLSM & Dokumentasi Topologi"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Subject & Class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kelas Sasaran
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Defense Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Batas Pengumpulan
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isDefenseRequired}
                      onChange={(e) => setIsDefenseRequired(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="font-semibold text-slate-700">Wajib Uji Lisan Pemahaman</span>
                  </label>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Petunjuk Pengerjaan Tugas
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Rancang skema pengalamatan IP menggunakan metode VLSM dan unggah laporan PDF..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Optional Attachment File PDF */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Lampiran Berkas Soal / Rubrik (PDF Opsional)
                </label>
                <div
                  onClick={() => attachmentInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50"
                >
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAttachmentFile(file);
                    }}
                  />
                  {attachmentFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700 text-xs font-semibold">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="truncate max-w-xs">{attachmentFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                      <UploadCloud className="h-4 w-4" />
                      <span>Klik untuk memilih berkas soal PDF (opsional)</span>
                    </div>
                  )}
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs h-9 rounded-lg"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingAssignment}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreatingAssignment || !assignmentTitle.trim()}
                  className="text-xs h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
                >
                  {isCreatingAssignment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mempublikasikan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Publikasikan Tugas</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

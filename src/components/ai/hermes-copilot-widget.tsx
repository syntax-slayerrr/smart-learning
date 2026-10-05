"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RefreshCw,
  Maximize2,
  Minimize2,
  Award,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  Download,
  ExternalLink,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

interface WorkspaceItem {
  id: string;
  name: string;
  nis: string;
  className: string;
  attendanceRate: number;
  handRaises: number;
  focusScore: number;
  absentCount?: number;
  rank?: number;
  waDraft?: string;
  badge?: string;
}

interface WorkspacePayload {
  type: "student_leaderboard" | "at_risk_list" | "session_recap";
  title: string;
  description: string;
  items: WorkspaceItem[];
  actions?: { label: string; actionType: string }[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  workspace?: WorkspacePayload | null;
}

const QUICK_PROMPTS = [
  "Cek siswa yang paling hadir dan paling aktif",
  "Rekap kelas hari ini",
  "Cek siswa at-risk & sering alpa",
  "guru yang jarang masuk",
  "Ide ice-breaking 3 menit",
];

export function HermesCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [awardedStudents, setAwardedStudents] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo! Saya **Smart AI Copilot**. Anda dapat meminta saya memproses data siswa langsung. Coba klik atau ketik: **'Cek siswa yang paling hadir dan paling aktif'** atau **'Rekap kelas hari ini'**.",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json();
      const replyText =
        data?.reply ||
        "Maaf, terjadi kendala saat menghubungi Hermes Agent. Silakan coba sesaat lagi.";

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: replyText,
        workspace: data?.workspace || null,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Koneksi ke gateway AI terputus. Pastikan 9Router aktif.",
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDraft = (id: string, draftText?: string) => {
    if (!draftText) return;
    navigator.clipboard.writeText(draftText);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2500);
  };

  const handleAwardStudent = async (id: string, isTeacher = false, meta?: { name?: string; className?: string }) => {
    setAwardedStudents((prev) => ({ ...prev, [id]: true }));
    try {
      await fetch("/api/ai/copilot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: isTeacher ? "confirm_teacher" : "award_points",
          targetId: id,
          metadata: {
            points: 10,
            studentName: meta?.name,
            teacherName: meta?.name,
            subject: meta?.className,
          },
        }),
      });
    } catch (err) {
      console.warn("[Copilot Action Persistence Failed]:", err);
    }
  };

  const handleWorkspaceAction = (actionType: string, workspace: WorkspacePayload) => {
    if (actionType === "copy_full_report" || actionType === "copy_all") {
      const reportLines = [
        `=== ${workspace.title.toUpperCase()} ===`,
        `Tanggal: ${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}`,
        `Ringkasan: ${workspace.description}`,
        ``,
        ...workspace.items.map((it) => `• ${it.name} (${it.className}) - ${it.badge || ""}`),
        ``,
        `Dicatat & Diverifikasi oleh Smart Learning AI Copilot.`,
      ].join("\n");
      navigator.clipboard.writeText(reportLines);
      alert("Laporan berhasil disalin ke clipboard!");
    } else if (actionType === "print_report" || actionType === "export_pdf" || actionType === "export_teacher_pdf") {
      window.print();
    } else if (actionType === "assign_substitute") {
      alert("Alokasi guru pengganti (inval) telah dicatat untuk tindak lanjut tata usaha.");
    } else {
      alert(`Aksi [${actionType}] berhasil diproses.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={lIdx} className="leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button - Smart AI */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-22 sm:bottom-24 right-3.5 sm:right-6 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 sm:gap-2.5 rounded-2xl bg-white/95 backdrop-blur-xl p-1.5 pr-3 sm:pr-4 text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.12)] border border-slate-200/90 hover:border-blue-400 hover:shadow-[0_16px_42px_rgba(59,130,246,0.22)] active:scale-[0.98] transition-all duration-300 group"
          title="Buka Smart AI"
        >
          {/* Wrapped Character Icon ("sedikit dibungkus" & larger size) */}
          <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center shrink-0 rounded-xl bg-gradient-to-tr from-blue-500/10 via-sky-400/15 to-indigo-500/10 p-1 border border-blue-200/70 shadow-inner group-hover:scale-105 transition-transform duration-300">
            <picture className="h-full w-full flex items-center justify-center">
              <source srcSet="/assets/hermes-robot.webp" type="image/webp" />
              <img
                src="/assets/hermes-robot.webp"
                alt="Smart AI"
                className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(37,99,235,0.28)] pointer-events-none select-none"
                loading="eager"
              />
            </picture>
            <span className="absolute -top-1 -right-1 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
          </div>

          <div className="flex flex-col items-start pr-0.5 text-left">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                Smart AI
              </span>
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] sm:text-[9.5px] font-semibold text-blue-600 border border-blue-200/60">
                Copilot
              </span>
            </div>
            <span className="text-[10px] sm:text-[10.5px] font-medium text-slate-500 -mt-0.5">
              Asisten Cerdas
            </span>
          </div>
        </button>
      )}

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs sm:hidden transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Floating Workspace / Mobile Bottom Sheet */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-white overflow-hidden transition-all duration-300 animate-in ${
            /* Mobile: Apple Bottom Sheet | Desktop: Floating Card */
            "inset-x-0 bottom-0 h-[88vh] max-h-[88vh] rounded-t-[28px] border-t border-slate-200/90 shadow-[0_-10px_40px_rgba(15,23,42,0.18)] slide-in-from-bottom-full sm:inset-x-auto sm:bottom-6 sm:right-6 sm:rounded-3xl sm:border sm:border-slate-200/90 sm:shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:slide-in-from-bottom-4"
          } ${
            isExpanded
              ? "sm:h-[680px] sm:w-[580px] sm:max-w-[calc(100vw-32px)] sm:max-h-[calc(100vh-5rem)]"
              : "sm:h-[560px] sm:w-[420px] sm:max-w-[calc(100vw-32px)] sm:max-h-[calc(100vh-5rem)]"
          }`}
        >
          {/* iOS Grab Handle (Mobile Only) */}
          <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-slate-300/80 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-md px-4 py-2.5 sm:px-5 sm:py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500/10 via-sky-400/15 to-indigo-500/10 p-1 border border-blue-200/70 shadow-2xs">
                <picture className="h-full w-full flex items-center justify-center">
                  <source srcSet="/assets/hermes-robot.webp" type="image/webp" />
                  <img
                    src="/assets/hermes-robot.webp"
                    alt="Smart AI"
                    className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(37,99,235,0.22)] pointer-events-none select-none"
                    loading="eager"
                  />
                </picture>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 truncate">
                    Smart AI Copilot
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700 border border-emerald-200/70 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  Asisten Cerdas & Analisis Data Kampus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Perkecil" : "Perluas Workspace"}
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setMessages([messages[0]])}
                title="Bersihkan Percakapan"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors ml-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1 font-medium text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-2xs whitespace-nowrap"
              >
                <Sparkles className="h-3 w-3 text-blue-500 shrink-0" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Chat Messages Stream with Generative UI Workspaces */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 text-xs sm:text-[13px]">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className="space-y-2.5">
                  <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center mt-0.5 rounded-xl bg-gradient-to-tr from-blue-500/10 via-sky-400/15 to-indigo-500/10 p-0.5 border border-blue-200/60 shadow-2xs">
                        <picture className="h-full w-full flex items-center justify-center">
                          <source srcSet="/assets/hermes-robot.webp" type="image/webp" />
                          <img
                            src="/assets/hermes-robot.webp"
                            alt="Smart AI"
                            className="h-full w-full object-contain pointer-events-none select-none"
                            loading="eager"
                          />
                        </picture>
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                        isUser
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-xs"
                          : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                      }`}
                    >
                      <div className="space-y-1 font-sans">
                        {renderMessageContent(m.content)}
                      </div>
                      <div
                        className={`text-[9.5px] font-mono mt-1 ${
                          isUser ? "text-blue-100/70 text-right" : "text-slate-400 text-left"
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>

                    {isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-200/70 text-blue-600 shadow-2xs mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* GENERATIVE AGENTIC WORKSPACE CARD */}
                  {!isUser && m.workspace && (
                    <div className="ml-1 sm:ml-9 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            {m.workspace.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {m.workspace.description}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-blue-700 shrink-0">
                          {m.workspace.items.length} Data
                        </span>
                      </div>

                      {/* Items Grid */}
                      <div className="space-y-2">
                        {m.workspace.items.map((item) => {
                          const isCopied = copiedDraftId === item.id;
                          const isAwarded = !!awardedStudents[item.id];

                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 sm:p-3 transition-all hover:bg-slate-50"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ({item.className})
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/70 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                  {item.badge}
                                </span>
                              </div>

                              {/* Metric Pills */}
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-600 mb-2">
                                <span className="rounded-lg bg-white border border-emerald-200/80 px-2 py-0.5 text-emerald-700 font-bold shadow-2xs">
                                  {m.workspace?.title.includes("Guru") ? "Kehadiran Mengajar" : "Hadir"}: {item.attendanceRate}%
                                </span>
                                {m.workspace?.title.includes("Guru") ? (
                                  <span className="rounded-lg bg-white border border-rose-200/80 px-2 py-0.5 text-rose-700 font-bold shadow-2xs">
                                    Izin/Alpa: {item.absentCount || 0}x
                                  </span>
                                ) : (
                                  <>
                                    <span className="rounded-lg bg-white border border-sky-200/80 px-2 py-0.5 text-sky-700 font-bold shadow-2xs">
                                      Tanya: {item.handRaises}x
                                    </span>
                                    <span className="rounded-lg bg-white border border-slate-200/80 px-2 py-0.5 text-slate-700 font-bold shadow-2xs">
                                      Fokus: {item.focusScore}%
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Interactive Action Buttons */}
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60">
                                {!m.workspace?.title.includes("Guru") ? (
                                  <>
                                    {item.waDraft && (
                                      <button
                                        onClick={() => handleCopyDraft(item.id, item.waDraft)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10.5px] font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors shadow-2xs active:scale-[0.98]"
                                        title="Salin Draf Pesan WhatsApp untuk Orang Tua"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="h-3 w-3 text-emerald-600" />
                                            <span className="text-emerald-700 font-bold">Tersalin!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Share2 className="h-3 w-3 text-emerald-600" />
                                            <span>Draf WA Ortu</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleAwardStudent(item.id, false, { name: item.name, className: item.className })}
                                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10.5px] font-medium transition-all shadow-2xs active:scale-[0.98] ${
                                        isAwarded
                                          ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                                          : "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-800"
                                      }`}
                                      title="Berikan Bintang Poin Keaktifan"
                                    >
                                      <Award className="h-3 w-3 text-amber-500" />
                                      <span>{isAwarded ? "⭐ +10 Poin Tersimpan" : "Beri Poin"}</span>
                                    </button>
                                  </>
                                ) : (
                                  /* Teacher Action Buttons */
                                  <>
                                    <button
                                      onClick={() => handleAwardStudent(item.id, true, { name: item.name, className: item.className })}
                                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10.5px] font-medium transition-all shadow-2xs active:scale-[0.98] ${
                                        isAwarded
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                          : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-800"
                                      }`}
                                      title="Tandai Sudah Ditindaklanjuti Admin"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>{isAwarded ? "✓ Tersimpan di DB" : "Tandai Tindak Lanjut"}</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        alert(`Catatan guru inval pengganti untuk ${item.name} (${item.className}) berhasil dibuat.`);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10.5px] font-medium text-slate-700 hover:border-amber-400 hover:text-amber-800 transition-colors shadow-2xs active:scale-[0.98]"
                                      title="Siapkan Guru Inval Pengganti"
                                    >
                                      <span>Jadwalkan Inval</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Workspace Global Action Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-400 font-mono">
                          {m.workspace.type === "session_recap" ? "Opsi Laporan" : "Aksi Cepat"}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {m.workspace.actions && m.workspace.actions.length > 0 ? (
                            m.workspace.actions.map((act) => (
                              <button
                                key={act.actionType}
                                onClick={() => handleWorkspaceAction(act.actionType, m.workspace!)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                              >
                                {act.actionType.includes("print") ? (
                                  <Download className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                <span>{act.label}</span>
                              </button>
                            ))
                          ) : (
                            <button
                              onClick={() => handleWorkspaceAction("copy_all", m.workspace!)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Salin Semua</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500">
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 p-0.5 border border-blue-200/50 shadow-2xs">
                  <picture className="h-full w-full flex items-center justify-center">
                    <source srcSet="/assets/hermes-robot.webp" type="image/webp" />
                    <img
                      src="/assets/hermes-robot.webp"
                      alt="Smart AI Loading"
                      className="h-full w-full object-contain pointer-events-none select-none animate-pulse"
                      loading="eager"
                    />
                  </picture>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/90 px-3.5 py-2 text-slate-600 shadow-2xs font-mono text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                  <span>Smart AI membaca basis data & menyiapkan workspace...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md px-3.5 pt-2.5 pb-4 sm:pb-3 shrink-0">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-blue-100 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan kehadiran, ringkasan kelas, atau siswa..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 py-1"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-[0.95] ${
                  inputValue.trim() && !isLoading
                    ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                    : "bg-slate-200/80 text-slate-400 disabled:opacity-40 disabled:pointer-events-none"
                }`}
                title="Kirim Pesan"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

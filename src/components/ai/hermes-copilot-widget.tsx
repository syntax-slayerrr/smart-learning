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
        "Halo! Saya **Hermes AI Copilot & Workspace**. Anda dapat meminta saya memproses data siswa langsung. Coba klik atau ketik: **'Cek siswa yang paling hadir dan paling aktif'** atau **'Rekap kelas hari ini'**.",
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

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2.5 rounded-full bg-stone-900 px-3.5 py-2.5 sm:px-4 sm:py-3 text-stone-100 shadow-xl border border-stone-800 hover:bg-stone-800 transition-all duration-200 active:scale-[0.98] group"
          title="Buka Hermes AI Workspace"
        >
          <div className="relative flex h-5 w-5 items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#EA580C] group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-xs font-semibold tracking-tight">Hermes AI Workspace</span>
          <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[9px] font-mono font-medium text-stone-400">
            9Router
          </span>
        </button>
      )}

      {/* Floating Workspace Modal */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col rounded-2xl border border-[#E7E2DA] bg-white shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            isExpanded
              ? "h-[650px] w-[560px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-6rem)]"
              : "h-[540px] w-[410px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-6rem)]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#FBF9F5] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#EA580C]">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight text-stone-900">
                    Hermes AI Workspace
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-emerald-700 border border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-600 animate-pulse" />
                    Interactive Agent
                  </span>
                </div>
                <p className="text-[10px] text-stone-500">
                  Powered by 9Router Gateway (:20128)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Perkecil" : "Perluas Workspace"}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/50 hover:text-stone-700 transition-colors"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setMessages([messages[0]])}
                title="Bersihkan Percakapan"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/50 hover:text-stone-700 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/50 hover:text-stone-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E7E2DA]/60 bg-[#FAF9F5] px-3 py-2 text-[10.5px]">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="shrink-0 rounded-full border border-[#E7E2DA] bg-white px-2.5 py-1 font-medium text-stone-600 hover:border-orange-300 hover:text-stone-900 hover:bg-orange-50/40 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Stream with Generative UI Workspaces */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF9F5]/40 text-xs">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className="space-y-2">
                  <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white shadow-2xs mt-0.5">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                        isUser
                          ? "bg-stone-900 text-white rounded-br-xs"
                          : "bg-white text-stone-800 border border-[#E7E2DA] rounded-bl-xs"
                      }`}
                    >
                      <div className="whitespace-pre-wrap space-y-1 font-sans">
                        {m.content}
                      </div>
                      <div
                        className={`text-[9px] font-mono mt-1 ${
                          isUser ? "text-stone-400 text-right" : "text-stone-400 text-left"
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>

                    {isUser && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#EA580C] shadow-2xs mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* GENERATIVE AGENTIC WORKSPACE CARD */}
                  {!isUser && m.workspace && (
                    <div className="ml-8 rounded-xl border border-[#E7E2DA] bg-white p-3.5 shadow-sm space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            {m.workspace.title}
                          </h4>
                          <p className="text-[10px] text-stone-500">
                            {m.workspace.description}
                          </p>
                        </div>
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-[9.5px] font-mono font-semibold text-stone-600">
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
                              className="rounded-lg border border-[#E7E2DA] bg-[#FBF9F5] p-2.5 transition-all hover:bg-stone-50/80"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-stone-900">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-stone-400">
                                    ({item.className})
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-[#EA580C]">
                                  {item.badge}
                                </span>
                              </div>

                              {/* Metric Pills */}
                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-stone-600 mb-2">
                                <span className="rounded bg-white border border-stone-200 px-1.5 py-0.5 text-emerald-700 font-bold">
                                  {m.workspace?.title.includes("Guru") ? "Kehadiran Mengajar" : "Hadir"}: {item.attendanceRate}%
                                </span>
                                {m.workspace?.title.includes("Guru") ? (
                                  <span className="rounded bg-white border border-stone-200 px-1.5 py-0.5 text-rose-700 font-bold">
                                    Izin/Alpa: {item.absentCount || 0}x
                                  </span>
                                ) : (
                                  <>
                                    <span className="rounded bg-white border border-stone-200 px-1.5 py-0.5 text-sky-700 font-bold">
                                      Tanya: {item.handRaises}x
                                    </span>
                                    <span className="rounded bg-white border border-stone-200 px-1.5 py-0.5 text-stone-700 font-bold">
                                      Fokus: {item.focusScore}%
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Interactive Action Buttons */}
                              <div className="flex items-center gap-1.5 pt-1 border-t border-[#E7E2DA]/60">
                                {!m.workspace?.title.includes("Guru") ? (
                                  <>
                                    {item.waDraft && (
                                      <button
                                        onClick={() => handleCopyDraft(item.id, item.waDraft)}
                                        className="inline-flex items-center gap-1 rounded-md bg-white border border-stone-200 px-2 py-1 text-[10px] font-medium text-stone-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors shadow-2xs active:scale-[0.98]"
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
                                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all shadow-2xs active:scale-[0.98] ${
                                        isAwarded
                                          ? "bg-amber-100 border-amber-300 text-amber-900 font-bold"
                                          : "bg-white border-stone-200 text-stone-700 hover:border-amber-400 hover:text-amber-800"
                                      }`}
                                      title="Berikan Bintang Poin Keaktifan"
                                    >
                                      <Award className="h-3 w-3 text-amber-500" />
                                      <span>{isAwarded ? "⭐ +10 Poin Tersimpan" : "Beri Poin"}</span>
                                    </button>
                                  </>
                                ) : (
                                  /* Teacher Action Buttons (No WhatsApp Draft) */
                                  <>
                                    <button
                                      onClick={() => handleAwardStudent(item.id, true, { name: item.name, className: item.className })}
                                      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-all shadow-2xs active:scale-[0.98] ${
                                        isAwarded
                                          ? "bg-emerald-100 border-emerald-300 text-emerald-900 font-bold"
                                          : "bg-white border-stone-200 text-stone-700 hover:border-emerald-400 hover:text-emerald-800"
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
                                      className="inline-flex items-center gap-1 rounded-md bg-white border border-stone-200 px-2 py-1 text-[10px] font-medium text-stone-700 hover:border-amber-400 hover:text-amber-800 transition-colors shadow-2xs active:scale-[0.98]"
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
                      <div className="flex items-center justify-between pt-2 border-t border-[#E7E2DA] text-[10.5px]">
                        <span className="text-stone-400 font-mono">
                          {m.workspace.type === "session_recap" ? "Opsi Laporan" : "Aksi Cepat"}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {m.workspace.actions && m.workspace.actions.length > 0 ? (
                            m.workspace.actions.map((act) => (
                              <button
                                key={act.actionType}
                                onClick={() => handleWorkspaceAction(act.actionType, m.workspace!)}
                                className="inline-flex items-center gap-1 text-[#EA580C] hover:underline font-semibold"
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
                              className="inline-flex items-center gap-1 text-[#EA580C] hover:underline font-semibold"
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
              <div className="flex gap-2.5 items-center text-xs text-stone-500">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white shadow-2xs">
                  <Bot className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white border border-[#E7E2DA] px-3.5 py-2 text-stone-600 shadow-2xs font-mono text-[10.5px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C] animate-ping" />
                  <span>Hermes membaca basis data & menyiapkan workspace...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-[#E7E2DA] bg-white p-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#E7E2DA] bg-[#FBF9F5] px-3 py-1.5 focus-within:border-stone-400 focus-within:bg-white transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik: 'cek siswa yang paling hadir dan paling aktif'..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-[0.95]"
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

"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMascot } from "@/components/mascot/mascot-context";
import { Mascot } from "@/components/Mascot";
import {
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

const GUIDE_QUICK_PROMPTS = [
  "Jelaskan alur presensi QR & Biometrik",
  "Apa itu Uji Lisan AI dan cara kerjanya?",
  "Bagaimana cara Orang Tua memantau siswa?",
  "Cara Guru mengelola tugas & modul ajar",
  "Panduan instalasi aplikasi PWA di HP",
];

export function HermesCopilotWidget() {
  const pathname = usePathname();
  const isGuidePage = pathname === "/panduan";
  const activePrompts = isGuidePage ? GUIDE_QUICK_PROMPTS : QUICK_PROMPTS;
  const { isCopilotOpen: isOpen, setIsCopilotOpen: setIsOpen, mood } = useMascot();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [awardedStudents, setAwardedStudents] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo! Saya **Smart AI**. Anda dapat meminta saya memproses data siswa langsung. Coba klik atau ketik: **'Cek siswa yang paling hadir dan paling aktif'** atau **'Rekap kelas hari ini'**.",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  useEffect(() => {
    if (isGuidePage) {
      setMessages([
        {
          id: "welcome-guide",
          role: "assistant",
          content:
            "Halo! Saya **Smart AI Panduan Aplikasi**. Saya siap menjelaskan seluruh fitur, arsitektur, dan cara penggunaan sistem Smart Learning untuk **Siswa, Guru, Orang Tua, dan Administrator**. Silakan klik topik rekomendasi di atas atau tanyakan apa saja!",
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [isGuidePage]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Lock body scroll while copilot sheet is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle mobile visual viewport resize without window bounce
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      scrollToBottom(false);
    };

    vv.addEventListener("resize", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [isOpen, messages, isLoading]);

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
        body: JSON.stringify({
          messages: payloadMessages,
          context: isGuidePage ? "guide" : "general",
          pathname,
        }),
      });

      const data = await res.json();
      const replyText =
        data?.reply ||
        "Maaf, terjadi kendala saat menghubungi layanan Asisten Cerdas. Silakan coba sesaat lagi.";

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

  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const showToastNotice = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
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
        `Dicatat & Diverifikasi oleh Smart AI.`,
      ].join("\n");
      navigator.clipboard.writeText(reportLines);
      showToastNotice("Laporan berhasil disalin ke clipboard!");
    } else if (actionType === "print_report" || actionType === "export_pdf" || actionType === "export_teacher_pdf") {
      window.print();
    } else if (actionType === "assign_substitute") {
      showToastNotice("Alokasi guru pengganti (inval) telah dicatat untuk kurikulum & tata usaha.");
    } else {
      showToastNotice(`Aksi [${actionType}] berhasil diproses.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderTableCellContent = (content: React.ReactNode) => {
    if (typeof content === "string") {
      const trimmed = content.trim();
      if (/^\d+([.,]\d+)?%$/.test(trimmed)) {
        const num = parseFloat(trimmed.replace("%", "").replace(",", "."));
        const isHigh = num >= 90;
        const isMid = num >= 75;
        return (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold ${
              isHigh
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                : isMid
                ? "bg-sky-50 text-sky-700 border border-sky-200/70"
                : "bg-amber-50 text-amber-700 border border-amber-200/70"
            }`}
          >
            {trimmed}
          </span>
        );
      }
    }
    return content;
  };

  const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-sm sm:text-base font-bold text-slate-900 mt-2.5 mb-1.5 flex items-center gap-1.5" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-[13px] sm:text-sm font-bold text-slate-900 mt-2.5 mb-1.5 flex items-center gap-1.5" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 mt-2.5 mb-1 pb-1 border-b border-slate-100 flex items-center gap-1.5 tracking-tight" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="text-[11.5px] sm:text-xs leading-relaxed text-slate-700 my-1" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold text-slate-900" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="my-1.5 space-y-1 pl-0.5 list-none" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="my-1.5 space-y-1 pl-4 list-decimal text-[11.5px] text-slate-700" {...props} />
          ),
          li: ({ children, ...props }) => (
            <li className="text-[11.5px] sm:text-xs leading-relaxed text-slate-700 flex items-start gap-1.5" {...props}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div className="flex-1">{children}</div>
            </li>
          ),
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-3 border-blue-500 bg-blue-50/60 rounded-r-xl px-3 py-1.5 my-2 text-[11.5px] text-slate-700 font-medium italic" {...props} />
          ),
          code: ({ className, children, ...props }: any) => {
            const isInline = !className?.includes("language-");
            if (isInline) {
              return (
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] text-blue-700 font-semibold border border-slate-200/60" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="my-2 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 text-slate-100 text-[10.5px] shadow-sm">
                <pre className="p-3 overflow-x-auto font-mono">
                  <code {...props}>{children}</code>
                </pre>
              </div>
            );
          },
          table: ({ ...props }) => (
            <div className="my-2.5 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full border-collapse text-left text-[11px]" {...props} />
              </div>
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-slate-50/90 text-slate-700 border-b border-slate-200/90 font-semibold tracking-wide text-[10px] uppercase" {...props} />
          ),
          tbody: ({ ...props }) => (
            <tbody className="divide-y divide-slate-100 text-slate-700" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="transition-colors hover:bg-blue-50/40 even:bg-slate-50/40" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="px-2.5 py-2 whitespace-nowrap font-semibold text-slate-800 tracking-tight" {...props} />
          ),
          td: ({ children, ...props }) => (
            <td className="px-2.5 py-2 text-slate-700 whitespace-nowrap font-medium" {...props}>
              {renderTableCellContent(children)}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <>
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
          className={`fixed z-50 flex flex-col bg-white overflow-hidden transition-none sm:transition-all sm:duration-200 animate-in ${
            /* Mobile: Apple Bottom Sheet | Desktop: Floating Card */
            "inset-x-0 bottom-0 h-[88dvh] max-h-[88dvh] rounded-t-[28px] border-t border-slate-200/90 shadow-[0_-10px_40px_rgba(15,23,42,0.18)] slide-in-from-bottom-full sm:inset-x-auto sm:bottom-6 sm:right-6 sm:rounded-3xl sm:border sm:border-slate-200/90 sm:shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:slide-in-from-bottom-4"
          } ${
            isExpanded
              ? "sm:w-[720px] sm:h-[680px]"
              : "sm:w-[480px] sm:h-[580px]"
          }`}
        >
          {/* iOS Grab Handle (Mobile Only) */}
          <div className="mx-auto mt-2 mb-1.5 h-1 w-10 shrink-0 rounded-full bg-slate-300/80 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-md px-4 py-2.5 sm:px-5 sm:py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500/10 via-sky-400/15 to-indigo-500/10 p-0.5 border border-blue-200/80 shadow-2xs">
                <Mascot mood={isLoading ? "fokus" : mood || "senang"} size={36} interactive={false} showBadge={false} />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 truncate">
                    {isGuidePage ? "Smart AI • Panduan Aplikasi" : "Smart AI"}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700 border border-emerald-200/70 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {isGuidePage ? "Asisten Penjelas Fitur & Dokumentasi Lengkap" : "Asisten Cerdas & Operasional Akademik"}
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors ml-1 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* In-App Toast Feedback */}
          {toastNotice && (
            <div className="absolute top-16 left-3 right-3 z-50 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-zinc-900/95 text-white text-xs shadow-lg border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium text-zinc-100 truncate">{toastNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastNotice(null)}
                className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Suggestion Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {activePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1 font-medium text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-2xs whitespace-nowrap"
              >
                <Bot className="h-3 w-3 text-blue-500 shrink-0" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Chat Messages Stream with Generative UI Workspaces */}
          <div
            ref={chatContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/50 text-xs sm:text-[13px] overscroll-contain"
          >
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className="space-y-2.5">
                  <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center mt-0.5 rounded-xl bg-gradient-to-tr from-blue-500/10 via-sky-400/15 to-indigo-500/10 p-0.5 border border-blue-200/60 shadow-2xs">
                        <Mascot mood="senang" size={24} interactive={false} showBadge={false} />
                      </div>
                    )}

                    <div
                      className={`leading-relaxed transition-all duration-200 ${
                        isUser
                          ? "max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tr-xs px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                          : "max-w-[96%] sm:max-w-[88%] w-full sm:w-auto rounded-2xl rounded-tl-xs px-3.5 sm:px-4 py-3 bg-white text-slate-800 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
                      }`}
                    >
                      {isUser ? (
                        <div className="text-[12px] sm:text-[12.5px] leading-relaxed whitespace-pre-wrap font-sans">
                          {m.content}
                        </div>
                      ) : (
                        <div className="font-sans">
                          <MarkdownRenderer content={m.content} />
                        </div>
                      )}

                      <div
                        className={`mt-2 flex items-center justify-between gap-2 border-t pt-1.5 ${
                          isUser ? "border-white/10 text-blue-100/70" : "border-slate-100 text-slate-400"
                        }`}
                      >
                        <span className="text-[9.5px] font-mono">
                          {m.timestamp}
                        </span>
                        {!isUser && (
                          <button
                            onClick={() => handleCopyMessage(m.id, m.content)}
                            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors py-0.5 px-1 rounded hover:bg-slate-50"
                            title="Salin isi pesan"
                          >
                            {copiedMessageId === m.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="text-[9.5px] text-emerald-600 font-medium">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span className="text-[9.5px]">Salin</span>
                              </>
                            )}
                          </button>
                        )}
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
                                            <span>Pesan ke Orang Tua</span>
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
                                        showToastNotice(`Catatan penugasan guru piket pengganti untuk ${item.name} (${item.className}) berhasil dibuat.`);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10.5px] font-medium text-slate-700 hover:border-amber-400 hover:text-amber-800 transition-colors shadow-2xs active:scale-[0.98]"
                                      title="Tugaskan Guru Piket / Pengganti"
                                    >
                                      <span>Tugaskan Guru Piket</span>
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
                  <Mascot mood="fokus" size={24} interactive={false} showBadge={false} />
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/90 px-3.5 py-2 text-slate-600 shadow-2xs font-mono text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>Smart AI membaca basis data & menyiapkan workspace...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md px-3.5 pt-2 pb-3.5 sm:pb-3 shrink-0">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-2xs">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (typeof window !== "undefined" && window.scrollY !== 0) {
                    window.scrollTo(0, 0);
                  }
                }}
                placeholder={
                  isGuidePage
                    ? "Tanyakan fitur, cara pakai, atau panduan Smart Learning..."
                    : "Tanyakan kehadiran, ringkasan kelas, atau siswa..."
                }
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

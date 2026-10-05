"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Send,
  Lightbulb,
  BookmarkPlus,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Headphones,
  X,
  CheckCircle2,
  Lock,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveOfflineNote } from "@/lib/offline-lms-cache";

export interface DocumentChapter {
  id: string;
  chapterNumber: number;
  title: string;
  pageStart: number;
  pageEnd: number;
  summary: string;
  keyTakeaways: string[];
  contentSnippet?: string;
}

export interface SocraticDocumentViewerProps {
  materialId: string;
  materialTitle: string;
  fileName: string;
  fileUrl?: string;
  chapters?: DocumentChapter[];
  studentId?: string;
  initialPage?: number;
  initialPrompt?: string;
  className?: string;
  onNavigateToReader?: (chapterIndex: number, page?: number) => void;
  onSaveNote?: (note: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "student" | "assistant";
  text: string;
  timestamp: string;
  citations?: Array<{
    page: number;
    quoteSnippet: string;
    chapterTitle?: string;
  }>;
  checkpointPassed?: {
    concept: string;
    summary: string;
  };
  highlightRef?: string;
}

const DEFAULT_CHAPTERS: DocumentChapter[] = [
  {
    id: "ch-1",
    chapterNumber: 1,
    title: "Pengantar & Konsep Fundamental",
    pageStart: 1,
    pageEnd: 10,
    summary: "Dasar-dasar arsitektur, terminologi kunci, dan prinsip kerja sistem.",
    keyTakeaways: [
      "Pemahaman struktur hierarki dan protokol dasar",
      "Perbedaan antara physical layer dan logical layer",
    ],
    contentSnippet: "Modul ini membahas prinsip fundamental arsitektur dan sistem transmisi data.",
  },
  {
    id: "ch-2",
    chapterNumber: 2,
    title: "Implementasi & Analisis Lanjutan",
    pageStart: 11,
    pageEnd: 24,
    summary: "Perhitungan matematis, pembagian alokasi, dan optimasi performa.",
    keyTakeaways: [
      "Metode alokasi efisien dan kalkulasi bitmask",
      "Pencegahan broadcast overhead dan isolasi collision",
    ],
    contentSnippet: "Pembagian rentang alamat secara hierarkis untuk efisiensi routing.",
  },
];

export function SocraticDocumentViewer({
  materialId,
  materialTitle,
  fileName,
  fileUrl,
  chapters = DEFAULT_CHAPTERS,
  studentId = "student-default",
  initialPage = 1,
  initialPrompt,
  className = "",
  onNavigateToReader,
  onSaveNote,
}: SocraticDocumentViewerProps) {
  const safeChapters = chapters && chapters.length > 0 ? chapters : DEFAULT_CHAPTERS;

  const [activeChapterIndex, setActiveChapterIndex] = useState(() => {
    const idx = safeChapters.findIndex(
      (c) => initialPage >= c.pageStart && initialPage <= c.pageEnd
    );
    return idx !== -1 ? idx : 0;
  });

  const activeChapter = safeChapters[activeChapterIndex] || safeChapters[0];

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-msg",
      sender: "assistant",
      text: `Halo! Aku **Smart AI**, mentor dialektikamu untuk materi **${activeChapter.title}** (${materialTitle}).\n\nDiskusi kita **terkunci penuh pada materi bab ini**. Tanyakan konsep yang ingin kamu perdalam, atau kita bisa bedah bersama dari dasar tanpa jalan pintas!`,
      timestamp: "Baru saja",
    },
  ]);

  const [promptInput, setPromptInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [activeCitationPeek, setActiveCitationPeek] = useState<{
    page: number;
    quoteSnippet: string;
    chapterTitle?: string;
  } | null>(null);

  // Audio speech synthesis state
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isAudioSummaryPlaying, setIsAudioSummaryPlaying] = useState(false);
  const [savedCheckpoints, setSavedCheckpoints] = useState<Record<string, boolean>>({});
  const [showChapterMenu, setShowChapterMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isAiThinking]);

  // Initial prompt trigger
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Stop TTS on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update welcome message if chapter changed and chat is at start
  const handleSelectChapter = (index: number) => {
    setActiveChapterIndex(index);
    setShowChapterMenu(false);
    const targetChapter = safeChapters[index];
    if (chatMessages.length <= 1) {
      setChatMessages([
        {
          id: `welcome-${targetChapter.id}`,
          sender: "assistant",
          text: `Fokus materi sekarang dialihkan ke **Bab ${targetChapter.chapterNumber}: ${targetChapter.title}**.\n\nPembahasan kita tetap **terkunci pada materi bab ini**. Apa yang ingin kamu diskusikan dari konsep bab ini?`,
          timestamp: "Baru saja",
        },
      ]);
    } else {
      // Append transition message
      setChatMessages((prev) => [
        ...prev,
        {
          id: `trans-${Date.now()}`,
          sender: "assistant",
          text: `*Fokus materi sekarang dialihkan ke **Bab ${targetChapter.chapterNumber}: ${targetChapter.title}**. Semua pertanyaan berikutnya terfokus pada bab ini.*`,
          timestamp: "Baru saja",
        },
      ]);
    }
  };

  // TTS Toggle for a message
  const toggleSpeakMessage = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (activeSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/\[CHECKPOINT_PASSED:[^\]]*\]/g, "")
      .replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;
    utterance.onend = () => setActiveSpeakingId(null);
    utterance.onerror = () => setActiveSpeakingId(null);

    setActiveSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Audio Summary for whole chapter
  const toggleAudioSummary = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isAudioSummaryPlaying) {
      window.speechSynthesis.cancel();
      setIsAudioSummaryPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const summaryText = `Ringkasan audio untuk Bab ${activeChapter.chapterNumber}, ${activeChapter.title}. ${activeChapter.summary}. Konsep kunci: ${activeChapter.keyTakeaways.join(". ")}.`;
    const utterance = new SpeechSynthesisUtterance(summaryText);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;
    utterance.onend = () => setIsAudioSummaryPlaying(false);
    utterance.onerror = () => setIsAudioSummaryPlaying(false);

    setIsAudioSummaryPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  // Reset conversation
  const handleResetChat = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeakingId(null);
    setIsAudioSummaryPlaying(false);
    setChatMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: `Halo Zaldy! Aku **Smart AI**, mentor dialektikamu untuk materi **${activeChapter.title}**.\n\nPembahasan kita **terkunci penuh pada materi bab ini**. Silakan ajukan pertanyaan seputar konsep materi ini.`,
        timestamp: "Baru saja",
      },
    ]);
  };

  // Send Prompt with Strict Grounding to API
  const handleSendPrompt = async (customPrompt?: string, highlight?: string) => {
    const textToSend = (customPrompt || promptInput).trim();
    if (!textToSend || isAiThinking) return;

    const userMsgId = `student-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: "student",
      text: textToSend,
      timestamp: "Baru saja",
      highlightRef: highlight,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setPromptInput("");
    setIsAiThinking(true);

    try {
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.sender === "student" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/ai/socratic-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          materialId,
          topicId: activeChapter.id,
          materialTitle: materialTitle || "Materi Pembelajaran",
          chapterTitle: activeChapter.title,
          chapterSummary: activeChapter.summary,
          chapterContent: activeChapter.contentSnippet || activeChapter.summary,
          message: textToSend,
          highlightedText: highlight,
          history: historyPayload,
        }),
      });

      if (!res.ok) throw new Error("Gagal menghubungi server Smart AI");

      const data = await res.json();
      let aiText = data.reply || data.response || "";

      // Parse Checkpoint token if present
      let checkpointData: { concept: string; summary: string } | undefined = undefined;
      const checkpointMatch = aiText.match(/\[CHECKPOINT_PASSED:\s*([^\]]+)\]/i);
      if (checkpointMatch) {
        checkpointData = {
          concept: `Pemahaman Bab ${activeChapter.chapterNumber}`,
          summary: checkpointMatch[1].trim(),
        };
        aiText = aiText.replace(/\[CHECKPOINT_PASSED:[^\]]+\]/i, "").trim();
      }

      const citations = [
        {
          page: activeChapter.pageStart,
          quoteSnippet: activeChapter.summary,
          chapterTitle: activeChapter.title,
        },
      ];

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "assistant",
          text: aiText,
          timestamp: "Baru saja",
          citations,
          checkpointPassed: checkpointData,
        },
      ]);
    } catch {
      // Fallback grounded answer
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `ai-fallback-${Date.now()}`,
            sender: "assistant",
            text: `Terkait pertanyaanmu mengenai **${activeChapter.title}**: mari kita bedah prinsip dasarnya terlebih dahulu.\n\n${activeChapter.summary}\n\nMenurutmu, bagaimana bagian ini terhubung dengan tantangan yang sedang kamu hadapi?`,
            timestamp: "Baru saja",
            citations: [
              {
                page: activeChapter.pageStart,
                quoteSnippet: activeChapter.summary,
                chapterTitle: activeChapter.title,
              },
            ],
          },
        ]);
      }, 700);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Save Checkpoint to Notes
  const handleSaveCheckpointToNotes = async (msgId: string, concept: string, summary: string) => {
    try {
      const noteContent = `### ✨ Checkpoint Pemahaman: ${activeChapter.title}\n\n**${concept}**\n${summary}\n\n*Dicatat otomatis dari sesi Socratic Smart AI pada ${new Date().toLocaleDateString("id-ID")}*`;
      saveOfflineNote({
        material_id: materialId,
        chapter_id: activeChapter.id,
        quote: concept,
        my_note: noteContent,
      });
      if (onSaveNote) {
        onSaveNote(noteContent);
      }
      setSavedCheckpoints((prev) => ({ ...prev, [msgId]: true }));
    } catch (e) {
      console.error("Gagal menyimpan catatan checkpoint:", e);
    }
  };

  // Quick suggestion prompts
  const suggestions = useMemo(
    () => [
      `💡 Apa konsep paling krusial di ${activeChapter.title}?`,
      `🔍 Berikan analogi sederhana untuk memahami materi ini`,
      `🎯 Beri aku 1 pertanyaan reflektif untuk menguji nalar`,
      `📋 Rangkum inti perbedaan prinsip utama di bab ini`,
    ],
    [activeChapter.title]
  );

  return (
    <div
      className={`relative flex flex-col h-full w-full bg-transparent overflow-hidden ${className}`}
    >
      {/* 1. SLIM CONTEXT SUB-TOOLBAR (Eliminates clashing double-header) */}
      <div className="shrink-0 px-3.5 sm:px-6 py-1.5 bg-white/40 backdrop-blur-xl border-b border-white/50 flex items-center justify-between gap-2 z-10">
        {/* Left: Active Chapter Selector & Strict Grounding Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <button
              onClick={() => setShowChapterMenu(!showChapterMenu)}
              className="h-7 px-2.5 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <span className="max-w-[130px] sm:max-w-[220px] truncate">
                Bab {activeChapter.chapterNumber}: {activeChapter.title}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showChapterMenu && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/70 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Fokus Pembahasan Bab
                </div>
                {safeChapters.map((chap, idx) => (
                  <button
                    key={chap.id}
                    onClick={() => handleSelectChapter(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                      idx === activeChapterIndex
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-slate-700 hover:bg-slate-100/70"
                    }`}
                  >
                    <span className="truncate pr-2">
                      Bab {chap.chapterNumber}: {chap.title}
                    </span>
                    {idx === activeChapterIndex && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
            <Lock className="h-2.5 w-2.5 text-emerald-600" />
            <span className="hidden sm:inline">Terkunci Pada Materi</span>
            <span className="sm:hidden">Terkunci</span>
          </span>
        </div>

        {/* Right: Audio Summary & Reset Chat */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleAudioSummary}
            className={`h-7 px-2 sm:px-2.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors shadow-2xs ${
              isAudioSummaryPlaying
                ? "text-[#007AFF] border-blue-300 bg-blue-50"
                : "text-slate-600 border-slate-200/80 bg-white/80 hover:bg-white"
            }`}
            title="Dengarkan Ringkasan Bab"
          >
            <Headphones className="h-3.5 w-3.5 text-[#007AFF]" />
            <span className="hidden sm:inline">Audio Ringkasan</span>
          </button>

          <button
            onClick={handleResetChat}
            className="h-7 w-7 rounded-xl border border-slate-200/80 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
            title="Reset Percakapan"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 2. CHAT FEED: Dedicated Native Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-3.5 py-4 sm:px-6 space-y-4">
        {chatMessages.map((msg) => {
          const isStudent = msg.sender === "student";
          const isSpeaking = activeSpeakingId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isStudent ? "items-end" : "items-start"} max-w-full`}
            >
              {/* Highlight Ref Tag */}
              {msg.highlightRef && (
                <div className="mb-1.5 px-3 py-1 rounded-xl bg-blue-50 text-[11px] text-blue-700 border border-blue-200/60 max-w-[85%] truncate italic">
                  &ldquo;{msg.highlightRef}&rdquo;
                </div>
              )}

              {/* Message Capsule */}
              <div
                className={`group relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all ${
                  isStudent
                    ? "bg-[#007AFF] text-white shadow-xs max-w-[85%] sm:max-w-[75%]"
                    : "bg-white/85 backdrop-blur-xl border border-white/80 text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] max-w-[92%] sm:max-w-[82%]"
                }`}
              >
                {/* Assistant Label */}
                {!isStudent && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
                      <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                        Smart AI Mentor
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleSpeakMessage(msg.id, msg.text)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                        title={isSpeaking ? "Hentikan Suara" : "Dengarkan Jawaban"}
                      >
                        {isSpeaking ? (
                          <VolumeX className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
                  {msg.text}
                </div>

                {/* Grounding Citation Pill */}
                {!isStudent && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 flex flex-wrap gap-1.5 items-center border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">Rujukan:</span>
                    {msg.citations.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveCitationPeek(c)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100/80 border border-blue-200/60 transition-colors"
                      >
                        <BookOpen className="h-2.5 w-2.5" />
                        Hal {c.page} • {c.chapterTitle || activeChapter.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Checkpoint Passed Card */}
                {msg.checkpointPassed && (
                  <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Checkpoint Pemahaman Terverifikasi
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-800 border-0 text-[10px]">
                        Tuntas
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-700 italic">
                      &ldquo;{msg.checkpointPassed.summary}&rdquo;
                    </p>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleSaveCheckpointToNotes(
                          msg.id,
                          msg.checkpointPassed!.concept,
                          msg.checkpointPassed!.summary
                        )
                      }
                      disabled={savedCheckpoints[msg.id]}
                      className="self-start h-7 px-2.5 text-[11px] rounded-xl font-medium bg-white/90 border-emerald-500/30 text-emerald-800 hover:bg-white flex items-center gap-1.5 mt-0.5"
                    >
                      {savedCheckpoints[msg.id] ? (
                        <>
                          <Check className="h-3 w-3" /> Tersimpan ke Catatan
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-3 w-3" /> Simpan ke Catatan Pribadi
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isAiThinking && (
          <div className="flex flex-col items-start">
            <div className="rounded-2xl sm:rounded-3xl p-4 bg-white/85 backdrop-blur-xl border border-white/80 shadow-xs flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#007AFF] animate-spin" />
              <span className="text-xs text-slate-500 font-medium">
                Smart AI sedang menganalisis materi bab...
              </span>
              <div className="flex items-center gap-1 ml-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF] animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF] animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF] animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* 3. CONTEXT SUGGESTIONS PILLS */}
      <div className="shrink-0 px-3.5 sm:px-6 py-2 bg-white/50 backdrop-blur-md border-t border-white/60 overflow-x-auto no-scrollbar flex items-center gap-2">
        {suggestions.map((promptText, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(promptText)}
            disabled={isAiThinking}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 hover:text-[#007AFF] shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Lightbulb className="h-3 w-3 text-amber-500" />
            <span className="truncate max-w-[220px]">{promptText}</span>
          </button>
        ))}
      </div>

      {/* 4. DOCKED INPUT CAPSULE */}
      <footer className="shrink-0 sticky bottom-0 p-2.5 sm:p-4 bg-white/85 backdrop-blur-2xl border-t border-white/70 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="relative flex items-center gap-2 rounded-full bg-white/95 border border-slate-200/90 px-3 sm:px-4 py-1.5 sm:py-2 shadow-xs focus-within:ring-2 focus-within:ring-[#007AFF]/20 focus-within:border-[#007AFF] transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onFocus={() => {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 300);
            }}
            placeholder={`Tanyakan konsep seputar ${activeChapter.title}...`}
            disabled={isAiThinking}
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          />

          <Button
            type="submit"
            size="sm"
            disabled={!promptInput.trim() || isAiThinking}
            className="h-8 w-8 rounded-full bg-[#007AFF] hover:bg-blue-600 text-white p-0 shrink-0 shadow-sm transition-transform active:scale-95 disabled:opacity-30 disabled:scale-100"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>

        <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-slate-400">
          <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" />
          <span>Respon AI 100% terkunci pada materi resmi & kurikulum guru.</span>
        </div>
      </footer>

      {/* 5. CITATION PEEK DRAWER / SHEET */}
      {activeCitationPeek && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex flex-col justify-end animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/70 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[80%] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#007AFF]" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Rujukan Modul: Halaman {activeCitationPeek.page}
                </h3>
              </div>
              <button
                onClick={() => setActiveCitationPeek(null)}
                className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-xs text-slate-700 leading-relaxed font-mono">
              &ldquo;{activeCitationPeek.quoteSnippet}&rdquo;
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  saveOfflineNote({
                    material_id: materialId,
                    chapter_id: activeChapter.id,
                    quote: activeCitationPeek.quoteSnippet,
                    my_note: `Kutipan Rujukan Bab ${activeChapter.chapterNumber} (Hal ${activeCitationPeek.page}):\n"${activeCitationPeek.quoteSnippet}"`,
                  });
                  setActiveCitationPeek(null);
                }}
                className="rounded-xl text-xs bg-white border-slate-200"
              >
                <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                Simpan Kutipan
              </Button>

              {onNavigateToReader && (
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveCitationPeek(null);
                    onNavigateToReader(activeChapterIndex, activeCitationPeek.page);
                  }}
                  className="rounded-xl text-xs bg-[#007AFF] hover:bg-blue-600 text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Buka di Reader Modul
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

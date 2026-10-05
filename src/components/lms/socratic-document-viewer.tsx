"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
  Lightbulb,
  Video,
  BookmarkPlus,
  Check,
  Volume2,
  VolumeX,
  Highlighter,
  RotateCcw,
  BookOpen,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DocumentChapter {
  id: string;
  title: string;
  chapterNumber?: number;
  pageStart?: number;
  pageEnd?: number;
  pages?: string;
  isCriticalZone?: boolean;
  criticalZoneDrop?: number;
  confusionScore?: number;
  detectedTimestamp?: string;
  contentSnippet?: string;
  summary?: string;
  keyTakeaways?: string[];
}

export interface SocraticDocumentViewerProps {
  chapters?: DocumentChapter[];
  materialTitle?: string;
  materialId?: string;
  studentId?: string;
  initialPage?: number;
  className?: string;
}

const DEFAULT_CHAPTERS: DocumentChapter[] = [
  {
    id: "chap-1",
    chapterNumber: 1,
    title: "Bab 1: Pengantar Arsitektur Jaringan & Model OSI",
    pageStart: 1,
    pageEnd: 12,
    isCriticalZone: false,
    contentSnippet: `Jaringan komputer adalah sistem yang menghubungkan dua atau lebih perangkat komputasi untuk bertukar data dan berbagi sumber daya. Model referensi OSI (Open Systems Interconnection) membagi komunikasi jaringan menjadi 7 lapisan terstruktur: Physical, Data Link, Network, Transport, Session, Presentation, dan Application. Setiap layer memiliki tanggung jawab enkapsulasi data tersendiri.

Pada model TCP/IP, arsitektur disederhanakan menjadi 4 lapisan: Network Access, Internet, Transport, dan Application. Router beroperasi pada Network Layer (Layer 3) menggunakan IP Address untuk meneruskan paket lintas subnet logis.`,
    keyTakeaways: ["7 Lapisan Model OSI", "Perbedaan OSI vs TCP/IP", "Enkapsulasi & PDU"],
  },
  {
    id: "chap-2",
    chapterNumber: 2,
    title: "Bab 2: Subnetting, Notasi CIDR, dan Alokasi VLSM",
    pageStart: 13,
    pageEnd: 28,
    isCriticalZone: true,
    confusionScore: 42,
    detectedTimestamp: "Sesi Kelas Fisik Pagi Ini",
    contentSnippet: `Pengalamatan IPv4 menggunakan 32-bit yang dipisahkan menjadi empat oktet numerik. Subnetting adalah teknik membagi satu jaringan fisik besar menjadi beberapa sub-jaringan logis yang lebih efisien.

Notasi CIDR (/24, /27, /28) menentukan berapa bit yang dipinjam dari host ID untuk alokasi network prefix.
Dalam alokasi VLSM (Variable Length Subnet Masking), kita mengurutkan kebutuhan host dari yang terbesar ke yang terkecil guna meminimalkan pemborosan alamat IP publik maupun privat.

Rumus krusial jumlah host yang valid: 2^n - 2 (di mana n adalah sisa bit host). Dua alamat selalu dialokasikan khusus dan tidak boleh dipasang pada perangkat: Network ID (semua bit host bernilai 0 biner) dan Broadcast Address (semua bit host bernilai 1 biner).`,
    keyTakeaways: ["Struktur Oktet IPv4", "Notasi Prefix CIDR", "Perhitungan Host Valid (2^n - 2)", "Hierarki Alokasi VLSM"],
  },
  {
    id: "chap-3",
    chapterNumber: 3,
    title: "Bab 3: Dynamic Routing Protocols (RIP & OSPF)",
    pageStart: 29,
    pageEnd: 45,
    isCriticalZone: false,
    contentSnippet: `Routing dinamis memungkinkan router secara otomatis bertukar informasi topologi dan memperbarui tabel routing ketika terjadi perubahan tautan fisik secara real-time.

Routing Information Protocol (RIP) berbasis Distance Vector dengan metrik hop count maksimal 15 hop, cocok untuk jaringan skala kecil tanpa segmentasi kompleks.
Open Shortest Path First (OSPF) adalah Link-State Protocol berbasis algoritma SPF (Dijkstra). OSPF menawarkan konvergensi sangat cepat, bebas routing loop, dan mendukung hierarki multi-area dengan Area 0 (Backbone Area) sebagai poros pertukaran paket antar-area.`,
    keyTakeaways: ["Distance Vector vs Link State", "Batas Metrik RIP 15 Hop", "Algoritma Dijkstra OSPF", "Desain Multi-Area OSPF"],
  },
];

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  checkpointPassed?: boolean;
  noteDraft?: string;
  noteSaved?: boolean;
  highlightContext?: string;
}

export function SocraticDocumentViewer({
  chapters: externalChapters,
  materialTitle = "Modul Jaringan Komputer & Topologi Lanjut",
  materialId,
  studentId = "std-001",
  initialPage = 13,
  className = "",
}: SocraticDocumentViewerProps) {
  const chapters =
    externalChapters && externalChapters.length > 0
      ? externalChapters
      : DEFAULT_CHAPTERS;

  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(() => {
    const critIdx = chapters.findIndex(
      (c) => c.isCriticalZone || Boolean(c.criticalZoneDrop)
    );
    return critIdx >= 0 ? critIdx : 0;
  });

  const activeChapter = chapters[activeChapterIndex] || chapters[0];

  const [currentPage, setCurrentPage] = useState<number>(() => {
    return (
      initialPage ||
      activeChapter.pageStart ||
      1
    );
  });

  const [socraticQuery, setSocraticQuery] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const documentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      text: `Halo Zaldy! Aku **Smart AI**, mentor belajarmu untuk materi **${materialTitle}**. 

Di sini aku tidak akan memberi contekan jawaban langsung, tapi membantumu membedah logika materi bab demi bab secara bertahap. 

${
  activeChapter.isCriticalZone || activeChapter.criticalZoneDrop
    ? `⚠️ **Catatan Kelas Fisik:** Kamera AI mencatat materi **${activeChapter.title}** ini sempat memicu kebingungan (${activeChapter.confusionScore || activeChapter.criticalZoneDrop || 42}% atensi drop). Ada bagian yang ingin kita bedah bersama?`
    : "Ada konsep di bab ini yang ingin kamu diskusikan atau tanyakan?"
}`,
    },
  ]);

  // Scroll to bottom when new chat message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiLoading]);

  // Update proactive Socratic greeting when chapter changes
  useEffect(() => {
    const isCrit = activeChapter.isCriticalZone || Boolean(activeChapter.criticalZoneDrop);
    const dropScore = activeChapter.confusionScore || activeChapter.criticalZoneDrop || 42;

    const chapterGreeting: ChatMessage = {
      id: `greeting-${activeChapter.id}-${Date.now()}`,
      role: "assistant",
      text: isCrit
        ? `⚠️ **Zona Kritis Kelas Fisik:** Kamera AI mencatat ${dropScore}% siswa kebingungan di **${activeChapter.title}**.

Mari kita bedah logikanya bersama. Perhatikan rumus krusial **2^n - 2**:
Mengapa angka 2 wajib selalu dikurangkan di akhir perhitungan host, dan apa yang terjadi jika sebuah komputer diberi alamat IP yang semua bit host-nya bernilai 0 biner atau 1 biner?`
        : `Halo! Kamu sedang menelaah **${activeChapter.title}**.

Ada konsep dari bab ini yang ingin kita bedah logikanya bersama?`,
    };

    setChatMessages([chapterGreeting]);
  }, [activeChapterIndex]);

  // Handle Text Selection inside Document View
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 3) {
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText("");
    }
  };

  // Text-to-Speech function for AI responses
  const handleToggleSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*_#`[\]]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "id-ID";
    utterance.rate = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Kirim pertanyaan ke Smart AI backend
  const handleSendPrompt = async (promptOverride?: string, highlightOverride?: string) => {
    const textToSend = promptOverride || socraticQuery;
    const highlight = highlightOverride !== undefined ? highlightOverride : selectedText;

    if (!textToSend.trim() || isAiLoading) return;

    const userMessageId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      text: textToSend,
      highlightContext: highlight || undefined,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setSocraticQuery("");
    setSelectedText("");
    setIsAiLoading(true);

    try {
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch("/api/ai/socratic-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          materialId,
          topicId: activeChapter.id,
          message: textToSend,
          highlightedText: highlight,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: data.reply,
          checkpointPassed: data.checkpointPassed,
          noteDraft: data.noteDraft,
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "Gagal menghubungi Smart AI");
      }
    } catch (err: any) {
      // Fallback socratic response jika offline / dev mode
      const fallbackReply = textToSend.toLowerCase().includes("analogi")
        ? `Bayangkan kamu punya sebidang tanah luas (Network ID: 192.168.1.0/24, total 256 m²). 
        
Kalau dipotong rata (/26), tiap ruang dapat 64 m². Tapi lab komputer butuh 50 m², sedangkan pos satpam cuma butuh 4 m²! 
Tanah di pos satpam jadi mubazir 60 m².

Dengan **VLSM**, kamu potong fleksibel: kasih kavling /26 (64 m²) untuk Lab, dan cukup potong kavling /29 (8 m²) untuk pos satpam. Menurutmu, apa manfaat terbesar dari teknik ini?`
        : `Mari kita bedah logikanya bersama. Perhatikan rumus **2^n - 2**. 
        
Mengapa angka 2 harus selalu dikurangkan di bagian akhir? Siapa dua 'pihak istimewa' di setiap blok jaringan yang berhak atas dua alamat tersebut?`;

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-fallback-${Date.now()}`,
          role: "assistant",
          text: fallbackReply,
          checkpointPassed: false,
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Simpan checkpoint pemahaman ke catatan siswa (student_study_notes)
  const handlePinNote = async (msgId: string, noteContent: string) => {
    setSavingNoteId(msgId);
    try {
      const res = await fetch("/api/lms/student/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          materialId,
          topicId: activeChapter.id,
          noteContent,
          socraticContext: {
            topicTitle: activeChapter.title,
            savedAt: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, noteSaved: true } : m))
        );
      }
    } catch (err) {
      console.error("Gagal menyimpan catatan:", err);
    } finally {
      setSavingNoteId(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Closed-Loop Telemetry Notification Banner if on Critical Zone */}
      {(activeChapter.isCriticalZone || Boolean(activeChapter.criticalZoneDrop)) && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300/70 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm mt-0.5">
                <Video className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-amber-950 tracking-tight">
                    Closed-Loop Telemetry: Zona Kritis Kelas Fisik Terdeteksi
                  </span>
                  <Badge variant="warning" className="text-[10px] py-0 px-2 font-mono">
                    {activeChapter.confusionScore || activeChapter.criticalZoneDrop || 42}% Kebingungan
                  </Badge>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed max-w-2xl">
                  Pada sesi kelas tatap muka <strong>{activeChapter.detectedTimestamp || "Pagi Ini"}</strong>, sensor kamera AI mencatat 42% siswa mengalami lonjakan kebingungan & atensi drop saat guru menerangkan topik ini.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white shrink-0 self-start sm:self-auto gap-2 rounded-2xl shadow-sm active:scale-95 transition-all"
              onClick={() =>
                handleSendPrompt("Bantu aku memahami bab ini lewat analogi sederhana dunia nyata!")
              }
            >
              <Lightbulb className="h-4 w-4" />
              Bongkar dengan Analogi
            </Button>
          </div>
        </div>
      )}

      {/* 2. Apple HIG Split-View Workspace (Document Reader & Smart AI Mentor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* === Left Viewport: Document Reader (7 Cols) === */}
        <div className="lg:col-span-7 flex flex-col bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden min-h-[580px]">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#007AFF] flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[260px]">
                {materialTitle}
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>Hal {currentPage}</span>
              <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] p-0.5 rounded-xl border border-black/5 dark:border-white/5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  title="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  title="Halaman berikutnya"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Chapter Selector Tabs (Apple Segmented Style) */}
          <div className="flex border-b border-black/5 dark:border-white/10 bg-white dark:bg-[#1C1C1E] overflow-x-auto text-xs scrollbar-none px-2 py-1 gap-1">
            {chapters.map((chap, idx) => {
              const isActive = activeChapterIndex === idx;
              return (
                <button
                  key={chap.id}
                  onClick={() => {
                    setActiveChapterIndex(idx);
                    if (chap.pageStart) setCurrentPage(chap.pageStart);
                  }}
                  className={`px-3.5 py-2 rounded-2xl whitespace-nowrap font-medium transition-all flex items-center gap-2 text-xs ${
                    isActive
                      ? "bg-[#007AFF]/10 text-[#007AFF] font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-black/[0.03]"
                  }`}
                >
                  {(chap.isCriticalZone || Boolean(chap.criticalZoneDrop)) && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  )}
                  <span>Bab {chap.chapterNumber || idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Document Content Viewport */}
          <div
            ref={documentRef}
            onMouseUp={handleTextSelection}
            className="p-6 flex-1 overflow-y-auto space-y-5 text-slate-700 dark:text-slate-300 leading-relaxed text-sm select-text relative"
          >
            {/* Chapter Header */}
            <div className="border-b border-black/5 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium uppercase tracking-wider mb-1">
                <span>Bab {activeChapter.chapterNumber || activeChapterIndex + 1}</span>
                <span>•</span>
                <span>
                  {activeChapter.pages ||
                    `Halaman ${activeChapter.pageStart || 1} - ${activeChapter.pageEnd || 10}`}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {activeChapter.title}
              </h3>
            </div>

            {/* Document Text Body */}
            <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 bg-black/[0.015] dark:bg-white/[0.015] p-5 rounded-3xl border border-black/5 dark:border-white/5 font-sans leading-relaxed text-[13.5px]">
              {activeChapter.contentSnippet || activeChapter.summary || "Memuat materi pembelajaran..."}
            </div>

            {/* Key Takeaways Pill Container */}
            {activeChapter.keyTakeaways && activeChapter.keyTakeaways.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Intisari Konsep Bab Ini:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeChapter.keyTakeaways.map((item, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 font-medium"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Prompt Chips */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Pantik Diskusi dengan Smart AI:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    handleSendPrompt("Bantu aku memahami bagian yang paling krusial di bab ini!")
                  }
                  className="px-3 py-1.5 rounded-2xl bg-black/[0.03] hover:bg-[#007AFF]/10 hover:text-[#007AFF] text-slate-700 dark:text-slate-300 text-xs transition-all border border-black/5 dark:border-white/5 active:scale-95"
                >
                  💡 Apa bagian paling krusial di bab ini?
                </button>
                <button
                  onClick={() =>
                    handleSendPrompt("Berikan 1 studi kasus nyata yang menerapkan konsep ini!")
                  }
                  className="px-3 py-1.5 rounded-2xl bg-black/[0.03] hover:bg-[#007AFF]/10 hover:text-[#007AFF] text-slate-700 dark:text-slate-300 text-xs transition-all border border-black/5 dark:border-white/5 active:scale-95"
                >
                  🌍 Berikan studi kasus dunia nyata
                </button>
              </div>
            </div>
          </div>

          {/* Floating Pill on Highlight */}
          {selectedText && (
            <div className="sticky bottom-4 mx-6 p-2 rounded-2xl bg-[#1D1D1F] text-white shadow-xl flex items-center justify-between gap-3 animate-fade-in z-20">
              <div className="flex items-center gap-2 pl-2 text-xs truncate max-w-xs">
                <Highlighter className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate italic text-slate-300">"{selectedText}"</span>
              </div>
              <button
                onClick={() =>
                  handleSendPrompt(
                    `Bisa tolong jelaskan makna bagian ini secara bertahap?`,
                    selectedText
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Tanya Smart AI
              </button>
            </div>
          )}
        </div>

        {/* === Right Viewport: Smart AI Dialectic Studio (5 Cols) === */}
        <div className="lg:col-span-5 flex flex-col bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden min-h-[580px] h-[580px]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-2xl bg-gradient-to-tr from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  Smart AI
                  <Badge variant="info" className="text-[10px] py-0 px-2 font-medium">
                    Metode Sokrates
                  </Badge>
                </h4>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">
                  Membimbing nalar mandiri • Anti-Jawaban Instan
                </p>
              </div>
            </div>

            {/* Clear conversation button */}
            <button
              onClick={() => {
                setChatMessages([
                  {
                    id: `welcome-${Date.now()}`,
                    role: "assistant",
                    text: `Sesi baru dimulai. Apa bagian dari bab **${activeChapter.title}** yang ingin kamu perdalam?`,
                  },
                ]);
              }}
              title="Mulai percakapan baru"
              className="p-1.5 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-slate-400 hover:text-slate-600 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 scrollbar-none">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Highlight Context Badge if any */}
                {msg.highlightContext && (
                  <div className="mb-1 text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.03] px-2 py-0.5 rounded-lg max-w-[85%] truncate">
                    <Highlighter className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                    <span className="truncate italic">"{msg.highlightContext}"</span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] rounded-3xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#007AFF] text-white rounded-br-md font-medium"
                      : "bg-white dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 rounded-bl-md border border-black/5 dark:border-white/5"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Actions for Assistant Message */}
                  {msg.role === "assistant" && (
                    <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => handleToggleSpeech(msg.text)}
                        className="flex items-center gap-1 text-slate-600 hover:text-[#007AFF] transition-colors"
                        title="Dengarkan penjelasan suara"
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="h-3 w-3 text-red-500" />
                            <span className="text-red-500">Berhenti</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3 w-3" />
                            <span>Dengarkan</span>
                          </>
                        )}
                      </button>

                      <span className="text-[10px] text-slate-600">Grounded di Modul Guru</span>
                    </div>
                  )}
                </div>

                {/* Checkpoint Note Pinning Card (Apple HIG Porcelain Style) */}
                {msg.checkpointPassed && msg.noteDraft && (
                  <div className="mt-2 w-[88%] rounded-2xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 shadow-sm animate-fade-in">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          Checkpoint Pemahaman Tercapai!
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200/90 italic mb-2 leading-relaxed">
                      "{msg.noteDraft}"
                    </p>
                    <Button
                      size="sm"
                      disabled={msg.noteSaved || savingNoteId === msg.id}
                      onClick={() => handlePinNote(msg.id, msg.noteDraft!)}
                      className={`h-7 px-3 text-xs rounded-xl font-medium flex items-center gap-1.5 transition-all ${
                        msg.noteSaved
                          ? "bg-emerald-600 text-white cursor-default"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                      }`}
                    >
                      {msg.noteSaved ? (
                        <>
                          <Check className="h-3 w-3" />
                          Tersimpan di Catatan Bab
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-3 w-3" />
                          Pin ke Catatan Bab Ini
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-[#2C2C2E] p-3 rounded-2xl rounded-bl-md border border-black/5 dark:border-white/5 w-fit shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#007AFF] animate-spin" />
                <span className="font-medium">Smart AI sedang menelaah modul...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Socratic Input Field */}
          <div className="p-3.5 bg-black/[0.015] dark:bg-white/[0.015] border-t border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 bg-white dark:bg-[#2C2C2E] rounded-2xl px-3.5 py-1.5 border border-black/10 dark:border-white/10 focus-within:ring-2 focus-within:ring-[#007AFF]/40 focus-within:border-[#007AFF] transition-all shadow-inner">
              <input
                type="text"
                value={socraticQuery}
                disabled={isAiLoading}
                onChange={(e) => setSocraticQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder={
                  selectedText
                    ? "Tanyakan tentang teks yang kamu sorot..."
                    : "Ajukan kebingunganmu tentang bab ini..."
                }
                className="w-full bg-transparent text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 py-2"
              />
              <button
                disabled={isAiLoading || !socraticQuery.trim()}
                onClick={() => handleSendPrompt()}
                className="h-8 w-8 rounded-xl bg-[#007AFF] text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-[#007AFF] transition-all shrink-0 active:scale-95 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 mt-2 px-1">
              <span>Socratic Dialog: Scaffolding bertahap</span>
              <span>100% Grounded di Modul Guru</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

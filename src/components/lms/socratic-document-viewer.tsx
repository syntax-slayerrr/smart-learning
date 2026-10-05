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
  Download,
  ExternalLink,
  MessageSquare,
  Compass,
  CheckCircle2,
  FileDown,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Headphones,
  X,
  Bookmark,
  Share2,
  Mic,
  Network,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveOfflineNote } from "@/lib/offline-lms-cache";

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
  fileUrl?: string;
  fileName?: string;
  studentId?: string;
  initialPage?: number;
  initialPrompt?: string;
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
  citation?: {
    chapterNumber?: number;
    page?: number;
    label?: string;
  };
}

interface CitationPeekState {
  chapterNumber: number;
  page: number;
  title: string;
  snippet: string;
  takeaways: string[];
}

export function SocraticDocumentViewer({
  chapters: externalChapters,
  materialTitle = "Modul Praktis Subnetting IPv4 & VLSM Jaringan Komputer",
  materialId,
  fileUrl,
  fileName,
  studentId = "std-001",
  initialPage = 13,
  initialPrompt,
  className = "",
}: SocraticDocumentViewerProps) {
  const chapters =
    externalChapters && externalChapters.length > 0
      ? externalChapters
      : DEFAULT_CHAPTERS;

  // View Mode: 'studio' (Smart AI Chat) or 'reader' (Full Document Reader)
  const [viewMode, setViewMode] = useState<"studio" | "reader">(() => {
    return initialPrompt ? "studio" : "studio";
  });

  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(() => {
    const critIdx = chapters.findIndex(
      (c) => c.isCriticalZone || Boolean(c.criticalZoneDrop)
    );
    return critIdx >= 0 ? critIdx : 0;
  });

  const activeChapter = chapters[activeChapterIndex] || chapters[0] || DEFAULT_CHAPTERS[0];

  const [currentPage, setCurrentPage] = useState<number>(() => {
    return initialPage || activeChapter?.pageStart || 1;
  });

  const [socraticQuery, setSocraticQuery] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isAudioOverviewPlaying, setIsAudioOverviewPlaying] = useState<boolean>(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [selectionNoteSaved, setSelectionNoteSaved] = useState<boolean>(false);

  // Feature 1: Apple Slide-Up Sheet for Citation Peek & Pop
  const [activeCitationPeek, setActiveCitationPeek] = useState<CitationPeekState | null>(null);

  // Feature 4: Touch swipe gestures state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const documentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      text: `Halo Zaldy! Aku **Smart AI**, mentor belajarmu yang terhubung langsung dengan modul resmi dari dosen/guru.

Di sini aku membimbing nalar mandirimu secara bertahap lewat metode Sokrates. Kamu bisa bertanya konsep, menganalisis studi kasus, atau meminta analogi sederhana.

${
  activeChapter.isCriticalZone || activeChapter.criticalZoneDrop
    ? `⚠️ **Catatan Kelas Fisik:** Kamera AI mencatat materi **${activeChapter.title}** ini sempat memicu kebingungan (${activeChapter.confusionScore || activeChapter.criticalZoneDrop || 42}% atensi drop). Mau kita bedah logikanya bersama?`
    : `Materi aktif saat ini: **${activeChapter.title}**. Apa yang ingin kamu diskusikan?`
}`,
      citation: {
        chapterNumber: activeChapter.chapterNumber || activeChapterIndex + 1,
        page: activeChapter.pageStart || 13,
        label: `Bab ${activeChapter.chapterNumber || activeChapterIndex + 1}, Hal ${activeChapter.pageStart || 13}`,
      },
    },
  ]);

  // Auto-scroll inside message feed when new message arrives
  useEffect(() => {
    if (viewMode === "studio") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAiLoading, viewMode]);

  // When chapter changes, update chapter greeting
  useEffect(() => {
    const isCrit = activeChapter.isCriticalZone || Boolean(activeChapter.criticalZoneDrop);
    const dropScore = activeChapter.confusionScore || activeChapter.criticalZoneDrop || 42;

    const chapterGreeting: ChatMessage = {
      id: `greeting-${activeChapter.id}-${Date.now()}`,
      role: "assistant",
      text: isCrit
        ? `Mari kita bedah logika penting di **${activeChapter.title}**, terutama rumus kapasitas host **2ⁿ - 2**.

Mengapa angka 2 wajib selalu dikurangkan dari total kombinasi bit host, dan apa konsekuensinya jika sebuah host komputer diberi alamat biner yang semuanya bernilai 0 atau 1?`
        : `Halo Zaldy! Kamu sedang menelaah **${activeChapter.title}**. Konsep atau studi kasus apa yang ingin kamu bahas bersama Smart AI?`,
      citation: {
        chapterNumber: activeChapter.chapterNumber || activeChapterIndex + 1,
        page: activeChapter.pageStart || 1,
        label: `Bab ${activeChapter.chapterNumber || activeChapterIndex + 1}`,
      },
    };

    setChatMessages([chapterGreeting]);
  }, [activeChapterIndex]);

  // Feature 4: Touch swipe gesture handlers (Native App Feeling)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Minimum swipe distance 60px & predominantly horizontal
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0 && viewMode === "studio") {
        // Swipe Left: Beralih ke Reader Modul
        setViewMode("reader");
      } else if (deltaX > 0 && viewMode === "reader") {
        // Swipe Right: Beralih ke Smart AI Studio
        setViewMode("studio");
      }
    }
  };

  // Feature 1: Apple Slide-Up Sheet (Peek & Pop) on citation click
  const handleOpenCitationPeek = (chapNumber?: number, page?: number) => {
    const targetChap =
      chapters.find((c, i) => (c.chapterNumber || i + 1) === chapNumber) ||
      activeChapter;
    setActiveCitationPeek({
      chapterNumber: targetChap.chapterNumber || chapNumber || 1,
      page: page || targetChap.pageStart || 1,
      title: targetChap.title,
      snippet:
        targetChap.contentSnippet ||
        targetChap.summary ||
        "Kutipan materi resmi modul guru.",
      takeaways: targetChap.keyTakeaways || [],
    });
  };

  // Switch to reader at specific chapter & page
  const handleJumpToSource = (chapNumber?: number, page?: number) => {
    if (chapNumber) {
      const idx = chapters.findIndex(
        (c, i) => (c.chapterNumber || i + 1) === chapNumber
      );
      if (idx >= 0) setActiveChapterIndex(idx);
    }
    if (page) {
      setCurrentPage(page);
    }
    setViewMode("reader");
  };

  // Handle Text Selection inside Document View
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 3) {
      setSelectedText(selection.toString().trim());
      setSelectionNoteSaved(false);
    } else {
      setSelectedText("");
    }
  };

  // Feature 2: Pin selected quote directly to student notes
  const handlePinSelectedQuote = async () => {
    if (!selectedText.trim()) return;
    try {
      setSelectionNoteSaved(true);
      await saveOfflineNote({
        material_id: materialId || "",
        chapter_id: activeChapter.id,
        quote: `Kutipan Bab ${activeChapter.chapterNumber || activeChapterIndex + 1}`,
        my_note: selectedText,
      });

      // Also sync to backend API if online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        await fetch("/api/lms/student/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            materialId,
            topicId: activeChapter.id,
            noteContent: selectedText,
            socraticContext: {
              topicTitle: activeChapter.title,
              savedAt: new Date().toISOString(),
            },
          }),
        }).catch(() => null);
      }
    } catch (err) {
      console.warn("Gagal pin catatan seleksi:", err);
    }
  };

  // Feature 3: Audio Overview 1-Tap (NotebookLM Deep Dive Audio)
  const handleToggleAudioOverview = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isAudioOverviewPlaying) {
      window.speechSynthesis.cancel();
      setIsAudioOverviewPlaying(false);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const takeawaysText =
      activeChapter.keyTakeaways && activeChapter.keyTakeaways.length > 0
        ? `Intisari pembahasan mencakup: ${activeChapter.keyTakeaways.join(", ")}.`
        : "";

    const overviewScript = `Ringkasan Audio ${activeChapter.title}. ${activeChapter.contentSnippet?.slice(0, 320) || ""}. ${takeawaysText} Mari pahami konsep ini secara bertahap bersama Smart AI.`;

    const cleanText = overviewScript.replace(/[*_#`[\]]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsAudioOverviewPlaying(false);
    utterance.onerror = () => setIsAudioOverviewPlaying(false);

    setIsAudioOverviewPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  // Text-to-Speech function for individual AI responses
  const handleToggleSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (isAudioOverviewPlaying) {
      window.speechSynthesis.cancel();
      setIsAudioOverviewPlaying(false);
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

  // Keyboard stability: smooth scroll into view on mobile focus
  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  // Kirim pertanyaan ke Smart AI backend
  const handleSendPrompt = async (
    promptOverride?: string,
    highlightOverride?: string
  ) => {
    const textToSend = promptOverride || socraticQuery;
    const highlight =
      highlightOverride !== undefined ? highlightOverride : selectedText;

    if (!textToSend.trim() || isAiLoading) return;

    // Ensure we are in studio view mode
    setViewMode("studio");

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
          citation: {
            chapterNumber: activeChapter.chapterNumber || activeChapterIndex + 1,
            page: currentPage,
            label: `Bab ${activeChapter.chapterNumber || activeChapterIndex + 1}, Hal ${currentPage}`,
          },
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "Gagal menghubungi Smart AI");
      }
    } catch (err: any) {
      // Fallback socratic response jika offline / dev mode
      const fallbackReply = textToSend.toLowerCase().includes("analogi")
        ? `Bayangkan kamu punya sebidang tanah luas (**Network ID**: 192.168.1.0/24, total 256 m²). 

Jika dipotong rata (/26), tiap ruang dapat 64 m². Tapi lab komputer butuh 50 m², sedangkan pos satpam cuma butuh 4 m²! 
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
          citation: {
            chapterNumber: activeChapter.chapterNumber || activeChapterIndex + 1,
            page: currentPage,
            label: `Bab ${activeChapter.chapterNumber || activeChapterIndex + 1}`,
          },
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Auto-send prompt when coming from Concept Graph action
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendPrompt(initialPrompt.trim());
    }
  }, [initialPrompt]);

  // Simpan checkpoint pemahaman ke catatan siswa
  const handlePinNote = async (msgId: string, noteContent: string) => {
    setSavingNoteId(msgId);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await saveOfflineNote({
          material_id: materialId || "",
          chapter_id: activeChapter.id,
          quote: activeChapter.title,
          my_note: noteContent,
        });
        setChatMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, noteSaved: true } : m))
        );
        return;
      }

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
      } else {
        throw new Error("Respon server gagal");
      }
    } catch (err) {
      console.warn("Fallback menyimpan catatan ke cache lokal offline:", err);
      await saveOfflineNote({
        material_id: materialId || "",
        chapter_id: activeChapter.id,
        quote: activeChapter.title,
        my_note: noteContent,
      });
      setChatMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, noteSaved: true } : m))
      );
    } finally {
      setSavingNoteId(null);
    }
  };

  // Helper formatter for markdown text (bold, code, bullet points)
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          // Render bold and inline code cleanly
          const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);

          return (
            <p key={idx} className="leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong
                      key={pIdx}
                      className="font-semibold text-slate-900 dark:text-white"
                    >
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                if (part.startsWith("`") && part.endsWith("`")) {
                  return (
                    <code
                      key={pIdx}
                      className="font-mono text-[11px] bg-black/[0.05] dark:bg-white/[0.1] px-1.5 py-0.5 rounded text-[#007AFF] dark:text-blue-400 font-medium"
                    >
                      {part.slice(1, -1)}
                    </code>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex flex-col h-full sm:h-[720px] sm:max-h-[820px] bg-slate-50/40 sm:bg-white/95 dark:bg-[#1C1C1E] sm:backdrop-blur-2xl rounded-none sm:rounded-3xl border-0 sm:border border-slate-200/80 dark:border-white/10 shadow-none sm:shadow-sm overflow-hidden overscroll-contain relative ${className}`}
    >
      {/* ============================================================== */}
      {/* 1. TOP GROUND TRUTH SOURCE BAR (Always Anchored at Top)        */}
      {/* ============================================================== */}
      <div className="shrink-0 z-20 border-b border-black/[0.06] dark:border-white/10 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl px-3.5 sm:px-5 py-2.5 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Left: Source File Info & Verified Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#007AFF] flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/40">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {materialTitle}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Modul Guru
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[180px] sm:max-w-xs font-mono">
                  {fileName || "Modul_Resmi.pdf"}
                </span>
                <span>•</span>
                <span>{chapters.length} Bab</span>
              </div>
            </div>
          </div>

          {/* Right: Actions, Audio Overview & Native Segmented Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
            {/* Feature 3: Audio Overview 1-Tap Button */}
            <button
              onClick={handleToggleAudioOverview}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 shrink-0 ${
                isAudioOverviewPlaying
                  ? "bg-blue-500 text-white border-blue-400 shadow-sm animate-pulse"
                  : "bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] text-slate-700 dark:text-slate-200 border-black/5 dark:border-white/5"
              }`}
              title="Dengarkan intisari lisan bab ini (NotebookLM Deep Dive Audio)"
            >
              <Headphones className={`h-3.5 w-3.5 ${isAudioOverviewPlaying ? "text-white" : "text-[#007AFF]"}`} />
              <span className="text-xs">
                {isAudioOverviewPlaying ? "Hentikan Audio" : "Audio Bab"}
              </span>
            </button>

            {/* Download Original File Button */}
            {fileUrl ? (
              <a
                href={fileUrl}
                download={fileName || `${materialTitle}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xs:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] text-slate-700 dark:text-slate-200 text-xs font-semibold border border-black/5 dark:border-white/5 transition-all active:scale-95 shrink-0"
                title="Unduh berkas modul original yang diunggah guru"
              >
                <Download className="h-3.5 w-3.5 text-[#007AFF]" />
                <span className="text-xs">Unduh</span>
              </a>
            ) : (
              <button
                onClick={() =>
                  alert("Dokumen original tersinkronisasi dalam cache offline PWA.")
                }
                className="hidden xs:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 text-xs font-semibold border border-black/5 transition-all shrink-0"
              >
                <Download className="h-3.5 w-3.5 text-[#007AFF]" />
                <span className="text-xs">Unduh</span>
              </button>
            )}

            {/* Apple Segmented Switcher: Studio vs Reader */}
            <div className="inline-flex p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/5 dark:border-white/5">
              <button
                onClick={() => setViewMode("studio")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
                  viewMode === "studio"
                    ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Smart AI</span>
              </button>
              <button
                onClick={() => setViewMode("reader")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
                  viewMode === "reader"
                    ? "bg-white dark:bg-[#2C2C2E] text-[#007AFF] font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Baca Modul</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. BODY CONTENT (FULL-SCREEN STUDIO OR FULL-SCREEN READER)     */}
      {/* ============================================================== */}
      {viewMode === "studio" ? (
        /* ============================================================ */
        /* --- MODE 1: SMART AI SOCRATIC STUDIO (NOTEBOOKLM PARADIGM)   */
        /* ============================================================ */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Featured Spotlight Card (Ella Assistant Reference Style) */}
          {(activeChapter.isCriticalZone || Boolean(activeChapter.criticalZoneDrop)) && (
            <div className="shrink-0 mx-3 sm:mx-5 mt-2.5 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/70 dark:from-blue-950/20 dark:via-[#242426] dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800/40 shadow-2xs space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  Fokus Belajar Hari Ini
                </span>
                <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                  Bab {activeChapter.chapterNumber || activeChapterIndex + 1} • {activeChapter.confusionScore || 42}% Siswa Butuh Reviu
                </span>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  Misteri Rumus 2ⁿ - 2 & Efisiensi Alokasi VLSM
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  Monitoring AI mendeteksi banyak siswa bingung menentukan Network ID & Broadcast Address dalam alokasi subnet jaringan.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() =>
                    handleSendPrompt("Bantu aku memahami kenapa rumus host 2^n - 2 lewat analogi dunia nyata sederhana!")
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all"
                >
                  <Lightbulb className="h-3 w-3" />
                  Bongkar Analogi
                </button>
                <button
                  onClick={() => handleSendPrompt("Berikan 1 studi kasus teknis alokasi subnet /28 vs /27!")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Studi Kasus Lab
                </button>
              </div>
            </div>
          )}

          {/* Quick Learning Tools Grid (Ella Assistant "Alat Produktivitas" Style) */}
          <div className="shrink-0 mx-3 sm:mx-5 mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleToggleAudioOverview}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 active:scale-95 transition-all text-left group"
            >
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Audio Bab</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Intisari suara</p>
              </div>
            </button>

            <button
              onClick={() => handleSendPrompt("Tampilkan intisari poin kunci dan peta konsep bab ini!")}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 active:scale-95 transition-all text-left group"
            >
              <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Network className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Peta Konsep</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Bagan relasi</p>
              </div>
            </button>

            <button
              onClick={() => setViewMode("reader")}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-95 transition-all text-left group"
            >
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Modul Asli</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Baca PDF hal 13</p>
              </div>
            </button>

            <button
              onClick={() => handleSendPrompt("Uji pemahamanku dengan 1 kuis logika Sokrates tentang bab ini!")}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200/80 dark:border-white/10 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 active:scale-95 transition-all text-left group"
            >
              <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Target className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Uji Reflektif</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Kuis logika AI</p>
              </div>
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 scrollbar-none">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Highlight Context Badge if any */}
                {msg.highlightContext && (
                  <div className="mb-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.05] px-2 py-0.5 rounded-lg max-w-[85%] truncate">
                    <Highlighter className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                    <span className="truncate italic">"{msg.highlightContext}"</span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-3xl p-3.5 sm:p-4 text-xs sm:text-[13.5px] leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#007AFF] text-white rounded-br-md font-medium"
                      : "bg-white dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 rounded-bl-md border border-black/5 dark:border-white/5"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    renderFormattedText(msg.text)
                  ) : (
                    <div className="whitespace-pre-line">{msg.text}</div>
                  )}

                  {/* Grounded Citation & Actions for Assistant */}
                  {msg.role === "assistant" && (
                    <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2 text-[11px]">
                      {/* Feature 1: Apple Slide-Up Sheet Trigger (Peek & Pop) */}
                      {msg.citation && (
                        <button
                          onClick={() =>
                            handleOpenCitationPeek(
                              msg.citation?.chapterNumber,
                              msg.citation?.page
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 text-[#007AFF] dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40 font-semibold hover:bg-blue-100 transition-all active:scale-95"
                          title="Klik untuk intip cuplikan sumber resmi tanpa menutup chat"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>{msg.citation.label || "Lihat Sumber Modul"}</span>
                          <span className="text-[9px] bg-[#007AFF] text-white px-1.5 py-0.2 rounded-full font-bold">Intip</span>
                        </button>
                      )}

                      {/* Speech synthesis toggle */}
                      <button
                        onClick={() => handleToggleSpeech(msg.text)}
                        className="flex items-center gap-1 text-slate-500 hover:text-[#007AFF] transition-colors ml-auto"
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
                    </div>
                  )}
                </div>

                {/* Checkpoint Note Pinning Card */}
                {msg.checkpointPassed && msg.noteDraft && (
                  <div className="mt-2 w-[92%] sm:w-[85%] rounded-2xl border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 shadow-sm animate-fade-in">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                          Checkpoint Pemahaman Tercapai!
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-900 dark:text-emerald-200/90 italic mb-2 leading-relaxed">
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

            {/* AI Loading Indicator */}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#2C2C2E] p-3 rounded-2xl rounded-bl-md border border-black/5 dark:border-white/5 w-fit shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#007AFF] animate-spin" />
                <span className="font-medium">Smart AI sedang menelaah modul guru...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompt Chips (NotebookLM Style) */}
          <div className="shrink-0 px-3.5 sm:px-5 py-1.5 bg-black/[0.015] dark:bg-white/[0.015] border-t border-black/[0.04] dark:border-white/5 overflow-x-auto scrollbar-none flex items-center gap-1.5">
            <button
              onClick={() =>
                handleSendPrompt("Bantu aku memahami bagian yang paling krusial di bab ini!")
              }
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-black/5 dark:border-white/10 hover:border-[#007AFF]/40 whitespace-nowrap transition-all active:scale-95 shadow-2xs"
            >
              💡 Konsep Krusial
            </button>
            <button
              onClick={() =>
                handleSendPrompt("Bantu jelaskan bab ini lewat analogi sederhana dunia nyata!")
              }
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-black/5 dark:border-white/10 hover:border-[#007AFF]/40 whitespace-nowrap transition-all active:scale-95 shadow-2xs"
            >
              🌱 Analogi Nyata
            </button>
            <button
              onClick={() =>
                handleSendPrompt("Berikan 1 studi kasus penerapan teknis dari materi ini!")
              }
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-black/5 dark:border-white/10 hover:border-[#007AFF]/40 whitespace-nowrap transition-all active:scale-95 shadow-2xs"
            >
              🌍 Studi Kasus
            </button>
            <button
              onClick={() =>
                handleSendPrompt("Uji pemahamanku dengan 1 pertanyaan logika Sokrates!")
              }
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-black/5 dark:border-white/10 hover:border-[#007AFF]/40 whitespace-nowrap transition-all active:scale-95 shadow-2xs"
            >
              🎯 Uji Pemahamanku
            </button>
          </div>

          {/* Docked Sticky Bottom Input Bar (Ella Assistant Floating Dock Style) */}
          <div className="shrink-0 z-20 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#1C1C1E] dark:via-[#1C1C1E]/95 p-2.5 sm:p-3.5">
            <div className="flex items-center gap-2 bg-white dark:bg-[#2C2C2E] rounded-full px-4 py-1 border border-slate-200/90 dark:border-white/10 shadow-lg focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={socraticQuery}
                disabled={isAiLoading}
                onFocus={handleInputFocus}
                onChange={(e) => setSocraticQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder={
                  selectedText
                    ? "Tanyakan teks terpilih..."
                    : "Tanyakan apa saja seputar bab ini..."
                }
                className="w-full bg-transparent text-xs sm:text-[13px] text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 py-2 font-normal"
              />
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
                    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    const recognition = new SpeechRec();
                    recognition.lang = "id-ID";
                    recognition.onresult = (event: any) => {
                      const transcript = event.results[0][0].transcript;
                      if (transcript) {
                        setSocraticQuery(transcript);
                        handleSendPrompt(transcript);
                      }
                    };
                    recognition.start();
                  } else {
                    handleSendPrompt("Bantu jelaskan bab ini lewat analogi sederhana!");
                  }
                }}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-all shrink-0 active:scale-95"
                title="Bicara (Suara)"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                disabled={isAiLoading || !socraticQuery.trim()}
                onClick={() => handleSendPrompt()}
                className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all shrink-0 active:scale-95 shadow-sm"
                title="Kirim pesan"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Mobile Native Gesture Hint & Quick Nav */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 px-3">
              <span className="hidden sm:inline">Socratic Mentor: Membimbing nalar mandiri</span>
              <span className="sm:hidden text-slate-400 font-medium">← Geser jari untuk Modul Asli</span>
              <button
                onClick={() => setViewMode("reader")}
                className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium"
              >
                <span>Buka teks modul</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* --- MODE 2: FULL-SCREEN ORIGINAL DOCUMENT READER (CLEAN)    */
        /* ============================================================ */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Chapter Selector Tabs (Scrollable Apple Pills) */}
          <div className="shrink-0 flex border-b border-black/[0.06] dark:border-white/10 bg-slate-50/70 dark:bg-[#1C1C1E] overflow-x-auto text-xs scrollbar-none px-3 sm:px-4 py-2 gap-1.5">
            {chapters.map((chap, idx) => {
              const isActive = activeChapterIndex === idx;
              return (
                <button
                  key={chap.id}
                  onClick={() => {
                    setActiveChapterIndex(idx);
                    if (chap.pageStart) setCurrentPage(chap.pageStart);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-all flex items-center gap-1.5 text-xs ${
                    isActive
                      ? "bg-[#007AFF] text-white shadow-sm"
                      : "bg-white dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 hover:text-slate-900 border border-black/5 dark:border-white/5"
                  }`}
                >
                  {(chap.isCriticalZone || Boolean(chap.criticalZoneDrop)) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse shrink-0" />
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
            onTouchEnd={handleTextSelection}
            className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7 space-y-5 select-text relative"
          >
            {/* Chapter Header */}
            <div className="border-b border-black/[0.06] dark:border-white/10 pb-4">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1.5 font-bold text-[#007AFF]">
                  Bab {activeChapter.chapterNumber || activeChapterIndex + 1}
                </span>
                <span className="font-mono text-slate-400">
                  {activeChapter.pages ||
                    `Halaman ${activeChapter.pageStart || 1} - ${activeChapter.pageEnd || 10}`}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {activeChapter.title}
              </h2>
            </div>

            {/* Document Text Content Body */}
            <div className="whitespace-pre-line text-slate-800 dark:text-slate-200 bg-black/[0.015] dark:bg-white/[0.02] p-5 sm:p-6 rounded-3xl border border-black/[0.05] dark:border-white/5 font-sans leading-relaxed text-sm sm:text-[14.5px]">
              {activeChapter.contentSnippet ||
                activeChapter.summary ||
                "Memuat konten materi..."}
            </div>

            {/* Key Takeaways */}
            {activeChapter.keyTakeaways && activeChapter.keyTakeaways.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Intisari Modul:
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
          </div>

          {/* Feature 2: Floating Apple Contextual Menu saat Blok Teks */}
          {selectedText && (
            <div className="absolute bottom-16 inset-x-3 sm:inset-x-8 p-3 rounded-2xl bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 text-slate-900 dark:text-white shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 animate-in slide-in-from-bottom-3 z-30">
              <div className="flex items-center gap-2 pl-1 text-xs truncate max-w-sm">
                <Highlighter className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="truncate italic text-slate-600 dark:text-slate-300">
                  "{selectedText.slice(0, 48)}..."
                </span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                {/* Pin to Flashcard / Notes Button */}
                <button
                  onClick={handlePinSelectedQuote}
                  disabled={selectionNoteSaved}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    selectionNoteSaved
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] text-slate-700 dark:text-slate-200"
                  }`}
                  title="Simpan kutipan ini langsung ke catatan flashcard"
                >
                  {selectionNoteSaved ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-white" />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="h-3.5 w-3.5 text-[#007AFF]" />
                      <span>Catat</span>
                    </>
                  )}
                </button>

                {/* Ask Smart AI Button */}
                <button
                  onClick={() => {
                    setViewMode("studio");
                    handleSendPrompt(
                      `Bisa tolong jelaskan kutipan ini secara bertahap?`,
                      selectedText
                    );
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Tanya Smart AI</span>
                </button>
              </div>
            </div>
          )}

          {/* Reader Footer Controls & Pagination */}
          <div className="shrink-0 z-20 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("studio")}
                className="text-xs h-8 gap-1.5 rounded-xl border-black/10 dark:border-white/10"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
                <span>Diskusi di AI Studio</span>
              </Button>
            </div>

            {/* Pagination & Mobile Gesture hint */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
                Geser jari ke kanan untuk AI Studio
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                <span>Hal {currentPage}</span>
                <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.05] p-0.5 rounded-xl border border-black/5">
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
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. FEATURE 1: APPLE SLIDE-UP SHEET (PEEK & POP CITATION)       */}
      {/* ============================================================== */}
      {activeCitationPeek && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Dimmed backdrop */}
          <div
            onClick={() => setActiveCitationPeek(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-Up Bottom Sheet Card */}
          <div className="relative w-full sm:max-w-lg bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col gap-3.5 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-hidden">
            {/* iOS Pull Handle Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto -mt-1 shrink-0" />

            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#007AFF] flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/40">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#007AFF] uppercase tracking-wider">
                      Rujukan Resmi Modul Guru
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono">
                      Hal {activeCitationPeek.page}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {activeCitationPeek.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveCitationPeek(null)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quotation Body */}
            <div className="overflow-y-auto max-h-[30vh] sm:max-h-[36vh] space-y-3 pr-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#2C2C2E]/60 p-4 rounded-2xl border border-black/5 dark:border-white/5 font-serif italic">
              "{activeCitationPeek.snippet}"
            </div>

            {/* Key takeaways */}
            {activeCitationPeek.takeaways && activeCitationPeek.takeaways.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Intisari Bab:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeCitationPeek.takeaways.map((takeaway, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                    >
                      ✓ {takeaway}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/10 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCitationPeek(null)}
                className="flex-1 rounded-xl text-xs h-9"
              >
                Tutup Intipan
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleJumpToSource(
                    activeCitationPeek.chapterNumber,
                    activeCitationPeek.page
                  );
                  setActiveCitationPeek(null);
                }}
                className="flex-1 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs h-9 gap-1.5 font-semibold"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Buka di Reader</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileText,
  Lightbulb,
  Video,
  Send,
} from "lucide-react";

export interface DocumentChapter {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  isCriticalZone: boolean;
  confusionScore?: number; // e.g. 42%
  detectedTimestamp?: string;
  contentSnippet: string;
}

const SAMPLE_CHAPTERS: DocumentChapter[] = [
  {
    id: "chap-1",
    title: "Bab 1: Pengantar Arsitektur Jaringan & Model OSI",
    pageStart: 1,
    pageEnd: 12,
    isCriticalZone: false,
    contentSnippet: `Jaringan komputer adalah sistem yang menghubungkan dua atau lebih perangkat komputasi untuk bertukar data dan berbagi sumber daya. Model referensi OSI (Open Systems Interconnection) membagi komunikasi jaringan menjadi 7 lapisan terstruktur: Physical, Data Link, Network, Transport, Session, Presentation, dan Application. Setiap layer memiliki tanggung jawab enkapsulasi data tersendiri.`,
  },
  {
    id: "chap-2",
    title: "Bab 2: Subnetting, Notasi CIDR, dan Alokasi VLSM",
    pageStart: 13,
    pageEnd: 28,
    isCriticalZone: true,
    confusionScore: 42,
    detectedTimestamp: "Tadi Siang, Pukul 10:24 WIB",
    contentSnippet: `Pengalamatan IPv4 menggunakan 32-bit yang dipisahkan menjadi empat oktet. Subnetting adalah teknik membagi satu jaringan fisik besar menjadi beberapa sub-jaringan logis yang lebih kecil. 

Notasi CIDR (/24, /27, /28) menentukan berapa bit yang dipinjam dari host ID untuk network ID.
Dalam alokasi VLSM (Variable Length Subnet Masking), kita mengurutkan kebutuhan host dari yang terbesar ke yang terkecil guna meminimalkan pemborosan alamat IP. 

Rumus jumlah host yang valid: 2^n - 2 (di mana n adalah sisa bit host). Dua alamat selalu dialokasikan khusus: Network ID (semua bit host 0) dan Broadcast Address (semua bit host 1).`,
  },
  {
    id: "chap-3",
    title: "Bab 3: Dynamic Routing Protocols (RIP & OSPF)",
    pageStart: 29,
    pageEnd: 45,
    isCriticalZone: false,
    contentSnippet: `Routing dinamis memungkinkan router secara otomatis bertukar informasi topologi dan memperbarui tabel routing ketika terjadi perubahan tautan fisik. 

Routing Information Protocol (RIP) berbasis Distance Vector dengan batas maksimal 15 hop, cocok untuk jaringan kecil. 
Open Shortest Path First (OSPF) berbasis Link-State Protocol yang menggunakan algoritma Dijkstra, memiliki konvergensi sangat cepat dan mendukung hierarki multi-area (Area 0 Backbone).`,
  },
];

export interface SocraticDocumentViewerProps {
  chapters?: DocumentChapter[];
  materialTitle?: string;
  initialPage?: number;
  className?: string;
}

export function SocraticDocumentViewer({
  chapters: externalChapters,
  materialTitle,
  initialPage = 13,
  className,
}: SocraticDocumentViewerProps) {
  const chapters = externalChapters && externalChapters.length > 0 ? externalChapters : SAMPLE_CHAPTERS;
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(() => {
    const critIdx = chapters.findIndex((c) => c.isCriticalZone);
    return critIdx >= 0 ? critIdx : 0;
  });
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [socraticQuery, setSocraticQuery] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "assistant" | "user"; text: string; isAnalogy?: boolean }>
  >([
    {
      role: "assistant",
      text: "Halo Zaldy! Berdasarkan rekaman atensi kelas fisik tadi siang, materi Subnetting VLSM ini adalah materi yang paling banyak memicu kebingungan (42% atensi drop di menit ke-25). Aku siap membantumu dengan analogi bertahap!",
      isAnalogy: true,
    },
  ]);

  const activeChapter = chapters[activeChapterIndex] || chapters[0];

  const handleSendPrompt = (promptText?: string) => {
    const textToSend = promptText || socraticQuery;
    if (!textToSend.trim()) return;

    const newMessages = [
      ...chatMessages,
      { role: "user" as const, text: textToSend },
    ];
    setChatMessages(newMessages);
    setSocraticQuery("");

    setTimeout(() => {
      let aiReply = "";
      if (textToSend.toLowerCase().includes("analogi") || textToSend.toLowerCase().includes("kavling")) {
        aiReply = `Bayangkan kamu punya sebidang tanah luas (Network ID: 192.168.1.0/24, total 256 meter persegi). 
        
Kalau pakai subnetting konvensional (/26), tanah dipotong rata jadi 4 kavling masing-masing 64 meter. Tapi lab komputer butuh 50 meter, sementara ruang guru cuma butuh 10 meter! Kavling ruang guru jadi mubazir 50 meter.
        
Dengan VLSM, kamu potong fleksibel: kasih kavling /26 (64 meter) untuk Lab, dan cukup potong kavling /28 (16 meter) untuk ruang guru. Tidak ada tanah yang terbuang sia-sia!`;
      } else {
        aiReply = `Mari kita selesaikan secara bertahap. Coba lihat rumus 2^n - 2. Mengapa angka 2 harus selalu dikurangi di akhir? Siapa dua pihak yang memegang hak istimewa di setiap blok jaringan?`;
      }

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: aiReply },
      ]);
    }, 700);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Closed-Loop Telemetry Notification Banner if on Critical Zone */}
      {activeChapter.isCriticalZone && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/70 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm mt-0.5">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900 tracking-tight">
                    Closed-Loop Telemetry: Zona Kritis Kelas Terdeteksi
                  </span>
                  <Badge variant="warning" className="text-[10px] py-0 px-2 font-mono">
                    {activeChapter.confusionScore}% Kebingungan
                  </Badge>
                </div>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  Pada sesi kelas fisik <strong>{activeChapter.detectedTimestamp}</strong>, kamera AI mencatat 42% siswa mengalami penurunan atensi & kebingungan massal saat guru membahas bab ini.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white shrink-0 self-start sm:self-auto gap-1.5 shadow-sm"
              onClick={() => handleSendPrompt("Tolong jelaskan konsep bab ini pakai analogi tanah kavling!")}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Bongkar dengan Analogi Visual
            </Button>
          </div>
        </div>
      )}

      {/* Reader & Socratic Assistant Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Document Reader Viewport */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[460px]">
          {/* Document Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 truncate max-w-[220px] sm:max-w-xs">
                Modul_Jaringan_Komputer_SMK.pdf
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>Hal {currentPage} / 45</span>
              <div className="flex items-center gap-0.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={currentPage >= 45}
                  onClick={() => setCurrentPage((p) => Math.min(45, p + 1))}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Chapter Selector Tabs */}
          <div className="flex border-b border-slate-100 bg-white overflow-x-auto text-xs scrollbar-none">
            {SAMPLE_CHAPTERS.map((chap, idx) => (
              <button
                key={chap.id}
                onClick={() => {
                  setActiveChapterIndex(idx);
                  setCurrentPage(chap.pageStart);
                }}
                className={`px-4 py-2.5 whitespace-nowrap font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeChapterIndex === idx
                    ? "border-blue-600 text-blue-600 bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {chap.isCriticalZone && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
                {chap.title.split(":")[0]}
              </button>
            ))}
          </div>

          {/* Document Content View */}
          <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4 text-slate-700 leading-relaxed font-sans text-xs sm:text-sm">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {activeChapter.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rentang Halaman Dokumen: {activeChapter.pageStart} - {activeChapter.pageEnd}
              </p>
            </div>

            <div className="whitespace-pre-line text-slate-700 bg-slate-50/60 p-4 rounded-2xl border border-slate-100 font-sans">
              {activeChapter.contentSnippet}
            </div>

            {/* In-text interactive prompt chips */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                Eksplorasi Konsep Cepat:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSendPrompt("Jelaskan kenapa /24 bisa punya 254 host valid?")}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs transition-colors border border-slate-200/60"
                >
                  💡 Kenapa /24 = 254 host?
                </button>
                <button
                  onClick={() => handleSendPrompt("Apa akibatnya jika default gateway salah ketik satu digit?")}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs transition-colors border border-slate-200/60"
                >
                  ⚠️ Akibat gateway salah konfigurasi?
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Socratic AI Study Companion Drawer */}
        <div className="lg:col-span-5 flex flex-col bg-slate-50/80 rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[460px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-white/80">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Socratic AI Tutor
                </h4>
                <p className="text-[10px] text-slate-500">
                  Membimbing logika berpikir mandiri (Anti-Jawaban Instan)
                </p>
              </div>
            </div>
            <Badge variant="default" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
              Scaffold Mode
            </Badge>
          </div>

          {/* Messages feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                      : "bg-white text-slate-800 rounded-bl-none border border-slate-200/80 shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Socratic Input Box */}
          <div className="p-3 bg-white border-t border-slate-200/80">
            <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-1.5 border border-slate-200/70 focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white transition-all">
              <input
                type="text"
                value={socraticQuery}
                onChange={(e) => setSocraticQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendPrompt();
                }}
                placeholder="Tanyakan kebingunganmu pada bab ini..."
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 py-1.5"
              />
              <button
                onClick={() => handleSendPrompt()}
                className="h-7 w-7 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-[10px] text-slate-600 mt-1.5 block text-center">
              Smart AI menuntun pemahamanmu, bukan memberikan jalan pintas.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

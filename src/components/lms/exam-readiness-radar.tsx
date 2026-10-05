"use client";

import React, { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Zap,
} from "lucide-react";

export interface CompetencyAxis {
  label: string;
  score: number; // 0-100
  target: number; // benchmark passing grade, e.g. 75
  category: string;
  isWeakSpot: boolean;
  recommendation: string;
}

const DEFAULT_AXES: CompetencyAxis[] = [
  {
    label: "Dasar Pengalamatan IP",
    score: 88,
    target: 75,
    category: "Teori",
    isWeakSpot: false,
    recommendation: "Pemahaman sangat baik. Pertahankan untuk ujian.",
  },
  {
    label: "Subnetting VLSM",
    score: 42,
    target: 75,
    category: "Kalkulasi",
    isWeakSpot: true,
    recommendation: "Sering keliru saat menghitung bit pinjaman & broadcast ID. Latih rumus 2^n - 2.",
  },
  {
    label: "Protokol Routing (RIP/OSPF)",
    score: 65,
    target: 75,
    category: "Konfigurasi",
    isWeakSpot: true,
    recommendation: "Pahami perbedaan Distance Vector vs Link State sebelum ujian semester.",
  },
  {
    label: "Topologi & Default Gateway",
    score: 92,
    target: 75,
    category: "Arsitektur",
    isWeakSpot: false,
    recommendation: "Sempurna. Mampu mendesain alur gateway dengan presisi.",
  },
  {
    label: "Keamanan Port & Troubleshooting",
    score: 74,
    target: 75,
    category: "Analisis",
    isWeakSpot: false,
    recommendation: "Cukup baik. Tingkatkan pemahaman status port listening & firewall.",
  },
];

export interface ExamReadinessRadarProps {
  axes?: CompetencyAxis[];
  onStartFlashcardDrill?: (category: string) => void;
  className?: string;
}

export function ExamReadinessRadar({
  axes: externalAxes,
  onStartFlashcardDrill,
  className,
}: ExamReadinessRadarProps) {
  const axes = useMemo(
    () => (externalAxes && externalAxes.length > 0 ? externalAxes : DEFAULT_AXES),
    [externalAxes]
  );
  const [activeDrillModal, setActiveDrillModal] = useState<boolean>(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number>(0);
  const [revealedAnswer, setRevealedAnswer] = useState<boolean>(false);
  const [studentNotes, setStudentNotes] = useState<any[]>([]);

  // Fetch real pinned notes from student_study_notes
  React.useEffect(() => {
    async function loadNotes() {
      try {
        const res = await fetch("/api/lms/student/notes?studentId=std-001");
        if (res.ok) {
          const data = await res.json();
          if (data.notes && data.notes.length > 0) {
            setStudentNotes(data.notes);
          }
        }
      } catch (err) {
        // Silent fallback
      }
    }
    loadNotes();
  }, []);

  // Flashcards for weak-spot remediation + dynamically converted pinned notes
  const flashcards = useMemo(() => {
    const defaultDeck = [
      {
        q: "Berapa jumlah host valid yang dapat digunakan pada subnet dengan prefix /28?",
        a: "Prefix /28 menyisakan 32 - 28 = 4 bit host. Rumus: 2^4 - 2 = 16 - 2 = 14 host yang dapat dipakai (1 untuk Network ID, 1 untuk Broadcast).",
        topic: "Subnetting VLSM",
        source: "Remediasi Zona Kritis",
      },
      {
        q: "Mengapa OSPF disebut algoritma Link-State dan lebih cepat konvergen dibanding RIP?",
        a: "OSPF menggunakan algoritma Dijkstra (Shortest Path First) dan menyebarkan Link-State Advertisements (LSA) langsung saat ada perubahan, sedangkan RIP mengirim seluruh tabel per 30 detik (hop count max 15).",
        topic: "Protokol Routing",
        source: "Konfigurasi Jaringan",
      },
    ];

    if (studentNotes.length > 0) {
      const generatedFromNotes = studentNotes.map((note) => ({
        q: `Berdasarkan intisari catatan yang kamu simpan: "${note.note_content}" — Mengapa pemahaman konsep ini penting dalam desain sistem?`,
        a: `Catatan ini menandai checkpoint pemahaman mandiri yang kamu capai saat berdiskusi dengan Smart AI. Ingat kembali logika dasarnya saat ujian.`,
        topic: note.socratic_context?.topicTitle || "Catatan Bab",
        source: "📌 Pinned Smart AI Note",
      }));
      return [...generatedFromNotes, ...defaultDeck];
    }

    return defaultDeck;
  }, [studentNotes]);

  // Calculate Overall Readiness
  const averageScore = Math.round(
    axes.reduce((sum, item) => sum + item.score, 0) / axes.length
  );

  const weakSpots = axes.filter((a) => a.isWeakSpot);

  // Radar geometry calculations (Pentagon)
  const size = 300;
  const center = size / 2;
  const radius = 105;
  const angleStep = (Math.PI * 2) / axes.length;

  const getCoordinates = (value: number, index: number) => {
    const r = (value / 100) * radius;
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Polygon points string for actual score
  const scorePolygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(axis.score, i);
      return `${x},${y}`;
    })
    .join(" ");

  // Target benchmark polygon points (75%)
  const benchmarkPolygonPoints = axes
    .map((_, i) => {
      const { x, y } = getCoordinates(75, i);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Banner: Status Kesiapan */}
      <GlassCard className="p-4 sm:p-5 border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <BrainCircuit className="h-7 w-7" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Radar Kesiapan Ujian & Titik Lemah
                </h3>
                <Badge
                  variant={averageScore >= 75 ? "success" : "warning"}
                  className="text-[11px] font-semibold"
                >
                  {averageScore >= 75 ? "Siap Ujian" : "Perlu Remediasi"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Model AI mengevaluasi pemahaman materi modul & riwayat respons kuis Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50/80 px-4 py-2 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
            <div>
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
                Indeks Kesiapan
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {averageScore}%
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
                Target Lulus
              </span>
              <span className="text-sm font-bold text-slate-600 font-mono">
                75% KKM
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Radar Graphic & Weak-Spot Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radar Chart SVG View */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-4 shadow-sm relative min-h-[340px]">
          <div className="absolute top-3 left-4 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Target className="h-4 w-4 text-indigo-600" />
            Poligon Kompetensi Siswa
          </div>

          {/* SVG Radar */}
          <svg width={size} height={size} className="overflow-visible select-none mt-4">
            {/* Concentric Grid Rings (25%, 50%, 75%, 100%) */}
            {[25, 50, 75, 100].map((ring) => {
              const r = (ring / 100) * radius;
              const points = axes
                .map((_, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  return `${center + r * Math.cos(angle)},${
                    center + r * Math.sin(angle)
                  }`;
                })
                .join(" ");
              return (
                <polygon
                  key={ring}
                  points={points}
                  fill="none"
                  stroke={ring === 75 ? "#f59e0b" : "#e2e8f0"}
                  strokeWidth={ring === 75 ? 1.5 : 1}
                  strokeDasharray={ring === 75 ? "3 3" : undefined}
                />
              );
            })}

            {/* Axis spokes from center */}
            {axes.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const x2 = center + radius * Math.cos(angle);
              const y2 = center + radius * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={x2}
                  y2={y2}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
              );
            })}

            {/* Benchmark Passing Area (75% outline) */}
            <polygon
              points={benchmarkPolygonPoints}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Student Current Performance Area */}
            <polygon
              points={scorePolygonPoints}
              fill="rgba(59, 130, 246, 0.22)"
              stroke="#3b82f6"
              strokeWidth="2.5"
              className="drop-shadow-sm transition-all duration-500"
            />

            {/* Vertex Nodes & Score badges */}
            {axes.map((axis, i) => {
              const { x, y } = getCoordinates(axis.score, i);
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={axis.isWeakSpot ? "5" : "4"}
                    fill={axis.isWeakSpot ? "#ef4444" : "#2563eb"}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              );
            })}

            {/* Labels on Outer Rim */}
            {axes.map((axis, i) => {
              const labelRadius = radius + 22;
              const angle = i * angleStep - Math.PI / 2;
              const lx = center + labelRadius * Math.cos(angle);
              const ly = center + labelRadius * Math.sin(angle);
              return (
                <text
                  key={i}
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fontWeight={axis.isWeakSpot ? "700" : "600"}
                  fill={axis.isWeakSpot ? "#dc2626" : "#475569"}
                  className="font-sans"
                >
                  {axis.label.split(" ")[0]} ({axis.score}%)
                </text>
              );
            })}
          </svg>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Capaian Siswa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-500" />
              Target KKM (75%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              Titik Lemah
            </span>
          </div>
        </div>

        {/* Actionable Weak-Spot Diagnostic Cards */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Diagnosis Titik Lemah ({weakSpots.length} Topik Kritis)
            </h4>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
              onClick={() => setActiveDrillModal(true)}
            >
              <Zap className="h-3 w-3" />
              Latih Kilat Flashcard AI
            </Button>
          </div>

          <div className="space-y-2.5">
            {axes.map((axis, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all ${
                  axis.isWeakSpot
                    ? "bg-red-50/60 border-red-200/80 shadow-sm"
                    : "bg-white/80 border-slate-200/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {axis.label}
                      </span>
                      {axis.isWeakSpot ? (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                          Perlu Penguatan
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px] py-0 px-1.5">
                          Aman
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                      {axis.recommendation}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-mono font-bold ${
                        axis.isWeakSpot ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {axis.score}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">/ 100</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive AI Flashcard Drill Modal */}
      {activeDrillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Latihan Kilat Titik Lemah AI
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span>Kartu {currentFlashcardIndex + 1} dari {flashcards.length} • {flashcards[currentFlashcardIndex].topic}</span>
                    {flashcards[currentFlashcardIndex].source && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                        {flashcards[currentFlashcardIndex].source}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveDrillModal(false);
                  setRevealedAnswer(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium"
              >
                ✕
              </button>
            </div>

            {/* Flashcard Content */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 min-h-[140px] flex flex-col justify-center text-center">
              <span className="text-[11px] font-mono uppercase text-indigo-600 font-semibold mb-1">
                Pertanyaan Uji Pemahaman:
              </span>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                {flashcards[currentFlashcardIndex].q}
              </p>

              {revealedAnswer && (
                <div className="mt-4 pt-3 border-t border-slate-200 text-left bg-emerald-50/80 p-3 rounded-xl border-emerald-100 animate-fade-in">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Penjelasan Kunci AI:
                  </span>
                  <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                    {flashcards[currentFlashcardIndex].a}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {!revealedAnswer ? (
                <Button
                  variant="primary"
                  className="w-full justify-center text-xs h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setRevealedAnswer(true)}
                >
                  Lihat Jawaban & Analogi Konsep
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="w-full justify-center text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    if (currentFlashcardIndex < flashcards.length - 1) {
                      setCurrentFlashcardIndex((prev) => prev + 1);
                      setRevealedAnswer(false);
                    } else {
                      setActiveDrillModal(false);
                      setRevealedAnswer(false);
                      setCurrentFlashcardIndex(0);
                    }
                  }}
                >
                  {currentFlashcardIndex < flashcards.length - 1
                    ? "Lanjut Kartu Berikutnya"
                    : "Selesai Latihan & Perbarui Skor"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import {
  Activity,
  BrainCircuit,
  Users,
  Moon,
  CheckCircle2,
  Radio,
  X,
  Printer,
  Volume2,
  VolumeX,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DetectedSubject, ScheduleContext } from "./types";
import { AiAttendanceDraftView } from "./AiAttendanceDraftView";
import { ScheduleContextBar } from "./ScheduleContextBar";
import { SCHOOL_NAME } from "@/lib/constants";

// Synthesizer Audio Chime Halus saat Siswa Mengangkat Tangan (Apple-style gentle chime)
function playHandRaiseChime() {
  try {
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    // Dual pleasant notes (D5 to A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // blocked by browser audio policy or unsupported
  }
}

interface TelemetryPanelProps {
  rightTab: "digital_twin" | "analytics" | "attendance";
  setRightTab: (tab: "digital_twin" | "analytics" | "attendance") => void;
  sessionId?: string;
  focusIndex: number;
  totalDetected: number;
  counts: {
    attentive: number;
    writing: number;
    hand_raised: number;
    using_phone: number;
    sleep: number;
  };
  subjects: DetectedSubject[];
  selectedSubject: DetectedSubject | null;
  setSelectedSubject: (subj: DetectedSubject | null) => void;
  getStatusBadge: (act: DetectedSubject["activity"]) => {
    label: string;
    bg: string;
    dot: string;
  };
  history: {
    time: string;
    attentive: number;
    writing: number;
    phone: number;
    sleeping: number;
  }[];
  hermesNudge: string | null;
  isNudgeLoading: boolean;
  scheduleContext?: ScheduleContext | null;
  isScheduleLoading?: boolean;
  classes?: { id: string; name: string }[];
  selectedClassId?: string | null;
  onSelectClass?: (classId: string) => void;
}

export function TelemetryPanel({
  rightTab,
  setRightTab,
  sessionId,
  focusIndex,
  totalDetected,
  counts,
  subjects,
  selectedSubject,
  setSelectedSubject,
  getStatusBadge,
  history,
  hermesNudge,
  isNudgeLoading,
  scheduleContext,
  isScheduleLoading,
  classes = [],
  selectedClassId,
  onSelectClass,
}: TelemetryPanelProps) {
  const [filterMode, setFilterMode] = React.useState<"all" | "hand_raised" | "attention">("all");
  const [showSummaryModal, setShowSummaryModal] = React.useState<boolean>(false);
  const [chimeEnabled, setChimeEnabled] = React.useState<boolean>(true);
  const [awardedMap, setAwardedMap] = React.useState<Record<string, boolean>>({});
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);

  const handleAwardStudent = async (st: DetectedSubject, e: React.MouseEvent) => {
    e.stopPropagation();
    const idKey = st.student_id || st.id;
    setAwardedMap((prev) => ({ ...prev, [idKey]: true }));
    try {
      await fetch("/api/ai/copilot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "award_points",
          targetId: st.student_id || st.id,
          metadata: {
            points: 10,
            studentName: st.student_name || st.label,
            reason: `Apresiasi keaktifan langsung dari kamera monitor: ${st.action_text || "Fokus Menyimak"}`,
          },
        }),
      });
    } catch (err) {
      console.warn("[Award Student Telemetry Failed]:", err);
    }
  };

  // Debounce Audio Chime saat jumlah siswa yang angkat tangan bertambah
  const lastHandRaisedRef = React.useRef(0);
  const lastChimeTimeRef = React.useRef(0);

  React.useEffect(() => {
    const now = Date.now();
    if (
      chimeEnabled &&
      counts.hand_raised > lastHandRaisedRef.current &&
      now - lastChimeTimeRef.current > 7000
    ) {
      playHandRaiseChime();
      lastChimeTimeRef.current = now;
    }
    lastHandRaisedRef.current = counts.hand_raised;
  }, [counts.hand_raised, chimeEnabled]);

  const filteredSubjects = subjects.filter((st) => {
    if (filterMode === "hand_raised") return Boolean(st.hand_raised);
    if (filterMode === "attention") {
      return (
        st.activity === "sleep" ||
        st.activity === "using_phone" ||
        (typeof st.attention_score === "number" && st.attention_score < 70)
      );
    }
    return true;
  });

  return (
    <div className="lg:col-span-5 xl:col-span-4 p-3 sm:p-4 space-y-2.5 bg-card flex flex-col justify-between relative">
      <div className="space-y-2.5">
        {/* Header & Segmented Mode Switcher */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-xs font-bold text-foreground tracking-tight truncate">
                Dinamika Kelas
              </h3>
            </div>

            {/* Audio Chime Bel Tanya Toggle */}
            <button
              type="button"
              onClick={() => setChimeEnabled((prev) => !prev)}
              title={
                chimeEnabled
                  ? "Bel Tanya: Aktif (bunyikan chime saat siswa angkat tangan). Klik untuk senyap."
                  : "Bel Tanya: Senyap. Klik untuk aktifkan bel."
              }
              className={`p-1 rounded-md border text-[10px] font-mono inline-flex items-center gap-1 transition-all ${
                chimeEnabled
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-muted/40 border-border text-muted-foreground opacity-60 hover:opacity-100"
              }`}
            >
              {chimeEnabled ? (
                <Volume2 className="h-3 w-3 stroke-[2]" />
              ) : (
                <VolumeX className="h-3 w-3 stroke-[2]" />
              )}
              <span className="hidden sm:inline text-[9px] font-sans">
                {chimeEnabled ? "Bel On" : "Senyap"}
              </span>
            </button>
          </div>

          <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5 shadow-inner">
            <button
              onClick={() => setRightTab("digital_twin")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                rightTab === "digital_twin"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Siswa
            </button>
            <button
              onClick={() => setRightTab("analytics")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                rightTab === "analytics"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tren
            </button>
            <button
              onClick={() => setRightTab("attendance")}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-all flex items-center gap-1 ${
                rightTab === "attendance"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Presensi
            </button>
          </div>
        </div>

        {/* Konteks Jam Pelajaran Aktif (1 Baris Kompak dengan Class Selector & Rangkum) */}
        <ScheduleContextBar
          schedule={scheduleContext ?? null}
          isLoading={Boolean(isScheduleLoading)}
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectClass={onSelectClass}
          onOpenSessionSummary={() => setShowSummaryModal(true)}
        />

        {/* Telemetry Strip Kompak 4-Kolom (Kondusif, Menyimak, Mencatat, Perhatian) */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-lg border border-border/70 bg-muted/20">
          <div className="text-center py-1 px-0.5">
            <span className="text-[10px] text-muted-foreground block truncate">Kondusif</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {focusIndex}%
            </span>
          </div>
          <div className="text-center py-1 px-0.5 border-l border-border/50">
            <span className="text-[10px] text-muted-foreground block truncate">Fokus</span>
            <span className="text-xs font-bold font-mono text-foreground tabular-nums">
              {counts.attentive}
            </span>
          </div>
          <div className="text-center py-1 px-0.5 border-l border-border/50">
            <span className="text-[10px] text-muted-foreground block truncate">Catat</span>
            <span className="text-xs font-bold font-mono text-primary tabular-nums">
              {counts.writing}
            </span>
          </div>
          <div className="text-center py-1 px-0.5 border-l border-border/50">
            <span className="text-[10px] text-muted-foreground block truncate">Perhatian</span>
            <span
              className={`text-xs font-bold font-mono tabular-nums ${
                counts.sleep + counts.using_phone > 0 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {counts.sleep + counts.using_phone}
            </span>
          </div>
        </div>

        {/* TAB RENDERING */}
        {rightTab === "attendance" ? (
          <AiAttendanceDraftView sessionId={sessionId} />
        ) : rightTab === "digital_twin" ? (
          <div className="space-y-1.5">
            {/* Header List Siswa & Quick Filter Chips */}
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-0.5">
              <span className="uppercase tracking-wider">Daftar Siswa</span>
              <span className="tabular-nums font-semibold text-foreground">
                {filteredSubjects.length} / {totalDetected} Siswa
              </span>
            </div>

            {/* Quick Filter Chips (Semua • Bertanya • Perhatian) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer min-h-[26px] ${
                  filterMode === "all"
                    ? "bg-foreground text-background font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({subjects.length})
              </button>
              {counts.hand_raised > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode("hand_raised")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer min-h-[26px] flex items-center gap-1 ${
                    filterMode === "hand_raised"
                      ? "bg-amber-600 text-white font-semibold"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                  }`}
                >
                  <span>✋ Bertanya ({counts.hand_raised})</span>
                </button>
              )}
              {counts.sleep + counts.using_phone > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode("attention")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer min-h-[26px] flex items-center gap-1 ${
                    filterMode === "attention"
                      ? "bg-destructive text-white font-semibold"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  }`}
                >
                  <span>⚠️ Perhatian ({counts.sleep + counts.using_phone})</span>
                </button>
              )}
            </div>

            {filteredSubjects.length > 0 ? (
              <div className="space-y-1 max-h-60 sm:max-h-68 overflow-y-auto pr-0.5">
                {filteredSubjects.map((st) => {
                  const badge = getStatusBadge(st.activity);
                  const isAlert = st.activity === "sleep" || st.activity === "using_phone";
                  const isSelected = selectedSubject?.id === st.id;

                  return (
                    <div
                      key={st.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSubject(isSelected ? null : st)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedSubject(isSelected ? null : st);
                        }
                      }}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-all duration-150 active:scale-[0.98] cursor-pointer flex flex-col gap-1 ${
                        isAlert
                          ? "border-destructive/40 bg-destructive/5"
                          : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/70 bg-background hover:bg-muted/40"
                      }`}
                    >
                      {/* Baris Utama: ID, Nama, Atensi %, Badge Status (No Wrapping) */}
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-mono font-bold text-foreground shrink-0">
                            #{st.anonymous_id || st.id}
                          </span>
                          <span className="text-xs font-medium text-foreground truncate">
                            {(st.student_name || st.label || "Siswa").replace(/\s*\(.*?\)/, "").trim()}
                          </span>
                          {st.hand_raised && (
                            <span className="text-xs shrink-0" title="Mengangkat Tangan">
                              ✋
                            </span>
                          )}
                          {st.posture === "standing" && (
                            <span className="text-[10px] text-muted-foreground shrink-0" title="Berdiri">
                              🧍
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                            {st.attention_score || 95}%
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border whitespace-nowrap ${badge.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* Detail Tambahan & Aksi Cepat Saat Dipilih */}
                      {(isSelected || isAlert) && (
                        <div className="pt-1.5 mt-0.5 border-t border-border/50 flex flex-col gap-1.5 text-[10px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-muted-foreground">
                              Aktivitas: <span className="font-semibold text-foreground">{st.action_text || st.label}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleAwardStudent(st, e)}
                              disabled={awardedMap[st.student_id || st.id]}
                              className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium transition-all active:scale-95 flex items-center gap-1 ${
                                awardedMap[st.student_id || st.id]
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20"
                                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer"
                              }`}
                            >
                              <span>{awardedMap[st.student_id || st.id] ? "✓ Poin Diberikan" : "⭐ +10 Poin"}</span>
                            </button>
                          </div>

                          {!st.is_recognized && isSelected && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setEnrollingId(st.id);
                                try {
                                  const res = await fetch("http://localhost:5000/register_face?name=Haikal%20(Siswa)");
                                  if (res.ok) {
                                    alert("Wajah siswa di kamera berhasil dipindai dan disimpan sebagai Haikal!");
                                  }
                                } catch {
                                  alert("Gagal memanggil engine lokal di http://localhost:5000.");
                                } finally {
                                  setTimeout(() => setEnrollingId(null), 1200);
                                }
                              }}
                              disabled={enrollingId === st.id}
                              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[10px] shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <span>{enrollingId === st.id ? "Memindai Wajah..." : "📸 Daftarkan Wajah Ini sebagai Haikal"}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-border bg-muted/20">
                <Users className="h-5 w-5 text-muted-foreground/60 mb-1" />
                <p className="text-xs font-semibold text-foreground">Standby Memindai</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Siswa di depan kamera akan terdeteksi otomatis.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: CLEAN FRAMELESS ACTIVITY TIMELINE */
          <div className="rounded-lg border border-border/80 bg-muted/20 p-2.5">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-semibold text-foreground">Tren Atensi</span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Fokus
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Catat
                </span>
              </div>
            </div>

            {history.length > 1 ? (
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFokus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorWriting" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007AFF" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#007AFF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 9, fill: "#8E8E93" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#8E8E93" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2 text-xs shadow-md">
                              <p className="font-bold text-foreground mb-0.5">{d.time}</p>
                              <p className="text-emerald-600 font-medium text-[11px]">Fokus: {d.attentive} siswa</p>
                              <p className="text-primary font-medium text-[11px]">Mencatat: {d.writing} siswa</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="attentive"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFokus)"
                    />
                    <Area
                      type="monotone"
                      dataKey="writing"
                      stroke="#007AFF"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorWriting)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 w-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Activity className="h-4 w-4 text-muted-foreground/50 mb-1 animate-pulse" />
                <span className="text-[11px]">Menunggu data telemetri stream...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status & Pedagogical Footnote (Ramping & Kompak) */}
      <div className="pt-2 border-t border-border/60">
        {hermesNudge ? (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-2 flex items-start gap-2 text-xs shadow-2xs">
            <BrainCircuit className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {hermesNudge}
              </p>
            </div>
            {isNudgeLoading && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0 mt-1" />
            )}
          </div>
        ) : counts.sleep > 0 ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
            <Moon className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="truncate">Perhatian: {counts.sleep} siswa lelah / menunduk</span>
          </div>
        ) : totalDetected > 0 ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{totalDetected} siswa terpantau kondusif</span>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="truncate">Kamera Standby • Siap mendeteksi kelas</span>
          </div>
        )}
      </div>

      {/* Session Exit Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
                  <Activity className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Ringkasan Jam Pelajaran
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {scheduleContext?.active
                      ? `${scheduleContext.active.subject_name} (Jam ke-${scheduleContext.active.period_number})`
                      : "Sesi Berlangsung"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Statistik Sesi */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block">Rata-rata Atensi</span>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {focusIndex}%
                </span>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block">Interaksi Tanya</span>
                <span className="text-sm font-bold font-mono text-amber-600">
                  {counts.hand_raised} siswa
                </span>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block">Butuh Bantuan</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    counts.sleep + counts.using_phone > 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {counts.sleep + counts.using_phone} siswa
                </span>
              </div>
            </div>

            {/* Informasi Pengajar */}
            {scheduleContext?.active && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground block text-[11px]">
                    {scheduleContext.active.teacher_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Waktu: {scheduleContext.active.start_time} - {scheduleContext.active.end_time}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                  AKTIF
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted active:scale-98 transition-all"
                title="Cetak atau Simpan PDF Laporan Sesi"
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Cetak Laporan</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSummaryModal(false);
                    setRightTab("attendance");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-xs transition-all active:scale-98"
                >
                  Buka Presensi AI →
                </button>
              </div>
            </div>

            {/* Hidden Print-Ready Sheet (Hanya Tampil saat Cetak / PDF) */}
            <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[9999] text-xs">
              <div className="border-b-2 border-black pb-3 mb-4">
                <h1 className="text-base font-bold uppercase tracking-tight">{SCHOOL_NAME}</h1>
                <h2 className="text-sm font-semibold">REKAPITULASI SESI BELAJAR & TELEMETRI KELAS</h2>
                <p className="text-[10px] text-gray-600 mt-1">
                  Dicetak secara otomatis melalui Sistem Smart Learning AI Vision • {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                <div>
                  <p><strong>Mata Pelajaran:</strong> {scheduleContext?.active?.subject_name || "—"}</p>
                  <p><strong>Guru Pengampu:</strong> {scheduleContext?.active?.teacher_name || "—"}</p>
                </div>
                <div>
                  <p><strong>Waktu Sesi:</strong> {scheduleContext?.active?.start_time || "—"} - {scheduleContext?.active?.end_time || "—"} WIB</p>
                  <p><strong>Indeks Atensi Kelas:</strong> {focusIndex}% • Siswa Bertanya: {counts.hand_raised}</p>
                </div>
              </div>

              <table className="w-full border-collapse border border-gray-400 text-[10px] mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 p-1.5 text-left">No</th>
                    <th className="border border-gray-400 p-1.5 text-left">Nama Siswa</th>
                    <th className="border border-gray-400 p-1.5 text-left">Bangku</th>
                    <th className="border border-gray-400 p-1.5 text-left">Aktivitas</th>
                    <th className="border border-gray-400 p-1.5 text-left">Atensi</th>
                    <th className="border border-gray-400 p-1.5 text-left">Keaktifan</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((st, idx) => (
                    <tr key={st.id || idx}>
                      <td className="border border-gray-400 p-1">{idx + 1}</td>
                      <td className="border border-gray-400 p-1 font-semibold">{st.student_name || st.label}</td>
                      <td className="border border-gray-400 p-1 font-mono">{st.location || `Baris ${st.row}`}</td>
                      <td className="border border-gray-400 p-1 capitalize">{st.activity || "menyimak"}</td>
                      <td className="border border-gray-400 p-1 font-mono">{st.attention_score ?? 90}%</td>
                      <td className="border border-gray-400 p-1">{st.hand_raised ? "✋ Aktif Bertanya" : "Menyimak"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-8">
                <div className="text-center w-48">
                  <p className="text-[11px] mb-12">Guru Pengampu Mata Pelajaran,</p>
                  <p className="font-bold underline text-[11px]">{scheduleContext?.active?.teacher_name || "Guru Pengampu"}</p>
                  <p className="text-[10px] text-gray-500">NIP. —</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

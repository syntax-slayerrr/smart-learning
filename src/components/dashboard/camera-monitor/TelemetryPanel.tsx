"use client";

import React from "react";
import {
  Activity,
  Sparkles,
  Users,
  Moon,
  CheckCircle2,
  Radio,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DetectedSubject } from "./types";
import { AiAttendanceDraftView } from "./AiAttendanceDraftView";

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
}: TelemetryPanelProps) {
  return (
    <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 space-y-4 bg-card flex flex-col justify-between">
      <div className="space-y-3.5">
        {/* Header & Segmented Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Dinamika Kelas
            </h3>
            <p className="text-xs text-muted-foreground">
              Analisis atensi & keterlibatan siswa real-time
            </p>
          </div>

          <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 shadow-inner">
            <button
              onClick={() => setRightTab("digital_twin")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all touch-manipulation ${
                rightTab === "digital_twin"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Siswa
            </button>
            <button
              onClick={() => setRightTab("analytics")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all touch-manipulation ${
                rightTab === "analytics"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tren
            </button>
            <button
              onClick={() => setRightTab("attendance")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all touch-manipulation flex items-center gap-1.5 ${
                rightTab === "attendance"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Presensi AI
            </button>
          </div>
        </div>

        {/* Clean Focus Index Strip (Reduced Card Surface) */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Indeks Atensi
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {focusIndex >= 85
                  ? "Sangat Kondusif"
                  : focusIndex >= 70
                  ? "Kondusif"
                  : focusIndex >= 50
                  ? "Cukup Baik"
                  : "Perlu Pendampingan"}
              </span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {focusIndex}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            {totalDetected > 0 ? (
              <>
                <div
                  style={{ width: `${(counts.attentive / totalDetected) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-700 ease-out"
                  title="Fokus / Menyimak"
                />
                <div
                  style={{ width: `${(counts.writing / totalDetected) * 100}%` }}
                  className="bg-primary transition-all duration-700 ease-out"
                  title="Mencatat / Praktik"
                />
                <div
                  style={{ width: `${(counts.sleep / totalDetected) * 100}%` }}
                  className="bg-amber-500 transition-all duration-700 ease-out"
                  title="Perlu Pendampingan"
                />
              </>
            ) : (
              <div style={{ width: "100%" }} className="bg-muted-foreground/20" title="Standby" />
            )}
          </div>
        </div>

        {/* TAB RENDERING */}
        {rightTab === "attendance" ? (
          <AiAttendanceDraftView sessionId={sessionId} />
        ) : rightTab === "digital_twin" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
              <span className="text-[11px] tracking-wider uppercase">Subjek Terpantau</span>
              <span className="tabular-nums font-semibold text-foreground">{totalDetected} Siswa Aktif</span>
            </div>

            {subjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-0.5">
                {subjects.map((st) => {
                  const badge = getStatusBadge(st.activity);
                  const isAlert = st.activity === "sleep" || st.activity === "using_phone";
                  const isSelected = selectedSubject?.id === st.id;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedSubject(isSelected ? null : st)}
                      className={`w-full rounded-xl border p-2.5 text-left transition-all active:scale-[0.99] cursor-pointer ${
                        isAlert
                          ? "border-destructive/40 bg-destructive/5 shadow-2xs"
                          : isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/80 bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-foreground">
                          #{st.anonymous_id || st.id}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${badge.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-foreground truncate">
                        {st.action_text || st.label}
                      </p>

                      <div className="mt-1.5 pt-1.5 border-t border-border/60 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          Fokus: <strong className="text-foreground font-mono">{st.attention_score || 95}%</strong>
                        </span>
                        <span className="truncate text-right">
                          Postur: <span className="font-semibold text-foreground">{st.posture === "standing" ? "Berdiri" : "Duduk"}</span>
                        </span>
                      </div>

                      {st.hand_raised && (
                        <div className="mt-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <span>✋ Mengangkat Tangan</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border bg-muted/20">
                <Users className="h-6 w-6 text-muted-foreground/60 mb-1.5" />
                <p className="text-xs font-semibold text-foreground">Belum Ada Subjek Terdeteksi</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 leading-relaxed">
                  Kamera standby memindai. Subjek yang berada dalam jangkauan akan terdaftar otomatis.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: CLEAN FRAMELESS ACTIVITY TIMELINE */
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">
                Tren Dinamika Atensi
              </span>
              <div className="flex items-center gap-2.5 text-[11px] font-medium">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fokus
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Mencatat
                </span>
              </div>
            </div>

            {history.length > 1 ? (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
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
                            <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-2.5 text-xs shadow-md font-sans">
                              <p className="font-bold text-foreground mb-1">{d.time}</p>
                              <p className="text-emerald-600 font-medium">Fokus: {d.attentive} siswa</p>
                              <p className="text-primary font-medium">Mencatat: {d.writing} siswa</p>
                              {d.sleeping > 0 && <p className="text-amber-600 font-semibold">Perhatian: {d.sleeping}</p>}
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
              <div className="h-40 w-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Activity className="h-5 w-5 text-muted-foreground/50 mb-1 animate-pulse" />
                <span>Menunggu data telemetri stream...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pedagogical Insights & Status Footnote */}
      <div className="pt-3 border-t border-border/60 space-y-2">
        {hermesNudge && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 shadow-2xs">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  AI Pedagogical Insight
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono text-primary font-semibold">
                    Real-time
                  </span>
                </span>
                {isNudgeLoading && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hermesNudge}
              </p>
            </div>
          </div>
        )}

        {counts.sleep > 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 shadow-2xs">
            <div className="rounded-md bg-amber-500/20 p-1 text-amber-600 shrink-0">
              <Moon className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-semibold block">
                Atensi Menurun: {counts.sleep} siswa lelah / menunduk
              </span>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                Rekomendasi: Lakukan interaksi tanya jawab atau ice-breaking singkat.
              </p>
            </div>
          </div>
        ) : totalDetected > 0 ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium truncate">
              {totalDetected} subjek terpantau aktif dan kondusif
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-2.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            <span className="text-xs font-medium truncate">
              Kamera Standby • Siap mendeteksi kehadiran di kelas
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

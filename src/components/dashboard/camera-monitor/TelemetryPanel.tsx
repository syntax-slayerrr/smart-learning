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
    <div className="lg:col-span-5 p-3 sm:p-5 space-y-3.5 bg-white flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header & Mode Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold tracking-tight text-[#1D1D1F] flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" />
              Dinamika Pembelajaran
            </h3>
            <p className="text-[11px] text-[#8E8E93]">
              Keterlibatan dan atensi siswa real-time
            </p>
          </div>

          <div className="inline-flex items-center rounded-xl border border-[rgba(60,60,67,0.12)] bg-[#EFEFED] p-1 shadow-inner">
            <button
              onClick={() => setRightTab("digital_twin")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all touch-manipulation ${
                rightTab === "digital_twin"
                  ? "bg-white text-[#1D1D1F] shadow-sm font-semibold"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Daftar Siswa
            </button>
            <button
              onClick={() => setRightTab("analytics")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all touch-manipulation ${
                rightTab === "analytics"
                  ? "bg-white text-[#1D1D1F] shadow-sm font-semibold"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Tren Fokus
            </button>
            <button
              onClick={() => setRightTab("attendance")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all touch-manipulation flex items-center gap-1 ${
                rightTab === "attendance"
                  ? "bg-white text-emerald-800 shadow-sm font-semibold"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Presensi AI
            </button>
          </div>
        </div>

        {/* Focus Index Gauge Card (Apple Health style) */}
        <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-[#FAFAF9] p-3 sm:p-3.5 shadow-2xs transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Indeks Fokus Kelas
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                {focusIndex >= 85
                  ? "Sangat Kondusif"
                  : focusIndex >= 70
                  ? "Kondusif"
                  : focusIndex >= 50
                  ? "Cukup Baik"
                  : "Perlu Pendampingan"}
              </span>
              <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                {focusIndex}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-stone-200/80 rounded-full overflow-hidden flex">
            {totalDetected > 0 ? (
              <>
                <div
                  style={{ width: `${(counts.attentive / totalDetected) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-700 ease-out"
                  title="Fokus / Menyimak"
                />
                <div
                  style={{ width: `${(counts.writing / totalDetected) * 100}%` }}
                  className="bg-sky-500 transition-all duration-700 ease-out"
                  title="Mencatat / Praktik"
                />
                <div
                  style={{ width: `${(counts.sleep / totalDetected) * 100}%` }}
                  className="bg-amber-500 transition-all duration-700 ease-out"
                  title="Perlu Pendampingan"
                />
              </>
            ) : (
              <div style={{ width: "100%" }} className="bg-stone-300" title="Standby" />
            )}
          </div>
        </div>

        {/* TAB RENDERING */}
        {rightTab === "attendance" ? (
          <AiAttendanceDraftView sessionId={sessionId} />
        ) : rightTab === "digital_twin" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#6E6E73] px-1">
              <span>STATUS INTERAKSI SISWA</span>
              <span className="tabular-nums font-semibold text-[#1D1D1F]">{totalDetected} Siswa Terpantau</span>
            </div>

            {subjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-0.5">
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
                          ? "border-red-300 bg-red-50/70 shadow-2xs"
                          : isSelected
                          ? "border-[#007AFF] bg-sky-50/50 shadow-xs"
                          : "border-[rgba(60,60,67,0.10)] bg-white hover:bg-[#F8F8F7]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-[#1D1D1F]">
                          #{st.anonymous_id || st.id}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${badge.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-[#1D1D1F] truncate">
                        {st.action_text || st.label}
                      </p>

                      <div className="mt-1.5 pt-1.5 border-t border-[rgba(60,60,67,0.08)] grid grid-cols-2 gap-1 text-[11px] text-[#6E6E73]">
                        <span className="truncate">
                          Fokus: <strong className="text-[#1D1D1F] font-mono">{st.attention_score || 95}%</strong>
                        </span>
                        <span className="truncate text-right">
                          Postur: <span className="font-semibold text-[#1D1D1F]">{st.posture === "standing" ? "Berdiri" : "Duduk"}</span>
                        </span>
                      </div>

                      {st.hand_raised && (
                        <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 flex items-center gap-1">
                          <span>✋ Mengangkat Tangan (Bertanya)</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-dashed border-[rgba(60,60,67,0.15)] bg-[#FAFAF9]">
                <Users className="h-6 w-6 text-stone-400 mb-1.5" />
                <p className="text-xs font-semibold text-[#1D1D1F]">Belum Ada Subjek Terdeteksi</p>
                <p className="text-[11px] text-[#8E8E93] max-w-xs mt-0.5 leading-relaxed">
                  Kamera standby memindai. Subjek yang tertangkap frame otomatis tampil di sini.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: CLEAN FRAMELESS ACTIVITY TIMELINE */
          <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-[#FAFAF9] p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#1D1D1F]">
                Tren Aktivitas Siswa
              </span>
              <div className="flex items-center gap-2.5 text-[11px] font-medium">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fokus
                </span>
                <span className="flex items-center gap-1 text-sky-700">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Mencatat / Tugas
                </span>
              </div>
            </div>

            {history.length > 1 ? (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFokus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B6BCB" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#0B6BCB" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorWriting" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.0} />
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
                            <div className="rounded-xl border border-[rgba(60,60,67,0.15)] bg-white/95 backdrop-blur-md p-2.5 text-xs shadow-lg font-sans">
                              <p className="font-bold text-[#1D1D1F] mb-1">{d.time}</p>
                              <p className="text-emerald-700 font-medium">Fokus: {d.attentive} siswa</p>
                              <p className="text-sky-600 font-medium">Mencatat: {d.writing} siswa</p>
                              {d.sleeping > 0 && <p className="text-amber-700 font-bold">Butuh Bantuan: {d.sleeping}</p>}
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
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorWriting)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 w-full flex flex-col items-center justify-center text-center text-xs text-stone-400">
                <Activity className="h-5 w-5 text-stone-300 mb-1 animate-pulse" />
                <span>Menunggu titik data telemetri...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hermes AI Pedagogical Nudge & Dynamic Status */}
      <div className="pt-2 border-t border-[rgba(60,60,67,0.08)] space-y-2">
        {hermesNudge && (
          <div className="rounded-2xl border border-orange-200/80 bg-orange-50/70 p-3 flex items-start gap-2.5 shadow-2xs">
            <div className="rounded-xl bg-orange-100 p-1.5 text-primary shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                  Hermes Pedagogical Nudge
                  <span className="rounded bg-orange-200/60 px-1.5 py-0.2 text-[9px] font-mono text-orange-950 font-semibold">
                    9Router AI
                  </span>
                </span>
                {isNudgeLoading && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                )}
              </div>
              <p className="text-xs text-[#444446] leading-relaxed">
                {hermesNudge}
              </p>
            </div>
          </div>
        )}

        {counts.sleep > 0 ? (
          <div className="rounded-2xl border border-amber-300/80 bg-amber-50/80 p-2.5 flex items-start gap-2 text-xs text-amber-900 shadow-2xs">
            <div className="rounded-lg bg-amber-100 p-1 text-amber-700 shrink-0">
              <Moon className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-bold block">
                Atensi Menurun: {counts.sleep} siswa terindikasi lelah / menunduk
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Rekomendasi: Ajak siswa berinteraksi atau lakukan ice breaking singkat.
              </p>
            </div>
          </div>
        ) : totalDetected > 0 ? (
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-2.5 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium truncate">
              {totalDetected} subjek terpantau aktif dan kondusif
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50 p-2.5 flex items-center gap-2 text-xs text-stone-600">
            <Radio className="h-4 w-4 text-stone-400 shrink-0" />
            <span className="text-xs font-medium truncate">
              Kamera Standby • Siap mendeteksi kehadiran di kelas
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

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
import { DetectedSubject, TelemetryPoint } from "./types";

interface TelemetryPanelProps {
  rightTab: "digital_twin" | "analytics";
  setRightTab: (tab: "digital_twin" | "analytics") => void;
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
    <>
{/* Right Pane: Real-Time Dynamic Subjects */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-white flex flex-col justify-between">
            <div className="space-y-3">
              {/* Tab Selector */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-primary" />
                    Dinamika Pembelajaran Kelas
                  </h4>
                  <p className="text-xs text-stone-500">
                    Pemantauan keterlibatan dan keaktifan siswa secara langsung
                  </p>
                </div>

                <div className="flex items-center rounded-lg border border-border bg-muted p-0.5">
                  <button
                    onClick={() => setRightTab("digital_twin")}
                    className={`rounded-md px-2 py-1 text-xs font-semibold apple-press ${
                      rightTab === "digital_twin" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-500"
                    }`}
                  >
                    Daftar Siswa
                  </button>
                  <button
                    onClick={() => setRightTab("analytics")}
                    className={`rounded-md px-2 py-1 text-xs font-semibold apple-press ${
                      rightTab === "analytics" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-500"
                    }`}
                  >
                    Tren Fokus
                  </button>
                </div>
              </div>

              {/* Focus Index Gauge Banner */}
              <div className="rounded-xl border border-border bg-background p-3 shadow-2xs transition-all duration-500">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Indeks Fokus Kelas
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {focusIndex >= 85
                        ? "Sangat Kondusif"
                        : focusIndex >= 70
                        ? "Kondusif"
                        : focusIndex >= 50
                        ? "Cukup Baik"
                        : "Perlu Pendampingan"}
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-700 tabular-nums transition-all duration-300">
                      {focusIndex}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-stone-200 rounded-full overflow-hidden flex">
                  {totalDetected > 0 ? (
                    <>
                      <div style={{ width: `${(counts.attentive / totalDetected) * 100}%` }} className="bg-emerald-600 transition-all duration-700 ease-out" title="Fokus / Menyimak" />
                      <div style={{ width: `${(counts.writing / totalDetected) * 100}%` }} className="bg-sky-500 transition-all duration-700 ease-out" title="Mencatat / Praktik" />
                      <div style={{ width: `${(counts.sleep / totalDetected) * 100}%` }} className="bg-amber-600 transition-all duration-700 ease-out" title="Perlu Pendampingan" />
                    </>
                  ) : (
                    <div style={{ width: "100%" }} className="bg-stone-300 transition-all duration-500" title="Standby" />
                  )}
                </div>
              </div>

              {/* TAB CONTENT 1: REAL DETECTED SUBJECTS */}
              {rightTab === "digital_twin" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-stone-600 px-1">
                    <span>STATUS INTERAKSI SISWA</span>
                    <span className="tabular-nums font-bold text-stone-800">{totalDetected} Siswa Terpantau</span>
                  </div>

                  {subjects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {subjects.map((st) => {
                        const badge = getStatusBadge(st.activity);
                        const isAlert = st.activity === "sleep" || st.activity === "using_phone";
                        const isSelected = selectedSubject?.id === st.id;

                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setSelectedSubject(st)}
                            className={`w-full rounded-xl border p-3 text-left apple-press apple-card cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40 ${
                              isAlert
                                ? "border-red-300 bg-red-50/70 shadow-xs"
                                : isSelected
                                ? "border-primary bg-orange-50/50 shadow-xs"
                                : "border-border bg-background hover:bg-stone-50 hover:border-stone-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-mono font-bold text-stone-700">
                                #{st.anonymous_id || st.id}
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono transition-all duration-500 ${badge.bg}`}>
                                <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-stone-900 truncate transition-colors duration-300">
                              {st.action_text || st.label}
                            </p>

                            {/* Multi-parameter detail pills */}
                            <div className="mt-2 pt-2 border-t border-border/70 grid grid-cols-2 gap-1 text-xs font-mono text-stone-600">
                              <span className="truncate">
                                <strong>Fokus:</strong> <span className="tabular-nums">{st.attention_score || 95}%</span>
                              </span>
                              <span className="truncate text-right">
                                <strong>Postur:</strong> <span className="font-semibold text-stone-800 transition-colors duration-300">{st.posture === "standing" ? "Berdiri" : "Duduk"}</span>
                              </span>
                              <span className="truncate">
                                <strong>Tilt:</strong> <span className="tabular-nums">{st.head_tilt_deg !== undefined ? `${Math.round(st.head_tilt_deg)}°` : "0°"}</span>
                              </span>
                              <span className="truncate text-right">
                                <strong>Arah:</strong> {st.gaze_direction || "Depan"}
                              </span>
                            </div>

                            {st.hand_raised && (
                              <div className="mt-1.5 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-xs font-mono font-bold text-amber-800 flex items-center gap-1 transition-all duration-300">
                                <span>✋ Tangan Terangkat (Bertanya)</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-background">
                      <Users className="h-7 w-7 text-stone-400 mb-2" />
                      <p className="text-xs font-bold text-stone-700">Belum Ada Subjek Terdeteksi</p>
                      <p className="text-xs text-stone-500 max-w-xs mt-1">
                        Kamera aktif memindai. Begitu ada orang yang masuk dalam visual kamera, kartu subjek akan muncul otomatis di sini.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB CONTENT 2: FLOW ACTIVITY TIMELINE CHART */
                <div className="rounded-xl border border-border bg-background p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Tren Aktivitas Subjek
                    </span>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" /> Fokus
                      </span>
                      <span className="flex items-center gap-1 text-sky-600">
                        <span className="h-2 w-2 rounded-full bg-sky-500" /> Meja
                      </span>
                    </div>
                  </div>

                  {history.length > 1 ? (
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorFokus" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorWriting" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#78716c" }} axisLine={{ stroke: "#E7E2DA" }} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "#78716c" }} axisLine={{ stroke: "#E7E2DA" }} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <div className="rounded-lg border border-border bg-white p-2 text-xs shadow-md font-mono">
                                    <p className="font-bold text-stone-800 mb-1">{d.time}</p>
                                    <p className="text-emerald-700">Fokus: {d.attentive} subjek</p>
                                    <p className="text-sky-600">Meja: {d.writing} subjek</p>
                                    {d.sleeping > 0 && <p className="text-red-700 font-bold">Menunduk: {d.sleeping}</p>}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area type="monotone" dataKey="attentive" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorFokus)" />
                          <Area type="monotone" dataKey="writing" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorWriting)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-44 w-full flex flex-col items-center justify-center text-center text-xs text-stone-400">
                      <Activity className="h-5 w-5 text-stone-300 mb-1 animate-pulse" />
                      <span>Menunggu titik data telemetri...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hermes AI Pedagogical Nudge & Alerts */}
            <div className="pt-2 border-t border-border space-y-2">
              {hermesNudge && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-3 flex items-start gap-2.5 shadow-2xs">
                  <div className="rounded-lg bg-orange-100 p-1.5 text-primary shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        Hermes Pedagogical Nudge
                        <span className="rounded bg-orange-200/60 px-1.5 py-0.2 text-xs font-mono text-orange-900 font-semibold">
                          9Router AI
                        </span>
                      </span>
                      {isNudgeLoading && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                      )}
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {hermesNudge}
                    </p>
                  </div>
                </div>
              )}

              {counts.sleep > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50/90 p-2.5 flex items-start gap-2.5 shadow-2xs animate-pulse">
                  <div className="rounded-lg bg-red-100 p-1.5 text-red-600 shrink-0">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-900 block">
                      ⚠️ Peringatan Kelelahan: Terdeteksi {counts.sleep} Subjek Menunduk
                    </span>
                    <p className="text-xs text-red-700 leading-relaxed mt-0.5">
                      Subjek menunduk / tidak aktif di area meja lebih dari 3 detik.
                    </p>
                  </div>
                </div>
              ) : totalDetected > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-medium truncate">
                    ✨ {totalDetected} subjek terdeteksi aktif dalam ruang pemantauan
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 flex items-center gap-2 text-xs text-stone-600">
                  <Radio className="h-4 w-4 text-stone-400 shrink-0" />
                  <span className="text-xs font-medium truncate">
                    Kamera Standby • Siap mendeteksi subjek yang memasuki frame
                  </span>
                </div>
              )}
            </div>
          </div>

    </>
  );
}

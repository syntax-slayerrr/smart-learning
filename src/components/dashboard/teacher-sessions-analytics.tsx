"use client";

import Link from "next/link";
import {
  Hand,
  Moon,
  Activity,
  BarChart3,
  ArrowRight,
  Brain,
  Sparkles,
} from "lucide-react";

interface SessionItem {
  id: string;
  date: string;
  subject: string;
  class_name: string;
  has_telemetry: boolean;
  hand_raises: number;
  sleep_incidents: number;
}

interface TeacherAnalyticsData {
  total_sessions: number;
  sessions_with_telemetry: number;
  total_sleep_alerts: number;
  total_hand_raises: number;
  recent_sessions: SessionItem[];
}

interface TeacherSessionsAnalyticsProps {
  data: TeacherAnalyticsData;
}

export function TeacherSessionsAnalytics({ data }: TeacherSessionsAnalyticsProps) {
  if (data.total_sessions === 0) return null;

  const aiCoveragePct =
    data.total_sessions > 0
      ? Math.round((data.sessions_with_telemetry / data.total_sessions) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Header with Visual Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shadow-2xs">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                Analitik Kelas & Telemetri Guru
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                <Sparkles className="h-2.5 w-2.5 text-blue-600" />
                Live V.1
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Ringkasan dinamika interaksi & kehadiran sesi pembelajaran
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid inspired by UPDATE V.1 KPI Architecture */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Total Sesi */}
        <div className="card-3d-ceramic p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Sesi
            </span>
            <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 border border-blue-100/80">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 tracking-tight">
            {data.total_sessions}
          </p>
          <span className="text-[10px] font-semibold text-slate-400 mt-1 inline-block">
            Terjadwal & Terekam
          </span>
        </div>

        {/* KPI 2: Cakupan AI */}
        <div className="card-3d-ceramic p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cakupan AI
            </span>
            <div className="rounded-lg bg-cyan-50 p-1.5 text-cyan-600 border border-cyan-100/80">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 tracking-tight">
            {aiCoveragePct}%
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${aiCoveragePct}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Angkat Tangan */}
        <div className="card-3d-ceramic p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Angkat Tangan
            </span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 border border-emerald-100/80">
              <Hand className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-emerald-600 tracking-tight">
            {data.total_hand_raises}
          </p>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 mt-1 inline-block">
            Interaktif Tinggi
          </span>
        </div>

        {/* KPI 4: Alert Tertidur */}
        <div className="card-3d-ceramic p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Alert Tertidur
            </span>
            <div
              className={`rounded-lg p-1.5 border ${
                data.total_sleep_alerts > 0
                  ? "bg-rose-50 text-rose-600 border-rose-200/80 animate-pulse"
                  : "bg-slate-50 text-slate-400 border-slate-100"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
            </div>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${
              data.total_sleep_alerts > 0 ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {data.total_sleep_alerts}
          </p>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 inline-block ${
              data.total_sleep_alerts > 0
                ? "bg-rose-50 text-rose-700 border-rose-200/70"
                : "bg-slate-50 text-slate-500 border-slate-200/60"
            }`}
          >
            {data.total_sleep_alerts > 0 ? "Butuh Atensi" : "Kondisi Terjaga"}
          </span>
        </div>
      </div>

      {/* Recent Sessions List */}
      {data.recent_sessions.length > 0 && (
        <div className="card-3d-ceramic overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Sesi Mengajar Terkini
            </h4>
            <span className="text-[11px] font-medium text-slate-400">
              Klik sesi untuk evaluasi telemetri
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recent_sessions.map((session) => (
              <Link
                key={session.id}
                href={`/teacher/attendance/${session.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors duration-150 group"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {session.subject}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {session.class_name} • <span className="tabular-nums">{session.date}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {session.has_telemetry ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg">
                        <Hand className="h-3 w-3 text-blue-600" />
                        <span className="font-bold text-slate-700 tabular-nums">
                          {session.hand_raises}
                        </span>
                      </div>
                      {session.sleep_incidents > 0 && (
                        <div className="flex items-center gap-1.5 text-xs bg-rose-50 border border-rose-200/70 px-2 py-1 rounded-lg">
                          <Moon className="h-3 w-3 text-rose-600" />
                          <span className="font-bold text-rose-600 tabular-nums">
                            {session.sleep_incidents}
                          </span>
                        </div>
                      )}
                      <span
                        className="h-2 w-2 rounded-full bg-emerald-500 shadow-2xs"
                        title="Data telemetri lengkap"
                      />
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                      Tanpa Kamera
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

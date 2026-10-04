"use client";

import Link from "next/link";
import {
  Hand,
  Moon,
  Activity,
  BarChart3,
  ArrowRight,
  Brain,
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-primary shadow-2xs">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-stone-900">
            Analitik Kelas & Telemetri Guru
          </h2>
          <p className="text-xs text-stone-500">
            Ringkasan dinamika dan interaksi sesi pembelajaran Anda
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-2xs apple-card">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Sesi</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-stone-900 font-sans">
            {data.total_sessions}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-2xs apple-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Cakupan AI</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-stone-900 font-sans">
            {data.total_sessions > 0
              ? `${Math.round((data.sessions_with_telemetry / data.total_sessions) * 100)}%`
              : "0%"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-2xs apple-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Hand className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Angkat Tangan</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-primary font-sans">
            {data.total_hand_raises}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-2xs apple-card">
          <div className="flex items-center gap-1.5 mb-1">
            <Moon className={`h-3.5 w-3.5 ${data.total_sleep_alerts > 0 ? "text-red-600 animate-pulse" : "text-stone-400"}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Alert Tertidur</span>
          </div>
          <p className={`text-2xl font-bold tabular-nums font-sans ${data.total_sleep_alerts > 0 ? "text-red-600" : "text-stone-900"}`}>
            {data.total_sleep_alerts}
          </p>
        </div>
      </div>

      {/* Recent Sessions List */}
      {data.recent_sessions.length > 0 && (
        <div className="rounded-xl border border-border bg-white shadow-2xs overflow-hidden apple-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-background">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Sesi Mengajar Terkini
            </h4>
            <span className="text-xs font-mono text-stone-400">Klik untuk melihat detail & grafik</span>
          </div>
          <div className="divide-y divide-[#E7E2DA]/60">
            {data.recent_sessions.map((session) => (
              <Link
                key={session.id}
                href={`/teacher/attendance/${session.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-background transition-colors duration-75 group apple-press"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-900 truncate group-hover:text-primary transition-colors">
                    {session.subject}
                  </p>
                  <p className="text-xs text-stone-500">
                    {session.class_name} • <span className="font-mono">{session.date}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {session.has_telemetry ? (
                    <>
                      <div className="flex items-center gap-1 text-xs">
                        <Hand className="h-3 w-3 text-primary" />
                        <span className="font-mono font-medium text-stone-700">{session.hand_raises}</span>
                      </div>
                      {session.sleep_incidents > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Moon className="h-3 w-3 text-red-600" />
                          <span className="font-mono font-bold text-red-600">{session.sleep_incidents}</span>
                        </div>
                      )}
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" title="Data telemetri lengkap" />
                    </>
                  ) : (
                    <span className="text-xs text-stone-400 font-medium">Tanpa Kamera</span>
                  )}
                  <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Hand,
  Moon,
  BookOpen,
  Users,
  Activity,
  Sparkles,
  CheckCircle,
} from "lucide-react";

interface TimelinePoint {
  timestamp: string;
  sitting: number;
  standing: number;
  hand_raises: number;
  desk_focused: number;
  sleep_detected: number;
  teacher_zone: string | null;
}

interface Totals {
  avg_students: number;
  total_hand_raises: number;
  total_sleep_incidents: number;
  avg_sitting_pct: number;
  avg_desk_focused_pct: number;
  peak_sleep_count: number;
}

interface Insight {
  id: string;
  type: string;
  summary: string;
  prompt: string;
  confidence: string;
  reviewed: boolean;
}

interface SessionDynamicsPanelProps {
  subjectName: string;
  className: string;
  sessionDate: string;
  timeline: TimelinePoint[];
  totals: Totals;
  insights: Insight[];
}

const insightTypeConfig: Record<string, { icon: typeof Hand; label: string; color: string; border: string }> = {
  participation: { icon: Hand, label: "Partisipasi", color: "text-primary bg-orange-50", border: "border-orange-200" },
  mobility: { icon: Activity, label: "Mobilitas", color: "text-stone-700 bg-stone-100", border: "border-stone-200" },
  group_work: { icon: Users, label: "Kerja Kelompok", color: "text-indigo-700 bg-indigo-50", border: "border-indigo-200" },
  pacing: { icon: BookOpen, label: "Pacing Belajar", color: "text-amber-700 bg-amber-50", border: "border-amber-200" },
  sleeping: { icon: Moon, label: "Tertidur", color: "text-red-700 bg-red-50", border: "border-red-200" },
};

export function SessionDynamicsPanel({
  subjectName,
  className,
  sessionDate,
  timeline,
  totals,
  insights,
}: SessionDynamicsPanelProps) {
  // Format timeline for chart
  const chartData = timeline.map((point) => ({
    ...point,
    time: new Date(point.timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  // Custom Tooltip (Fintech Minimalist Solid Card)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900 border border-stone-800 text-white p-3 shadow-xl rounded-xl space-y-1.5 min-w-44">
          <p className="font-semibold text-xs text-stone-200 border-b border-stone-800 pb-1 font-mono">
            {label} WIB
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-stone-400">Duduk</span>
            <span className="font-mono font-medium text-stone-200 text-right">{data.sitting}</span>
            <span className="text-stone-400">Berdiri</span>
            <span className="font-mono font-medium text-stone-200 text-right">{data.standing}</span>
            <span className="text-orange-400 font-medium">Angkat Tangan</span>
            <span className="font-mono font-bold text-orange-400 text-right">{data.hand_raises}</span>
            <span className="text-stone-400">Fokus Meja</span>
            <span className="font-mono font-medium text-stone-200 text-right">{data.desk_focused}</span>
            <span className="text-red-400 font-medium">Tertidur</span>
            <span className={`font-mono font-bold text-right ${data.sleep_detected > 0 ? "text-red-400" : "text-stone-400"}`}>
              {data.sleep_detected}
            </span>
          </div>
          {data.teacher_zone && (
            <p className="text-xs text-stone-400 border-t border-stone-800 pt-1 mt-1 font-mono">
              Zona Guru: <span className="font-semibold text-stone-200">{data.teacher_zone}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-primary" />
            Dinamika Kelas & Telemetri
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {subjectName} — {className} • <span className="font-mono">{sessionDate}</span>
          </p>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatPill label="Rata-rata Siswa" value={totals.avg_students} icon={Users} color="stone" />
        <StatPill label="Angkat Tangan" value={totals.total_hand_raises} icon={Hand} color="orange" />
        <StatPill label="Fokus Meja" value={`${totals.avg_desk_focused_pct}%`} icon={BookOpen} color="stone" />
        <StatPill
          label="Tertidur"
          value={totals.total_sleep_incidents}
          icon={Moon}
          color={totals.total_sleep_incidents > 0 ? "red" : "stone"}
          alert={totals.total_sleep_incidents > 0}
        />
        <StatPill
          label="Puncak Tidur"
          value={totals.peak_sleep_count}
          icon={Moon}
          color={totals.peak_sleep_count > 0 ? "red" : "stone"}
        />
      </div>

      {/* Timeline Chart */}
      {chartData.length > 0 ? (
        <div className="rounded-xl border border-border bg-white p-5 shadow-2xs apple-card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Timeline Aktivitas Belajar Mengajar
            </h4>
            <span className="text-xs font-mono text-stone-400">Bucket 1 Menit</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Royal Blue Gradient for Active Participation */}
                  <linearGradient id="colorHandRaise" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B6BCB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0B6BCB" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Sky Cyan for Sitting */}
                  <linearGradient id="colorSitting" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Red for Sleep */}
                  <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.06)" />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "currentColor" }}
                />
                <Area
                  type="monotone"
                  dataKey="sitting"
                  name="Siswa Duduk"
                  stroke="#00B4D8"
                  strokeWidth={1.75}
                  fillOpacity={1}
                  fill="url(#colorSitting)"
                />
                <Area
                  type="monotone"
                  dataKey="hand_raises"
                  name="Interaksi / Angkat Tangan"
                  stroke="#0B6BCB"
                  strokeWidth={2.25}
                  fillOpacity={1}
                  fill="url(#colorHandRaise)"
                />
                <Area
                  type="monotone"
                  dataKey="sleep_detected"
                  name="Siswa Tertidur"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSleep)"
                  activeDot={{ r: 5, className: "fill-rose-600 stroke-white stroke-2" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
          <Activity className="h-8 w-8 mx-auto text-stone-300 mb-2" />
          <p className="text-xs text-stone-500 font-medium">
            Belum ada data telemetri kamera untuk sesi ini
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Data akan otomatis masuk saat kamera edge box mendeteksi ruang kelas
          </p>
        </div>
      )}

      {/* AI Pedagogical Insights (Executive Briefing Style) */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Refleksi & Rekomendasi Pedagogis AI
            </h4>
          </div>
          <div className="space-y-2.5">
            {insights.map((insight) => {
              const config = insightTypeConfig[insight.type] || insightTypeConfig.participation;
              const Icon = config.icon;
              return (
                <div
                  key={insight.id}
                  className="rounded-xl border border-border bg-white p-4 shadow-2xs hover:border-orange-200 transition-colors border-l-4 border-l-[#EA580C]"
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${config.color} border ${config.border}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color} px-2 py-0.5 rounded-md border ${config.border}`}>
                          {config.label}
                        </span>
                        <span className="text-xs font-mono text-stone-400">
                          Tingkat Keyakinan: {insight.confidence}
                        </span>
                        {insight.reviewed && (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-xs text-stone-900 font-semibold leading-relaxed">
                        {insight.summary}
                      </p>
                      <div className="mt-2 rounded-lg bg-background border border-border p-2.5 text-xs text-stone-600 leading-relaxed">
                        <span className="font-semibold text-stone-800">Saran Tindak Lanjut Guru: </span>
                        {insight.prompt}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Internal StatPill component
// ============================================

function StatPill({
  label,
  value,
  icon: Icon,
  color,
  alert = false,
}: {
  label: string;
  value: string | number;
  icon: typeof Hand;
  color: string;
  alert?: boolean;
}) {
  const colorMap: Record<string, string> = {
    stone: "bg-white text-stone-800 border-border",
    orange: "bg-orange-50/60 text-primary border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`rounded-xl border p-3.5 ${colorMap[color] || colorMap.stone} shadow-2xs apple-card`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3.5 w-3.5 ${alert ? "animate-pulse text-red-600" : "text-stone-400"} transition-colors duration-300`} />
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 truncate">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold tabular-nums tracking-tight font-sans text-stone-900 transition-all duration-300">
        {value}
      </p>
    </div>
  );
}

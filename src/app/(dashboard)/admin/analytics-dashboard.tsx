"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, TrendingUp, Users, BarChart3, LineChart } from "lucide-react";

interface ChartData {
  date: string;
  presentRate: number;
  hadir: number;
  alpa: number;
  terlambat: number;
}

interface TopAbsentee {
  count: number;
  name: string;
  nis: string;
  avatar: string;
}

export function AnalyticsDashboard({
  trendData,
  topAbsentees,
}: {
  trendData: ChartData[];
  topAbsentees: TopAbsentee[];
}) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  // Summary statistics for human-centric KPIs
  const avgPresentRate =
    trendData.length > 0
      ? Math.round(
          trendData.reduce((acc, curr) => acc + curr.presentRate, 0) /
            trendData.length
        )
      : 0;

  const peakPresentRate =
    trendData.length > 0
      ? Math.max(...trendData.map((d) => d.presentRate))
      : 0;

  // Custom Human-Centric Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = new Date(label).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return (
        <div className="card-3d-ceramic p-4 border border-slate-200/90 shadow-[0_16px_32px_-6px_rgba(15,23,42,0.14)] rounded-2xl bg-white/95 backdrop-blur-xl min-w-[190px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
            <span className="font-extrabold text-xs text-slate-900">{dateStr}</span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              {data.presentRate}%
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-[#0B6BCB]" />
                Hadir
              </span>
              <span className="font-extrabold text-slate-900 tabular-nums">{data.hadir}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                Terlambat
              </span>
              <span className="font-extrabold text-slate-900 tabular-nums">{data.terlambat}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                Alpa
              </span>
              <span className="font-extrabold text-slate-900 tabular-nums">{data.alpa}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {/* Trend & Distribution Chart - Spans 2 columns on desktop */}
      <div className="md:col-span-2 card-3d-ceramic p-5 sm:p-6 transition-all duration-300">
        {/* Header & Segmented Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600 border border-blue-100/80 shadow-2xs">
                <TrendingUp className="h-4 w-4 stroke-[2.2]" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Tren & Distribusi Kehadiran
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Analisis 30 hari histori presensi siswa secara menyeluruh
            </p>
          </div>

          {/* Quick Segmented Toggle (Kurva vs Batang) */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 self-start sm:self-auto shadow-inner">
            <button
              onClick={() => setChartType("area")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === "area"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LineChart className="h-3.5 w-3.5" />
              <span>Kurva</span>
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === "bar"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Batang</span>
            </button>
          </div>
        </div>

        {/* Human-Centric KPI Quick Summary Ribbons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rata-rata Presensi
            </span>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
              {avgPresentRate}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Puncak Tertinggi
            </span>
            <p className="text-xl font-extrabold text-blue-600 tabular-nums mt-0.5">
              {peakPresentRate}%
            </p>
          </div>
          <div className="hidden sm:block rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rentang Evaluasi
            </span>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
              30 Hari Aktif
            </p>
          </div>
        </div>

        {trendData.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    {/* Reference UPDATE V.1 Blue-to-Cyan Smooth Gradient */}
                    <linearGradient id="v1AreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0B6BCB" stopOpacity={0.28} />
                      <stop offset="60%" stopColor="#00B4D8" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#00B4D8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="rgba(15,23,42,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) =>
                      new Date(val).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })
                    }
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="presentRate"
                    stroke="#0B6BCB"
                    strokeWidth={2.75}
                    fillOpacity={1}
                    fill="url(#v1AreaGradient)"
                    activeDot={{
                      r: 6,
                      className: "fill-[#0B6BCB] stroke-white stroke-[3px]",
                    }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={trendData.slice(-14)} // show last 14 days for optimal bar density
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="rgba(15,23,42,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) =>
                      new Date(val).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })
                    }
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="hadir"
                    name="Hadir"
                    fill="#0B6BCB"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="terlambat"
                    name="Terlambat"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="alpa"
                    name="Alpa"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-xs font-medium text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Belum ada riwayat absensi 30 hari terakhir
          </div>
        )}
      </div>

      {/* Top Absentees - Siswa Butuh Perhatian */}
      <div className="card-3d-ceramic p-5 sm:p-6 transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600 border border-rose-100/80 shadow-2xs">
                <AlertTriangle className="h-4 w-4 stroke-[2.2]" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Siswa Butuh Perhatian
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Top 5 Alpa akumulatif bulan ini
            </p>
          </div>
        </div>

        {topAbsentees.length > 0 ? (
          <div className="space-y-3">
            {topAbsentees.map((student) => (
              <div
                key={student.nis}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300/80 transition-all shadow-[0_2px_4px_rgba(15,23,42,0.03)] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 shrink-0 border border-slate-200 shadow-2xs overflow-hidden">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt="Avatar"
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      student.name.charAt(0)
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {student.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium tabular-nums mt-0.5">
                      NIS: {student.nis}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-rose-50 border border-rose-200/60 px-2.5 py-1 text-xs font-bold text-rose-600 shadow-2xs">
                    {student.count} Alpa
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-emerald-700 text-xs font-medium bg-emerald-50/60 rounded-2xl border border-emerald-200/50">
            <div className="text-center p-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-2 shadow-2xs border border-emerald-200/50">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-bold text-xs text-slate-900">Kondisi Kehadiran Prima</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Semua siswa tertib hadir bulan ini.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

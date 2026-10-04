"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, TrendingUp, Users } from "lucide-react";

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
  // Custom Tooltip for the chart - Apple Glass Style
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = new Date(label).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      return (
        <div className="bg-white/95 dark:bg-zinc-900/95 p-3.5 border border-stone-200 dark:border-white/10 shadow-lg rounded-xl backdrop-blur-md">
          <p className="font-semibold text-xs text-stone-900 dark:text-stone-100 mb-2 font-mono">{dateStr}</p>
          <div className="space-y-1 text-xs">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-between gap-3">
              <span>Hadir:</span>
              <span className="font-bold font-mono">{data.hadir}</span>
            </p>
            <p className="text-red-600 dark:text-red-400 font-medium flex items-center justify-between gap-3">
              <span>Alpa:</span>
              <span className="font-bold font-mono">{data.alpa}</span>
            </p>
            <p className="text-amber-600 dark:text-amber-400 font-medium flex items-center justify-between gap-3">
              <span>Terlambat:</span>
              <span className="font-bold font-mono">{data.terlambat}</span>
            </p>
            <div className="pt-2 mt-2 border-t border-stone-200 dark:border-white/10">
              <p className="font-bold text-orange-600 dark:text-orange-400 text-xs flex items-center justify-between gap-3">
                <span>Tingkat Kehadiran:</span>
                <span className="font-mono">{data.presentRate}%</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {/* Trend Chart - Spans 2 columns on desktop */}
      <div className="md:col-span-2 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-orange-500/10 p-1.5 text-orange-600 dark:text-orange-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 tracking-tight">
                Tren Kehadiran Siswa (30 Hari)
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Persentase kehadiran harian seluruh rombel aktif
            </p>
          </div>
        </div>

        {trendData.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="solarOrangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E7E2DA"
                  opacity={0.6}
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
                  tick={{ fontSize: 11, fill: "#78716C" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#78716C" }}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="presentRate"
                  stroke="#EA580C"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#solarOrangeGradient)"
                  activeDot={{
                    r: 5,
                    className: "fill-orange-600 stroke-white stroke-[2px]",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
            Belum ada riwayat absensi 30 hari terakhir
          </div>
        )}
      </div>

      {/* Top Absentees - Siswa Butuh Perhatian */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-red-500/10 p-1.5 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 tracking-tight">
                Siswa Butuh Perhatian
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Top ketidakhadiran tanpa keterangan bulan ini
            </p>
          </div>
        </div>

        {topAbsentees.length > 0 ? (
          <div className="space-y-2.5">
            {topAbsentees.map((student) => (
              <div
                key={student.nis}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-white/5 hover:border-orange-500/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-stone-900 dark:text-stone-100 shrink-0 border border-stone-200 dark:border-white/10 shadow-xs">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt="Avatar"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      student.name.charAt(0)
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                      {student.name}
                    </p>
                    <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                      NIS: {student.nis}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-semibold font-mono text-red-600 dark:text-red-400">
                    {student.count} Alpa
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-medium bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
            <div className="text-center p-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">Kondisi Kehadiran Prima</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Semua siswa tertib hadir bulan ini.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

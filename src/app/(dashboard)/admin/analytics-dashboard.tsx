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
  // Custom Tooltip with 3D Ceramic Glass Depth
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = new Date(label).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      return (
        <div className="card-3d-ceramic p-3.5 border border-slate-200/80 shadow-[0_12px_24px_-4px_rgba(15,23,42,0.12)] rounded-2xl bg-white/95 backdrop-blur-xl">
          <p className="font-bold text-xs text-slate-900 mb-2">{dateStr}</p>
          <div className="space-y-1.5 text-xs">
            <p className="text-emerald-600 font-semibold flex items-center justify-between gap-3">
              <span>Hadir:</span>
              <span className="font-extrabold tabular-nums">{data.hadir}</span>
            </p>
            <p className="text-rose-600 font-semibold flex items-center justify-between gap-3">
              <span>Alpa:</span>
              <span className="font-extrabold tabular-nums">{data.alpa}</span>
            </p>
            <p className="text-amber-600 font-semibold flex items-center justify-between gap-3">
              <span>Terlambat:</span>
              <span className="font-extrabold tabular-nums">{data.terlambat}</span>
            </p>
            <div className="pt-2 mt-1.5 border-t border-slate-100">
              <p className="font-bold text-blue-600 text-xs flex items-center justify-between gap-3">
                <span>Tingkat Kehadiran:</span>
                <span className="tabular-nums font-extrabold">{data.presentRate}%</span>
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
      <div className="md:col-span-2 card-3d-ceramic p-5 sm:p-6 transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600 border border-blue-100/80 shadow-sm">
                <TrendingUp className="h-4 w-4 stroke-[2.2]" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Tren Kehadiran (30 Hari)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Persentase siswa hadir terdaftar setiap harinya
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
                  <linearGradient id="smartRateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
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
                  tick={{ fontSize: 11, fill: "#64748B" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="presentRate"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url smartRateGradient"
                  style={{ fill: "url(#smartRateGradient)" }}
                  activeDot={{
                    r: 5,
                    className: "fill-blue-600 stroke-white stroke-[2.5px]",
                  }}
                />
              </AreaChart>
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
              <div className="rounded-xl bg-rose-50 p-2 text-rose-600 border border-rose-100/80 shadow-sm">
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
          <div className="space-y-2.5">
            {topAbsentees.map((student) => (
              <div
                key={student.nis}
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300/80 transition-all shadow-[0_2px_4px_rgba(15,23,42,0.03)] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 shrink-0 border border-slate-200 shadow-sm overflow-hidden">
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
                    <p className="text-[11px] text-slate-400 font-medium tabular-nums">
                      NIS: {student.nis}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-rose-50 border border-rose-200/60 px-2.5 py-1 text-xs font-bold text-rose-600 shadow-sm">
                    {student.count} Alpa
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-emerald-700 text-xs font-medium bg-emerald-50/60 rounded-2xl border border-emerald-200/50">
            <div className="text-center p-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-2 shadow-sm border border-emerald-200/50">
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

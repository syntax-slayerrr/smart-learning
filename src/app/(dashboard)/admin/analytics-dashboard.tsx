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
  // Custom Tooltip for the chart - Apple Glass Style (Section 4 & 24)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = new Date(label).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      return (
        <div className="bg-white/95 p-3.5 border border-[rgba(60,60,67,0.14)] shadow-[var(--shadow-floating)] rounded-2xl backdrop-blur-md">
          <p className="font-semibold text-xs text-[#1D1D1F] mb-2">{dateStr}</p>
          <div className="space-y-1 text-xs">
            <p className="text-[#34C759] font-medium flex items-center justify-between gap-3">
              <span>Hadir:</span>
              <span className="font-bold tabular">{data.hadir}</span>
            </p>
            <p className="text-[#FF3B30] font-medium flex items-center justify-between gap-3">
              <span>Alpa:</span>
              <span className="font-bold tabular">{data.alpa}</span>
            </p>
            <p className="text-[#FF9F0A] font-medium flex items-center justify-between gap-3">
              <span>Terlambat:</span>
              <span className="font-bold tabular">{data.terlambat}</span>
            </p>
            <div className="pt-2 mt-2 border-t border-[rgba(60,60,67,0.12)]">
              <p className="font-bold text-[#007AFF] text-xs flex items-center justify-between gap-3">
                <span>Tingkat Kehadiran:</span>
                <span className="tabular">{data.presentRate}%</span>
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
      {/* Trend Chart - Spans 2 columns on desktop (Section 24) */}
      <div className="md:col-span-2 rounded-[18px] border border-[rgba(60,60,67,0.12)] bg-white p-6 shadow-[var(--shadow-subtle)] apple-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#007AFF]/10 p-1.5 text-[#007AFF]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base text-[#1D1D1F] tracking-tight">
                Tren Kehadiran (30 Hari)
              </h3>
            </div>
            <p className="text-xs text-[#6E6E73] mt-1">
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
                  <linearGradient id="appleRateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(60,60,67,0.08)"
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
                  tick={{ fontSize: 11, fill: "#8E8E93" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8E8E93" }}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="presentRate"
                  stroke="#007AFF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#appleRateGradient)"
                  activeDot={{
                    r: 5,
                    className: "fill-[#007AFF] stroke-white stroke-[2px]",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-xs text-[#8E8E93] border border-dashed border-[rgba(60,60,67,0.16)] rounded-2xl">
            Belum ada riwayat absensi 30 hari terakhir
          </div>
        )}
      </div>

      {/* Top Absentees - Siswa Butuh Perhatian (Section 23 & 20) */}
      <div className="rounded-[18px] border border-[rgba(60,60,67,0.12)] bg-white p-6 shadow-[var(--shadow-subtle)] apple-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#FF3B30]/10 p-1.5 text-[#FF3B30]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base text-[#1D1D1F] tracking-tight">
                Siswa Butuh Perhatian
              </h3>
            </div>
            <p className="text-xs text-[#6E6E73] mt-1">
              Top 5 Alpa akumulatif bulan ini
            </p>
          </div>
        </div>

        {topAbsentees.length > 0 ? (
          <div className="space-y-2.5">
            {topAbsentees.map((student) => (
              <div
                key={student.nis}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F7F5] border border-[rgba(60,60,67,0.06)] hover:bg-[#F2F2F0] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center font-bold text-xs text-[#1D1D1F] shrink-0 border border-[rgba(60,60,67,0.12)] shadow-[var(--shadow-subtle)]">
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
                    <p className="font-semibold text-xs text-[#1D1D1F] truncate">
                      {student.name}
                    </p>
                    <p className="text-[11px] text-[#8E8E93] tabular">
                      NIS: {student.nis}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-[#FF3B30]/10 px-2.5 py-0.5 text-xs font-semibold text-[#FF3B30]">
                    {student.count} Alpa
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-[#34C759] text-xs font-medium bg-[#34C759]/[0.06] rounded-2xl border border-[#34C759]/15">
            <div className="text-center p-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759]/10 text-[#34C759] mb-2">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-semibold text-xs text-[#1D1D1F]">Kondisi Kehadiran Prima</p>
              <p className="text-[11px] text-[#6E6E73] mt-0.5">Semua siswa tertib hadir bulan ini.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  // Custom Tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Format date
      const dateStr = new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return (
        <div className="bg-card/95 p-3 border border-border shadow-lg rounded-xl backdrop-blur-sm">
          <p className="font-medium text-sm mb-2">{dateStr}</p>
          <div className="space-y-1 text-xs">
            <p className="text-emerald-500 font-medium">Hadir: {data.hadir}</p>
            <p className="text-red-500 font-medium">Alpa: {data.alpa}</p>
            <p className="text-amber-500 font-medium">Telat: {data.terlambat}</p>
            <div className="pt-2 mt-2 border-t">
              <p className="font-bold text-primary">Tingkat Kehadiran: {data.presentRate}%</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
      
      {/* Trend Chart - Spans 2 columns on desktop */}
      <div className="md:col-span-2 rounded-2xl border bg-card p-6 shadow-sm overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tren Kehadiran (30 Hari)
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Persentase siswa hadir setiap harinya
            </p>
          </div>
        </div>

        {trendData.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="presentRate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                  activeDot={{ r: 6, className: "fill-primary stroke-background stroke-[3px]" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
            Belum ada data absensi 30 hari terakhir
          </div>
        )}
      </div>

      {/* Top Absentees */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Siswa Butuh Perhatian
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Top 5 Alpa terbanyak bulan ini
            </p>
          </div>
        </div>

        {topAbsentees.length > 0 ? (
          <div className="space-y-4">
            {topAbsentees.map((student, idx) => (
              <div key={student.nis} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center font-bold text-muted-foreground shrink-0 border shadow-sm">
                    {student.avatar ? (
                      <img src={student.avatar} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      student.name.charAt(0)
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.nis}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {student.count} Alpa
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-medium bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <p>Hebat! Semua siswa rajin hadir.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

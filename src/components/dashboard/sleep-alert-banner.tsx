"use client";

import { AlertTriangle, Moon } from "lucide-react";

interface SleepAlertBannerProps {
  alerts: {
    session_date: string;
    subject: string;
    class_name: string;
    sleep_count: number;
  }[];
}

export function SleepAlertBanner({ alerts }: SleepAlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 shadow-2xs relative overflow-hidden transition-all">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
            </span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Peringatan: Siswa Tertidur di Jam Pelajaran
          </h3>
          <span className="text-[10px] font-mono text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md font-semibold">
            {alerts.length} Sesi Terdeteksi
          </span>
        </div>

        <div className="space-y-1.5">
          {alerts.slice(0, 5).map((alert, idx) => (
            <div
              key={`${alert.session_date}-${alert.class_name}-${idx}`}
              className="flex items-center justify-between rounded-lg bg-white border border-red-200/80 px-3.5 py-2 text-xs transition-colors hover:border-red-300"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0 h-6 w-6 rounded-md bg-red-100 flex items-center justify-center">
                  <Moon className="h-3.5 w-3.5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 truncate">
                    {alert.subject} — <span className="font-normal text-stone-600">{alert.class_name}</span>
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono">
                    {alert.session_date}
                  </p>
                </div>
              </div>
              <span className="shrink-0 ml-3 inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                {alert.sleep_count} siswa
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

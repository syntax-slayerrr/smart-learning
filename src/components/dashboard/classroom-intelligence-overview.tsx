"use client";

import { SleepAlertBanner } from "./sleep-alert-banner";
import { AtRiskStudentsTable } from "./at-risk-students-table";
import {
  Activity,
  Hand,
  Moon,
  Brain,
  BarChart3,
} from "lucide-react";

interface SchoolOverviewData {
  total_sessions_with_telemetry: number;
  total_sleep_incidents: number;
  avg_hand_raises_per_session: number;
  classes_with_highest_sleep: { class_name: string; count: number }[];
  at_risk_students: {
    student_id: string;
    student_name: string;
    nis: string;
    class_name: string;
    attendance_rate: number;
    absent_count: number;
    sleep_incidents: number;
    risk_score: number;
    risk_level: "low" | "medium" | "high" | "critical";
  }[];
  recent_sleep_alerts: {
    session_date: string;
    subject: string;
    class_name: string;
    sleep_count: number;
  }[];
}

interface ClassroomIntelligenceOverviewProps {
  data: SchoolOverviewData;
}

export function ClassroomIntelligenceOverview({ data }: ClassroomIntelligenceOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-primary shadow-2xs">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#1D1D1F]">
            Analitik Perilaku Belajar & Peringatan Dini
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Evaluasi keterlibatan pembelajaran kelas dan pemantauan siswa yang membutuhkan pendampingan
          </p>
        </div>
      </div>

      {/* Quick Stats Grid: 2 columns on mobile, 4 on desktop, NO TRUNCATION */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickStat
          label="Sesi Terpantau"
          value={data.total_sessions_with_telemetry}
          icon={BarChart3}
        />
        <QuickStat
          label="Interaksi / Sesi"
          value={data.avg_hand_raises_per_session}
          icon={Hand}
          suffix="x"
        />
        <QuickStat
          label="Insiden Tidur"
          value={data.total_sleep_incidents}
          icon={Moon}
          alert={data.total_sleep_incidents > 0}
        />
        <QuickStat
          label="Siswa At-Risk"
          value={data.at_risk_students.length}
          icon={Activity}
          alert={data.at_risk_students.length > 0}
        />
      </div>

      {/* Sleep Alerts Banner */}
      {data.recent_sleep_alerts.length > 0 && (
        <SleepAlertBanner alerts={data.recent_sleep_alerts} />
      )}

      {/* Classes with Highest Sleep */}
      {data.classes_with_highest_sleep.length > 0 && (
        <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-xs font-bold tracking-tight text-[#1D1D1F] flex items-center gap-2">
              <Moon className="h-4 w-4 text-red-600" />
              Kelas dengan Insiden Tidur Tertinggi
            </h4>
            <span className="text-[11px] text-[#8E8E93]">Bulan Ini</span>
          </div>
          <div className="space-y-3">
            {data.classes_with_highest_sleep.map((cls, idx) => {
              const maxCount = data.classes_with_highest_sleep[0]?.count || 1;
              const pct = Math.round((cls.count / maxCount) * 100);
              return (
                <div key={cls.class_name} className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[#8E8E93] w-5 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#1D1D1F] truncate">
                        {cls.class_name}
                      </span>
                      <span className="text-xs font-mono font-semibold text-red-600 shrink-0 ml-2">
                        {cls.count} insiden
                      </span>
                    </div>
                    <div className="h-2 bg-[#F2F2F1] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* At-Risk Students Table */}
      <AtRiskStudentsTable students={data.at_risk_students} />
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon: Icon,
  suffix,
  alert = false,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  suffix?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white p-3.5 shadow-2xs hover:border-[rgba(60,60,67,0.20)] transition-all">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${alert ? "text-red-600 animate-pulse" : "text-[#8E8E93]"}`} />
        <span className="text-xs font-medium text-[#6E6E73] leading-snug">
          {label}
        </span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight font-sans ${alert ? "text-red-600" : "text-[#1D1D1F]"}`}>
        {value}
        {suffix && <span className="text-xs font-normal text-[#8E8E93] ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

"use client";

import { StudentRiskBadge } from "./student-risk-badge";
import {
  Moon,
  XCircle,
  CheckCircle,
  GraduationCap,
  Activity,
  Sparkles,
} from "lucide-react";

interface ChildData {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  relationship: string;
  attendance_rate: number;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  sleep_incidents: number;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
}

interface ChildEngagementCardProps {
  child: ChildData;
}

export function ChildEngagementCard({ child }: ChildEngagementCardProps) {
  return (
    <div className="rounded-xl border border-[#E7E2DA] bg-white shadow-2xs overflow-hidden card-hover transition-all">
      {/* Header */}
      <div className="border-b border-[#E7E2DA] px-5 py-4 flex items-center justify-between bg-[#FBF9F5]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#EA580C]/10 border border-[#EA580C]/20 flex items-center justify-center text-[#EA580C] shadow-2xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-stone-900 text-sm tracking-tight">{child.student_name}</p>
            <p className="text-xs text-stone-500">
              {child.class_name} • Hubungan: <span className="capitalize">{child.relationship}</span> • <span className="font-mono">NIS: {child.nis}</span>
            </p>
          </div>
        </div>
        <StudentRiskBadge riskLevel={child.risk_level} riskScore={child.risk_score} />
      </div>

      {/* Stats Grid */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          label="Tingkat Presensi"
          value={`${child.attendance_rate}%`}
          icon={Activity}
          color={child.attendance_rate >= 85 ? "emerald" : child.attendance_rate >= 75 ? "amber" : "red"}
        />
        <MiniStat
          label="Sesi Hadir"
          value={`${child.present_count} sesi`}
          icon={CheckCircle}
          color="emerald"
        />
        <MiniStat
          label="Tidak Hadir"
          value={`${child.absent_count} hari`}
          icon={XCircle}
          color={child.absent_count > 0 ? "red" : "stone"}
        />
        <MiniStat
          label="Insiden Tertidur"
          value={child.sleep_incidents > 0 ? `${child.sleep_incidents}x` : "0 (Aman)"}
          icon={Moon}
          color={child.sleep_incidents > 0 ? "red" : "stone"}
          alert={child.sleep_incidents > 0}
        />
      </div>

      {/* Humanized Peace of Mind Note */}
      <div className="mx-5 mb-5 rounded-lg bg-[#FBF9F5] border border-[#E7E2DA] p-3 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-[#EA580C] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-600 leading-relaxed">
          {child.sleep_incidents > 0 ? (
            <p>
              <strong className="text-stone-900">Perhatian Rumah: </strong>
              Siswa terpantau {child.sleep_incidents}x mengantuk/telungkup di kelas. Mohon bantu memastikan waktu tidur malam cukup agar konsentrasi belajar tetap optimal.
            </p>
          ) : (
            <p>
              <strong className="text-emerald-700">Kondisi Belajar Prima: </strong>
              Siswa aktif mengikuti proses belajar mengajar tanpa kendala kelelahan atau mengantuk yang terdeteksi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  color,
  alert = false,
}: {
  label: string;
  value: string;
  icon: any;
  color: "emerald" | "amber" | "red" | "stone";
  alert?: boolean;
}) {
  const colorMap = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-600",
    stone: "text-stone-800",
  };

  return (
    <div className="rounded-xl border border-[#E7E2DA] bg-white p-3 shadow-2xs">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3.5 w-3.5 ${alert ? "text-red-600 animate-pulse" : "text-stone-400"}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 truncate">
          {label}
        </span>
      </div>
      <p className={`text-base font-bold tabular-nums font-sans ${colorMap[color]}`}>
        {value}
      </p>
    </div>
  );
}

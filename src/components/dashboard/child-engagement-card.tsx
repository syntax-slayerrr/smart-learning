"use client";

import { StudentRiskBadge } from "./student-risk-badge";
import {
  Moon,
  XCircle,
  CheckCircle,
  GraduationCap,
  Activity,
  ShieldCheck,
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
  hand_raise_count?: number;
  favorite_seat?: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
}

interface ChildEngagementCardProps {
  child: ChildData;
}

export function ChildEngagementCard({ child }: ChildEngagementCardProps) {
  const handRaises = child.hand_raise_count ?? 0;
  const seatName = child.favorite_seat || "Meja Siswa";

  return (
    <div className="rounded-xl border border-border bg-white dark:bg-zinc-950 shadow-2xs overflow-hidden apple-card">
      {/* Header */}
      <div className="border-b border-border px-5 py-4 flex items-center justify-between bg-stone-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-stone-900 dark:text-zinc-100 text-sm tracking-tight">{child.student_name}</p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
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
          label="Keaktifan Tanya"
          value={handRaises > 0 ? `${handRaises}x tanya` : "Aktif menyimak"}
          icon={CheckCircle}
          color="emerald"
        />
        <MiniStat
          label="Posisi Belajar"
          value={seatName}
          icon={ShieldCheck}
          color="stone"
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
      <div className="mx-5 mb-5 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-border p-3.5 flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
          {child.sleep_incidents > 0 ? (
            <p>
              <strong className="text-stone-900 dark:text-zinc-100">Perhatian Rumah: </strong>
              Siswa terpantau {child.sleep_incidents}x mengantuk/telungkup di kelas. Mohon bantu memastikan waktu tidur malam cukup agar konsentrasi belajar tetap optimal.
            </p>
          ) : (
            <p>
              <strong className="text-emerald-700 dark:text-emerald-400">Kondisi Belajar Positif: </strong>
              Anak Anda terpantau kamera kelas aktif menyimak di <span className="font-mono font-medium">{seatName}</span>
              {handRaises > 0 ? ` serta telah ${handRaises}x berpartisipasi bertanya/menjawab.` : " dalam kondisi fokus yang sangat baik."}
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
    <div className="rounded-xl border border-border bg-white p-3 shadow-2xs apple-card">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3.5 w-3.5 ${alert ? "text-red-600 animate-pulse" : "text-stone-400"}`} />
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 truncate">
          {label}
        </span>
      </div>
      <p className={`text-base font-bold tabular-nums font-sans ${colorMap[color]}`}>
        {value}
      </p>
    </div>
  );
}

"use client";

import { StudentRiskBadge } from "./student-risk-badge";
import { ShieldAlert, Moon, TrendingDown, User } from "lucide-react";

interface RiskStudent {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  attendance_rate: number;
  absent_count: number;
  sleep_incidents: number;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
}

interface AtRiskStudentsTableProps {
  students: RiskStudent[];
  title?: string;
  showClassColumn?: boolean;
}

export function AtRiskStudentsTable({
  students,
  title = "Siswa Butuh Perhatian Khusus (Early Warning)",
  showClassColumn = true,
}: AtRiskStudentsTableProps) {
  if (!students || students.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white p-8 text-center shadow-2xs">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/80 mb-2.5">
          <ShieldAlert className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-[#1D1D1F]">
          Seluruh Siswa dalam Kondisi Optimal
        </p>
        <p className="text-xs text-[#8E8E93] mt-1 max-w-sm mx-auto leading-relaxed">
          Tidak ada indikasi siswa tertidur berulang atau presensi di bawah ambang batas kehadiran.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white shadow-2xs overflow-hidden">
      {/* Table Title Bar */}
      <div className="flex items-center justify-between border-b border-[rgba(60,60,67,0.10)] px-4 sm:px-5 py-3.5 bg-white">
        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-[#1D1D1F] flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" />
          {title}
        </h3>
        <span className="text-xs font-mono text-[#1D1D1F] bg-[#F2F2F1] border border-[rgba(60,60,67,0.12)] px-2.5 py-0.5 rounded-full font-semibold">
          {students.length} Terdeteksi
        </span>
      </div>

      {/* 1. Mobile Adaptive Card View (sm:hidden) */}
      <div className="sm:hidden divide-y divide-[rgba(60,60,67,0.08)] bg-white">
        {students.map((student) => (
          <div key={student.student_id} className="p-4 space-y-3 hover:bg-[#FAFAF9] transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-[#F2F2F1] text-primary flex items-center justify-center shrink-0 border border-[rgba(60,60,67,0.08)]">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#1D1D1F] text-sm truncate">
                    {student.student_name}
                  </p>
                  <p className="text-xs font-mono text-[#8E8E93]">
                    NIS: {student.nis} {showClassColumn && `• ${student.class_name}`}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <StudentRiskBadge
                  riskLevel={student.risk_level}
                  riskScore={student.risk_score}
                  compact
                />
              </div>
            </div>

            {/* Metrics Pills Grid */}
            <div className="grid grid-cols-3 gap-2 bg-[#FAFAF9] border border-[rgba(60,60,67,0.08)] rounded-xl p-2.5 text-center">
              <div>
                <span className="text-[10px] text-[#8E8E93] block font-medium">Kehadiran</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    student.attendance_rate < 75
                      ? "text-red-600"
                      : student.attendance_rate < 85
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }`}
                >
                  {student.attendance_rate}%
                </span>
              </div>
              <div className="border-x border-[rgba(60,60,67,0.08)]">
                <span className="text-[10px] text-[#8E8E93] block font-medium">Alpha</span>
                <span className="text-xs font-mono font-semibold text-[#1D1D1F]">
                  {student.absent_count}x
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8E8E93] block font-medium">Insiden Tidur</span>
                {student.sleep_incidents > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-red-600">
                    <Moon className="h-3 w-3" />
                    {student.sleep_incidents}x
                  </span>
                ) : (
                  <span className="text-xs text-[#8E8E93] font-mono">0</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Desktop Standard Table View (hidden sm:block) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[rgba(60,60,67,0.10)] bg-[#FAFAF9]">
              <th className="px-5 py-3 text-xs font-semibold text-[#8E8E93]">
                Nama Siswa
              </th>
              {showClassColumn && (
                <th className="px-4 py-3 text-xs font-semibold text-[#8E8E93]">
                  Kelas
                </th>
              )}
              <th className="px-4 py-3 text-xs font-semibold text-[#8E8E93] text-center">
                Kehadiran
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#8E8E93] text-center">
                Alpha
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#8E8E93] text-center">
                Insiden Tidur
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-[#8E8E93] text-right">
                Tingkat Risiko
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(60,60,67,0.08)]">
            {students.map((student) => (
              <tr
                key={student.student_id}
                className="hover:bg-[#FAFAF9] transition-colors"
              >
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-[#1D1D1F] text-xs">
                    {student.student_name}
                  </p>
                  <p className="text-xs font-mono text-[#8E8E93]">
                    NIS: {student.nis}
                  </p>
                </td>
                {showClassColumn && (
                  <td className="px-4 py-3.5 font-medium text-[#6E6E73]">
                    {student.class_name}
                  </td>
                )}
                <td className="px-4 py-3.5 text-center">
                  <span
                    className={`font-mono font-bold ${
                      student.attendance_rate < 75
                        ? "text-red-600"
                        : student.attendance_rate < 85
                        ? "text-amber-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {student.attendance_rate}%
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="font-mono text-[#1D1D1F]">
                    {student.absent_count}x
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {student.sleep_incidents > 0 ? (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-red-600">
                      <Moon className="h-3 w-3" />
                      {student.sleep_incidents}x
                    </span>
                  ) : (
                    <span className="text-[#8E8E93] font-mono">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <StudentRiskBadge
                    riskLevel={student.risk_level}
                    riskScore={student.risk_score}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

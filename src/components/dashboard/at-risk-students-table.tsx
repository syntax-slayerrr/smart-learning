"use client";

import { StudentRiskBadge } from "./student-risk-badge";
import { ShieldAlert, Moon, XCircle, TrendingDown } from "lucide-react";

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
      <div className="rounded-xl border border-[#E7E2DA] bg-white p-8 text-center shadow-2xs">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 mb-2">
          <ShieldAlert className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="text-xs font-semibold text-emerald-800">
          Seluruh Siswa dalam Kondisi Optimal
        </p>
        <p className="text-[11px] text-stone-500 mt-0.5">
          Tidak ada indikasi siswa tertidur berulang atau presensi di bawah ambang batas
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E7E2DA] bg-white shadow-2xs overflow-hidden">
      {/* Table Title Bar */}
      <div className="flex items-center justify-between border-b border-[#E7E2DA] px-5 py-3.5 bg-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-[#EA580C]" />
          {title}
        </h3>
        <span className="text-[11px] font-mono text-stone-600 bg-[#F5F2EB] border border-[#E7E2DA] px-2.5 py-0.5 rounded-md font-semibold">
          {students.length} Terdeteksi
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E7E2DA] bg-[#FBF9F5]">
              <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Nama Siswa
              </th>
              {showClassColumn && (
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Kelas
                </th>
              )}
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 text-center">
                Kehadiran
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 text-center">
                Alpha
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 text-center">
                Insiden Tidur
              </th>
              <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 text-right">
                Tingkat Risiko
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E2DA]/60">
            {students.map((student) => (
              <tr
                key={student.student_id}
                className="hover:bg-[#FBF9F5] transition-colors duration-75"
              >
                <td className="px-5 py-3">
                  <p className="font-semibold text-stone-900 text-xs">
                    {student.student_name}
                  </p>
                  <p className="text-[10px] font-mono text-stone-400">
                    NIS: {student.nis}
                  </p>
                </td>
                {showClassColumn && (
                  <td className="px-4 py-3 font-medium text-stone-600">
                    {student.class_name}
                  </td>
                )}
                <td className="px-4 py-3 text-center">
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
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-stone-700">
                    {student.absent_count}x
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {student.sleep_incidents > 0 ? (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-red-600">
                      <Moon className="h-3 w-3" />
                      {student.sleep_incidents}x
                    </span>
                  ) : (
                    <span className="text-stone-300 font-mono">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
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

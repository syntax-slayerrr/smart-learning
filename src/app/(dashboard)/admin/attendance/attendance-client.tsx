"use client";

import { useState, useMemo, useTransition } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Download, Search, ArrowUpDown, Filter, Loader2, Calendar, Users } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { exportProfessionalExcel } from "@/lib/excel-utils";
import { Button } from "@/components/ui/button";

function extractName(profiles: any): string {
  if (!profiles) return "Tanpa Nama";
  if (Array.isArray(profiles)) return profiles[0]?.full_name || "Tanpa Nama";
  return profiles.full_name || "Tanpa Nama";
}

function extractClass(classes: any): string {
  if (!classes) return "—";
  if (Array.isArray(classes)) return classes[0]?.name || "—";
  return classes.name || "—";
}

interface AttendanceClientProps {
  students: any[];
  sessions: any[];
  records: any[];
  classes: any[];
}

export function AttendanceClient({ students, sessions, records, classes }: AttendanceClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const selectedClass = searchParams.get("classId") || "";
  const selectedDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [localDate, setLocalDate] = useState(selectedDate);
  const [localClass, setLocalClass] = useState(selectedClass);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (localDate) params.set("date", localDate);
    if (localClass) params.set("classId", localClass);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Group sessions by class
  const classSessions = useMemo(() => {
    const map: Record<string, any[]> = {};
    sessions.forEach((session) => {
      if (!map[session.class_id]) map[session.class_id] = [];
      map[session.class_id].push(session);
    });
    // Ensure they are sorted by subject_start_time
    Object.keys(map).forEach((classId) => {
      map[classId].sort((a, b) =>
        (a.subject_start_time || "").localeCompare(b.subject_start_time || "")
      );
    });
    return map;
  }, [sessions]);

  // Determine max JP (Jam Pelajaran) length to render columns
  const maxJP = useMemo(() => {
    let max = 0;
    Object.values(classSessions).forEach((sessArr) => {
      if (sessArr.length > max) max = sessArr.length;
    });
    return max === 0 ? 1 : max;
  }, [classSessions]);

  // Apply filters on students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedClass && student.class_id !== selectedClass) return false;
      const studentName = extractName(student.profiles).toLowerCase();
      if (searchTerm && !studentName.includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [students, selectedClass, searchTerm]);

  // Apply sorting on students
  const sortedStudents = useMemo(() => {
    const sortable = [...filteredStudents];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aValue = "";
        let bValue = "";

        switch (sortConfig.key) {
          case "student":
            aValue = extractName(a.profiles);
            bValue = extractName(b.profiles);
            break;
          case "class":
            aValue = extractClass(a.classes);
            bValue = extractClass(b.classes);
            break;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      sortable.sort((a, b) => {
        const nameA = extractName(a.profiles);
        const nameB = extractName(b.profiles);
        return nameA.localeCompare(nameB);
      });
    }
    return sortable;
  }, [filteredStudents, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getRecordForSession = (studentId: string, sessionId: string) => {
    return records.find((r) => r.student_id === studentId && r.session_id === sessionId);
  };

  const formatStatus = (record: any) => {
    if (!record) return { label: "Tidak Hadir", type: "absent" };
    switch (record.status) {
      case "present":
      case "late": {
        let dateStr = record.scanned_at || record.created_at;
        if (!dateStr) return { label: "Hadir", type: "present" };
        if (!dateStr.includes("Z") && !dateStr.includes("+")) {
          dateStr += "Z";
        }
        return {
          label:
            new Date(dateStr)
              .toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
              })
              .replace(/\./g, ":") + " WIB",
          type: "present",
        };
      }
      case "sick":
        return { label: "Sakit", type: "sick" };
      case "excused":
        return { label: "Izin", type: "warning" };
      case "absent":
        return { label: "Tidak Hadir", type: "absent" };
      default:
        return { label: "Tidak Hadir", type: "absent" };
    }
  };

  const getStatusBadgeClass = (type: string) => {
    switch (type) {
      case "present":
        return "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20";
      case "warning":
        return "bg-[#FF9F0A]/10 text-[#FF9F0A] border-[#FF9F0A]/20";
      case "sick":
        return "bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20";
      case "absent":
      default:
        return "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20";
    }
  };

  const handleExport = async () => {
    if (sortedStudents.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const exportReadyData = sortedStudents.map((student) => {
      const row: any = {
        nama: extractName(student.profiles),
        kelas: extractClass(student.classes),
      };

      const mySessions = classSessions[student.class_id] || [];
      for (let i = 0; i < maxJP; i++) {
        const session = mySessions[i];
        if (session) {
          const record = getRecordForSession(student.id, session.id);
          row[`jp${i + 1}`] = formatStatus(record).label;
        } else {
          row[`jp${i + 1}`] = "-";
        }
      }

      return row;
    });

    const columns = [
      { header: "Nama Siswa", key: "nama", width: 35 },
      { header: "Kelas", key: "kelas", width: 15 },
    ];
    for (let i = 0; i < maxJP; i++) {
      columns.push({ header: `JP ${i + 1}`, key: `jp${i + 1}`, width: 15 });
    }

    await exportProfessionalExcel({
      title: "LAPORAN KEHADIRAN HARIAN SISWA",
      subtitle: "SYNTAX SLAYER — Monitoring Presensi Jam Pelajaran (JP)",
      period: `Tanggal: ${format(new Date(selectedDate), "dd MMMM yyyy", { locale: id })}`,
      filename: `Kehadiran_Siswa_${selectedDate}.xlsx`,
      withPrintFooter: true,
      columns: columns,
      data: exportReadyData,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#8E8E93]">
            REKAPITULASI PRESENSI
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
            Laporan Absensi Siswa
          </h1>
          <p className="text-xs text-[#6E6E73] mt-0.5">
            Monitor kehadiran harian siswa terintegrasi Jam Pelajaran (JP).
          </p>
        </div>
        <div>
          <Button
            type="button"
            variant="primary"
            onClick={handleExport}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
          >
            <Download className="h-4 w-4" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1F]">
          <Filter className="h-3.5 w-3.5 text-[#007AFF]" />
          <span>Filter Laporan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="filter-date" className="text-xs font-semibold text-[#6E6E73] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Tanggal
            </label>
            <input
              id="filter-date"
              type="date"
              aria-label="Pilih tanggal laporan absensi"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.16)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="filter-class" className="text-xs font-semibold text-[#6E6E73] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Kelas
            </label>
            <select
              id="filter-class"
              aria-label="Filter berdasarkan kelas"
              value={localClass}
              onChange={(e) => setLocalClass(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.16)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
            >
              <option value="">Semua Kelas</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={applyFilters}
              disabled={isPending}
              className="w-full min-h-[44px] justify-center"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Memperbarui Data...</span>
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-1.5 text-[#007AFF]" />
                  <span>Terapkan Filter</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
        <input
          type="text"
          aria-label="Cari siswa"
          placeholder="Cari siswa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.12)] bg-white pl-10 pr-4 py-2 text-sm text-[#1D1D1F] outline-none placeholder:text-[#8E8E93] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
        />
      </div>

      {/* MOBILE LIST VIEW (Cards by Student with JP badges) */}
      <div className="sm:hidden space-y-3">
        {sortedStudents.map((student: any) => {
          const studentName = extractName(student.profiles);
          const className = extractClass(student.classes);
          const mySessions = classSessions[student.class_id] || [];

          return (
            <article
              key={student.id}
              className="card-3d-ceramic p-4 sm:p-5 space-y-3.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 shrink-0 border border-slate-200 shadow-sm">
                    {studentName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">{studentName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-400 tabular-nums">{student.nis || "—"}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs font-semibold text-blue-600">{className}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* JP Status Grid - Tactile Pods */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                {Array.from({ length: maxJP }).map((_, i) => {
                  const session = mySessions[i];
                  if (!session) return null;

                  const record = getRecordForSession(student.id, session.id);
                  const status = formatStatus(record);

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 shadow-inner"
                    >
                      <span className="text-[11px] font-bold text-slate-600">JP {i + 1}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${getStatusBadgeClass(
                          status.type
                        )}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}

        {sortedStudents.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-[rgba(60,60,67,0.12)] text-[#8E8E93] text-sm">
            Tidak ada data presensi yang sesuai.
          </div>
        )}
      </div>

      {/* DESKTOP DATA TABLE */}
      <div className="hidden sm:block rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(60,60,67,0.08)] bg-[#F7F7F5]/80 text-[#6E6E73]">
                <th
                  onClick={() => requestSort("student")}
                  className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-[#1D1D1F]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Siswa</span>
                    <ArrowUpDown className="h-3 w-3 text-[#8E8E93]" />
                  </div>
                </th>
                <th
                  onClick={() => requestSort("class")}
                  className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-[#1D1D1F]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kelas</span>
                    <ArrowUpDown className="h-3 w-3 text-[#8E8E93]" />
                  </div>
                </th>
                {Array.from({ length: maxJP }).map((_, i) => (
                  <th
                    key={i}
                    className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider uppercase"
                  >
                    JP {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(60,60,67,0.08)]">
              {sortedStudents.map((student: any) => {
                const studentName = extractName(student.profiles);
                const className = extractClass(student.classes);
                const mySessions = classSessions[student.class_id] || [];

                return (
                  <tr key={student.id} className="hover:bg-[#F7F7F5]/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#1D1D1F]">
                      <div className="whitespace-nowrap">{studentName}</div>
                      <div className="text-xs font-mono text-[#8E8E93]">{student.nis || "—"}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">{className}</td>

                    {Array.from({ length: maxJP }).map((_, i) => {
                      const session = mySessions[i];
                      if (!session) {
                        return (
                          <td key={i} className="px-4 py-3.5 text-center text-[#C7C7CC]">
                            —
                          </td>
                        );
                      }

                      const record = getRecordForSession(student.id, session.id);
                      const status = formatStatus(record);

                      return (
                        <td key={i} className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                              status.type
                            )}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {sortedStudents.length === 0 && (
                <tr>
                  <td colSpan={maxJP + 2} className="px-5 py-12 text-center text-[#8E8E93]">
                    Tidak ada data siswa yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

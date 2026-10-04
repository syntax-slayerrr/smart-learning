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
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "sick":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "absent":
      default:
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    }
  };

  // Immediate attendance statistics from records
  const statsSummary = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    records.forEach((r) => {
      if (r.status === "present") hadir++;
      else if (r.status === "late") terlambat++;
      else if (r.status === "excused") izin++;
      else if (r.status === "sick") sakit++;
      else if (r.status === "absent") alpa++;
    });

    const totalScanned = hadir + terlambat + izin + sakit + alpa;
    const rate = totalScanned > 0 ? Math.round(((hadir + terlambat) / totalScanned) * 100) : 0;

    return { hadir, terlambat, izin, sakit, alpa, rate, totalScanned };
  }, [records]);

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
      subtitle: "SMK TI SYNTAX SLAYER — Monitoring Presensi Jam Pelajaran (JP)",
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
          <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 dark:text-orange-400">
            REKAPITULASI PRESENSI • SMK TI SYNTAX SLAYER
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Monitoring Presensi Harian Siswa
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Pelacakan kehadiran multi-sesi Jam Pelajaran (JP) dengan verifikasi AI & barcode scanner.
          </p>
        </div>
        <div>
          <Button
            type="button"
            variant="primary"
            onClick={handleExport}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Lembar Excel</span>
          </Button>
        </div>
      </div>

      {/* Immediate Attendance Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs">
          <p className="text-[11px] font-medium text-stone-500">Tingkat Hadir</p>
          <p className="text-2xl font-bold font-mono text-orange-600 dark:text-orange-400 mt-0.5">
            {statsSummary.rate}%
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs">
          <p className="text-[11px] font-medium text-stone-500">Hadir Tepat Waktu</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {statsSummary.hadir}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs">
          <p className="text-[11px] font-medium text-stone-500">Terlambat</p>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            {statsSummary.terlambat}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs">
          <p className="text-[11px] font-medium text-stone-500">Izin & Sakit</p>
          <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            {statsSummary.izin + statsSummary.sakit}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs">
          <p className="text-[11px] font-medium text-stone-500">Alpa / Belum Absen</p>
          <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
            {statsSummary.alpa}
          </p>
        </div>
      </div>

      {/* Filter Toolbar (Controls separated from data) */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 dark:text-stone-100">
          <Filter className="h-3.5 w-3.5 text-orange-600" />
          <span>Filter Parameter Tanggal & Rombel</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              Tanggal Presensi
            </label>
            <input
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-zinc-800/60 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-stone-400" />
              Rombel / Kelas
            </label>
            <select
              value={localClass}
              onChange={(e) => setLocalClass(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-zinc-800/60 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 transition-all"
            >
              <option value="">Semua Rombel</option>
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
                  <Filter className="h-4 w-4 mr-1.5 text-orange-600" />
                  <span>Terapkan Filter</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Search Input Toolbar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="text"
          placeholder="Cari nama atau NIS siswa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2 text-sm text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 transition-all shadow-xs"
        />
      </div>

      {/* MOBILE LIST VIEW (Cards by Student with JP badges) */}
      <div className="sm:hidden space-y-3">
        {sortedStudents.map((student: any) => {
          const studentName = extractName(student.profiles);
          const className = extractClass(student.classes);
          const mySessions = classSessions[student.class_id] || [];

          return (
            <div
              key={student.id}
              className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{studentName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-stone-500">{student.nis || "—"}</span>
                    <span className="text-xs text-stone-400">•</span>
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{className}</span>
                  </div>
                </div>
              </div>

              {/* JP Status Grid */}
              <div className="pt-2 border-t border-stone-100 dark:border-white/5 grid grid-cols-2 gap-2">
                {Array.from({ length: maxJP }).map((_, i) => {
                  const session = mySessions[i];
                  if (!session) return null;

                  const record = getRecordForSession(student.id, session.id);
                  const status = formatStatus(record);

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-white/5"
                    >
                      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">JP {i + 1}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${getStatusBadgeClass(
                          status.type
                        )}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {sortedStudents.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-white/10 text-stone-500 text-sm">
            Tidak ada data presensi yang sesuai dengan parameter filter.
          </div>
        )}
      </div>

      {/* DESKTOP DATA TABLE */}
      <div className="hidden sm:block rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-zinc-800/60 text-stone-600 dark:text-stone-400">
                <th
                  onClick={() => requestSort("student")}
                  className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-stone-900 dark:hover:text-stone-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Siswa</span>
                    <ArrowUpDown className="h-3 w-3 text-stone-400" />
                  </div>
                </th>
                <th
                  onClick={() => requestSort("class")}
                  className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-stone-900 dark:hover:text-stone-100"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kelas / Rombel</span>
                    <ArrowUpDown className="h-3 w-3 text-stone-400" />
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
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {sortedStudents.map((student: any) => {
                const studentName = extractName(student.profiles);
                const className = extractClass(student.classes);
                const mySessions = classSessions[student.class_id] || [];

                return (
                  <tr key={student.id} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-stone-900 dark:text-stone-100">
                      <div className="whitespace-nowrap">{studentName}</div>
                      <div className="text-xs font-mono text-stone-500">{student.nis || "—"}</div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600 dark:text-stone-400 whitespace-nowrap">{className}</td>

                    {Array.from({ length: maxJP }).map((_, i) => {
                      const session = mySessions[i];
                      if (!session) {
                        return (
                          <td key={i} className="px-4 py-3.5 text-center text-stone-300 dark:text-stone-600">
                            —
                          </td>
                        );
                      }

                      const record = getRecordForSession(student.id, session.id);
                      const status = formatStatus(record);

                      return (
                        <td key={i} className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-mono border ${getStatusBadgeClass(
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
                  <td colSpan={maxJP + 2} className="px-5 py-12 text-center text-stone-400">
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

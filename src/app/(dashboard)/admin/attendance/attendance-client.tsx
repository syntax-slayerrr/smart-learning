"use client";

import { useState, useMemo, useTransition } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Download, Search, ArrowUpDown, Filter, Loader2 } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { exportProfessionalExcel } from "@/lib/excel-utils";

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
    sessions.forEach(session => {
      if (!map[session.class_id]) map[session.class_id] = [];
      map[session.class_id].push(session);
    });
    // Ensure they are sorted by subject_start_time
    Object.keys(map).forEach(classId => {
      map[classId].sort((a, b) => (a.subject_start_time || "").localeCompare(b.subject_start_time || ""));
    });
    return map;
  }, [sessions]);

  // Determine max JP (Jam Pelajaran) length to render columns
  const maxJP = useMemo(() => {
    let max = 0;
    Object.values(classSessions).forEach(sessArr => {
      if (sessArr.length > max) max = sessArr.length;
    });
    return max === 0 ? 1 : max; // at least 1 column for UI spacing if empty
  }, [classSessions]);

  // Apply filters on students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 1. Class filter (already handled partly by server, but enforce here)
      if (selectedClass && student.class_id !== selectedClass) return false;

      // 2. Search filter
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
    return records.find(r => r.student_id === studentId && r.session_id === sessionId);
  };

  const formatStatus = (record: any) => {
    if (!record) return { label: "Tidak Hadir", type: "absent" };
    switch(record.status) {
      case 'present':
      case 'late': {
        let dateStr = record.scanned_at || record.created_at;
        if (!dateStr) return { label: "Hadir", type: "present" };
        // Ensure UTC timezone if missing
        if (!dateStr.includes('Z') && !dateStr.includes('+')) {
          dateStr += 'Z';
        }
        return { 
          label: new Date(dateStr).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ':') + " WIB", 
          type: "present" 
        };
      }
      case 'sick': return { label: 'Sakit', type: "warning" };
      case 'excused': return { label: 'Izin', type: "warning" };
      case 'absent': return { label: 'Tidak Hadir', type: "absent" };
      default: return { label: 'Tidak Hadir', type: "absent" };
    }
  };

  const handleExport = async () => {
    if (sortedStudents.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const exportReadyData = sortedStudents.map(student => {
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
      title: "LAPORAN KEHADIRAN SISWA",
      period: `Tanggal: ${format(new Date(selectedDate), "dd MMMM yyyy", { locale: id })}`,
      filename: `Kehadiran_Siswa_${selectedDate}.xlsx`,
      columns: columns,
      data: exportReadyData
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Absensi Siswa</h1>
          <p className="text-muted-foreground">
            Monitor kehadiran seluruh siswa secara interaktif berdasarkan Jam Pelajaran.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-emerald-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel Profesional
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 bg-card border rounded-xl p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Tanggal</label>
            <input
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Kelas</label>
            <select 
              value={localClass}
              onChange={(e) => setLocalClass(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
            >
              <option value="">Semua Kelas</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={applyFilters}
          disabled={isPending}
          className="apple-press inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menarik Data...
            </>
          ) : (
            <>
              <Filter className="mr-2 h-4 w-4" />
              Terapkan Filter
            </>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-muted-foreground uppercase">Pencarian Cepat</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ketik nama siswa untuk mencari (tanpa klik tombol terapkan)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/30">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort('student')}>
                  <div className="flex items-center gap-1">Nama Siswa <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort('class')}>
                  <div className="flex items-center gap-1">Kelas <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                {Array.from({ length: maxJP }).map((_, i) => (
                  <th key={i} className="h-12 px-4 text-center align-middle font-medium text-muted-foreground whitespace-nowrap">
                    JP {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {sortedStudents?.map((student: any) => {
                const studentName = extractName(student.profiles);
                const className = extractClass(student.classes);
                const mySessions = classSessions[student.class_id] || [];

                return (
                  <tr key={student.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="font-medium whitespace-nowrap">{studentName}</div>
                      <div className="text-xs text-muted-foreground">{student.nis || "—"}</div>
                    </td>
                    <td className="p-4 align-middle font-medium whitespace-nowrap">{className}</td>
                    
                    {Array.from({ length: maxJP }).map((_, i) => {
                      const session = mySessions[i];
                      if (!session) {
                        return <td key={i} className="p-4 align-middle text-center text-muted-foreground">-</td>;
                      }

                      const record = getRecordForSession(student.id, session.id);
                      const status = formatStatus(record);

                      return (
                        <td key={i} className="p-4 align-middle text-center">
                          <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                            status.type === 'present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            status.type === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {status.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {(!sortedStudents || sortedStudents.length === 0) && (
                <tr>
                  <td colSpan={maxJP + 2} className="p-12 text-center text-muted-foreground">
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

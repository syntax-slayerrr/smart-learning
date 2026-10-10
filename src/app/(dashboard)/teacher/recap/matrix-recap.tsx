"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  FileSpreadsheet, 
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { SCHOOL_NAME } from "@/lib/constants";

interface Student {
  id: string;
  full_name: string;
  class_id: string;
}

interface AttendanceRecord {
  student_id: string;
  session_id: string;
  status: string;
}

interface Session {
  id: string;
  date: string;
  subject: string;
  class_id: string;
}

interface MatrixRecapProps {
  students: Student[];
  sessions: Session[];
  records: AttendanceRecord[];
  classes: { id: string, name: string }[];
  subjects: string[];
}

export default function MatrixRecapClient({
  students,
  sessions,
  records,
  classes,
  subjects,
}: MatrixRecapProps) {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || "");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter sessions based on selection and date range
  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        const matchesClass = s.class_id === selectedClass;
        const matchesSubject = s.subject === selectedSubject;
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        const matchesStart = startDate ? sessionDate >= startDate : true;
        const matchesEnd = endDate ? sessionDate <= endDate : true;
        return matchesClass && matchesSubject && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, selectedClass, selectedSubject, startDate, endDate]);

  // Create a map for quick lookup: student_id -> session_id -> status
  const recordMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    records.forEach(r => {
      if (!map[r.student_id]) map[r.student_id] = {};
      map[r.student_id][r.session_id] = r.status;
    });
    return map;
  }, [records]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.class_id === selectedClass && 
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, selectedClass, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-emerald-50 text-emerald-700 border border-emerald-300/80";
      case "late": return "bg-amber-50 text-amber-700 border border-amber-300/80";
      case "sick": return "bg-sky-50 text-sky-700 border border-sky-300/80";
      case "excused": return "bg-purple-50 text-purple-700 border border-purple-300/80";
      case "absent": return "bg-rose-50 text-rose-700 border border-rose-300/80";
      default: return "bg-slate-50 text-slate-300 border border-slate-200/50";
    }
  };

  const getStatusCode = (status: string) => {
    switch (status) {
      case "present": return "H";
      case "late": return "T";
      case "sick": return "S";
      case "excused": return "I";
      case "absent": return "A";
      default: return "-";
    }
  };

  const handleExport = () => {
    if (filteredStudents.length === 0) {
      alert("Tidak ada data untuk di-export.");
      return;
    }

    const exportData = filteredStudents.map(student => {
      let presentCount = 0;
      const rowData: Record<string, any> = {
        "Nama Siswa": student.full_name,
      };

      filteredSessions.forEach((session, idx) => {
        const status = recordMap[student.id]?.[session.id];
        if (status === "present" || status === "late") presentCount++;
        
        const dateStr = new Date(session.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
        rowData[`P${idx + 1} (${dateStr})`] = getStatusCode(status || "");
      });

      const percentage = filteredSessions.length > 0 
        ? Math.round((presentCount / filteredSessions.length) * 100) 
        : 0;
        
      rowData["% Hadir"] = `${percentage}%`;
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxContentLength = Math.max(
        key.length,
        ...exportData.map(row => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: maxContentLength + 2 };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Matriks");

    const className = classes.find(c => c.id === selectedClass)?.name || "Kelas";
    XLSX.writeFile(workbook, `Rekap_Matriks_${className}_${selectedSubject}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Filter Bar with Apple Precision Inset */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3.5 print:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Kelas</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-xs transition-colors"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Mata Pelajaran</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none shadow-xs transition-colors"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Dari Tanggal</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none shadow-xs transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Sampai Tanggal</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none shadow-xs transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none shadow-xs transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => window.print()}
              className="flex h-9 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all"
              title="Cetak format cetak A4 atau simpan PDF"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Cetak / PDF</span>
            </button>
            <button 
              onClick={handleExport}
              className="flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-4 text-xs font-semibold text-white shadow-xs transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Informative notice if no sessions exist yet */}
      {filteredSessions.length === 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs shadow-xs">
          <span className="text-base select-none">💡</span>
          <div>
            <p className="font-bold text-amber-950">Belum ada riwayat pertemuan presensi</p>
            <p className="text-[11px] text-amber-800/90 mt-0.5">
              Belum ada data absensi untuk kelas dan mata pelajaran yang dipilih. Kolom pertemuan otomatis tampil begitu guru melakukan sesi presensi.
            </p>
          </div>
        </div>
      )}

      {/* Print Official Letterhead (Hanya tampil saat dicetak ke printer / PDF) */}
      <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-2">
        <h2 className="text-base font-bold uppercase tracking-tight text-slate-900">
          {SCHOOL_NAME}
        </h2>
        <p className="text-xs font-semibold text-slate-700">
          LEMBAR REKAPITULASI PRESENSI PEMBELAJARAN SISWA
        </p>
        <p className="text-[10px] font-mono text-slate-600 mt-1">
          Kelas: {classes.find((c) => c.id === selectedClass)?.name || "-"} • Mata Pelajaran: {selectedSubject} • Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* 2. Matrix Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden print:border-none print:shadow-none">
        {/* Mobile scroll hint */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50 sm:hidden">
          <span className="text-[11px] font-medium text-slate-500">
            Total {filteredStudents.length} siswa • {filteredSessions.length} sesi pertemuan
          </span>
          {filteredSessions.length > 0 && (
            <span className="text-[10px] font-semibold text-blue-600">
              Geser tabel →
            </span>
          )}
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-max min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80">
                {/* Fixed Sticky Student Column */}
                <th className="sticky left-0 z-20 w-44 min-w-[176px] max-w-[176px] sm:w-60 sm:min-w-[240px] sm:max-w-[240px] bg-slate-50/95 backdrop-blur-md px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200/80 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.05)]">
                  Nama Siswa
                </th>

                {/* Uniform Session Columns or Empty Session State Header */}
                {filteredSessions.length === 0 ? (
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 border-r border-slate-200/70">
                    Status Riwayat Pertemuan
                  </th>
                ) : (
                  filteredSessions.map((session, idx) => (
                    <th 
                      key={session.id} 
                      className="w-14 min-w-[56px] max-w-[56px] px-1 py-2.5 text-center border-r border-slate-200/70 bg-slate-50/90"
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[11px] font-extrabold text-slate-700">P{idx + 1}</span>
                        <span className="text-[9px] font-medium text-slate-400 font-mono tracking-tight">
                          {new Date(session.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    </th>
                  ))
                )}

                {/* Summary Attendance Column */}
                <th className="w-20 min-w-[80px] max-w-[80px] px-2 py-3 text-center text-[11px] font-bold text-blue-950 uppercase tracking-wider bg-blue-50/60 border-l border-slate-200/80">
                  % Hadir
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td 
                    colSpan={filteredSessions.length + 2} 
                    className="px-6 py-12 text-center text-xs text-slate-400 font-medium"
                  >
                    Tidak ada data siswa ditemukan untuk kriteria ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  let presentCount = 0;
                  const totalSessions = filteredSessions.length;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Sticky Student Name with subtle shadow */}
                      <td className="sticky left-0 z-10 w-44 min-w-[176px] max-w-[176px] sm:w-60 sm:min-w-[240px] sm:max-w-[240px] bg-white group-hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-900 border-r border-slate-100 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.05)] transition-colors">
                        <div className="truncate" title={student.full_name}>
                          {student.full_name}
                        </div>
                      </td>

                      {/* Session Status Chips or Empty Sessions Row Cell */}
                      {filteredSessions.length === 0 ? (
                        <td className="px-4 py-2.5 text-center text-xs text-slate-400 italic border-r border-slate-100">
                          Belum ada sesi presensi yang tercatat
                        </td>
                      ) : (
                        filteredSessions.map((session) => {
                          const status = recordMap[student.id]?.[session.id];
                          if (status === "present" || status === "late") presentCount++;
                          
                          return (
                            <td 
                              key={session.id} 
                              className="w-14 min-w-[56px] max-w-[56px] p-1.5 border-r border-slate-100 text-center align-middle"
                            >
                              <div className={cn(
                                "mx-auto flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-xs font-bold transition-all shadow-xs",
                                getStatusColor(status || "")
                              )}>
                                {getStatusCode(status || "")}
                              </div>
                            </td>
                          );
                        })
                      )}

                      {/* Percentage Badge */}
                      {(() => {
                        const percentage = totalSessions > 0 
                          ? Math.round((presentCount / totalSessions) * 100) 
                          : 0;

                        return (
                          <td className="w-20 min-w-[80px] max-w-[80px] px-2 py-2.5 text-center align-middle bg-blue-50/20 border-l border-slate-100">
                            {totalSessions === 0 ? (
                              <span className="text-xs font-semibold text-slate-400">-</span>
                            ) : (
                              <span className={cn(
                                "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold",
                                percentage >= 85 ? "bg-emerald-100 text-emerald-800" :
                                percentage >= 70 ? "bg-amber-100 text-amber-800" :
                                "bg-rose-100 text-rose-800"
                              )}>
                                {percentage}%
                              </span>
                            )}
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Keterangan:</span>
            <div className="grid grid-cols-5 gap-1 sm:flex sm:items-center sm:gap-3 text-slate-600">
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-300/80 text-[10px]">H</span>
                <span className="text-[10px] sm:text-xs">Hadir</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-300/80 text-[10px]">T</span>
                <span className="text-[10px] sm:text-xs">Telat</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-300/80 text-[10px]">S</span>
                <span className="text-[10px] sm:text-xs">Sakit</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-300/80 text-[10px]">I</span>
                <span className="text-[10px] sm:text-xs">Izin</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-300/80 text-[10px]">A</span>
                <span className="text-[10px] sm:text-xs">Alpa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

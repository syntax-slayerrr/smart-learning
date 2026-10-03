"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronLeft,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

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

  const filteredStudents = students.filter(s => 
    s.class_id === selectedClass && 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-emerald-100 text-emerald-700 font-bold";
      case "late": return "bg-amber-100 text-amber-700 font-bold";
      case "sick": return "bg-blue-100 text-blue-700 font-bold";
      case "excused": return "bg-purple-100 text-purple-700 font-bold";
      case "absent": return "bg-red-100 text-red-700 font-bold";
      default: return "bg-muted/30 text-muted-foreground text-xs";
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
      return { wch: maxContentLength + 2 }; // Add padding
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Matriks");

    const className = classes.find(c => c.id === selectedClass)?.name || "Kelas";
    XLSX.writeFile(workbook, `Rekap_Matriks_${className}_${selectedSubject}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-4 bg-card border rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Kelas</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Mata Pelajaran</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Dari Tanggal</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Sampai Tanggal</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full lg:w-64 rounded-lg border bg-background pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <button 
            onClick={handleExport}
            className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-20 bg-muted/50 px-4 py-3 text-sm font-bold border-r border-b min-w-[200px]">
                  Nama Siswa
                </th>
                {filteredSessions.map((session, idx) => (
                  <th key={session.id} className="px-2 py-3 text-[10px] font-bold text-center border-b border-r min-w-[40px] uppercase">
                    <div className="flex flex-col">
                      <span>P{idx + 1}</span>
                      <span className="text-[8px] font-medium text-muted-foreground">
                        {new Date(session.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-sm font-bold text-center border-b min-w-[80px] bg-primary/5">
                  % Hadir
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                let presentCount = 0;
                const totalSessions = filteredSessions.length;

                return (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2.5 text-sm font-medium border-r border-b group-hover:bg-muted/30">
                      {student.full_name}
                    </td>
                    {filteredSessions.map((session) => {
                      const status = recordMap[student.id]?.[session.id];
                      if (status === "present" || status === "late") presentCount++;
                      
                      return (
                        <td key={session.id} className={cn(
                          "p-0 border-r border-b text-center align-middle",
                        )}>
                          <div className={cn(
                            "mx-auto flex h-7 w-7 items-center justify-center rounded text-[10px] transition-all",
                            getStatusColor(status || "")
                          )}>
                            {getStatusCode(status || "")}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-sm font-bold text-center border-b bg-primary/5">
                      {totalSessions > 0 
                        ? Math.round((presentCount / totalSessions) * 100) 
                        : 0}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground p-2">
        <div className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-100 text-emerald-700 font-bold">H</span> Hadir</div>
        <div className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-amber-100 text-amber-700 font-bold">T</span> Terlambat</div>
        <div className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-blue-100 text-blue-700 font-bold">S</span> Sakit</div>
        <div className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-purple-100 text-purple-700 font-bold">I</span> Izin</div>
        <div className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-red-100 text-red-700 font-bold">A</span> Alpa</div>
      </div>
    </div>
  );
}

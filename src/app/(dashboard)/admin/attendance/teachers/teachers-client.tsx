"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Download, Filter, Search, ArrowUpDown } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TeacherStatusAction } from "./teacher-status-action";
import { exportProfessionalExcel } from "@/lib/excel-utils";

interface TeachersClientProps {
  initialData: any[];
  classes: any[];
}

export function TeachersClient({ initialData, classes }: TeachersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const selectedClass = searchParams.get("classId") || "";
  const selectedDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const updateFilters = (date: string, classId: string) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (classId) params.set("classId", classId);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Apply filters in memory
  const filteredData = useMemo(() => {
    return initialData.filter((session) => {
      // 1. Date Filter
      const matchDate = session.session_date === selectedDate;
      if (!matchDate) return false;

      // 2. Class Filter
      const matchClass = selectedClass ? session.class_id === selectedClass : true;
      if (!matchClass) return false;

      // 3. Search Filter
      const teacherName = session.teachers?.profiles?.full_name?.toLowerCase() || "";
      const matchSearch = teacherName.includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      return true;
    });
  }, [initialData, selectedDate, selectedClass, searchTerm]);

  // Apply sorting
  const sortedData = useMemo(() => {
    const sortableData = [...filteredData];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        let aValue = "";
        let bValue = "";

        switch (sortConfig.key) {
          case "teacher":
            aValue = a.teachers?.profiles?.full_name || "";
            bValue = b.teachers?.profiles?.full_name || "";
            break;
          case "subject":
            aValue = a.subjects?.name || "";
            bValue = b.subjects?.name || "";
            break;
          case "class":
            aValue = a.classes?.name || "";
            bValue = b.classes?.name || "";
            break;
          case "schedule":
            aValue = a.subject_start_time || "";
            bValue = b.subject_start_time || "";
            break;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleExport = async () => {
    if (sortedData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const exportReadyData = sortedData.map(session => {
      let status = "Tidak Hadir";
      if (session.teacher_present_at) {
        status = "Hadir";
      } else if (session.status === "active") {
        const isExpired = new Date(session.qr_expires_at).getTime() < new Date().getTime();
        if (!isExpired) {
          status = "Sedang Berjalan";
        }
      }

      return {
        tanggal: format(new Date(session.session_date), "dd/MM/yyyy"),
        guru: session.teachers?.profiles?.full_name || "N/A",
        mapel: (session.subjects as any)?.name || "-",
        kelas: session.classes?.name || "N/A",
        jadwal: session.subject_start_time || "-",
        hadir: session.teacher_present_at ? new Date(session.teacher_present_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ':') : "-",
        status: status
      };
    });

    await exportProfessionalExcel({
      title: "JADWAL DAN KEHADIRAN GURU",
      subtitle: "SMK TI SYNTAX SLAYER — Monitoring Presensi Pengajar & Jam Pelajaran",
      period: `Tanggal: ${format(new Date(selectedDate), "dd MMMM yyyy")}`,
      filename: `Kehadiran_Guru_${selectedDate}.xlsx`,
      withPrintFooter: true,
      columns: [
        { header: "Tanggal", key: "tanggal", width: 15 },
        { header: "Nama Guru", key: "guru", width: 35 },
        { header: "Mata Pelajaran", key: "mapel", width: 30 },
        { header: "Kelas", key: "kelas", width: 15 },
        { header: "Jam Jadwal", key: "jadwal", width: 15 },
        { header: "Jam Hadir", key: "hadir", width: 15 },
        { header: "Status", key: "status", width: 20 },
      ],
      data: exportReadyData
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekap Kehadiran Guru</h1>
          <p className="text-muted-foreground">
            Laporan riwayat kehadiran guru di kelas (Tabel Panjang).
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
      <div className="grid gap-4 md:grid-cols-4 bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => updateFilters(e.target.value, selectedClass)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase">Kelas</label>
          <select 
            value={selectedClass}
            onChange={(e) => updateFilters(selectedDate, e.target.value)}
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
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">Pencarian Cepat</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ketik nama guru untuk memfilter seketika..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/30">
              <tr className="border-b transition-colors hover:bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tanggal</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none" onClick={() => requestSort('teacher')}>
                  <div className="flex items-center gap-1">Nama Guru <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none" onClick={() => requestSort('subject')}>
                  <div className="flex items-center gap-1">Pelajaran <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none" onClick={() => requestSort('class')}>
                  <div className="flex items-center gap-1">Kelas <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none" onClick={() => requestSort('schedule')}>
                  <div className="flex items-center gap-1">Jam Jadwal <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Jam Hadir</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {sortedData?.map((session: any) => {
                const teacherName = session.teachers?.profiles?.full_name || "N/A";
                const className = session.classes?.name || "N/A";
                const presentAt = session.teacher_present_at ? new Date(session.teacher_present_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ':') : "-";
                
                let statusBadge = (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 border border-red-200">
                    Tidak Hadir
                  </span>
                );

                if (session.teacher_present_at) {
                  statusBadge = (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                      Hadir
                    </span>
                  );
                } else if (session.status === "active") {
                  const isExpired = new Date(session.qr_expires_at).getTime() < new Date().getTime();
                  if (!isExpired) {
                    statusBadge = (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                        Sedang Berjalan
                      </span>
                    );
                  }
                }

                return (
                  <tr key={session.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle">{format(new Date(session.session_date), "dd/MM/yyyy")}</td>
                    <td className="p-4 align-middle font-medium">{teacherName}</td>
                    <td className="p-4 align-middle">{(session.subjects as any)?.name}</td>
                    <td className="p-4 align-middle">{className}</td>
                    <td className="p-4 align-middle">{session.subject_start_time || "-"}</td>
                    <td className="p-4 align-middle font-medium">{presentAt}</td>
                    <td className="p-4 align-middle">{statusBadge}</td>
                    <td className="p-4 align-middle text-center">
                      <TeacherStatusAction 
                        sessionId={session.id} 
                        currentPresence={session.teacher_present_at} 
                      />
                    </td>
                  </tr>
                );
              })}
              {(!sortedData || sortedData.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    Tidak ada data riwayat kehadiran guru yang sesuai dengan filter.
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

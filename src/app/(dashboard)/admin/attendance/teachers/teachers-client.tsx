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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 dark:text-orange-400">
            REKAPITULASI PENGAJAR • SMK TI SYNTAX SLAYER
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Monitoring Presensi Guru
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Riwayat kehadiran guru pengampu, jam mengajar aktif, dan override manual presensi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] transition-all min-h-[44px]"
          >
            <Download className="mr-2 h-4 w-4" />
            Ekspor Excel Profesional
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => updateFilters(e.target.value, selectedClass)}
            className="flex min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-zinc-800/60 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 shadow-xs transition-all focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Kelas / Rombel</label>
          <select 
            value={selectedClass}
            onChange={(e) => updateFilters(selectedDate, e.target.value)}
            className="flex min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-zinc-800/60 px-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 shadow-xs transition-all focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 outline-none"
          >
            <option value="">Semua Rombel</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Pencarian Guru</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Ketik nama guru pengampu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex min-h-[44px] w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-zinc-800/60 pl-10 pr-3.5 py-2 text-sm text-stone-900 dark:text-stone-100 shadow-xs transition-all focus:border-orange-600 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-zinc-800/60 text-stone-600 dark:text-stone-400">
                <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">Tanggal</th>
                <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-stone-900 dark:hover:text-stone-100" onClick={() => requestSort('teacher')}>
                  <div className="flex items-center gap-1">Nama Guru <ArrowUpDown className="h-3 w-3 text-stone-400" /></div>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-stone-900 dark:hover:text-stone-100" onClick={() => requestSort('subject')}>
                  <div className="flex items-center gap-1">Mata Pelajaran <ArrowUpDown className="h-3 w-3 text-stone-400" /></div>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-stone-900 dark:hover:text-stone-100" onClick={() => requestSort('class')}>
                  <div className="flex items-center gap-1">Rombel <ArrowUpDown className="h-3 w-3 text-stone-400" /></div>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider uppercase cursor-pointer select-none hover:text-stone-900 dark:hover:text-stone-100" onClick={() => requestSort('schedule')}>
                  <div className="flex items-center gap-1">Jadwal JP <ArrowUpDown className="h-3 w-3 text-stone-400" /></div>
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">Waktu Hadir</th>
                <th className="px-4 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">Status</th>
                <th className="px-4 py-3.5 text-center font-semibold text-xs tracking-wider uppercase">Aksi Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {sortedData?.map((session: any) => {
                const teacherName = session.teachers?.profiles?.full_name || "N/A";
                const className = session.classes?.name || "N/A";
                const presentAt = session.teacher_present_at ? new Date(session.teacher_present_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ':') : "-";
                
                let statusBadge = (
                  <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold font-mono text-red-600 dark:text-red-400 border border-red-500/20">
                    Tidak Hadir
                  </span>
                );

                if (session.teacher_present_at) {
                  statusBadge = (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      Hadir
                    </span>
                  );
                } else if (session.status === "active") {
                  const isExpired = new Date(session.qr_expires_at).getTime() < new Date().getTime();
                  if (!isExpired) {
                    statusBadge = (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold font-mono text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        Sedang Berjalan
                      </span>
                    );
                  }
                }

                return (
                  <tr key={session.id} className="hover:bg-stone-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-stone-600 dark:text-stone-400">{format(new Date(session.session_date), "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3.5 font-medium text-stone-900 dark:text-stone-100">{teacherName}</td>
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300">{(session.subjects as any)?.name}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-stone-600 dark:text-stone-400">{className}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-stone-600 dark:text-stone-400">{session.subject_start_time || "-"}</td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-stone-900 dark:text-stone-100">{presentAt}</td>
                    <td className="px-4 py-3.5">{statusBadge}</td>
                    <td className="px-4 py-3.5 text-center">
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
                  <td colSpan={8} className="p-12 text-center text-stone-400">
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

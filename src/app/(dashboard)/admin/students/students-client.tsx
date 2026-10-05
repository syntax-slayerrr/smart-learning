"use client";

import { useState, useTransition, useRef } from "react";
import {
  createStudent,
  deleteStudent,
  resetStudentDevice,
  resetClassStudentDevices,
  updateStudentClass,
  updateStudentDetails,
} from "../actions";
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  Smartphone,
  Upload,
  Pencil,
  Printer,
  RotateCcw,
  ChevronRight,
  X,
  CheckCircle2,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { cn } from "@/lib/utils";

interface StudentRow {
  id: string;
  nis: string;
  class_id: string | null;
  profiles: { full_name: string; email: string; phone: string | null } | null;
  classes: { name: string } | null;
  device_id: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  grade: string;
}

export function StudentsClient({
  students,
  classes,
}: {
  students: StudentRow[];
  classes: ClassOption[];
}) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<{ id: string; name: string } | null>(null);
  const [selectedMobileStudent, setSelectedMobileStudent] = useState<StudentRow | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, show: false });
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const filtered = students.filter((s) => {
    const name = s.profiles?.full_name?.toLowerCase() || "";
    const nis = s.nis?.toLowerCase() || "";
    const q = search.toLowerCase();
    const matchesQuery = name.includes(q) || nis.includes(q);
    const matchesClass = selectedClassFilter ? s.class_id === selectedClassFilter : true;
    return matchesQuery && matchesClass;
  });

  const handleResetAllDevicesInClass = () => {
    const targetClassName = classes.find((c) => c.id === selectedClassFilter)?.name || "yang difilter";
    const confirmMsg = selectedClassFilter
      ? `Reset ikatan HP untuk SELURUH siswa di kelas ${targetClassName}? Siswa dapat login dengan HP baru.`
      : `Reset ikatan HP untuk SELURUH siswa yang terdaftar?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      await resetClassStudentDevices(selectedClassFilter || undefined);
    });
  };

  const handleCreateSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await createStudent(formData);
      if (result.error) {
        setFormError(result.error);
      } else {
        setShowAddSheet(false);
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingStudent) return;
    startTransition(async () => {
      await deleteStudent(deletingStudent.id);
      if (selectedMobileStudent?.id === deletingStudent.id) {
        setSelectedMobileStudent(null);
      }
      setDeletingStudent(null);
    });
  };

  const handleEditSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await updateStudentDetails(formData);
      if (result.error) {
        setFormError(result.error);
      } else {
        setEditingStudent(null);
        if (selectedMobileStudent?.id === editingStudent?.id) {
          setSelectedMobileStudent(null);
        }
      }
    });
  };

  const handleClassChange = (studentId: string, classId: string) => {
    startTransition(async () => {
      await updateStudentClass(studentId, classId || null);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (rawData.length < 2) {
        alert("File kosong atau tidak memiliki baris data.");
        e.target.value = "";
        return;
      }

      const headers = rawData[0].map((h) => String(h).toLowerCase().trim());
      const nameIdx = headers.findIndex((h) => h.includes("nama"));
      const nisIdx = headers.findIndex((h) => h.includes("nis"));
      const kelasIdx = headers.findIndex((h) => h.includes("kelas"));

      if (nameIdx === -1 || nisIdx === -1) {
        alert(
          "Format Salah! File Excel harus memiliki tulisan 'Nama' dan 'NIS' di baris paling atas. (Kolom 'Kelas' bersifat opsional)."
        );
        e.target.value = "";
        return;
      }

      const dataRows = rawData
        .slice(1)
        .filter((r) => r[nameIdx] !== undefined && r[nisIdx] !== undefined);

      if (dataRows.length === 0) {
        alert("Tidak ada data siswa yang valid ditemukan dalam file.");
        e.target.value = "";
        return;
      }

      if (!confirm(`Ditemukan ${dataRows.length} data siswa. Mulai import sekarang?`)) {
        e.target.value = "";
        return;
      }

      setImportProgress({ current: 0, total: dataRows.length, show: true });
      setImportErrors([]);

      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const formData = new FormData();
        formData.append("full_name", String(row[nameIdx]).trim());
        formData.append("nis", String(row[nisIdx]).trim());

        if (kelasIdx !== -1 && row[kelasIdx]) {
          const classNameInExcel = String(row[kelasIdx]).trim().toLowerCase();
          const matchedClass = classes.find(
            (c) => c.name.toLowerCase() === classNameInExcel
          );
          if (matchedClass) {
            formData.append("class_id", matchedClass.id);
          }
        }

        const result = await createStudent(formData);
        if (result.error) {
          errors.push(`Baris ${i + 2} (${row[nameIdx]}): ${result.error}`);
        } else {
          successCount++;
        }
        setImportProgress({ current: i + 1, total: dataRows.length, show: true });
      }

      if (errors.length > 0) {
        setImportErrors(errors);
        alert(
          `Import Selesai dengan beberapa catatan: ${successCount} Berhasil, ${errors.length} Gagal.`
        );
      } else {
        alert(`Luar Biasa! Berhasil mengimpor ${successCount} siswa tanpa masalah.`);
        setImportProgress({ current: 0, total: 0, show: false });
        window.location.reload();
      }
    } catch {
      alert("Gagal membaca file Excel. Pastikan file tidak rusak.");
    }
    e.target.value = "";
  };

  const handleResetDevice = (id: string, name: string) => {
    if (
      !confirm(
        `Reset kunci perangkat untuk "${name}"? Siswa dapat menggunakan perangkat baru pada absensi berikutnya.`
      )
    )
      return;
    startTransition(async () => {
      await resetStudentDevice(id);
    });
  };

  return (
    <div className="space-y-5">
      {/* Search, Filter, Primary Actions Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search & Filter */}
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              aria-label="Cari siswa atau NIS"
              placeholder="Cari siswa atau NIS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.12)] bg-white py-2 pl-10 pr-4 text-sm text-[#1D1D1F] outline-none transition-all placeholder:text-[#8E8E93] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
            />
          </div>
          <div className="relative sm:w-48 shrink-0">
            <select
              aria-label="Filter berdasarkan Kelas"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.12)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none transition-all focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetAllDevicesInClass}
            disabled={isPending}
            title="Reset ikatan HP siswa"
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[rgba(60,60,67,0.12)] bg-white px-3.5 py-2 text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F0] active:scale-[0.98] transition-all"
          >
            <RotateCcw className="h-4 w-4 text-[#8E8E93]" />
            <span>Reset HP {selectedClassFilter ? "Kelas" : "Massal"}</span>
          </button>

          <input
            type="file"
            aria-label="Unggah file spreadsheet siswa"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[rgba(60,60,67,0.12)] bg-white px-3.5 py-2 text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F0] active:scale-[0.98] transition-all"
          >
            <Upload className="h-4 w-4 text-[#8E8E93]" />
            <span>Import Excel</span>
          </button>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setFormError("");
              setShowAddSheet(true);
            }}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Siswa</span>
          </Button>
        </div>
      </div>

      {/* Import Progress Bar */}
      {importProgress.show && (
        <div className="rounded-2xl border border-[#007AFF]/20 bg-[#007AFF]/5 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#007AFF]">
              Mengimpor Data Siswa...
            </span>
            <span className="text-xs font-mono font-bold text-[#007AFF]">
              {importProgress.current} / {importProgress.total}
            </span>
          </div>
          <div className="h-2 w-full bg-[#E5E5EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#007AFF] transition-all duration-300"
              style={{
                width: `${(importProgress.current / importProgress.total) * 100}%`,
              }}
            />
          </div>
          {importProgress.current === importProgress.total && importErrors.length > 0 && (
            <div className="mt-4 space-y-2 text-xs text-[#FF3B30] bg-[#FF3B30]/10 p-3 rounded-xl border border-[#FF3B30]/20 max-h-32 overflow-y-auto">
              <p className="font-semibold">Beberapa baris tidak dapat diimpor:</p>
              <ul className="list-disc pl-4 space-y-1">
                {importErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* MOBILE LIST (Under 640px) */}
      <div className="sm:hidden space-y-2">
        {filtered.map((s) => {
          const classNameStr =
            classes.find((c) => c.id === s.class_id)?.name ||
            s.classes?.name ||
            "Belum ada kelas";

          return (
            <button
              type="button"
              key={s.id}
              onClick={() => setSelectedMobileStudent(s)}
              className="w-full text-left min-h-[64px] flex items-center justify-between p-3.5 sm:p-4 card-3d-ceramic active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center font-extrabold text-xs text-blue-600 shrink-0 shadow-sm">
                  {(s.profiles?.full_name || "S").charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-extrabold text-slate-900 truncate">
                    {s.profiles?.full_name || "—"}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-400 tabular-nums">{s.nis}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs font-semibold text-blue-600 truncate">{classNameStr}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-2">
                {s.device_id ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-sm" title="HP Terkunci">
                    <Smartphone className="h-3 w-3" />
                    <span className="hidden xs:inline">Terkunci</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    Bebas
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-[rgba(60,60,67,0.12)] text-[#8E8E93] text-sm">
            {search ? "Tidak ada siswa yang cocok." : "Belum ada data siswa."}
          </div>
        )}
      </div>

      {/* DESKTOP TABLE (640px and above) */}
      <div className="hidden sm:block rounded-2xl border border-[rgba(60,60,67,0.12)] bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(60,60,67,0.08)] bg-[#F7F7F5]/80 text-[#6E6E73]">
                <th className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">Nama</th>
                <th className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">NIS</th>
                <th className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">Kelas</th>
                <th className="px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">Status HP</th>
                <th className="hidden lg:table-cell px-5 py-3.5 text-left font-semibold text-xs tracking-wider uppercase">Email</th>
                <th className="px-5 py-3.5 text-right font-semibold text-xs tracking-wider uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(60,60,67,0.08)]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F7F7F5]/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#1D1D1F]">
                    {s.profiles?.full_name || "—"}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-[#6E6E73]">{s.nis}</td>
                  <td className="px-5 py-3.5 text-[#6E6E73]">
                    <select
                      value={s.class_id || ""}
                      onChange={(e) => handleClassChange(s.id, e.target.value)}
                      disabled={isPending}
                      className="bg-transparent border border-transparent text-sm text-[#1D1D1F] outline-none cursor-pointer hover:border-[rgba(60,60,67,0.16)] hover:bg-[#F2F2F0] focus:bg-white focus:border-[#007AFF] px-2 py-1 rounded-lg transition-all -ml-2"
                    >
                      <option value="">— Kosong —</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    {s.device_id ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9F0A]/10 px-2.5 py-1 text-xs font-semibold text-[#FF9F0A]">
                          <Smartphone className="h-3 w-3" />
                          Terkunci
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResetDevice(s.id, s.profiles?.full_name || "")}
                          disabled={isPending}
                          title="Reset kunci HP"
                          className="text-xs font-semibold text-[#FF3B30] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-2.5 py-1 text-xs font-semibold text-[#34C759]">
                        <CheckCircle2 className="h-3 w-3" />
                        Bebas
                      </span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-5 py-3.5 text-[#8E8E93] text-xs">
                    {s.profiles?.email || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingStudent(s);
                          setFormError("");
                        }}
                        disabled={isPending}
                        title="Edit Data Siswa"
                        className="rounded-lg p-2 text-[#6E6E73] hover:bg-[#F2F2F0] hover:text-[#1D1D1F] transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/admin/students/print-card/${s.id}`, "_blank")}
                        disabled={isPending}
                        title="Cetak Kartu Absen"
                        className="rounded-lg p-2 text-[#6E6E73] hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingStudent({ id: s.id, name: s.profiles?.full_name || s.nis })}
                        disabled={isPending}
                        title="Hapus Siswa"
                        className="rounded-lg p-2 text-[#6E6E73] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[#8E8E93]">
                    {search ? "Tidak ada siswa yang cocok dengan filter." : "Belum ada data siswa."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM SHEET / MODAL: TAMBAH SISWA */}
      <BottomSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title="Tambah Siswa"
        description="Lengkapi informasi untuk mendaftarkan siswa baru."
      >
        <form action={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/10 p-3.5 text-xs text-[#FF3B30] font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="create_full_name" className="text-xs font-semibold text-[#1D1D1F]">Nama lengkap</label>
            <input
              id="create_full_name"
              name="full_name"
              aria-label="Nama lengkap siswa"
              required
              placeholder="Contoh: Andi Pratama"
              className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.16)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="create_nis" className="text-xs font-semibold text-[#1D1D1F]">NIS</label>
            <input
              id="create_nis"
              name="nis"
              aria-label="Nomor Induk Siswa"
              required
              placeholder="Contoh: 20250001"
              className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.16)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="create_class_id" className="text-xs font-semibold text-[#1D1D1F]">Kelas</label>
            <select
              id="create_class_id"
              name="class_id"
              aria-label="Pilih kelas siswa"
              className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.16)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
            >
              <option value="">Pilih kelas...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-[#F7F7F5] border border-[rgba(60,60,67,0.10)] p-3 text-xs text-[#6E6E73]">
            Akun dibuat otomatis. Kredensial awal tersedia setelah siswa tersimpan.
          </div>

          <div className="flex gap-2.5 pt-3 pb-6 sm:pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddSheet(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Simpan
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* BOTTOM SHEET / MODAL: EDIT SISWA */}
      <BottomSheet
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Edit Data Siswa"
        description="Perbarui informasi profil dan status perangkat siswa."
      >
        {editingStudent && (
          <form action={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="id" value={editingStudent.id} />
            {formError && (
              <div className="rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/10 p-3.5 text-xs text-[#FF3B30] font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="edit_full_name" className="text-xs font-semibold text-[#1D1D1F]">Nama lengkap</label>
              <input
                id="edit_full_name"
                name="full_name"
                aria-label="Nama lengkap siswa"
                defaultValue={editingStudent.profiles?.full_name}
                required
                className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.16)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit_nis" className="text-xs font-semibold text-[#1D1D1F]">NIS</label>
              <input
                id="edit_nis"
                name="nis"
                aria-label="Nomor Induk Siswa"
                defaultValue={editingStudent.nis}
                required
                className="w-full min-h-[44px] rounded-xl border border-[rgba(60,60,67,0.16)] bg-white px-3.5 py-2 text-sm text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
              />
            </div>

            {/* Status Perangkat HP */}
            <div className="rounded-xl border border-[rgba(60,60,67,0.12)] p-3.5 bg-[#F7F7F5] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1D1D1F]">Status Kunci HP</span>
                {editingStudent.device_id ? (
                  <span className="text-xs font-semibold text-[#FF9F0A]">Terkunci ke 1 HP</span>
                ) : (
                  <span className="text-xs font-semibold text-[#34C759]">Bebas (Belum Terikat)</span>
                )}
              </div>
              <p className="text-[11px] text-[#6E6E73]">
                {editingStudent.device_id
                  ? "Siswa hanya bisa absen dari perangkat ini. Klik tombol di bawah jika siswa mengganti HP."
                  : "Siswa akan otomatis mengikat HP pertama yang digunakan saat absen."}
              </p>
              {editingStudent.device_id && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    handleResetDevice(editingStudent.id, editingStudent.profiles?.full_name || "");
                    setEditingStudent({ ...editingStudent, device_id: null });
                  }}
                  className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(60,60,67,0.16)] bg-white text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Kunci HP Siswa Ini
                </button>
              )}
            </div>

            <div className="flex gap-2.5 pt-3 pb-6 sm:pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingStudent(null)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Simpan Perubahan
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* MOBILE ACTION SHEET FOR SELECTED STUDENT */}
      <BottomSheet
        isOpen={!!selectedMobileStudent}
        onClose={() => setSelectedMobileStudent(null)}
        title={selectedMobileStudent?.profiles?.full_name || "Detail Siswa"}
        description={`NIS: ${selectedMobileStudent?.nis} • ${
          classes.find((c) => c.id === selectedMobileStudent?.class_id)?.name ||
          selectedMobileStudent?.classes?.name ||
          "Tanpa Kelas"
        }`}
      >
        {selectedMobileStudent && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#F7F7F5] border border-[rgba(60,60,67,0.10)] space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#8E8E93]">Email Akun:</span>
                <span className="font-mono text-[#1D1D1F]">{selectedMobileStudent.profiles?.email || "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8E8E93]">Status Perangkat:</span>
                <span className={selectedMobileStudent.device_id ? "text-[#FF9F0A] font-semibold" : "text-[#34C759] font-semibold"}>
                  {selectedMobileStudent.device_id ? "Terkunci (Terikat HP)" : "Bebas"}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingStudent(selectedMobileStudent);
                  setSelectedMobileStudent(null);
                }}
                className="w-full justify-start gap-2.5"
              >
                <Pencil className="h-4 w-4 text-[#007AFF]" />
                <span>Edit Informasi Siswa</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.open(`/admin/students/print-card/${selectedMobileStudent.id}`, "_blank");
                }}
                className="w-full justify-start gap-2.5"
              >
                <Printer className="h-4 w-4 text-[#34C759]" />
                <span>Cetak Kartu Absen (QR)</span>
              </Button>

              {selectedMobileStudent.device_id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleResetDevice(selectedMobileStudent.id, selectedMobileStudent.profiles?.full_name || "");
                    setSelectedMobileStudent({ ...selectedMobileStudent, device_id: null });
                  }}
                  className="w-full justify-start gap-2.5 text-[#FF9F0A]"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset Kunci HP Siswa</span>
                </Button>
              )}

              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeletingStudent({
                    id: selectedMobileStudent.id,
                    name: selectedMobileStudent.profiles?.full_name || selectedMobileStudent.nis,
                  });
                }}
                className="w-full justify-start gap-2.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Hapus Data Siswa</span>
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Dialog Konfirmasi Hapus Siswa */}
      <DeleteConfirmDialog
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deletingStudent?.name}
        isPending={isPending}
        title="Hapus Data Siswa"
        description={`Apakah Anda yakin ingin menghapus data siswa "${deletingStudent?.name}"? Seluruh data kehadiran, pelanggaran, dan kartu QR terkait akan dihapus secara permanen.`}
      />
    </div>
  );
}

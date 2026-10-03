"use client";

import { useState, useTransition, useRef } from "react";
import { createStudent, deleteStudent, resetStudentDevice, resetClassStudentDevices, updateStudentClass, updateStudentDetails } from "../actions";
import { Plus, Trash2, Search, Loader2, Smartphone, Upload, Pencil, Printer, ShieldAlert, CheckCircle2, RotateCcw } from "lucide-react";
import * as XLSX from "xlsx";

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

export function StudentsClient({ students, classes }: { students: StudentRow[]; classes: ClassOption[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
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
    const targetClassName = classes.find(c => c.id === selectedClassFilter)?.name || "yang difilter";
    const confirmMsg = selectedClassFilter 
      ? `Reset ikatan HP untuk SELURUH siswa di kelas ${targetClassName}? Siswa dapat login dengan HP baru.` 
      : `Reset ikatan HP untuk SELURUH siswa yang terdaftar?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      await resetClassStudentDevices(selectedClassFilter || undefined);
    });
  };

  const handleSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await createStudent(formData);
      if (result.error) {
        setFormError(result.error);
      } else {
        setShowForm(false);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus siswa "${name}"?`)) return;
    startTransition(async () => {
      await deleteStudent(id);
    });
  };

  const handleEditSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await updateStudentDetails(formData);
      if (result.error) setFormError(result.error);
      else setEditingStudent(null);
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
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to array of arrays to handle columns dynamically
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length < 2) {
        alert("File kosong atau tidak memiliki baris data.");
        e.target.value = '';
        return;
      }

      const headers = rawData[0].map(h => String(h).toLowerCase().trim());
      const nameIdx = headers.findIndex(h => h.includes('nama'));
      const nisIdx = headers.findIndex(h => h.includes('nis'));
      const kelasIdx = headers.findIndex(h => h.includes('kelas'));

      if (nameIdx === -1 || nisIdx === -1) {
        alert("Format Salah! File Excel harus memiliki tulisan 'Nama' dan 'NIS' di baris paling atas. (Kolom 'Kelas' bersifat opsional).");
        e.target.value = '';
        return;
      }

      const dataRows = rawData.slice(1).filter(r => r[nameIdx] !== undefined && r[nisIdx] !== undefined);
      
      if (dataRows.length === 0) {
        alert("Tidak ada data siswa yang valid ditemukan dalam file.");
        e.target.value = '';
        return;
      }
      
      if (!confirm(`Ditemukan ${dataRows.length} data siswa. Mulai import sekarang?`)) {
        e.target.value = '';
        return;
      }

    setImportProgress({ current: 0, total: dataRows.length, show: true });
    setImportErrors([]);
    
    let successCount = 0;
    const errors: string[] = [];

    // Process sequentially to prevent overwhelming the server or hitting rate limits
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const formData = new FormData();
      formData.append('full_name', String(row[nameIdx]).trim());
      formData.append('nis', String(row[nisIdx]).trim());

      if (kelasIdx !== -1 && row[kelasIdx]) {
        const classNameInExcel = String(row[kelasIdx]).trim().toLowerCase();
        const matchedClass = classes.find(c => c.name.toLowerCase() === classNameInExcel);
        if (matchedClass) {
          formData.append('class_id', matchedClass.id);
        } else {
          // Warning but don't fail the insert
          console.warn(`Kelas '${row[kelasIdx]}' untuk siswa ${row[nameIdx]} tidak ditemukan di database.`);
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
      alert(`Import Selesai dengan beberapa masalah: ${successCount} Berhasil, ${errors.length} Gagal. Lihat daftar error di bawah.`);
    } else {
      alert(`Luar Biasa! Berhasil mengimpor ${successCount} siswa tanpa masalah.`);
      setImportProgress({ current: 0, total: 0, show: false });
      window.location.reload();
    }
    
    } catch (error) {
      alert("Gagal membaca file Excel. Pastikan file tidak rusak.");
    }
    e.target.value = '';
  };

  const handleResetDevice = (id: string, name: string) => {
    if (!confirm(`Reset kunci perangkat untuk "${name}"? Siswa dapat menggunakan perangkat baru pada absensi berikutnya.`)) return;
    startTransition(async () => {
      await resetStudentDevice(id);
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Reset HP Massal */}
          <button
            type="button"
            onClick={handleResetAllDevicesInClass}
            disabled={isPending}
            title="Reset ikatan HP siswa agar bisa login dari perangkat baru"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <span className="hidden md:inline">Reset HP {selectedClassFilter ? "Kelas Ini" : "Semua"}</span>
            <span className="md:hidden">Reset HP</span>
          </button>

          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-accent"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Siswa</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>
      </div>

      {/* Import Progress Indicator */}
      {importProgress.show && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-blue-800">Proses Import Berjalan...</span>
            <span className="text-sm font-bold text-blue-800">{importProgress.current} / {importProgress.total}</span>
          </div>
          <div className="h-2 w-full bg-blue-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300" 
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
          {importProgress.current === importProgress.total && importErrors.length > 0 && (
            <div className="mt-4 space-y-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 max-h-32 overflow-y-auto">
              <p className="font-bold">Beberapa data gagal diproses:</p>
              <ul className="list-disc pl-4 space-y-1">
                {importErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="animate-slide-up rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Tambah Siswa Baru</h3>
          {formError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nama Lengkap</label>
              <input name="full_name" required placeholder="Nama lengkap siswa" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 rounded-lg bg-blue-50/50 border border-blue-100 p-3">
              <p className="text-xs text-blue-800 font-medium">ℹ️ Info Akun Otomatis:</p>
              <p className="text-xs text-blue-600 mt-0.5">Email akan digenerate otomatis: <strong>nama.nis@smktarkid.sch.id</strong>. Password default: <strong>tarkid123</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">NIS</label>
              <input name="nis" required placeholder="Nomor Induk Siswa" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Kelas</label>
              <select name="class_id" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Pilih kelas...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Simpan
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingStudent && (
        <div className="animate-slide-up rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-amber-800">Edit Data Siswa</h3>
          {formError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          <form action={handleEditSubmit} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={editingStudent.id} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nama Lengkap</label>
              <input name="full_name" defaultValue={editingStudent.profiles?.full_name} required placeholder="Nama lengkap siswa" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">NIS</label>
              <input name="nis" defaultValue={editingStudent.nis} required placeholder="Nomor Induk Siswa" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>

            {/* Status Perangkat di Form Edit */}
            <div className="sm:col-span-2 rounded-lg border p-3.5 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${editingStudent.device_id ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Status Kunci Perangkat (HP):{" "}
                    {editingStudent.device_id ? (
                      <span className="text-amber-600 font-bold">Terkunci (Terikat ke HP)</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">Belum Terikat (Bebas)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingStudent.device_id
                      ? "Siswa hanya bisa absen dari 1 HP ini. Klik tombol di kanan jika siswa ganti HP baru."
                      : "Siswa akan otomatis mengikat HP pertama yang digunakannya saat scan absensi."}
                  </p>
                </div>
              </div>

              {editingStudent.device_id && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    handleResetDevice(editingStudent.id, editingStudent.profiles?.full_name || "");
                    setEditingStudent({ ...editingStudent, device_id: null });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Kunci HP Siswa Ini
                </button>
              )}
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update Data
              </button>
              <button type="button" onClick={() => {setEditingStudent(null); setFormError("");}} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background bg-white transition-colors">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">NIS</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Kelas</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status HP</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Email</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.profiles?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.nis}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    <select 
                      value={s.class_id || ""} 
                      onChange={(e) => handleClassChange(s.id, e.target.value)}
                      disabled={isPending}
                      className="bg-transparent border border-transparent text-sm outline-none cursor-pointer hover:border-input hover:bg-muted focus:bg-background focus:border-primary p-1 rounded transition-colors -ml-1"
                    >
                      <option value="">— Kosong —</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Kolom Status Perangkat HP */}
                  <td className="px-4 py-3">
                    {s.device_id ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                          <Smartphone className="h-3 w-3" />
                          Terkunci
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResetDevice(s.id, s.profiles?.full_name || "")}
                          disabled={isPending}
                          title="Klik untuk mereset agar siswa bisa absen dari HP baru"
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:underline transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Bebas
                      </span>
                    )}
                  </td>

                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{s.profiles?.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {setEditingStudent(s); setShowForm(false); setFormError("");}}
                        disabled={isPending}
                        title="Edit Data Siswa"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/admin/students/print-card/${s.id}`, '_blank')}
                        disabled={isPending}
                        title="Cetak Kartu Absen (Bagi yang tidak punya HP)"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.profiles?.full_name || "")}
                        disabled={isPending}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {search ? "Tidak ada siswa yang cocok" : "Belum ada data siswa"}
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

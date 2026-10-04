"use client";

import { useState, useTransition } from "react";
import { createClass, deleteClass, editClass } from "../actions";
import { Plus, Trash2, Loader2, QrCode, Printer, Pencil } from "lucide-react";
import { GRADE_LEVELS, CURRENT_ACADEMIC_YEAR } from "@/lib/constants";
import { StaticQrDialog } from "@/components/attendance/static-qr-dialog";

interface ClassRow {
  id: string;
  name: string;
  grade: string;
  academic_year: string;
  is_active: boolean;
  homeroom_teacher_id?: string | null;
  teachers: { profiles: { full_name: string } | null } | null;
}

interface TeacherOption {
  id: string;
  profiles: { full_name: string } | null;
}

export function ClassesClient({ classes, teachers }: { classes: ClassRow[]; teachers: TeacherOption[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");
  const [selectedClassQr, setSelectedClassQr] = useState<{ id: string; name: string } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await createClass(formData);
      if (result.error) setFormError(result.error);
      else setShowForm(false);
    });
  };

  const handleEditSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await editClass(formData);
      if (result.error) setFormError(result.error);
      else setEditingClass(null);
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus kelas "${name}"?`)) return;
    startTransition(async () => { 
      const result = await deleteClass(id); 
      if (result.error) {
        alert(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-medium text-stone-500">
            Total Terdaftar: <strong className="text-stone-900 dark:text-white">{classes.length}</strong> Rombel
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-700 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-6 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="mb-4 text-sm font-bold text-stone-900 dark:text-white">Tambah Rombongan Belajar (Rombel) Baru</h3>
          {formError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">{formError}</div>}
          <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Nama Kelas</label>
              <input name="name" required placeholder="Contoh: X RPL 1" className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Tingkat</label>
              <select name="grade" required className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">Pilih tingkat...</option>
                {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Tahun Ajaran</label>
              <input name="academic_year" required defaultValue={CURRENT_ACADEMIC_YEAR} className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Wali Kelas</label>
              <select name="homeroom_teacher_id" className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">Pilih wali kelas...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.profiles?.full_name || "—"}</option>)}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2 pt-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-orange-700 px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan Kelas
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-stone-200 dark:border-white/10 px-4 py-2.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">Batal</button>
            </div>
          </form>
        </div>
      )}

      {editingClass && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 p-6 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="mb-4 text-sm font-bold text-amber-900 dark:text-amber-200">Edit Rombongan Belajar: {editingClass.name}</h3>
          {formError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">{formError}</div>}
          <form action={handleEditSubmit} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={editingClass.id} />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Nama Kelas</label>
              <input name="name" required defaultValue={editingClass.name} placeholder="Contoh: X RPL 1" className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Tingkat</label>
              <select name="grade" required defaultValue={editingClass.grade} className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">Pilih tingkat...</option>
                {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Tahun Ajaran</label>
              <input name="academic_year" required defaultValue={editingClass.academic_year} className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Wali Kelas</label>
              <select name="homeroom_teacher_id" defaultValue={editingClass.homeroom_teacher_id || ""} className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">Pilih wali kelas...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.profiles?.full_name || "—"}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer">
                <input type="checkbox" name="is_active" value="true" defaultChecked={editingClass.is_active} className="rounded border-stone-300 text-primary focus:ring-primary/20" />
                Kelas Aktif untuk Tahun Ajaran Ini
              </label>
            </div>
            <div className="flex gap-2 sm:col-span-2 pt-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan Perubahan
              </button>
              <button type="button" onClick={() => { setEditingClass(null); setFormError(""); }} className="rounded-xl border border-stone-200 dark:border-white/10 px-4 py-2.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Classes Asymmetric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <div key={c.id} className="group rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-5 shadow-2xs hover:border-orange-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-stone-900 dark:text-white tracking-tight">{c.name}</h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      Tk. {c.grade}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-stone-400 mt-0.5">{c.academic_year}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  c.is_active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                    : "bg-stone-100 text-stone-500 dark:bg-stone-900 border border-stone-200 dark:border-white/10"
                }`}>
                  {c.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-white/5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Wali Kelas</p>
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                  {c.teachers?.profiles?.full_name || <span className="text-stone-400 italic">Belum ditentukan</span>}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex gap-1.5">
                <button 
                  type="button"
                  onClick={() => setSelectedClassQr({ id: c.id, name: c.name })}
                  className="rounded-lg p-2 text-stone-500 hover:text-primary hover:bg-orange-500/10 transition-colors active:scale-[0.96]"
                  title="Cetak QR Presensi Statis"
                >
                  <QrCode className="h-4 w-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => window.open(`/admin/classes/print-cards/${c.id}`, '_blank')}
                  className="rounded-lg p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors active:scale-[0.96]"
                  title="Cetak Semua Kartu Siswa (.pdf)"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => { setEditingClass(c); setShowForm(false); setFormError(""); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="rounded-lg p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors active:scale-[0.96]"
                  title="Edit Data Kelas"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c.id, c.name)}
                disabled={isPending}
                className="rounded-lg p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-[0.96]"
                title="Hapus Kelas"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-stone-950 p-12 text-center text-xs text-stone-400">
            Belum ada rombongan belajar (kelas) yang terdaftar dalam sistem.
          </div>
        )}
      </div>

      {selectedClassQr && (
        <StaticQrDialog
          classId={selectedClassQr.id}
          className={selectedClassQr.name}
          onClose={() => setSelectedClassQr(null)}
        />
      )}
    </div>
  );
}

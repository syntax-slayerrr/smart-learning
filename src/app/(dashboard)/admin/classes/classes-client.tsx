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
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Tambah Kelas
        </button>
      </div>

      {showForm && (
        <div className="animate-slide-up rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Tambah Kelas Baru</h3>
          {formError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nama Kelas</label>
              <input name="name" required placeholder="Contoh: X RPL 1" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tingkat</label>
              <select name="grade" required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Pilih tingkat...</option>
                {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tahun Ajaran</label>
              <input name="academic_year" required defaultValue={CURRENT_ACADEMIC_YEAR} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Wali Kelas</label>
              <select name="homeroom_teacher_id" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Pilih wali kelas...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.profiles?.full_name || "—"}</option>)}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Batal</button>
            </div>
          </form>
        </div>
      )}

      {editingClass && (
        <div className="animate-slide-up rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-amber-800">Edit Kelas</h3>
          {formError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <form action={handleEditSubmit} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={editingClass.id} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nama Kelas</label>
              <input name="name" required defaultValue={editingClass.name} placeholder="Contoh: X RPL 1" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tingkat</label>
              <select name="grade" required defaultValue={editingClass.grade} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Pilih tingkat...</option>
                {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tahun Ajaran</label>
              <input name="academic_year" required defaultValue={editingClass.academic_year} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Wali Kelas</label>
              <select name="homeroom_teacher_id" defaultValue={editingClass.homeroom_teacher_id || ""} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Pilih wali kelas...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.profiles?.full_name || "—"}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" name="is_active" value="true" defaultChecked={editingClass.is_active} className="rounded border-input text-primary focus:ring-primary/20" />
                Kelas Aktif
              </label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan Perubahan
              </button>
              <button type="button" onClick={() => { setEditingClass(null); setFormError(""); }} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium hover:bg-amber-100">Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">{c.name}</h3>
                <p className="text-xs text-muted-foreground">Tingkat {c.grade} • {c.academic_year}</p>
                {c.teachers?.profiles?.full_name && (
                  <p className="mt-1 text-xs text-muted-foreground">Wali: {c.teachers.profiles.full_name}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => { setEditingClass(c); setShowForm(false); setFormError(""); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                  title="Edit Kelas"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setSelectedClassQr({ id: c.id, name: c.name })}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  title="Cetak QR Statis"
                >
                  <QrCode className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => window.open(`/admin/classes/print-cards/${c.id}`, '_blank')}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                  title="Cetak Semua Kartu Siswa"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(c.id, c.name)} disabled={isPending} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                {c.is_active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada data kelas
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

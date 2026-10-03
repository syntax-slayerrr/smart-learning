"use client";

import { useState, useTransition } from "react";
import { createTeacher, deleteTeacher, updateTeacherDetails } from "../actions";
import { Plus, Trash2, Search, Loader2, Pencil } from "lucide-react";

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
}

interface TeacherRow {
  id: string;
  nip: string;
  teacher_subjects?: { subject_id: string; subjects: { name: string; code: string | null } | null }[];
  profiles: { full_name: string; email: string; phone: string | null } | null;
}

export function TeachersClient({ teachers, subjects }: { teachers: TeacherRow[]; subjects: SubjectRow[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");

  const filtered = teachers.filter((t) => {
    const name = t.profiles?.full_name?.toLowerCase() || "";
    const nip = t.nip?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || nip.includes(search.toLowerCase());
  });

  const handleSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await createTeacher(formData);
      if (result.error) setFormError(result.error);
      else setShowForm(false);
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus guru "${name}"?`)) return;
    startTransition(async () => { await deleteTeacher(id); });
  };

  const handleEditSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await updateTeacherDetails(formData);
      if (result.error) setFormError(result.error);
      else setEditingTeacher(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Cari nama atau NIP..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Tambah Guru
        </button>
      </div>

      {showForm && (
        <div className="animate-slide-up rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Tambah Guru Baru</h3>
          {formError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nama Lengkap</label>
              <input name="full_name" required placeholder="Nama lengkap" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 rounded-lg bg-blue-50/50 border border-blue-100 p-3">
              <p className="text-xs text-blue-800 font-medium">ℹ️ Info Akun Otomatis:</p>
              <p className="text-xs text-blue-600 mt-0.5">Email akan digenerate otomatis: <strong>nama@smktarkid.sch.id</strong>. Password default: <strong>tarkid123</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">NIP</label>
              <input name="nip" required placeholder="Nomor Induk Pegawai" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium">Mata Pelajaran (Bisa Pilih Lebih dari Satu)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" name="subject_ids" value={s.id} className="rounded border-input text-primary focus:ring-primary/20" />
                    <span className="truncate">{s.name} {s.code && `(${s.code})`}</span>
                  </label>
                ))}
              </div>
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

      {editingTeacher && (
        <div className="animate-slide-up rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-amber-800">Edit Data Guru</h3>
          {formError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <form key={editingTeacher.id} action={handleEditSubmit} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={editingTeacher.id} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nama Lengkap</label>
              <input name="full_name" defaultValue={editingTeacher.profiles?.full_name} required placeholder="Nama lengkap" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">NIP</label>
              <input name="nip" defaultValue={editingTeacher.nip} required placeholder="Nomor Induk Pegawai" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium">Mata Pelajaran (Bisa Pilih Lebih dari Satu)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" name="subject_ids" value={s.id} defaultChecked={editingTeacher.teacher_subjects?.some(ts => ts.subject_id === s.id)} className="rounded border-input text-primary focus:ring-primary/20" />
                    <span className="truncate">{s.name} {s.code && `(${s.code})`}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update Data
              </button>
              <button type="button" onClick={() => {setEditingTeacher(null); setFormError("");}} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background bg-white transition-colors">Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">NIP</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Mapel</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Email</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{t.profiles?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.nip}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{t.teacher_subjects?.length ? t.teacher_subjects.map((ts) => Array.isArray(ts.subjects) ? ts.subjects[0]?.name : ts.subjects?.name).filter(Boolean).join(", ") : "—"}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{t.profiles?.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => {setEditingTeacher(t); setShowForm(false); setFormError("");}} disabled={isPending} className="rounded-lg p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id, t.profiles?.full_name || "")} disabled={isPending} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{search ? "Tidak ditemukan" : "Belum ada data guru"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

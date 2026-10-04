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
              <p className="text-xs text-blue-600 mt-0.5">Akun akan digenerate otomatis: <strong>nama@slayer.test</strong>. Password default: <strong>password123</strong></p>
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

      {/* Desktop Data Table */}
      <div className="hidden md:block rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-white/10 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Nama Lengkap & Pendidik</th>
                <th className="py-3 px-4 w-40">NIP</th>
                <th className="py-3 px-4">Mata Pelajaran Diampu</th>
                <th className="py-3 px-4">Email Akun</th>
                <th className="py-3 px-4 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">{t.profiles?.full_name || "—"}</td>
                  <td className="py-3 px-4 font-mono font-medium text-stone-600 dark:text-stone-300">{t.nip}</td>
                  <td className="py-3 px-4 text-stone-600 dark:text-stone-400">
                    {t.teacher_subjects?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {t.teacher_subjects.map((ts, idx) => {
                          const name = Array.isArray(ts.subjects) ? ts.subjects[0]?.name : ts.subjects?.name;
                          if (!name) return null;
                          return (
                            <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-white/5">
                              {name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-stone-400 italic">Belum ada mapel</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-stone-500">{t.profiles?.email || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingTeacher(t); setShowForm(false); setFormError(""); }}
                        disabled={isPending}
                        className="rounded-lg p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors active:scale-[0.96]"
                        title="Edit Data Guru"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.profiles?.full_name || "")}
                        disabled={isPending}
                        className="rounded-lg p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-[0.96]"
                        title="Hapus Data Guru"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-stone-400">
                    {search ? "Tidak ditemukan guru yang cocok dengan pencarian" : "Belum ada data guru terdaftar"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Adaptive Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">{t.profiles?.full_name || "—"}</h4>
                <p className="text-[10px] font-mono text-stone-500 mt-0.5">NIP: {t.nip}</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { setEditingTeacher(t); setShowForm(false); setFormError(""); }}
                  disabled={isPending}
                  className="rounded-lg p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id, t.profiles?.full_name || "")}
                  disabled={isPending}
                  className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-white/5 space-y-1.5 text-xs">
              <div className="text-[11px] text-stone-500 font-mono truncate">
                {t.profiles?.email || "—"}
              </div>
              <div className="flex flex-wrap gap-1">
                {t.teacher_subjects?.length ? (
                  t.teacher_subjects.map((ts, idx) => {
                    const name = Array.isArray(ts.subjects) ? ts.subjects[0]?.name : ts.subjects?.name;
                    if (!name) return null;
                    return (
                      <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {name}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[10px] text-stone-400 italic">Belum ada mapel diampu</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-stone-950 p-8 text-center text-xs text-stone-400">
            {search ? "Tidak ditemukan guru yang cocok dengan kata kunci" : "Belum ada data guru"}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Search, BookOpen, Trash2, Hash } from "lucide-react";
import { createSubject, deleteSubject } from "../actions";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export default function SubjectsClient({
  initialSubjects,
}: {
  initialSubjects: Subject[];
}) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredSubjects = subjects.filter((s) => {
    const name = s.name.toLowerCase();
    const code = s.code?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createSubject(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.reload();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus mata pelajaran ini?")) return;
    const result = await deleteSubject(id);
    if (result.success) window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Cari mata pelajaran atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 pl-10 pr-4 py-2.5 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-orange-700 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((subject) => (
          <div key={subject.id} className="group rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-5 shadow-2xs hover:border-orange-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-primary shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">{subject.name}</h3>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 mt-0.5">
                    {subject.code || "TANPA KODE"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(subject.id)}
                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors active:scale-[0.96]"
                title="Hapus Mata Pelajaran"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {filteredSubjects.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-stone-950 p-12 text-center text-xs text-stone-400">
            {searchTerm ? "Tidak ditemukan mata pelajaran yang cocok dengan pencarian" : "Belum ada mata pelajaran. Klik tombol Tambah untuk memulai."}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 pb-3 border-b border-stone-100 dark:border-white/5">
              <h2 className="text-base font-bold text-stone-900 dark:text-white">Tambah Mata Pelajaran</h2>
              <p className="text-xs text-stone-500 mt-0.5">Masukkan nama kurikulum resmi mata pelajaran sekolah</p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-600 border border-red-200 dark:border-red-900/40 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Nama Mata Pelajaran</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    name="name"
                    required
                    placeholder="Contoh: Pemrograman Web & Perangkat Bergerak"
                    className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 pl-10 pr-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Kode Mapel (Opsional)</label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    name="code"
                    placeholder="Contoh: PWPB-11"
                    className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 pl-10 pr-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-100 dark:border-white/5 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-stone-200 dark:border-white/10 px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-700 px-5 py-2 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Simpan Mapel"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

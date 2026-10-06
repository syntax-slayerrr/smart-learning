"use client";

import { useState } from "react";
import { Plus, Search, BookOpen, Trash2, Hash, Pencil, Loader2 } from "lucide-react";
import { createSubject, updateSubject, deleteSubject } from "../actions";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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
  const [subjects] = useState(initialSubjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<{ id: string; name: string } | null>(null);
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

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSubject) return;
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.append("id", editingSubject.id);

    const result = await updateSubject(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.reload();
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingSubject) return;
    setLoading(true);
    const result = await deleteSubject(deletingSubject.id);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Add Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari mata pelajaran atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => {
            setError("");
            setShowAddModal(true);
          }}
          className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs border border-white/10 hover:bg-primary-hover min-h-[44px] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Tambah Mata Pelajaran
        </button>
      </div>

      {/* Grid Mata Pelajaran 3D Ceramic Squircle */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((subject) => (
          <div
            key={subject.id}
            className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 border-t-white bg-white/95 p-5 shadow-[0_2px_4px_-1px_rgba(15,23,42,0.03),0_12px_24px_-4px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_-1px_rgba(15,23,42,0.05),0_20px_36px_-6px_rgba(15,23,42,0.1)] card-3d-ceramic"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 shadow-xs">
                    <BookOpen className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base tracking-tight leading-snug">{subject.name}</h3>
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-slate-100/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200/60 tracking-wider">
                      {subject.code || "REGULER"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inset Tactile Action Bar */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100/80">
              <span className="text-[11px] font-medium text-slate-400">Kurikulum Aktif</span>
              <div className="flex items-center gap-1 rounded-2xl bg-slate-50/90 p-1 border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)]">
                <button
                  onClick={() => {
                    setError("");
                    setEditingSubject(subject);
                  }}
                  className="apple-press rounded-xl p-2 text-slate-600 hover:bg-white hover:text-amber-600 hover:shadow-xs transition-all cursor-pointer"
                  title="Edit Mata Pelajaran"
                  aria-label={`Edit ${subject.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeletingSubject({ id: subject.id, name: subject.name })}
                  className="apple-press rounded-xl p-2 text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-xs transition-all cursor-pointer"
                  title="Hapus Mata Pelajaran"
                  aria-label={`Hapus ${subject.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredSubjects.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white/50 px-4 py-12 text-center text-sm font-medium text-slate-500">
            {searchTerm ? "Tidak ditemukan mata pelajaran yang cocok" : "Belum ada mata pelajaran. Klik tombol Tambah untuk memulai."}
          </div>
        )}
      </div>

      {/* Modal Tambah Mata Pelajaran */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => {
          if (!loading) {
            setShowAddModal(false);
            setError("");
          }
        }}
        title="Tambah Mata Pelajaran"
        description="Masukkan nama mata pelajaran dan kode kurikulum resmi sekolah."
      >
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> Nama Mata Pelajaran
            </label>
            <input
              name="name"
              required
              placeholder="Contoh: Matematika Wajib"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" /> Kode Mapel (Opsional)
            </label>
            <input
              name="code"
              placeholder="Contoh: MTK-10"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex w-full items-center justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setShowAddModal(false);
                setError("");
              }}
              className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan Mapel</span>
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Modal Edit Mata Pelajaran */}
      <BottomSheet
        isOpen={Boolean(editingSubject)}
        onClose={() => {
          if (!loading) {
            setEditingSubject(null);
            setError("");
          }
        }}
        title="Edit Mata Pelajaran"
        description="Perbarui informasi nama mata pelajaran atau kode kurikulum."
      >
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        {editingSubject && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> Nama Mata Pelajaran
              </label>
              <input
                name="name"
                defaultValue={editingSubject.name}
                required
                placeholder="Contoh: Matematika Wajib"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" /> Kode Mapel (Opsional)
              </label>
              <input
                name="code"
                defaultValue={editingSubject.code || ""}
                placeholder="Contoh: MTK-10"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex w-full items-center justify-end gap-2.5 pt-4 border-t border-border">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setEditingSubject(null);
                  setError("");
                }}
                className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Perbarui Mapel</span>
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* Dialog Konfirmasi Hapus */}
      <DeleteConfirmDialog
        isOpen={Boolean(deletingSubject)}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deletingSubject?.name}
        isPending={loading}
        title="Hapus Mata Pelajaran"
        description={`Apakah Anda yakin ingin menghapus mata pelajaran "${deletingSubject?.name}"? Jadwal pengajaran terkait akan terhapus.`}
      />
    </div>
  );
}

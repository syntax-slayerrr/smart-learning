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
          className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover min-h-[44px] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Tambah Mata Pelajaran
        </button>
      </div>

      {/* Grid Mata Pelajaran */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((subject) => (
          <div
            key={subject.id}
            className="group relative rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md apple-card"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">{subject.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
                    {subject.code || "TANPA KODE"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setError("");
                    setEditingSubject(subject);
                  }}
                  className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                  title="Edit Mata Pelajaran"
                  aria-label={`Edit ${subject.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeletingSubject({ id: subject.id, name: subject.name })}
                  className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                  title="Hapus Mata Pelajaran"
                  aria-label={`Hapus ${subject.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredSubjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
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

"use client";

import { useState, useTransition } from "react";
import { createTeacher, deleteTeacher, updateTeacherDetails } from "../actions";
import { Plus, Trash2, Search, Loader2, Pencil, User, Hash, BookOpen } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");

  const filtered = teachers.filter((t) => {
    const name = t.profiles?.full_name?.toLowerCase() || "";
    const nip = t.nip?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || nip.includes(search.toLowerCase());
  });

  const handleAddSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await createTeacher(formData);
      if (result.error) {
        setFormError(result.error);
      } else {
        setShowAddModal(false);
      }
    });
  };

  const handleEditSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await updateTeacherDetails(formData);
      if (result.error) {
        setFormError(result.error);
      } else {
        setEditingTeacher(null);
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingTeacher) return;
    startTransition(async () => {
      await deleteTeacher(deletingTeacher.id);
      setDeletingTeacher(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            aria-label="Cari nama, NIP, atau mapel guru"
            placeholder="Cari nama, NIP, atau mapel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-input bg-card pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs"
          />
        </div>
        <button
          onClick={() => {
            setFormError("");
            setShowAddModal(true);
          }}
          className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs border border-white/10 hover:bg-primary-hover min-h-[44px] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Guru
        </button>
      </div>

      {/* MOBILE CARD VIEW (Under 640px) */}
      <div className="sm:hidden space-y-3">
        {filtered.map((t) => {
          const subjects = t.teacher_subjects?.length
            ? t.teacher_subjects
                .map((ts) => (Array.isArray(ts.subjects) ? ts.subjects[0]?.name : ts.subjects?.name))
                .filter(Boolean)
                .join(", ")
            : "—";

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-foreground text-sm truncate">
                    {t.profiles?.full_name || "Tanpa Nama"}
                  </h4>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    NIP: {t.nip}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeacher(t);
                      setFormError("");
                    }}
                    disabled={isPending}
                    className="apple-press rounded-xl p-2.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    title="Edit Guru"
                    aria-label={`Edit ${t.profiles?.full_name || ""}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingTeacher({ id: t.id, name: t.profiles?.full_name || t.nip })}
                    disabled={isPending}
                    className="apple-press rounded-xl p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer disabled:opacity-50"
                    title="Hapus Guru"
                    aria-label={`Hapus ${t.profiles?.full_name || ""}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Mata Pelajaran:</span>
                  <span className="font-medium text-foreground text-right">{subjects}</span>
                </div>
                {t.profiles?.email && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Email:</span>
                    <span className="text-foreground truncate max-w-[200px] text-right">{t.profiles.email}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
            {search ? "Tidak ditemukan guru yang cocok" : "Belum ada data guru"}
          </div>
        )}
      </div>

      {/* Teachers Table (Desktop 640px and up) */}
      <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
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
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{t.profiles?.full_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.nip}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {t.teacher_subjects?.length
                      ? t.teacher_subjects
                          .map((ts) => (Array.isArray(ts.subjects) ? ts.subjects[0]?.name : ts.subjects?.name))
                          .filter(Boolean)
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{t.profiles?.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditingTeacher(t);
                          setFormError("");
                        }}
                        disabled={isPending}
                        className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                        title="Edit Guru"
                        aria-label={`Edit guru ${t.profiles?.full_name || ""}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTeacher({ id: t.id, name: t.profiles?.full_name || t.nip })}
                        disabled={isPending}
                        className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer disabled:opacity-50"
                        title="Hapus Guru"
                        aria-label={`Hapus guru ${t.profiles?.full_name || ""}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {search ? "Tidak ditemukan guru yang cocok" : "Belum ada data guru"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Guru */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => {
          if (!isPending) {
            setShowAddModal(false);
            setFormError("");
          }
        }}
        title="Tambah Guru Baru"
        description="Lengkapi data guru baru untuk akun pengajar dan pengampu mata pelajaran."
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {formError}
          </div>
        )}
        <form action={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama Lengkap
            </label>
            <input
              name="full_name"
              required
              placeholder="Contoh: Budi Santoso, S.Pd."
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3.5">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">ℹ️ Info Pembuatan Akun Otomatis:</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
              Email otomatis: <strong className="font-mono">nama@slayer.test</strong> • Password default:{" "}
              <strong className="font-mono">password123</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" /> NIP / Nomor Identitas
            </label>
            <input
              name="nip"
              required
              placeholder="Nomor Induk Pegawai"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> Mata Pelajaran yang Diampu
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto p-1 border border-border/60 rounded-xl">
              {subjects.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 p-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    name="subject_ids"
                    value={s.id}
                    className="rounded border-input text-primary focus:ring-primary/20"
                  />
                  <span className="truncate">
                    {s.name} {s.code && <span className="text-muted-foreground font-mono">({s.code})</span>}
                  </span>
                </label>
              ))}
              {subjects.length === 0 && (
                <p className="col-span-2 py-3 text-center text-xs text-muted-foreground">
                  Belum ada data mata pelajaran. Tambahkan mapel terlebih dahulu.
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowAddModal(false);
                setFormError("");
              }}
              className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan Guru</span>
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Modal Edit Guru */}
      <BottomSheet
        isOpen={Boolean(editingTeacher)}
        onClose={() => {
          if (!isPending) {
            setEditingTeacher(null);
            setFormError("");
          }
        }}
        title="Edit Data Guru"
        description="Perbarui informasi data pokok dan penetapan mata pelajaran guru ini."
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {formError}
          </div>
        )}
        {editingTeacher && (
          <form key={editingTeacher.id} action={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="id" value={editingTeacher.id} />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama Lengkap
              </label>
              <input
                name="full_name"
                defaultValue={editingTeacher.profiles?.full_name}
                required
                placeholder="Nama lengkap guru"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" /> NIP / Nomor Identitas
              </label>
              <input
                name="nip"
                defaultValue={editingTeacher.nip}
                required
                placeholder="Nomor Induk Pegawai"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> Mata Pelajaran yang Diampu
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto p-1 border border-border/60 rounded-xl">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-border/50 p-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="subject_ids"
                      value={s.id}
                      defaultChecked={editingTeacher.teacher_subjects?.some((ts) => ts.subject_id === s.id)}
                      className="rounded border-input text-primary focus:ring-primary/20"
                    />
                    <span className="truncate">
                      {s.name} {s.code && <span className="text-muted-foreground font-mono">({s.code})</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex w-full items-center justify-end gap-2.5 pt-4 border-t border-border">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setEditingTeacher(null);
                  setFormError("");
                }}
                className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Perbarui Data</span>
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* Dialog Konfirmasi Hapus */}
      <DeleteConfirmDialog
        isOpen={Boolean(deletingTeacher)}
        onClose={() => setDeletingTeacher(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deletingTeacher?.name}
        isPending={isPending}
        title="Hapus Data Guru"
        description={`Apakah Anda yakin ingin menghapus data guru "${deletingTeacher?.name}"? Akun dan relasi jadwal terkait akan terdampak.`}
      />
    </div>
  );
}

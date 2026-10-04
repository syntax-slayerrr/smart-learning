"use client";

import { useState, useTransition } from "react";
import { createClass, deleteClass, editClass } from "../actions";
import { Plus, Trash2, Loader2, QrCode, Printer, Pencil } from "lucide-react";
import { GRADE_LEVELS, CURRENT_ACADEMIC_YEAR } from "@/lib/constants";
import { StaticQrDialog } from "@/components/attendance/static-qr-dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [deletingClass, setDeletingClass] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");
  const [selectedClassQr, setSelectedClassQr] = useState<{ id: string; name: string } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      const result = await createClass(formData);
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
      const result = await editClass(formData);
      if (result.error) {
        setFormError(result.error);
      } else {
        setEditingClass(null);
      }
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingClass) return;
    startTransition(async () => {
      const result = await deleteClass(deletingClass.id);
      if (result?.error) {
        alert(result.error);
      }
      setDeletingClass(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setFormError("");
            setShowAddModal(true);
          }}
          className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover min-h-[44px] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Kelas
        </button>
      </div>

      {/* Grid Kelas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md apple-card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground">Tingkat {c.grade} • {c.academic_year}</p>
                {c.teachers?.profiles?.full_name && (
                  <p className="mt-1 text-xs text-muted-foreground">Wali: {c.teachers.profiles.full_name}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingClass(c);
                    setFormError("");
                  }}
                  className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                  title="Edit Kelas"
                  aria-label={`Edit kelas ${c.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedClassQr({ id: c.id, name: c.name })}
                  className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  title="Cetak QR Statis"
                  aria-label={`Cetak QR statis kelas ${c.name}`}
                >
                  <QrCode className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.open(`/admin/classes/print-cards/${c.id}`, "_blank")}
                  className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Cetak Semua Kartu Siswa"
                  aria-label={`Cetak kartu siswa kelas ${c.name}`}
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeletingClass({ id: c.id, name: c.name })}
                  disabled={isPending}
                  className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer disabled:opacity-50"
                  title="Hapus Kelas"
                  aria-label={`Hapus kelas ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
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

      {/* Modal 1: Tambah Kelas Baru */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Kelas Baru"
        description="Masukkan identitas kelas dan tahun ajaran akademik"
        footer={
          <div className="flex w-full items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-add-class"
              disabled={isPending}
              className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan Kelas</span>
            </button>
          </div>
        }
      >
        {formError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {formError}
          </div>
        )}
        <form id="form-add-class" action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Nama Kelas</label>
            <input
              name="name"
              required
              placeholder="Contoh: X RPL 1"
              className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tingkat</label>
            <select
              name="grade"
              required
              className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih tingkat...</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tahun Ajaran</label>
            <input
              name="academic_year"
              required
              defaultValue={CURRENT_ACADEMIC_YEAR}
              className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Wali Kelas</label>
            <select
              name="homeroom_teacher_id"
              className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih wali kelas...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.profiles?.full_name || "—"}
                </option>
              ))}
            </select>
          </div>
        </form>
      </BottomSheet>

      {/* Modal 2: Edit Kelas */}
      <BottomSheet
        isOpen={Boolean(editingClass)}
        onClose={() => setEditingClass(null)}
        title="Edit Data Kelas"
        description={editingClass ? `Memperbarui kelas ${editingClass.name}` : undefined}
        footer={
          <div className="flex w-full items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditingClass(null)}
              className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-edit-class"
              disabled={isPending}
              className="apple-press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        }
      >
        {formError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {formError}
          </div>
        )}
        {editingClass && (
          <form id="form-edit-class" action={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="id" value={editingClass.id} />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nama Kelas</label>
              <input
                name="name"
                required
                defaultValue={editingClass.name}
                placeholder="Contoh: X RPL 1"
                className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tingkat</label>
              <select
                name="grade"
                required
                defaultValue={editingClass.grade}
                className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Pilih tingkat...</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tahun Ajaran</label>
              <input
                name="academic_year"
                required
                defaultValue={editingClass.academic_year}
                className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Wali Kelas</label>
              <select
                name="homeroom_teacher_id"
                defaultValue={editingClass.homeroom_teacher_id || ""}
                className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Pilih wali kelas...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.profiles?.full_name || "—"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked={editingClass.is_active}
                  className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4"
                />
                Status Kelas Aktif
              </label>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* Modal 3: Konfirmasi Hapus Kelas */}
      <DeleteConfirmDialog
        isOpen={Boolean(deletingClass)}
        onClose={() => setDeletingClass(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Kelas"
        itemName={deletingClass?.name}
        isPending={isPending}
        description={`Apakah Anda yakin ingin menghapus kelas "${deletingClass?.name}"? Seluruh data yang terkait dengan kelas ini akan terpengaruh.`}
      />

      {/* Modal 4: Cetak QR Statis */}
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

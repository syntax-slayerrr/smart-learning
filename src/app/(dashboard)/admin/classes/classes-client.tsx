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

      {/* Grid Kelas 3D Ceramic Squircle */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <div
            key={c.id}
            className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 border-t-white bg-white/95 p-5 shadow-[0_2px_4px_-1px_rgba(15,23,42,0.03),0_12px_24px_-4px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_-1px_rgba(15,23,42,0.05),0_20px_36px_-6px_rgba(15,23,42,0.1)] card-3d-ceramic"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 font-bold text-sm shadow-xs">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">{c.name}</h3>
                    <p className="text-xs font-medium text-slate-500">Tingkat {c.grade} • {c.academic_year}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                    c.is_active
                      ? "border border-emerald-200/70 bg-emerald-50 text-emerald-700"
                      : "border border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {c.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              {c.teachers?.profiles?.full_name && (
                <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-slate-50/80 px-3 py-2 border border-slate-100/90 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Wali:</span>
                  <span className="font-medium text-slate-800 truncate">{c.teachers.profiles.full_name}</span>
                </div>
              )}
            </div>

            {/* Inset Tactile Action Bar */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100/80">
              <span className="text-[11px] font-medium text-slate-400">Opsi Manajemen</span>
              <div className="flex items-center gap-1 rounded-2xl bg-slate-50/90 p-1 border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)]">
                <button
                  onClick={() => {
                    setEditingClass(c);
                    setFormError("");
                  }}
                  className="apple-press rounded-xl p-2 text-slate-600 hover:bg-white hover:text-amber-600 hover:shadow-xs transition-all cursor-pointer"
                  title="Edit Kelas"
                  aria-label={`Edit kelas ${c.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setSelectedClassQr({ id: c.id, name: c.name })}
                  className="apple-press rounded-xl p-2 text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-all cursor-pointer"
                  title="Cetak QR Statis"
                  aria-label={`Cetak QR statis kelas ${c.name}`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => window.open(`/admin/classes/print-cards/${c.id}`, "_blank")}
                  className="apple-press rounded-xl p-2 text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-xs transition-all cursor-pointer"
                  title="Cetak Semua Kartu Siswa"
                  aria-label={`Cetak kartu siswa kelas ${c.name}`}
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeletingClass({ id: c.id, name: c.name })}
                  disabled={isPending}
                  className="apple-press rounded-xl p-2 text-slate-600 hover:bg-white hover:text-red-600 hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title="Hapus Kelas"
                  aria-label={`Hapus kelas ${c.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white/50 px-4 py-12 text-center text-sm font-medium text-slate-500">
            Belum ada data kelas terdaftar
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
            <label htmlFor="add-class-name" className="text-xs font-semibold text-foreground">Nama Kelas</label>
            <input
              id="add-class-name"
              name="name"
              required
              aria-label="Nama Kelas"
              placeholder="Contoh: X RPL 1"
              className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-class-grade" className="text-xs font-semibold text-foreground">Tingkat</label>
            <select
              id="add-class-grade"
              name="grade"
              required
              aria-label="Tingkat Kelas"
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
            <label htmlFor="add-academic-year" className="text-xs font-semibold text-foreground">Tahun Ajaran</label>
            <input
              id="add-academic-year"
              name="academic_year"
              required
              aria-label="Tahun Ajaran"
              defaultValue={CURRENT_ACADEMIC_YEAR}
              className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-homeroom-teacher" className="text-xs font-semibold text-foreground">Wali Kelas</label>
            <select
              id="add-homeroom-teacher"
              name="homeroom_teacher_id"
              aria-label="Wali Kelas"
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
              <label htmlFor="edit-class-name" className="text-xs font-semibold text-foreground">Nama Kelas</label>
              <input
                id="edit-class-name"
                name="name"
                required
                aria-label="Nama Kelas"
                defaultValue={editingClass.name}
                placeholder="Contoh: X RPL 1"
                className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-class-grade" className="text-xs font-semibold text-foreground">Tingkat</label>
              <select
                id="edit-class-grade"
                name="grade"
                required
                aria-label="Tingkat Kelas"
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
              <label htmlFor="edit-academic-year" className="text-xs font-semibold text-foreground">Tahun Ajaran</label>
              <input
                id="edit-academic-year"
                name="academic_year"
                required
                aria-label="Tahun Ajaran"
                defaultValue={editingClass.academic_year}
                className="w-full min-h-[44px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-homeroom-teacher" className="text-xs font-semibold text-foreground">Wali Kelas</label>
              <select
                id="edit-homeroom-teacher"
                name="homeroom_teacher_id"
                aria-label="Wali Kelas"
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

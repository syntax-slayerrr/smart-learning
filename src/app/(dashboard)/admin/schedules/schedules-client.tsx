"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Trash2, Loader2, Calendar, Edit, Clock, BookOpen, GraduationCap, User } from "lucide-react";
import { createSchedule, deleteSchedule, updateSchedule } from "../actions";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface ScheduleRow {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  classes: { name: string } | null;
  teachers: { profiles: { full_name: string } | null } | null;
  subjects: { name: string } | null;
}

const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

export function SchedulesClient({
  schedules,
  classes,
  teachers,
  subjects,
}: {
  schedules: ScheduleRow[];
  classes: any[];
  teachers: any[];
  subjects: any[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (filterDay !== "all" && s.day_of_week.toString() !== filterDay) return false;
      if (filterClass !== "all" && s.class_id !== filterClass) return false;
      return true;
    });
  }, [schedules, filterDay, filterClass]);

  const handleSubmit = async (formData: FormData) => {
    setFormError("");
    startTransition(async () => {
      let result;
      if (editingSchedule) {
        formData.append("id", editingSchedule.id);
        result = await updateSchedule(formData);
      } else {
        result = await createSchedule(formData);
      }

      if (result.error) {
        setFormError(result.error);
      } else {
        setShowModal(false);
        setEditingSchedule(null);
      }
    });
  };

  const handleEdit = (schedule: ScheduleRow) => {
    setEditingSchedule(schedule);
    setSelectedTeacherId(schedule.teacher_id);
    setFormError("");
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    setSelectedTeacherId("");
    setFormError("");
    setShowModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingSchedule) return;
    startTransition(async () => {
      await deleteSchedule(deletingSchedule.id);
      setDeletingSchedule(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          Master Jadwal Pelajaran
        </h2>
        <button
          onClick={handleAddNew}
          className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover min-h-[44px] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Tambah Jadwal
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-bold text-muted-foreground uppercase">Filter Hari</label>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">Semua Hari</option>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-bold text-muted-foreground uppercase">Filter Kelas</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MOBILE CARD VIEW (Under 640px) */}
      <div className="sm:hidden space-y-3">
        {filteredSchedules.map((s) => {
          const dayLabel = DAYS.find((d) => d.value === s.day_of_week)?.label || "—";
          const className = Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name || "—";
          const teacherName = Array.isArray(s.teachers)
            ? s.teachers[0]?.profiles?.full_name
            : s.teachers?.profiles?.full_name || "—";
          const subjectName = Array.isArray(s.subjects) ? s.subjects[0]?.name : s.subjects?.name || "—";

          return (
            <div
              key={s.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {dayLabel}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm mt-1 truncate">
                    {subjectName}
                  </h4>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(s)}
                    disabled={isPending}
                    className="apple-press rounded-xl p-2.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    title="Edit Jadwal"
                    aria-label={`Edit jadwal ${subjectName}`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeletingSchedule({
                        id: s.id,
                        name: `${subjectName} (${className} - ${dayLabel})`,
                      })
                    }
                    disabled={isPending}
                    className="apple-press rounded-xl p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer disabled:opacity-50"
                    title="Hapus Jadwal"
                    aria-label={`Hapus jadwal ${subjectName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Kelas:</span>
                  <span className="font-medium text-foreground">{className}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Guru Pengampu:</span>
                  <span className="font-medium text-foreground">{teacherName}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSchedules.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
            Tidak ada jadwal pelajaran ditemukan
          </div>
        )}
      </div>

      {/* DESKTOP TABLE (640px and up) */}
      <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3">Hari</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Guru</th>
                <th className="px-4 py-3">Mata Pelajaran</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSchedules.map((s) => {
                const dayLabel = DAYS.find((d) => d.value === s.day_of_week)?.label || "—";
                const className = Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name || "—";
                const teacherName = Array.isArray(s.teachers)
                  ? s.teachers[0]?.profiles?.full_name
                  : s.teachers?.profiles?.full_name || "—";
                const subjectName = Array.isArray(s.subjects) ? s.subjects[0]?.name : s.subjects?.name || "—";

                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{dayLabel}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">{className}</td>
                    <td className="px-4 py-3 text-muted-foreground">{teacherName}</td>
                    <td className="px-4 py-3 text-foreground">{subjectName}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(s)}
                          disabled={isPending}
                          className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                          title="Edit Jadwal"
                          aria-label={`Edit jadwal ${subjectName}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeletingSchedule({
                              id: s.id,
                              name: `${subjectName} (${className} - ${dayLabel})`,
                            })
                          }
                          disabled={isPending}
                          className="apple-press rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer disabled:opacity-50"
                          title="Hapus Jadwal"
                          aria-label={`Hapus jadwal ${subjectName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada data jadwal pelajaran yang sesuai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input/Edit Jadwal */}
      <BottomSheet
        isOpen={showModal}
        onClose={() => {
          if (!isPending) {
            setShowModal(false);
            setEditingSchedule(null);
            setFormError("");
          }
        }}
        title={editingSchedule ? "Edit Jadwal Pelajaran" : "Tambah Jadwal Pelajaran"}
        description={
          editingSchedule
            ? "Perbarui alokasi hari, jam, kelas, guru pengampu, atau mata pelajaran."
            : "Alokasikan mata pelajaran dan guru pengampu ke kelas pada hari dan jam tertentu."
        }
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {formError}
          </div>
        )}

        <form key={editingSchedule ? editingSchedule.id : "new"} action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Hari
              </label>
              <select
                name="day_of_week"
                defaultValue={editingSchedule?.day_of_week ?? 1}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" /> Kelas
              </label>
              <select
                name="class_id"
                defaultValue={editingSchedule?.class_id}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Pilih Kelas —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Guru Pengampu
              </label>
              <select
                name="teacher_id"
                required
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Pilih Guru —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.profiles?.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> Mata Pelajaran
              </label>
              <select
                name="subject_id"
                defaultValue={editingSchedule?.subject_id}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Pilih Mapel —</option>
                {subjects
                  .filter((s) => {
                    if (editingSchedule && editingSchedule.subject_id === s.id) return true;
                    if (!selectedTeacherId) return true;
                    const teacher = teachers.find((t) => t.id === selectedTeacherId);
                    if (!teacher || !teacher.teacher_subjects || teacher.teacher_subjects.length === 0) return true;
                    return teacher.teacher_subjects.some((ts: any) => ts.subject_id === s.id);
                  })
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Jam Mulai
              </label>
              <input
                type="time"
                name="start_time"
                defaultValue={editingSchedule?.start_time?.substring(0, 5) || "07:30"}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Jam Selesai
              </label>
              <input
                type="time"
                name="end_time"
                defaultValue={editingSchedule?.end_time?.substring(0, 5) || "09:00"}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowModal(false);
                setEditingSchedule(null);
                setFormError("");
              }}
              className="apple-press rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`apple-press inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-50 min-h-[44px] cursor-pointer ${
                editingSchedule ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary-hover"
              }`}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{editingSchedule ? "Perbarui Jadwal" : "Simpan Jadwal"}</span>
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Dialog Konfirmasi Hapus */}
      <DeleteConfirmDialog
        isOpen={Boolean(deletingSchedule)}
        onClose={() => setDeletingSchedule(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deletingSchedule?.name}
        isPending={isPending}
        title="Hapus Jadwal Pelajaran"
        description={`Apakah Anda yakin ingin menghapus jadwal "${deletingSchedule?.name}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}

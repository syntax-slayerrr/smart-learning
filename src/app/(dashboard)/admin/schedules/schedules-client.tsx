"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Trash2, Loader2, Calendar, Edit } from "lucide-react";
import { createSchedule, deleteSchedule, updateSchedule } from "../actions";

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
  subjects 
}: { 
  schedules: ScheduleRow[];
  classes: any[];
  teachers: any[];
  subjects: any[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
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
        setShowForm(false);
        setEditingSchedule(null);
      }
    });
  };

  const handleEdit = (schedule: ScheduleRow) => {
    setEditingSchedule(schedule);
    setSelectedTeacherId(schedule.teacher_id);
    setShowForm(true);
    setFormError("");
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    setSelectedTeacherId("");
    setShowForm(!showForm);
    setFormError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    startTransition(async () => {
      await deleteSchedule(id);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Master Jadwal Mata Pelajaran
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Konfigurasi jam belajar-mengajar mingguan seluruh rombongan belajar
          </p>
        </div>
        <button 
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-orange-700 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Jadwal Pelajaran</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-white/10 shadow-2xs">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Filter Hari Belajar</label>
          <select 
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="all">Semua Hari Belajar (Senin - Minggu)</option>
            {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Filter Rombel / Kelas</label>
          <select 
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="all">Semua Rombongan Belajar</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-6 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="mb-4 text-sm font-bold text-stone-900 dark:text-white">
            {editingSchedule ? "Perbarui Jadwal Pelajaran" : "Input Jadwal Pelajaran Baru"}
          </h3>
          {formError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">{formError}</div>}
          <form key={editingSchedule ? editingSchedule.id : "new"} action={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Hari</label>
              <select name="day_of_week" defaultValue={editingSchedule?.day_of_week} required className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Kelas / Rombel</label>
              <select name="class_id" defaultValue={editingSchedule?.class_id} required className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Guru Pengampu</label>
              <select name="teacher_id" required value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">— Pilih Guru —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.profiles?.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Mata Pelajaran</label>
              <select name="subject_id" defaultValue={editingSchedule?.subject_id} required className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                <option value="">— Pilih Mapel —</option>
                {subjects.filter(s => {
                  if (editingSchedule && editingSchedule.subject_id === s.id) return true;
                  if (!selectedTeacherId) return true;
                  const teacher = teachers.find(t => t.id === selectedTeacherId);
                  if (!teacher || !teacher.teacher_subjects || teacher.teacher_subjects.length === 0) return true;
                  return teacher.teacher_subjects.some((ts: any) => ts.subject_id === s.id);
                }).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Jam Mulai</label>
              <input type="time" name="start_time" defaultValue={editingSchedule?.start_time?.substring(0,5)} required className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-mono font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Jam Selesai</label>
              <input type="time" name="end_time" defaultValue={editingSchedule?.end_time?.substring(0,5)} required className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-stone-900 px-3.5 py-2 text-xs font-mono font-medium text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2.5 pt-2">
              <button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-orange-700 px-6 py-2.5 text-xs font-bold text-white shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Simpan Jadwal</span>
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingSchedule(null); }} className="rounded-xl border border-stone-200 dark:border-white/10 px-5 py-2.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">Batal</button>
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
                <th className="py-3 px-4 w-28">Hari</th>
                <th className="py-3 px-4 w-36">Waktu (WIB)</th>
                <th className="py-3 px-4 w-32">Kelas</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-4 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {filteredSchedules.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-md font-bold text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                      {DAYS.find(d => d.value === s.day_of_week)?.label || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-stone-600 dark:text-stone-300">
                    {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}
                  </td>
                  <td className="py-3 px-4 font-bold text-stone-900 dark:text-white">
                    {Array.isArray(s.classes) ? s.classes[0]?.name : (s.classes?.name || "—")}
                  </td>
                  <td className="py-3 px-4 font-semibold text-primary">
                    {Array.isArray(s.subjects) ? s.subjects[0]?.name : (s.subjects?.name || "—")}
                  </td>
                  <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                    {Array.isArray(s.teachers) ? s.teachers[0]?.profiles?.full_name : (s.teachers?.profiles?.full_name || "—")}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        type="button"
                        onClick={() => handleEdit(s)} 
                        className="rounded-lg p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors active:scale-[0.96]"
                        title="Edit Jadwal"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(s.id)} 
                        className="rounded-lg p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-[0.96]"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-stone-400">
                    Belum ada data jadwal pelajaran yang sesuai filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Adaptive Cards */}
      <div className="md:hidden space-y-3">
        {filteredSchedules.map((s) => (
          <div key={s.id} className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-950 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                {DAYS.find(d => d.value === s.day_of_week)?.label || "—"}
              </span>
              <span className="text-xs font-mono font-medium text-stone-500">
                {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}
              </span>
            </div>

            <div className="pt-1">
              <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                {Array.isArray(s.subjects) ? s.subjects[0]?.name : (s.subjects?.name || "—")}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Kelas: <strong className="text-stone-800 dark:text-stone-200">{Array.isArray(s.classes) ? s.classes[0]?.name : (s.classes?.name || "—")}</strong> • Guru: {Array.isArray(s.teachers) ? s.teachers[0]?.profiles?.full_name : (s.teachers?.profiles?.full_name || "—")}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleEdit(s)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg"
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 p-1.5 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </button>
            </div>
          </div>
        ))}
        {filteredSchedules.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-stone-950 p-8 text-center text-xs text-stone-400">
            Belum ada data jadwal pelajaran
          </div>
        )}
      </div>
    </div>
  );
}

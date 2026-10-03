"use client";

import { useActionState } from "react";
import { createAttendanceSession, type CreateSessionState } from "../actions";
import { Loader2 } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
  grade: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

export function CreateSessionForm({ 
  classes, 
  subjects 
}: { 
  classes: ClassOption[], 
  subjects: SubjectOption[] 
}) {
  const [state, action, pending] = useActionState<CreateSessionState, FormData>(
    createAttendanceSession,
    {}
  );

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="class_id" className="text-sm font-medium">Kelas</label>
        <select
          id="class_id"
          name="class_id"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Pilih kelas...</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.grade})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="subject_id" className="text-sm font-medium">Mata Pelajaran</label>
        <select
          id="subject_id"
          name="subject_id"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Pilih mata pelajaran...</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.name}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="duration_minutes" className="text-sm font-medium">Durasi QR (menit)</label>
        <input
          id="duration_minutes"
          name="duration_minutes"
          type="number"
          defaultValue={30}
          min={5}
          max={120}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-muted-foreground">QR Code akan kadaluarsa setelah durasi ini</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Membuat Sesi...</>
        ) : (
          "Buat Sesi & Generate QR"
        )}
      </button>
    </form>
  );
}

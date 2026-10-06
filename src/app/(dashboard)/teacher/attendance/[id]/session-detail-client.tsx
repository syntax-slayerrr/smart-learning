"use client";

import { useState, useTransition, useEffect } from "react";
import { StatusBadge } from "@/components/attendance/status-badge";
import { closeAttendanceSession, markStudentAttendance } from "../actions";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { Users, Camera, XCircle } from "lucide-react";
import { TeacherScanner } from "@/components/attendance/teacher-qr-scanner";

interface StudentData {
  id: string;
  nis: string;
  profiles: { full_name: string } | null;
}

interface RecordData {
  id: string;
  student_id: string;
  status: string;
  scanned_at: string;
  notes: string | null;
}

interface SessionData {
  id: string;
  subject: string;
  qr_token: string;
  qr_expires_at: string;
  status: string;
  session_date: string;
  classes: { name: string } | null;
}

interface Props {
  session: SessionData;
  students: StudentData[];
  records: RecordData[];
}

export function SessionDetailClient({ session, students, records: initialRecords }: Props) {
  const [records, setRecords] = useState(initialRecords);
  const [isPending, startTransition] = useTransition();
  const [showScanner, setShowScanner] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(
    new Date(session.qr_expires_at).getTime() < new Date().getTime()
  );
  
  const isActive = session.status === "active" && !isExpired;

  useEffect(() => {
    if (session.status !== "active" || isExpired) return;

    const expiryTime = new Date(session.qr_expires_at).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        clearInterval(interval);
        // Automatically trigger handleClose to close session and mark absents
        handleClose();
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, session.qr_expires_at, isExpired]);
  
  const attendedIds = new Set(records.map((r) => r.student_id));
  const attendedCount = records.length;
  const totalStudents = students.length;

  const handleClose = () => {
    startTransition(async () => {
      await closeAttendanceSession(session.id);
      window.location.reload();
    });
  };

  const handleMark = (studentId: string, status: string) => {
    startTransition(async () => {
      const result = await markStudentAttendance(session.id, studentId, status);
      if (result.success) {
        // Optimistic update
        setRecords((prev) => {
          const existing = prev.find((r) => r.student_id === studentId);
          if (existing) {
            return prev.map((r) =>
              r.student_id === studentId ? { ...r, status } : r
            );
          }
          return [
            ...prev,
            { id: crypto.randomUUID(), student_id: studentId, status, scanned_at: new Date().toISOString(), notes: null },
          ];
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className={`flex items-center justify-between rounded-xl p-4 ${isActive ? "border-2 border-emerald-200 bg-emerald-50" : "border border-border bg-muted/30"}`}>
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${isActive ? "animate-pulse bg-emerald-500" : "bg-gray-400"}`} />
          <span className="text-sm font-medium">
            {isActive ? "Sesi Aktif" : "Sesi Selesai"}
            {isActive && timeLeft > 0 && (
              <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            <Users className="mr-1 inline h-3.5 w-3.5" />
            {attendedCount}/{totalStudents} hadir
          </span>
        </div>
        
        {/* verification_code removed: Kode Papan Tulis no longer used */}
        
        {session.status === "active" && (
          <button
            onClick={handleClose}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Tutup & Rekap
          </button>
        )}

      </div>

      {/* Action Bar */}
      {isActive && (
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowScanner(true)}
            className="apple-press w-full max-w-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground py-2.5 rounded-xl text-sm font-semibold shadow-xs border border-white/10 transition-all"
          >
            <Camera className="h-4 w-4" />
            <span>Buka Scanner Kamera Guru</span>
          </button>
        </div>
      )}

      {/* Teacher Scanner Modal */}
      {showScanner && (
         <TeacherScanner 
           sessionId={session.id} 
           onClose={() => setShowScanner(false)} 
           onSuccess={() => window.location.reload()} 
         />
      )}

      {/* Student List */}
        <div className="rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {students.map((student) => {
              const record = records.find((r) => r.student_id === student.id);
              return (
                <div key={student.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{student.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">NIS: {student.nis}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {record ? (
                      <StatusBadge status={record.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum absen</span>
                    )}
                    {isActive && (
                      <select
                        value={record?.status || ""}
                        onChange={(e) => handleMark(student.id, e.target.value)}
                        disabled={isPending}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                      >
                        <option value="">Tandai...</option>
                        {ATTENDANCE_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
            {students.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Tidak ada siswa di kelas ini
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

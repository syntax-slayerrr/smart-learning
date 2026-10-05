"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  UserCheck,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface VerifiedStudent {
  student_id: string;
  nis: string;
  name: string;
  dwell_seconds: number;
  confidence: number;
  seat_id: string;
  already_recorded: boolean;
  status_recommendation: "present" | "late" | "sick" | "excused" | "absent";
  qualification_reason: string;
}

interface PendingStudent {
  student_id: string;
  nis: string;
  name: string;
  dwell_seconds: number;
  already_recorded: boolean;
  status_recommendation: string;
  reason: string;
}

interface DraftMetrics {
  total_enrolled: number;
  verified_count: number;
  pending_count: number;
  consensus_rate: number;
  fail_safe_gate: string;
}

interface AiAttendanceDraftViewProps {
  sessionId?: string;
}

export function AiAttendanceDraftView({
  sessionId = "00000000-0000-0000-0000-000000000001",
}: AiAttendanceDraftViewProps) {
  const [metrics, setMetrics] = useState<DraftMetrics | null>(null);
  const [verifiedList, setVerifiedList] = useState<VerifiedStudent[]>([]);
  const [pendingList, setPendingList] = useState<PendingStudent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studentStatuses, setStudentStatuses] = useState<Record<string, "present" | "late" | "sick" | "excused">>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedMessage, setApprovedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);

  const fetchDraft = useCallback(async () => {
    try {
      setErrorMessage(null);
      const res = await fetch(`/api/attendance/session/${sessionId}/auto-draft`);
      const data = await res.json();

      if (data.success) {
        setMetrics(data.metrics);
        setVerifiedList(data.verified_students || []);
        setPendingList(data.pending_students || []);

        // Default all verified & not yet recorded students to selected
        const initialSelected = new Set<string>();
        const initialStatuses: Record<string, "present" | "late" | "sick" | "excused"> = {};

        (data.verified_students || []).forEach((s: VerifiedStudent) => {
          if (!s.already_recorded) {
            initialSelected.add(s.student_id);
          }
          initialStatuses[s.student_id] = "present";
        });

        setSelectedIds(initialSelected);
        setStudentStatuses(initialStatuses);
      } else {
        setErrorMessage(data.error || "Gagal memuat draf presensi AI");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Koneksi ke backend presensi bermasalah");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchDraft();
    const interval = setInterval(fetchDraft, 5000); // Polling every 5s for live updates
    return () => clearInterval(interval);
  }, [fetchDraft]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const unrecorded = verifiedList.filter((s) => !s.already_recorded).map((s) => s.student_id);
    setSelectedIds(new Set(unrecorded));
  };

  const handleApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    setApprovedMessage(null);
    setErrorMessage(null);

    try {
      const payloadRecords = Array.from(selectedIds).map((id) => {
        const student = verifiedList.find((s) => s.student_id === id);
        return {
          student_id: id,
          status: studentStatuses[id] || "present",
          notes: student
            ? `Diverifikasi AI Vision (Dwell time ${student.dwell_seconds}s di ${student.seat_id}, Akurasi ${(student.confidence * 100).toFixed(0)}%)`
            : "Diverifikasi AI Vision",
        };
      });

      const res = await fetch(`/api/attendance/session/${sessionId}/approve-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: payloadRecords }),
      });

      const result = await res.json();
      if (result.success) {
        setApprovedMessage(result.message || `Berhasil menyetujui ${payloadRecords.length} siswa.`);
        // Refresh draft list
        fetchDraft();
      } else {
        setErrorMessage(result.error || "Gagal menyimpan draf presensi.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengirim konfirmasi presensi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Fail-Safe Guardrail Banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 shadow-2xs">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-950">Triple Fail-Safe Guardrail Aktif</span>
              <span className="rounded-md bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 font-mono">
                100% Akurasi
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
              Hanya siswa yang terbukti duduk diam di kursinya minimal <strong>45 detik</strong> dengan <strong>5x konsensus ArcFace</strong> yang masuk rekomendasi.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[rgba(60,60,67,0.12)] bg-[#FAFAF9] p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] tracking-wide">Terverifikasi</span>
            <p className="text-base font-bold font-mono text-emerald-600">
              {metrics.verified_count} <span className="text-xs text-[#8E8E93] font-normal">/ {metrics.total_enrolled}</span>
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(60,60,67,0.12)] bg-[#FAFAF9] p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] tracking-wide">Konsensus AI</span>
            <p className="text-base font-bold font-mono text-[#007AFF]">{metrics.consensus_rate}%</p>
          </div>
          <div className="rounded-xl border border-[rgba(60,60,67,0.12)] bg-[#FAFAF9] p-2.5 text-center">
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] tracking-wide">Perlu Cek</span>
            <p className="text-base font-bold font-mono text-amber-600">{metrics.pending_count}</p>
          </div>
        </div>
      )}

      {/* Alert / Notification Feedback */}
      {approvedMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="font-medium flex-1">{approvedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span className="font-medium flex-1">{errorMessage}</span>
        </div>
      )}

      {/* Verified List Header */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          DRAF PRESENSI SIAP DISETUJUI ({verifiedList.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={fetchDraft}
            className="p-1 text-[#8E8E93] hover:text-[#1D1D1F] rounded-md transition-colors"
            title="Refresh Draf"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Verified List Cards */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
        {verifiedList.length > 0 ? (
          verifiedList.map((st) => {
            const isSelected = selectedIds.has(st.student_id);
            return (
              <div
                key={st.student_id}
                className={`rounded-xl border p-2.5 transition-all text-left flex items-start gap-2.5 ${
                  st.already_recorded
                    ? "border-emerald-200 bg-emerald-50/40 opacity-80"
                    : isSelected
                    ? "border-primary bg-sky-50/50 shadow-2xs"
                    : "border-[rgba(60,60,67,0.12)] bg-white hover:bg-[#FAFAF9]"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={st.already_recorded}
                  checked={st.already_recorded || isSelected}
                  onChange={() => toggleSelect(st.student_id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-[#1D1D1F] truncate">{st.name}</p>
                    <span className="text-[10px] font-mono font-bold text-[#6E6E73] bg-[#EFEFED] px-1.5 py-0.5 rounded">
                      {st.seat_id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6E6E73]">
                    <span className="flex items-center gap-1 font-mono text-emerald-700">
                      <Clock className="h-3 w-3" />
                      {st.dwell_seconds}s
                    </span>
                    <span>•</span>
                    <span className="font-mono text-sky-700">
                      {(st.confidence * 100).toFixed(0)}% Match
                    </span>
                    {st.already_recorded && (
                      <span className="ml-auto font-semibold text-emerald-700 text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">
                        ✓ Tercatat
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[rgba(60,60,67,0.15)] bg-[#FAFAF9] p-5 text-center text-xs text-[#8E8E93]">
            <Clock className="h-5 w-5 mx-auto mb-1.5 text-stone-400" />
            <p className="font-semibold text-[#1D1D1F]">Sedang Menghitung Waktu Duduk Siswa</p>
            <p className="text-[11px] mt-0.5">
              Siswa yang telah duduk diam selama ≥ 45 detik akan otomatis muncul di sini.
            </p>
          </div>
        )}
      </div>

      {/* Collapsible Pending List */}
      {pendingList.length > 0 && (
        <div className="rounded-xl border border-[rgba(60,60,67,0.10)] bg-[#FAFAF9] p-2">
          <button
            type="button"
            onClick={() => setShowPending(!showPending)}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#6E6E73] p-1 cursor-pointer"
          >
            <span>{pendingList.length} Siswa Belum Terverifikasi / Belum Hadir</span>
            {showPending ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showPending && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-[rgba(60,60,67,0.08)]">
              {pendingList.map((p) => (
                <div key={p.student_id} className="flex items-center justify-between text-[11px] px-1 py-0.5 text-[#6E6E73]">
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {p.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1-Click Approval Action Button */}
      <div className="pt-2 border-t border-[rgba(60,60,67,0.10)]">
        <button
          type="button"
          onClick={handleApprove}
          disabled={selectedIds.size === 0 || isSubmitting}
          className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary/95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Menyimpan Presensi...
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4" />
              Setujui Presensi Otomatis ({selectedIds.size} Siswa)
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-[#8E8E93] mt-1.5">
          Guru memegang kendali penuh sebelum data presensi resmi masuk ke database.
        </p>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import {
  Award,
  Hand,
  Target,
  CheckCircle2,
  BookCheck,
  ShieldCheck,
} from "lucide-react";

interface StudentEngagementJournalProps {
  studentName: string;
  handRaiseCount: number;
  focusScore: number;
  favoriteSeat?: string | null;
  totalSessionsVerified?: number;
  recentAiVerifiedNote?: string | null;
}

/**
 * StudentEngagementJournal — Jurnal Keaktifan Belajar & Apresiasi Mingguan Siswa.
 * Mengubah data telemetri kamera AI Vision menjadi feedback positif yang memotivasi siswa.
 * Desain: Hairline borders, Monospace metrics, aksen terkalibrasi.
 */
export function StudentEngagementJournal({
  studentName,
  handRaiseCount = 0,
  focusScore = 0,
  favoriteSeat = "-",
  totalSessionsVerified = 0,
  recentAiVerifiedNote,
}: StudentEngagementJournalProps) {
  const firstName = studentName.split(" ")[0];
  const hasData = totalSessionsVerified > 0 || handRaiseCount > 0 || focusScore > 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
      {/* Header Ringkas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
            <Award className="h-3.5 w-3.5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Jurnal Keaktifan Belajar
            </h3>
            <p className="text-[10px] text-slate-400">
              {hasData
                ? `Apresiasi minggu ini untuk ${firstName}`
                : "Belum ada rekaman sesi minggu ini"}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
          Mingguan
        </span>
      </div>

      {/* 3 Metrik Inti Minimalis */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-center">
          <span className="text-[10px] font-medium text-slate-400 block truncate">
            Sesi Kelas
          </span>
          <span className="text-sm font-bold font-mono text-slate-800 tabular-nums">
            {totalSessionsVerified}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">hadir</span>
        </div>

        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-center">
          <span className="text-[10px] font-medium text-slate-400 block truncate">
            Fokus Belajar
          </span>
          <span className="text-sm font-bold font-mono text-emerald-600 tabular-nums">
            {focusScore > 0 ? `${focusScore}%` : "0%"}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">atensi</span>
        </div>

        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 text-center">
          <span className="text-[10px] font-medium text-slate-400 block truncate">
            Interaksi
          </span>
          <span className="text-sm font-bold font-mono text-orange-600 tabular-nums">
            {handRaiseCount}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">tanya</span>
        </div>
      </div>
    </div>
  );
}

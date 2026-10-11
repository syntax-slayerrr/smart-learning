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
 * Mematuhi pedoman AGENTS.md: Hairline borders, Monospace metrics, Tanpa AI slop / tanpa sparkles.
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
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Top Header & Tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0">
            <Award className="h-4 w-4 stroke-[2]" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-orange-600 dark:text-orange-400 font-bold">
              JURNAL KEAKTIFAN BELAJAR
            </span>
            <h3 className="text-xs font-bold text-foreground">
              Apresiasi Belajar Mingguan
            </h3>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Terverifikasi Kamera Kelas</span>
        </div>
      </div>

      {/* Hero Quote Apresiasi (Inti Permintaan User) */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.03] p-4 sm:p-4.5 space-y-1.5">
        {hasData ? (
          <>
            <p className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
              &ldquo;Minggu ini kamu aktif berpartisipasi{" "}
              <span className="text-orange-600 dark:text-orange-400 font-mono underline decoration-orange-500/30 underline-offset-4">
                {handRaiseCount}x angkat tangan
              </span>{" "}
              dan{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-mono underline decoration-emerald-500/30 underline-offset-4">
                {focusScore}% fokus belajar
              </span>
              .&rdquo;
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kerja bagus, {firstName}! Keberanianmu berdiskusi di kelas dan ketepatan hadir di bangku belajar mendapatkan apresiasi tinggi dari guru pengampu.
            </p>
          </>
        ) : (
          <>
            <p className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
              &ldquo;Belum ada rekaman sesi belajar.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Halo {firstName}, riwayat keaktifan dan atensi belajarmu akan terisi otomatis setelah mengikuti sesi pembelajaran terverifikasi di kelas.
            </p>
          </>
        )}
      </div>

      {/* 3 Pilar Glanceable Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 1. Partisipasi Bertanya */}
        <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-card p-3 flex items-start gap-3 shadow-2xs">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 shrink-0 mt-0.5">
            <Hand className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Interaksi Tanya
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold font-mono text-foreground tabular-nums">
                {handRaiseCount}
              </span>
              <span className="text-xs text-muted-foreground">kali</span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
              Aktif berdiskusi di kelas
            </p>
          </div>
        </div>

        {/* 2. Indeks Fokus Belajar */}
        <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-card p-3 flex items-start gap-3 shadow-2xs">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 shrink-0 mt-0.5">
            <Target className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Indeks Atensi
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {focusScore}%
              </span>
              <span className="text-xs text-muted-foreground">kondusif</span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
              Fokus menyimak & mencatat
            </p>
          </div>
        </div>

        {/* 3. Posisi Meja & Presensi Nir-Sentuh */}
        <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-card p-3 flex items-start gap-3 shadow-2xs">
          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
            <Award className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Posisi Meja Belajar
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold font-mono text-foreground truncate">
                {favoriteSeat || "-"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
              {totalSessionsVerified} sesi hadir terverifikasi
            </p>
          </div>
        </div>
      </div>

      {/* Note Verifikasi Kehadiran Kelas */}
      {recentAiVerifiedNote && (
        <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="truncate">{recentAiVerifiedNote}</span>
          </span>
          <span className="font-mono text-[10px] shrink-0 text-muted-foreground/70 ml-2">
            Verifikasi Kamera Kelas
          </span>
        </div>
      )}
    </div>
  );
}

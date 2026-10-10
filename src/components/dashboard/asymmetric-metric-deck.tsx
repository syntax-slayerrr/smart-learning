"use client";

import React from "react";
import Link from "next/link";
import { Users, ShieldCheck, ChevronRight, Award, BookOpen, GraduationCap } from "lucide-react";

interface AsymmetricMetricDeckProps {
  totalStudents?: number;
  attendanceRate: number; // e.g. 94.2
  totalSessionsToday?: number;
  className?: string;

  leftCard?: {
    label: string;
    value: string | number;
    unit?: string;
    sublabel?: string;
    href?: string;
    statusText?: string;
    icon?: "book" | "users" | "graduation" | "award";
  };

  rightCard?: {
    label?: string;
    href?: string;
    sublabel?: string;
    actionText?: string;
  };
}

export function AsymmetricMetricDeck({
  totalStudents = 0,
  attendanceRate,
  totalSessionsToday = 0,
  className = "",
  leftCard,
  rightCard,
}: AsymmetricMetricDeckProps) {
  const formattedRate = Math.round(attendanceRate);
  const isOptimal = formattedRate >= 85;

  // Resolusi konten kartu kiri
  const leftLabel = leftCard?.label ?? "Siswa Terdaftar";
  const leftValue = leftCard?.value ?? totalStudents;
  const leftUnit = leftCard?.unit ?? "Siswa";
  const leftSublabel =
    leftCard?.sublabel ??
    (totalSessionsToday > 0
      ? `${totalSessionsToday} sesi kelas hari ini`
      : "Semua kelas terintegrasi");
  const leftHref = leftCard?.href ?? "/admin/students";
  const leftStatusText = leftCard?.statusText ?? "Sistem Aktif";
  
  let LeftIcon = Users;
  if (leftCard?.icon === "book") LeftIcon = BookOpen;
  else if (leftCard?.icon === "graduation") LeftIcon = GraduationCap;
  else if (leftCard?.icon === "award") LeftIcon = Award;

  // Resolusi konten kartu kanan
  const rightLabel = rightCard?.label ?? "Presensi Hari Ini";
  const rightHref = rightCard?.href ?? "/admin/attendance";
  const rightSublabel = rightCard?.sublabel ?? "kehadiran";
  const rightActionText = rightCard?.actionText ?? "Rincian Absensi";

  return (
    <div className={`grid grid-cols-2 gap-3.5 sm:gap-4 ${className}`}>
      {/* LEFT CARD: Primary Saturated 3D Card (Deep Navy) */}
      <Link
        href={leftHref}
        className="card-3d-navy group relative flex flex-col justify-between p-3.5 sm:p-5 text-white overflow-hidden"
      >
        {/* Subtle Ambient Radial Glow inside card */}
        <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-blue-500/15 blur-2xl" />

        {/* Top Row: Label & Floating Micro Icon */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-300 tracking-tight">
            {leftLabel}
          </span>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-blue-400 group-hover:scale-105 transition-transform">
            <LeftIcon className="h-3.5 w-3.5 stroke-[2]" />
          </div>
        </div>

        {/* Center / Stat Display with Floating Volumetric Feel */}
        <div className="my-2 sm:my-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums">
              {leftValue}
            </span>
            <span className="text-xs text-slate-400 font-medium">{leftUnit}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">
            {leftSublabel}
          </p>
        </div>

        {/* Bottom Status Pill */}
        <div className="flex items-center gap-1.5 pt-1 text-[10px] sm:text-[11px] font-medium text-emerald-400">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{leftStatusText}</span>
        </div>
      </Link>

      {/* RIGHT CARD: Ceramic White Floating 3D Card */}
      <Link
        href={rightHref}
        className="card-3d-ceramic group relative flex flex-col justify-between p-3.5 sm:p-5 text-slate-900 overflow-hidden"
      >
        {/* Top Row: Label & Status Pill */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-600 tracking-tight truncate">
            {rightLabel}
          </span>
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${
              isOptimal
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-amber-50 text-amber-700 border border-amber-200/60"
            }`}
          >
            <ShieldCheck className="h-2.5 w-2.5 stroke-[2.2]" />
            <span>{isOptimal ? "Optimal" : "Perhatian"}</span>
          </div>
        </div>

        {/* Center / Stat Display */}
        <div className="my-2 sm:my-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {formattedRate}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium ml-1">
              {rightSublabel}
            </span>
          </div>

          {/* Segmented Dual-Tone Tactile Progress Bar */}
          <div className="mt-1.5 sm:mt-2 h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(Math.max(formattedRate, 5), 100)}%` }}
            />
          </div>
        </div>

        {/* Bottom Drilldown Action */}
        <div className="flex items-center justify-between pt-1 text-[10px] sm:text-[11px] font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
          <span>{rightActionText}</span>
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.2] group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </div>
  );
}

"use client";

import React from "react";
import { Activity, ShieldCheck, BrainCircuit } from "lucide-react";

interface RadialIntelligenceGaugeProps {
  score: number; // 0 - 100
  title?: string;
  subtitle?: string;
  className?: string;
}

export function RadialIntelligenceGauge({
  score = 0,
  title = "Smart Intelligence Score",
  subtitle = "Analisis Telemetri & Partisipasi Siswa",
  className = "",
}: RadialIntelligenceGaugeProps) {
  // SVG 270-degree open gauge parameters inspired by Human-Centric Infographics
  const size = 160;
  const strokeWidth = 11;
  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  
  // 270 degrees is 75% of circumference
  const arcLength = 0.75 * circumference;
  const safeScore = Math.min(Math.max(score, 0), 100);
  const activeLength = (safeScore / 100) * arcLength;

  // Determine status label & color accent based on score
  const getStatusBadge = () => {
    if (safeScore === 0) {
      return {
        label: "Belum Ada Data",
        bg: "bg-slate-50/90 text-slate-600 border-slate-200/80",
        dot: "bg-slate-400",
      };
    }
    if (safeScore >= 85) {
      return {
        label: "Sangat Optimal",
        bg: "bg-cyan-50/90 text-cyan-800 border-cyan-200/80",
        dot: "bg-cyan-500",
      };
    } else if (safeScore >= 70) {
      return {
        label: "Cukup Baik",
        bg: "bg-blue-50/90 text-blue-800 border-blue-200/80",
        dot: "bg-blue-500",
      };
    }
    return {
      label: "Perlu Pantauan",
      bg: "bg-amber-50/90 text-amber-800 border-amber-200/80",
      dot: "bg-amber-500",
    };
  };

  const status = getStatusBadge();

  return (
    <div
      className={`card-3d-ceramic relative p-5 sm:p-6 overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Background Soft Blue/Cyan Ambient Gradient */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/10 via-blue-500/10 to-transparent blur-2xl" />

      {/* Main Container */}
      <div className="relative flex flex-col sm:items-center">
        {/* Header Tag */}
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50/90 px-3 py-1 text-[11px] font-bold text-blue-700 border border-blue-200/70 mb-4 shadow-2xs">
          <Activity className="h-3 w-3 text-blue-600" />
          <span>Kesehatan Ekosistem Sekolah</span>
        </div>

        {/* Mobile Horizontal Layout / Desktop Vertical Stack */}
        <div className="flex items-center gap-4 sm:flex-col sm:text-center w-full">
          {/* 270-degree Open Arc Radial Gauge */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="h-28 w-28 sm:h-[150px] sm:w-[150px] transform rotate-[135deg]"
            >
              <defs>
                {/* Reference UPDATE V.1 Blue-to-Teal Gradient */}
                <linearGradient id="v1BlueTealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0B6BCB" />
                  <stop offset="50%" stopColor="#00B4D8" />
                  <stop offset="100%" stopColor="#1BCFB4" />
                </linearGradient>
                <filter id="gaugeShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0B6BCB" floodOpacity="0.18" />
                </filter>
              </defs>

              {/* Background Track (270 degree arc) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#EEF2F6"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />

              {/* Active Animated Fill */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="url(#v1BlueTealGradient)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${activeLength} ${circumference}`}
                strokeLinecap="round"
                filter="url(#gaugeShadow)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Center Metric Display (Extreme Data Contrast) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                {safeScore}%
              </span>
              <div
                className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold border ${status.bg} shadow-2xs`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot} animate-pulse`} />
                <span>{status.label}</span>
              </div>
            </div>
          </div>

          {/* Right Information Container on Mobile / Bottom Container on Desktop */}
          <div className="flex-1 min-w-0 text-left sm:text-center sm:mt-1">
            <div className="inline-flex sm:hidden items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60 mb-1">
              <Activity className="h-2.5 w-2.5 text-blue-600 shrink-0" />
              <span>Ekosistem AI</span>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug">
              {title}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 max-w-xs mt-0.5 line-clamp-2">
              {subtitle}
            </p>

            {/* Sub-Metric Badges inspired by Slide 3 & Slide 7 */}
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-semibold text-slate-600">
                <ShieldCheck className="h-3 w-3 text-cyan-600" />
                <span>Kehadiran {safeScore}%</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-semibold text-slate-600">
                <Activity className="h-3 w-3 text-blue-600" />
                <span>AI Vision Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

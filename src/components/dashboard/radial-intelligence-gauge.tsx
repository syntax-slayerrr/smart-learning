"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface RadialIntelligenceGaugeProps {
  score: number; // 0 - 100
  title?: string;
  subtitle?: string;
  className?: string;
}

export function RadialIntelligenceGauge({
  score = 94,
  title = "Smart Intelligence Score",
  subtitle = "Analisis Telemetri & Partisipasi Siswa",
  className = "",
}: RadialIntelligenceGaugeProps) {
  // SVG circular progress parameters
  const size = 150;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div
      className={`card-3d-ceramic relative p-4 sm:p-6 overflow-hidden ${className}`}
    >
      {/* Background Soft Blue Ambient Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent blur-xl" />

      {/* Main Container: Horizontal on mobile, Centered on tablet/desktop */}
      <div className="relative flex flex-col sm:items-center">
        {/* Header Tag - Visible on desktop, subtle pill on mobile */}
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200/60 mb-3">
          <Sparkles className="h-3 w-3 text-blue-600" />
          <span>Kesehatan Ekosistem Sekolah</span>
        </div>

        {/* Mobile Horizontal Layout / Desktop Vertical Stack */}
        <div className="flex items-center gap-4 sm:flex-col sm:text-center w-full">
          {/* Concentric Gauge SVG */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="h-24 w-24 sm:h-[140px] sm:w-[140px] transform -rotate-90"
            >
              {/* Track background */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="round"
              />
              {/* Animated Gradient Active Fill */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="url(#blueGaugeGradient)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="blueGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="60%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Metric Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular">
                {safeScore}%
              </span>
              <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200/50 mt-0.5">
                Optimal
              </span>
            </div>
          </div>

          {/* Right Information Container on Mobile / Bottom Container on Desktop */}
          <div className="flex-1 min-w-0 text-left sm:text-center">
            <div className="inline-flex sm:hidden items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60 mb-1">
              <Sparkles className="h-2.5 w-2.5 text-blue-600 shrink-0" />
              <span>Kesehatan Ekosistem</span>
            </div>

            <h4 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight leading-snug sm:mt-2">
              {title}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 max-w-xs mt-0.5 line-clamp-2">
              {subtitle}
            </p>

            {/* Mobile Key Status Indicators to fill dead space and provide high value */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 sm:hidden">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Presensi {safeScore}%</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>AI Vision Siaga</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

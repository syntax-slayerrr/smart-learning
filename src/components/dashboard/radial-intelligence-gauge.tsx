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
      className={`card-3d-ceramic relative flex flex-col items-center p-5 sm:p-6 text-center overflow-hidden ${className}`}
    >
      {/* Background Soft Blue Ambient Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent blur-xl" />

      {/* Header Tag */}
      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200/60 mb-4">
        <Sparkles className="h-3 w-3 text-blue-600" />
        <span>Kesehatan Ekosistem Sekolah</span>
      </div>

      {/* Concentric Gauge SVG */}
      <div className="relative flex items-center justify-center my-2">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
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
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular">
            {safeScore}%
          </span>
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50 mt-0.5">
            Optimal
          </span>
        </div>
      </div>

      {/* Titles */}
      <h4 className="mt-2 text-sm sm:text-base font-bold text-slate-900 tracking-tight">
        {title}
      </h4>
      <p className="mt-0.5 text-xs text-slate-500 max-w-xs">
        {subtitle}
      </p>
    </div>
  );
}

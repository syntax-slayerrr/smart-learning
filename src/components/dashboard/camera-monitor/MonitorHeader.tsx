"use client";

import React from "react";
import {
  Zap,
  Square,
  LayoutGrid,
  RefreshCw,
  Maximize2,
  Minimize2,
  Wifi,
  Eye,
} from "lucide-react";
import { CameraChannel } from "./types";

interface MonitorHeaderProps {
  streamOnline: boolean;
  actualFps?: number;
  viewMode: "single" | "quad";
  setViewMode: (mode: "single" | "quad") => void;
  isRefreshing: boolean;
  handleManualRefresh: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  channels: CameraChannel[];
  activeCamIndex: number;
  setActiveCamIndex: (idx: number) => void;
  focusIndex: number;
  totalDetected: number;
}

export function MonitorHeader({
  streamOnline,
  actualFps = 30,
  viewMode,
  setViewMode,
  isRefreshing,
  handleManualRefresh,
  isFullscreen,
  toggleFullscreen,
  channels,
  activeCamIndex,
  setActiveCamIndex,
  focusIndex,
  totalDetected,
}: MonitorHeaderProps) {
  return (
    <>
{/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-primary shadow-2xs">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-stone-900">
                AI Classroom Vision & Live Monitor
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                  streamOnline
                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                    : "bg-stone-200/60 text-stone-600 border border-stone-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    streamOnline ? "bg-emerald-600 animate-pulse" : "bg-stone-400"
                  }`}
                />
                {streamOnline ? `LIVE STREAM AKTIF (${actualFps} FPS)` : "KAMERA STANDBY"}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Deteksi multi-subjek real-time, klasifikasi postur duduk/berdiri, dan telemetri langsung
            </p>
          </div>
        </div>

        {/* View Mode & Actions Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-muted p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode("single")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold apple-press ${
                viewMode === "single"
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Fokus Kamera</span>
            </button>
            <button
              onClick={() => setViewMode("quad")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold apple-press ${
                viewMode === "quad"
                  ? "bg-white text-primary shadow-2xs font-bold"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Multi-Kamera</span>
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            title="Muat Ulang Telemetri"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 apple-press shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-stone-400"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title="Layar Penuh"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 apple-press shadow-2xs"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-stone-500" />
                <span className="hidden sm:inline">Keluar</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-stone-500" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Classroom Channel Selector */}
      <div className="flex items-center justify-between border-b border-border/80 bg-white px-5 py-2 overflow-x-auto gap-3 text-xs">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-semibold text-stone-700 flex items-center gap-1 text-xs">
            <Wifi className="h-3.5 w-3.5 text-primary" /> Saluran:
          </span>
          <div className="flex items-center gap-1.5">
            {channels.map((cam, idx) => {
              const isSelected = activeCamIndex === idx;
              return (
                <button
                  key={cam.id}
                  onClick={() => {
                    setActiveCamIndex(idx);
                    if (viewMode === "quad") setViewMode("single");
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono apple-press ${
                    isSelected
                      ? "bg-primary text-white font-bold shadow-2xs"
                      : "bg-muted text-stone-600 hover:bg-muted"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      idx === 0 && streamOnline ? "bg-emerald-300 animate-ping" : "bg-stone-400"
                    }`}
                  />
                  <span>CAM #{idx + 1}: {cam.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-stone-500 shrink-0">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
            <Eye className="h-3.5 w-3.5" /> Indeks Fokus: {focusIndex}%
          </span>
          <span className="text-stone-300">•</span>
          <span>{totalDetected} Subjek Terdeteksi</span>
        </div>
      </div>
    </>
  );
}

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-2xs">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                AI Classroom Vision & Live Monitor
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono transition-colors ${
                  streamOnline
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    streamOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                {streamOnline ? `LIVE STREAM (${actualFps} FPS)` : "STANDBY"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Deteksi multi-subjek real-time, klasifikasi postur duduk/berdiri, dan telemetri langsung
            </p>
          </div>
        </div>

        {/* View Mode & Actions Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-muted/80 p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode("single")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold apple-press transition-colors cursor-pointer ${
                viewMode === "single"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Fokus Kamera</span>
            </button>
            <button
              onClick={() => setViewMode("quad")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold apple-press transition-colors cursor-pointer ${
                viewMode === "quad"
                  ? "bg-card text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Multi-Kamera</span>
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            title="Muat Ulang Telemetri"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/70 apple-press shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title="Layar Penuh"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/70 apple-press shadow-2xs cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Keluar</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Classroom Channel Selector */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-2 overflow-x-auto gap-3 text-xs">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-semibold text-foreground flex items-center gap-1 text-xs">
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
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono apple-press transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      idx === 0 && streamOnline ? "bg-emerald-400 animate-ping" : "bg-muted-foreground/60"
                    }`}
                  />
                  <span>CAM #{idx + 1}: {cam.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0">
          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
            <Eye className="h-3.5 w-3.5" /> Indeks Fokus: {focusIndex}%
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="tabular">{totalDetected} Subjek Terdeteksi</span>
        </div>
      </div>
    </>
  );
}

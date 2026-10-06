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
  ChevronDown,
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
  const activeChannel = channels[activeCamIndex] || channels[0];

  return (
    <div className="border-b border-border bg-card">
      {/* Top Cockpit: Channel Info & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-5">
        {/* Left: Active Camera & Live Status Indicator */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[170px] sm:max-w-none">
                  {activeChannel.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors ${
                    streamOnline
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      streamOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                    }`}
                  />
                  {streamOnline ? "LIVE" : "STANDBY"}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Right Controls: Refresh & Fullscreen */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              aria-label="Refresh Telemetri"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            </button>
            <button
              onClick={toggleFullscreen}
              aria-label="Layar Penuh"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Center/Right: View Switcher (Segmented Control) & Global Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          {/* Segmented Control */}
          <div className="w-full sm:w-auto inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 shadow-inner">
            <button
              onClick={() => setViewMode("single")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium min-h-[32px] transition-all touch-manipulation ${
                viewMode === "single"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Fokus Kamera</span>
            </button>
            <button
              onClick={() => setViewMode("quad")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium min-h-[32px] transition-all touch-manipulation ${
                viewMode === "quad"
                  ? "bg-background text-primary shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Multi-Kamera</span>
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              title="Muat Ulang Telemetri"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs min-h-[32px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={toggleFullscreen}
              title="Layar Penuh"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs min-h-[32px]"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Keluar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Classroom Channel Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 sm:px-5 gap-2.5">
        {/* Mobile Dropdown */}
        <div className="sm:hidden relative w-full">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
            <Wifi className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground shrink-0 font-normal">Kamera:</span>
            <span className="font-semibold truncate flex-1 text-foreground">
              {activeChannel.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
          <select
            value={activeCamIndex}
            onChange={(e) => {
              setActiveCamIndex(Number(e.target.value));
              if (viewMode === "quad") setViewMode("single");
            }}
            aria-label="Pilih Saluran Kamera"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {channels.map((cam, idx) => (
              <option key={cam.id} value={idx}>
                {cam.name} {idx === 0 && streamOnline ? "(LIVE)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Channel Pills */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto">
          <span className="font-medium text-muted-foreground flex items-center gap-1.5 text-xs shrink-0">
            <Wifi className="h-3.5 w-3.5 text-primary" /> Ruangan:
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
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all active:scale-95 ${
                    isSelected
                      ? "bg-foreground text-background font-semibold shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      idx === 0 && streamOnline ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span>{cam.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Telemetry Metrics in Header */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <Eye className="h-3.5 w-3.5" /> Fokus: {focusIndex}%
          </span>
          <span className="text-border">•</span>
          <span className="tabular font-medium text-foreground">{totalDetected} Siswa Terdeteksi</span>
        </div>
      </div>
    </div>
  );
}

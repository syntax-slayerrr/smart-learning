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
    <div className="border-b border-[rgba(60,60,67,0.12)] bg-[#FAFAF9]">
      {/* Top Bar: Concise Title, Live Status & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#1D1D1F]">
                  Vision & Live Monitor
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold tracking-wide transition-colors ${
                    streamOnline
                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                      : "bg-stone-200/60 text-stone-600 border border-stone-300/40"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      streamOnline ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                    }`}
                  />
                  {streamOnline ? "LIVE" : "STANDBY"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Refresh & Fullscreen for Mobile header */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              aria-label="Refresh Telemetri"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(60,60,67,0.12)] bg-white text-[#1D1D1F] active:scale-95 transition-all shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : "text-[#6E6E73]"}`} />
            </button>
            <button
              onClick={toggleFullscreen}
              aria-label="Layar Penuh"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(60,60,67,0.12)] bg-white text-[#1D1D1F] active:scale-95 transition-all shadow-xs"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-[#6E6E73]" />
              ) : (
                <Maximize2 className="h-4 w-4 text-[#6E6E73]" />
              )}
            </button>
          </div>
        </div>

        {/* View Mode Switcher (iOS Segmented Control) & Desktop Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div className="w-full sm:w-auto inline-flex items-center rounded-xl border border-[rgba(60,60,67,0.12)] bg-[#EFEFED] p-1 shadow-inner">
            <button
              onClick={() => setViewMode("single")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium min-h-[36px] transition-all touch-manipulation ${
                viewMode === "single"
                  ? "bg-white text-[#1D1D1F] shadow-sm font-semibold"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Fokus Kamera</span>
            </button>
            <button
              onClick={() => setViewMode("quad")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium min-h-[36px] transition-all touch-manipulation ${
                viewMode === "quad"
                  ? "bg-white text-primary shadow-sm font-semibold"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Multi-Kamera</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              title="Muat Ulang Telemetri"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(60,60,67,0.12)] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F0] active:scale-95 transition-all shadow-xs min-h-[36px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-[#8E8E93]"}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={toggleFullscreen}
              title="Layar Penuh"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(60,60,67,0.12)] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F0] active:scale-95 transition-all shadow-xs min-h-[36px]"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-[#6E6E73]" />
                  <span>Keluar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-[#6E6E73]" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Classroom Channel Selector: Mobile Pop-up Picker vs Desktop Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-[rgba(60,60,67,0.08)] bg-white px-4 py-2.5 sm:px-6 gap-2.5">
        {/* Mobile: iOS-style Native Picker Dropdown (Prevents horizontal clipping) */}
        <div className="sm:hidden relative w-full">
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(60,60,67,0.14)] bg-[#F8F8F7] px-3 py-2 text-xs font-medium text-[#1D1D1F]">
            <Wifi className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[#8E8E93] shrink-0 font-normal">Kamera:</span>
            <span className="font-semibold truncate flex-1 text-[#1D1D1F]">
              {activeChannel.name}
            </span>
            <ChevronDown className="h-4 w-4 text-[#8E8E93] shrink-0" />
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

        {/* Desktop: Segmented Channel Pills */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto">
          <span className="font-medium text-[#8E8E93] flex items-center gap-1.5 text-xs shrink-0">
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
                      ? "bg-[#1D1D1F] text-white font-semibold shadow-xs"
                      : "bg-[#F5F5F4] text-[#6E6E73] hover:bg-[#EBEBEA] hover:text-[#1D1D1F]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      idx === 0 && streamOnline ? "bg-emerald-400 animate-pulse" : "bg-[#AEAEB2]"
                    }`}
                  />
                  <span>{cam.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Summary Badge */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-[#6E6E73]">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold">
            <Eye className="h-3.5 w-3.5" /> Fokus: {focusIndex}%
          </span>
          <span className="text-[#AEAEB2]">•</span>
          <span className="tabular font-medium text-[#1D1D1F]">{totalDetected} Siswa</span>
        </div>
      </div>
    </div>
  );
}

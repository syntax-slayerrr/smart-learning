"use client";

import React from "react";
import { Smartphone, Square, RotateCw, Battery, BatteryCharging } from "lucide-react";
import { CameraChannel } from "./types";

interface MultiCameraGridProps {
  channels: CameraChannel[];
  streamOnline: boolean;
  totalDetected: number;
  focusIndex: number;
  setActiveCamIndex: (idx: number) => void;
  setViewMode: (mode: "single" | "quad") => void;
  onRotateChannel?: (classId: string) => void;
}

export function MultiCameraGrid({
  channels,
  streamOnline,
  totalDetected,
  focusIndex,
  setActiveCamIndex,
  setViewMode,
  onRotateChannel,
}: MultiCameraGridProps) {
  return (
    <div className="p-4 sm:p-5 bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((cam, idx) => {
          const isCamOnline = cam.isOnline ?? streamOnline;
          return (
            <div
              key={cam.id}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs transition-all hover:border-primary/40 flex flex-col justify-between"
            >
              {/* Header Card CCTV */}
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-foreground truncate">
                    CAM #{idx + 1} — {cam.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Battery Telemetry Pill */}
                  {cam.battery !== undefined && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                        cam.battery <= 20
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                      title={cam.isCharging ? "Sedang Mengisi Daya" : "Daya Baterai HP"}
                    >
                      {cam.isCharging ? (
                        <BatteryCharging className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Battery className="h-3 w-3" />
                      )}
                      <span>{cam.battery}%</span>
                    </span>
                  )}

                  {/* Online/Standby Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${
                      isCamOnline
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isCamOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"
                      }`}
                    />
                    {isCamOnline ? "LIVE STREAM" : "STANDBY"}
                  </span>
                </div>
              </div>

              {/* Video Feed Viewport */}
              <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {isCamOnline ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cam.streamUrl}
                      alt={`Live Feed ${cam.name}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                      <span className="rounded-lg bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-xs font-mono font-semibold text-white border border-white/10">
                        🔴 CAM #{idx + 1} • {idx === 0 ? totalDetected : 0} Subjek
                      </span>
                    </div>

                    {/* Quick Remote Rotation Button */}
                    {onRotateChannel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotateChannel(cam.id);
                        }}
                        title="Putar Sudut Kamera (90°)"
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-900 border border-white/10 text-white hover:text-orange-400 transition-colors cursor-pointer backdrop-blur-md shadow-xs"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center text-white">
                    <Smartphone className="h-7 w-7 text-muted-foreground/50 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-200">{cam.name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{cam.ipAddress}</p>
                  </div>
                )}
              </div>

              {/* Footer Panel */}
              <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{idx === 0 ? totalDetected : 0}</strong> Subjek
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Fokus: {idx === 0 ? focusIndex : 100}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCamIndex(idx);
                    setViewMode("single");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                >
                  <Square className="h-3 w-3" />
                  <span>Fokuskan</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

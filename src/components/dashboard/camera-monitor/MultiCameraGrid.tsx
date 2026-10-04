"use client";

import React from "react";
import { Smartphone, Square } from "lucide-react";
import { CameraChannel } from "./types";

interface MultiCameraGridProps {
  channels: CameraChannel[];
  streamOnline: boolean;
  totalDetected: number;
  focusIndex: number;
  setActiveCamIndex: (idx: number) => void;
  setViewMode: (mode: "single" | "quad") => void;
}

export function MultiCameraGrid({
  channels,
  streamOnline,
  totalDetected,
  focusIndex,
  setActiveCamIndex,
  setViewMode,
}: MultiCameraGridProps) {
  return (
        <div className="p-4 sm:p-5 bg-stone-950/2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((cam, idx) => {
              const isCamOnline = idx === 0 && streamOnline;
              return (
                <div
                  key={cam.id}
                  className="rounded-xl border border-[#E7E2DA] bg-white overflow-hidden shadow-2xs card-hover flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#FBF9F5] px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">
                        CAM #{idx + 1} — {cam.name}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-mono font-bold ${
                        isCamOnline
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isCamOnline ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                      {isCamOnline ? "LIVE 30 FPS" : "STANDBY"}
                    </span>
                  </div>

                  <div className="relative aspect-video w-full bg-stone-900 flex items-center justify-center overflow-hidden">
                    {isCamOnline ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cam.streamUrl}
                          alt={`Live Feed ${cam.name}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                          <span className="rounded bg-stone-950/80 backdrop-blur-md px-2 py-0.5 text-[9.5px] font-mono font-bold text-white border border-white/10">
                            🔴 CAM #{idx + 1} • {totalDetected} Subjek
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center text-white">
                        <Smartphone className="h-7 w-7 text-stone-500 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-stone-300">{cam.name}</p>
                        <p className="text-[10.5px] font-mono text-stone-400 mt-0.5">{cam.ipAddress}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-[#FBF9F5] border-t border-[#E7E2DA] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-stone-700">
                        <strong>{idx === 0 ? totalDetected : 0}</strong> Subjek
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        Fokus: {idx === 0 ? focusIndex : 100}%
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveCamIndex(idx);
                        setViewMode("single");
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-stone-900 text-white px-2.5 py-1 text-[11px] font-medium hover:bg-stone-800 apple-press"
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

"use client";

import React, { RefObject, useState } from "react";
import {
  Video,
  Camera,
  RotateCw,
  FlipHorizontal,
  Smartphone,
  Laptop,
  Radio,
  Terminal,
} from "lucide-react";
import { CameraChannel, TelemetryPoint } from "./types";
import { Button } from "@/components/ui/button";

interface StreamViewportProps {
  activeChannel: CameraChannel;
  activeCamIndex: number;
  streamOnline: boolean;
  activeRotation: string;
  isFlipped: boolean;
  aspectRatioMode: "portrait" | "landscape";
  totalDetected: number;
  counts: {
    attentive: number;
    writing: number;
    hand_raised: number;
    using_phone: number;
    sleep: number;
  };
  telemetry: TelemetryPoint;
  lastSyncTime: Date;
  copiedCmd: boolean;
  currentCameraSource: number | string;
  isCameraHardwareConnected: boolean;
  videoImgRef: RefObject<HTMLImageElement | null>;
  edgeServerUrl: string;
  feedTimestamp: number;
  setStreamOnline: (online: boolean) => void;
  onOpenModal: () => void;
  rotateCamera: (deg: string) => void;
  toggleFlip: () => void;
  setAspectRatioMode: (
    mode: "portrait" | "landscape" | ((prev: "portrait" | "landscape") => "portrait" | "landscape")
  ) => void;
  copyWifiCommand: (camNum: number, port: number) => void;
}

export function StreamViewport({
  activeChannel,
  activeCamIndex,
  streamOnline,
  activeRotation,
  isFlipped,
  aspectRatioMode,
  totalDetected,
  counts,
  telemetry,
  lastSyncTime,
  copiedCmd,
  currentCameraSource,
  isCameraHardwareConnected,
  videoImgRef,
  edgeServerUrl,
  feedTimestamp,
  setStreamOnline,
  onOpenModal,
  rotateCamera,
  toggleFlip,
  setAspectRatioMode,
  copyWifiCommand,
}: StreamViewportProps) {
  const [showCliInstruction, setShowCliInstruction] = useState(false);

  return (
    <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between bg-white border-b lg:border-b-0 lg:border-r border-[rgba(60,60,67,0.10)]">
      <div className="space-y-4">
        {/* Top Minimal Bar: Source & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1D1D1F] flex items-center gap-1.5 text-sm">
              <Video className="h-4 w-4 text-[#007AFF]" />
              {activeChannel.name}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                streamOnline
                  ? "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20"
                  : "bg-[#8E8E93]/10 text-[#6E6E73] border border-[rgba(60,60,67,0.12)]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  streamOnline ? "bg-[#34C759] animate-pulse" : "bg-[#8E8E93]"
                }`}
              />
              {streamOnline ? "LIVE" : "Standby"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(60,60,67,0.12)] bg-[#F7F7F5] hover:bg-[#E5E5EA] text-[#1D1D1F] px-3 py-1.5 text-xs font-medium transition-colors apple-press"
              title="Atur Sumber Kamera"
            >
              <Camera className="h-3.5 w-3.5 text-[#007AFF]" />
              <span>Sumber:</span>
              <span className="font-semibold text-[#007AFF]">
                {typeof currentCameraSource === "number" ? `Webcam ${currentCameraSource}` : "Kamera IP"}
              </span>
            </button>

            {/* Compact Orientation controls */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-[rgba(60,60,67,0.12)] bg-[#F7F7F5] p-0.5">
              <button
                onClick={() =>
                  rotateCamera(
                    activeRotation === "0"
                      ? "90"
                      : activeRotation === "90"
                      ? "180"
                      : activeRotation === "180"
                      ? "270"
                      : "0"
                  )
                }
                title={`Rotasi Kamera (Saat ini: ${activeRotation}°)`}
                className="px-2 py-1 rounded-lg text-xs font-mono font-medium text-[#1D1D1F] hover:bg-white apple-press transition-colors"
              >
                <RotateCw className="h-3 w-3 inline mr-1 text-[#007AFF]" />
                {activeRotation}°
              </button>
              <button
                onClick={toggleFlip}
                title="Mirror Horizontal"
                className={`px-2 py-1 rounded-lg text-xs font-medium apple-press transition-colors ${
                  isFlipped ? "bg-white text-[#007AFF] shadow-xs" : "text-[#6E6E73] hover:bg-white"
                }`}
              >
                <FlipHorizontal className="h-3 w-3" />
              </button>
              <button
                onClick={() => setAspectRatioMode((m) => (m === "portrait" ? "landscape" : "portrait"))}
                title="Mode Potret / Lanskap"
                className="px-2 py-1 rounded-lg text-xs font-medium text-[#6E6E73] hover:bg-white apple-press transition-colors"
              >
                {aspectRatioMode === "portrait" ? (
                  <Smartphone className="h-3 w-3 text-[#007AFF]" />
                ) : (
                  <Laptop className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Video Player Box */}
        <div
          className={`relative w-full rounded-2xl overflow-hidden bg-[#1C1C1E] border border-[rgba(60,60,67,0.15)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center justify-center transition-all ${
            aspectRatioMode === "portrait" ? "aspect-[3/4] sm:aspect-[9/16] max-h-[34rem]" : "aspect-video"
          }`}
        >
          {streamOnline ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={videoImgRef}
                src={`${edgeServerUrl}/video_feed?t=${feedTimestamp}`}
                alt={`Live Stream ${activeChannel.name}`}
                className="w-full h-full object-contain"
                onError={() => setStreamOnline(false)}
              />

              {/* Top Floating Restrained HUD Badges */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-white border border-white/10 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
                  LIVE • {activeChannel.name}
                </span>
              </div>

              <div className="absolute top-3.5 right-3.5 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/90 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <span>{totalDetected} siswa terdeteksi</span>
                </span>
              </div>

              {/* Bottom Subtle Detection Telemetry Pill */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 pointer-events-none flex justify-center">
                <div className="rounded-full bg-black/65 backdrop-blur-md px-4 py-1.5 text-xs text-white/90 border border-white/10 flex items-center gap-3 shadow-md">
                  <Radio className="h-3.5 w-3.5 text-[#34C759] animate-pulse" />
                  <span>
                    Duduk: <strong className="font-mono text-white">{telemetry.sitting_count}</strong>
                  </span>
                  <span className="text-white/40">•</span>
                  <span>
                    Berdiri: <strong className="font-mono text-white">{telemetry.standing_count}</strong>
                  </span>
                  <span className="text-white/40">•</span>
                  <span>
                    Fokus: <strong className="font-mono text-white">{counts.attentive}</strong>
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Standby State with Apple Clean Calmness */
            <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-[#F7F7F5] text-[#1D1D1F] select-none min-h-[20rem]">
              <div className="h-14 w-14 rounded-2xl bg-white border border-[rgba(60,60,67,0.12)] flex items-center justify-center text-primary mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Video className="h-7 w-7 text-primary" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#8E8E93]/15 text-[#6E6E73] mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8E8E93]" />
                Kamera Standby
              </div>

              <h3 className="text-base font-bold text-[#1D1D1F] mb-0.5">{activeChannel.name}</h3>
              <p className="text-xs text-[#6E6E73] max-w-sm mb-5 leading-relaxed">
                Hubungkan kamera HP Android (IP Webcam) atau kamera laptop untuk memantau keterlibatan kelas secara langsung.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={onOpenModal}
                  className="apple-press w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-primary/20 hover:bg-orange-700 transition-colors min-h-[44px] cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Hubungkan Kamera HP / Laptop</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Status Indicators */}
      <div className="mt-4 pt-3 border-t border-[rgba(60,60,67,0.08)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-[#6E6E73]">
          <span className="font-semibold text-[#1D1D1F]">Ringkasan Kelas:</span>
          <span className="flex items-center gap-1 text-[#34C759] font-medium">
            <span className="h-2 w-2 rounded-full bg-[#34C759]" /> Menyimak ({counts.attentive})
          </span>
          <span className="flex items-center gap-1 text-[#007AFF] font-medium">
            <span className="h-2 w-2 rounded-full bg-[#007AFF]" /> Aktif Bertanya ({counts.hand_raised})
          </span>
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Perlu Pendampingan ({counts.sleep})
          </span>
        </div>
        <span className="text-[11px] text-[#8E8E93] font-mono">
          Pembaruan: {lastSyncTime.toLocaleTimeString("id-ID")}
        </span>
      </div>
    </div>
  );
}

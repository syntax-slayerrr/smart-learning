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
    <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between bg-white dark:bg-stone-950 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-white/10">
      <div className="space-y-4">
        {/* Top Minimal Bar: Source & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5 text-sm">
              <Video className="h-4 w-4 text-primary" />
              {activeChannel.name}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                streamOnline
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-stone-100 text-stone-500 border border-stone-200 dark:border-white/10"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  streamOnline ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                }`}
              />
              {streamOnline ? "LIVE" : "Standby"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 hover:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 px-3 py-1.5 text-xs font-medium transition-colors apple-press"
              title="Atur Sumber Kamera"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span>Sumber:</span>
              <span className="font-semibold text-primary">
                {typeof currentCameraSource === "number" ? `Webcam ${currentCameraSource}` : "Kamera IP"}
              </span>
            </button>

            {/* Compact Orientation controls */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-stone-900 p-0.5">
              <button
                type="button"
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
                className="px-2 py-1 rounded-lg text-xs font-mono font-medium text-stone-800 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-800 apple-press transition-colors"
              >
                <RotateCw className="h-3 w-3 inline mr-1 text-primary" />
                {activeRotation}°
              </button>
              <button
                type="button"
                onClick={toggleFlip}
                title="Mirror Horizontal"
                className={`px-2 py-1 rounded-lg text-xs font-medium apple-press transition-colors ${
                  isFlipped ? "bg-white dark:bg-stone-800 text-primary shadow-xs font-bold" : "text-stone-500 hover:bg-white dark:hover:bg-stone-800"
                }`}
              >
                <FlipHorizontal className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setAspectRatioMode((m) => (m === "portrait" ? "landscape" : "portrait"))}
                title="Mode Potret / Lanskap"
                className="px-2 py-1 rounded-lg text-xs font-medium text-stone-500 hover:bg-white dark:hover:bg-stone-800 apple-press transition-colors"
              >
                {aspectRatioMode === "portrait" ? (
                  <Smartphone className="h-3 w-3 text-primary" />
                ) : (
                  <Laptop className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Video Player Box */}
        <div
          className={`relative w-full rounded-2xl overflow-hidden bg-[#1C1C1E] border border-border/80 shadow-md flex items-center justify-center transition-all ${
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
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE • {activeChannel.name}
                </span>
              </div>

              <div className="absolute top-3.5 right-3.5 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <span>{totalDetected} siswa terdeteksi</span>
                </span>
              </div>

              {/* Bottom Subtle Detection Telemetry Pill */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 pointer-events-none flex justify-center">
                <div className="rounded-full bg-black/65 backdrop-blur-md px-4 py-1.5 text-xs text-white/90 border border-white/10 flex items-center gap-3 shadow-md">
                  <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
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
            <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 select-none">
              <div className="h-14 w-14 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-white/10 flex items-center justify-center text-stone-400 mb-4 shadow-2xs">
                <Video className="h-7 w-7 text-primary" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-300 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                Standby
              </div>

              <h3 className="text-base font-bold text-stone-900 dark:text-white mb-0.5">{activeChannel.name}</h3>
              <p className="text-xs text-stone-400 mb-2 font-mono">IP Webcam / Network Camera</p>

              <p className="text-xs text-stone-500 max-w-sm mb-5 leading-relaxed">
                Hubungkan kamera untuk memulai visual feed dan deteksi postur kelas secara real-time.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                <Button
                  type="button"
                  variant="primary"
                  onClick={onOpenModal}
                  className="w-full min-h-[44px] justify-center shadow-2xs active:scale-[0.98]"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Hubungkan Kamera
                </Button>
              </div>

              {/* Subtle Collapsible CLI Helper */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowCliInstruction(!showCliInstruction)}
                  className="text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 inline-flex items-center gap-1 transition-colors"
                >
                  <Terminal className="h-3 w-3" />
                  <span>{showCliInstruction ? "Sembunyikan Perintah Edge AI" : "Bantuan Perintah Edge AI"}</span>
                </button>

                {showCliInstruction && (
                  <div className="mt-3 p-3 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-white/10 text-left max-w-md w-full shadow-2xs">
                    <p className="text-[11px] text-stone-500 mb-1.5 font-medium">Jalankan di terminal lokal:</p>
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50 dark:bg-stone-900 font-mono text-[10px] text-stone-800 dark:text-stone-200">
                      <span className="truncate">python3 experiments/cv-poc/classroom_poc.py</span>
                      <button
                        type="button"
                        onClick={() => copyWifiCommand(activeCamIndex + 1, activeChannel.port)}
                        className="px-2 py-1 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-white/10 text-[10px] text-primary hover:bg-stone-50 shrink-0 font-bold"
                      >
                        {copiedCmd ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Status Indicators */}
      <div className="mt-4 pt-3 border-t border-stone-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="font-semibold text-stone-900 dark:text-white">Ringkasan Deteksi:</span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Duduk ({counts.attentive})
          </span>
          <span className="flex items-center gap-1 text-primary font-medium">
            <span className="h-2 w-2 rounded-full bg-primary" /> Angkat Tangan ({counts.hand_raised})
          </span>
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Berdiri ({telemetry.standing_count})
          </span>
        </div>
        <span className="text-[11px] text-stone-400 font-mono">
          Sinkronisasi: {lastSyncTime.toLocaleTimeString("id-ID")}
        </span>
      </div>
    </div>
  );
}

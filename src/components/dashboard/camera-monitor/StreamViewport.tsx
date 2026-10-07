"use client";

import React, { RefObject } from "react";
import {
  Video,
  Camera,
  RotateCw,
  FlipHorizontal,
  Smartphone,
  Laptop,
  Radio,
} from "lucide-react";
import { CameraChannel, TelemetryPoint } from "./types";

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
  streamOnline,
  activeRotation,
  isFlipped,
  aspectRatioMode,
  totalDetected,
  counts,
  telemetry,
  lastSyncTime,
  currentCameraSource,
  videoImgRef,
  edgeServerUrl,
  feedTimestamp,
  setStreamOnline,
  onOpenModal,
  rotateCamera,
  toggleFlip,
  setAspectRatioMode,
}: StreamViewportProps) {
  return (
    <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-5 flex flex-col justify-between bg-card border-b lg:border-b-0 lg:border-r border-border">
      <div className="space-y-3.5">
        {/* Top Control Bar: Active Source & Quick Hardware Setup */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <Video className="h-4 w-4 text-primary" />
              <span className="truncate max-w-[160px] sm:max-w-none">{activeChannel.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground px-3 py-1.5 text-xs font-medium transition-all active:scale-95 shadow-xs min-h-[34px]"
              title="Atur Sumber Kamera"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline text-muted-foreground">Sumber:</span>
              <span className="font-semibold text-primary">
                {typeof currentCameraSource === "number" ? `Webcam ${currentCameraSource}` : "Kamera IP"}
              </span>
            </button>

            {/* Orientation & Aspect Controls */}
            <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/60 p-0.5 shadow-inner">
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
                title={`Rotasi Kamera (${activeRotation}°)`}
                className="px-2 py-1 rounded-lg text-xs font-mono font-medium text-foreground hover:bg-background active:scale-95 transition-all"
              >
                <RotateCw className="h-3 w-3 inline mr-0.5 text-primary" />
                <span>{activeRotation}°</span>
              </button>
              <button
                onClick={toggleFlip}
                title="Mirror Horizontal"
                className={`p-1.5 rounded-lg text-xs font-medium active:scale-95 transition-all ${
                  isFlipped ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setAspectRatioMode((m) => (m === "portrait" ? "landscape" : "portrait"))}
                title="Rasio Aspek"
                className="p-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              >
                {aspectRatioMode === "portrait" ? (
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Laptop className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div
          className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-border/80 shadow-xs flex items-center justify-center transition-all ${
            aspectRatioMode === "portrait" ? "aspect-[3/4] sm:aspect-[9/16] max-h-[32rem]" : "aspect-video"
          }`}
        >
          {streamOnline ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={videoImgRef}
                src={
                  typeof window !== "undefined" && window.location.protocol === "https:" && !window.location.hostname.includes("localhost")
                    ? `/api/camera/stream?target=video_feed&t=${feedTimestamp}`
                    : `${edgeServerUrl}/video_feed?t=${feedTimestamp}`
                }
                alt={`Live Stream ${activeChannel.name}`}
                className="w-full h-full object-contain"
                onError={() => setStreamOnline(false)}
              />

              {/* Top HUD Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white border border-white/10 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE</span>
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-slate-950/50 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white/80 border border-white/10">
                  {activeChannel.name}
                </span>
              </div>

              <div className="absolute top-3 right-3 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/10 shadow-xs">
                  <span>{totalDetected} Siswa</span>
                </span>
              </div>

              {/* Bottom Telemetry HUD Pill */}
              <div className="absolute bottom-3 inset-x-3 pointer-events-none flex justify-center">
                <div className="rounded-full bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 text-xs text-white/90 border border-white/15 flex items-center gap-2.5 shadow-md">
                  <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse shrink-0" />
                  <span>
                    Duduk: <strong className="font-mono text-white">{telemetry.sitting_count}</strong>
                  </span>
                  <span className="text-white/30">•</span>
                  <span>
                    Berdiri: <strong className="font-mono text-white">{telemetry.standing_count}</strong>
                  </span>
                  <span className="text-white/30">•</span>
                  <span>
                    Fokus: <strong className="font-mono text-white">{counts.attentive}</strong>
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Standby State with Clean Apple Ceramic Look */
            <div className="w-full h-full p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-muted/20 text-foreground select-none min-h-[19rem]">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-background border border-border flex items-center justify-center text-primary mb-3 shadow-xs">
                <Video className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border mb-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                Kamera Standby
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">{activeChannel.name}</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                Sambungkan webcam laptop atau kamera HP Android (IP Webcam) untuk mulai menganalisis atensi kelas.
              </p>

              <button
                type="button"
                onClick={onOpenModal}
                className="w-full max-w-xs inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold shadow-xs hover:bg-primary/90 active:scale-95 transition-all min-h-[42px] cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>Pilih Sumber Kamera</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Indicators: Flat summary footnote */}
      <div className="mt-3.5 pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Menyimak: {counts.attentive}
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1 text-primary font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Bertanya: {counts.hand_raised}
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Perhatian: {counts.sleep}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          Sinkron: {lastSyncTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

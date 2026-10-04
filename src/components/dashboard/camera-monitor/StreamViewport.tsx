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
  Wifi,
  Check,
  Copy,
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
  setAspectRatioMode: (mode: "portrait" | "landscape" | ((prev: "portrait" | "landscape") => "portrait" | "landscape")) => void;
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
  return (
    <>
{/* Left Pane: Live Video Stream */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between bg-stone-950/2">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                    <Video className="h-4 w-4 text-primary" />
                    Visual Feed: {activeChannel.name}
                  </span>
                  <button
                    onClick={onOpenModal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-2.5 py-1 text-xs font-medium shadow-2xs transition-all active:scale-[0.98]"
                    title="Buka Pengaturan Kamera & Webcam"
                  >
                    <Camera className="h-3 w-3 text-orange-400" />
                    <span>Sumber:</span>
                    <span className="font-mono font-bold text-orange-200">
                      {typeof currentCameraSource === "number" ? `Webcam ${currentCameraSource}` : "Kamera IP"}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isCameraHardwareConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                      }`}
                    />
                  </button>
                </div>
                <span className="font-mono text-xs text-stone-400">
                  {activeChannel.ipAddress}
                </span>
              </div>

              {/* Orientation & Aspect Ratio Controls for Phone Camera */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted border border-border p-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-stone-700">
                  <RotateCw className="h-3.5 w-3.5 text-primary" />
                  <span>Orientasi Kamera HP:</span>
                  <span className="font-mono text-xs rounded bg-white px-1.5 py-0.5 border border-border text-stone-800 font-bold">
                    {activeRotation}° {isFlipped ? "(Mirror)" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => rotateCamera("0")}
                    title="Rotasi 0 Derajat (Normal)"
                    className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-all ${
                      activeRotation === "0" ? "bg-stone-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-border"
                    }`}
                  >
                    0°
                  </button>
                  <button
                    onClick={() => rotateCamera("90")}
                    title="Rotasi 90 Derajat (Searah jarum jam)"
                    className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-all ${
                      activeRotation === "90" ? "bg-stone-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-border"
                    }`}
                  >
                    ↻ 90°
                  </button>
                  <button
                    onClick={() => rotateCamera("180")}
                    title="Rotasi 180 Derajat (Terbalik)"
                    className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-all ${
                      activeRotation === "180" ? "bg-stone-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-border"
                    }`}
                  >
                    180°
                  </button>
                  <button
                    onClick={() => rotateCamera("270")}
                    title="Rotasi 270 Derajat (Berlawanan jarum jam)"
                    className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-all ${
                      activeRotation === "270" ? "bg-stone-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-border"
                    }`}
                  >
                    ↺ 270°
                  </button>
                  <button
                    onClick={toggleFlip}
                    title="Cermin Horizontal (Mirror)"
                    className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-all flex items-center gap-1 ${
                      isFlipped ? "bg-primary text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-border"
                    }`}
                  >
                    <FlipHorizontal className="h-3 w-3" />
                    <span>Mirror</span>
                  </button>
                  <button
                    onClick={() => setAspectRatioMode((m) => (m === "portrait" ? "landscape" : "portrait"))}
                    className="ml-1 rounded px-2 py-0.5 text-xs font-medium bg-white text-stone-800 hover:bg-stone-100 border border-border flex items-center gap-1"
                  >
                    {aspectRatioMode === "portrait" ? (
                      <>
                        <Smartphone className="h-3 w-3 text-primary" />
                        <span>Mode Potret HP</span>
                      </>
                    ) : (
                      <>
                        <Laptop className="h-3 w-3 text-stone-600" />
                        <span>Mode Lanskap</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Video Player Box with dynamic portrait/landscape ratio */}
              <div
                className={`relative w-full rounded-xl overflow-hidden bg-stone-950 border border-stone-800 shadow-inner flex items-center justify-center transition-all ${
                  aspectRatioMode === "portrait" ? "aspect-[3/4] sm:aspect-[9/16] max-h-[36rem]" : "aspect-video"
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
                    {/* Top Floating HUD Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-950/80 backdrop-blur-md px-2.5 py-1 text-xs font-mono font-medium text-white border border-white/10 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        LIVE • {activeChannel.name}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
                      <span className="rounded-md bg-primary/90 backdrop-blur-md px-2.5 py-1 text-xs font-mono font-bold text-white shadow-sm">
                        ⚡ {totalDetected} Subjek Terdeteksi
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="rounded-md bg-stone-950/80 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-stone-200 border border-white/10 flex items-center gap-2 transition-all duration-500">
                        <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse shrink-0" />
                        <span>Kamera HP IP Webcam • Duduk: <strong className="font-mono tabular-nums text-white">{telemetry.sitting_count}</strong> | Berdiri: <strong className="font-mono tabular-nums text-white">{telemetry.standing_count}</strong></span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Standby / Offline Screen with Instructions */
                  <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center bg-stone-900 text-white select-none">
                    <div className="h-12 w-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-orange-500 mb-3 shadow-lg">
                      <Wifi className="h-6 w-6 text-stone-400" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-200 mb-1">
                      Kamera IP: {activeChannel.name} Standby
                    </h4>
                    <p className="text-xs text-stone-400 max-w-sm mb-4 leading-relaxed">
                      Jalankan perintah berikut di terminal untuk mengaktifkan AI Vision Engine:
                    </p>

                    <div className="w-full max-w-md space-y-2 text-left">
                      <div className="flex items-center justify-between rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-xs font-mono text-stone-300">
                        <div className="flex items-center gap-2 truncate">
                          <Wifi className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <span className="truncate">
                            python3 experiments/cv-poc/classroom_poc.py --source &quot;http://10.10.10.33:8080/video&quot;
                          </span>
                        </div>
                        <button
                          onClick={() => copyWifiCommand(activeCamIndex + 1, activeChannel.port)}
                          title="Salin Perintah"
                          className="ml-2 inline-flex items-center gap-1 rounded bg-stone-800 px-2 py-1 text-xs text-stone-300 hover:text-white transition-colors"
                        >
                          {copiedCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedCmd ? "Tersalin" : "Salin"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Status Legend Bar */}
            <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-stone-700">Status Real-Time:</span>
                <span className="flex items-center gap-1 text-emerald-700 font-mono text-xs transition-all duration-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 transition-colors duration-300" /> Duduk / Fokus (<strong className="tabular-nums font-bold">{counts.attentive}</strong>)
                </span>
                <span className="flex items-center gap-1 text-sky-700 font-mono text-xs transition-all duration-300">
                  <span className="h-2 w-2 rounded-full bg-sky-500 transition-colors duration-300" /> Menulis (<strong className="tabular-nums font-bold">{counts.writing}</strong>)
                </span>
                {counts.sleep > 0 && (
                  <span className="flex items-center gap-1 text-red-700 font-mono text-xs font-bold transition-all duration-300">
                    <span className="h-2 w-2 rounded-full bg-red-700 animate-pulse" /> Tidur / Menunduk (<strong className="tabular-nums">{counts.sleep}</strong>)
                  </span>
                )}
                {counts.hand_raised > 0 && (
                  <span className="flex items-center gap-1 text-amber-800 font-mono text-xs font-bold transition-all duration-300">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Angkat Tangan (<strong className="tabular-nums">{counts.hand_raised}</strong>)
                  </span>
                )}
                {telemetry.standing_count > 0 && (
                  <span className="flex items-center gap-1 text-blue-700 font-mono text-xs font-bold transition-all duration-300">
                    <span className="h-2 w-2 rounded-full bg-blue-600" /> Berdiri (<strong className="tabular-nums">{telemetry.standing_count}</strong>)
                  </span>
                )}
              </div>
              <div className="font-mono text-stone-400 text-xs">
                Update: {lastSyncTime.toLocaleTimeString("id-ID")}
              </div>
            </div>
          </div>
    </>
  );
}

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
  Play,
  Loader2,
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
  const [useProxy, setUseProxy] = React.useState(false);
  const [streamError, setStreamError] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Reset fallback saat saluran aktif berubah
  React.useEffect(() => {
    setUseProxy(false);
    setStreamError(false);
  }, [activeChannel?.id]);

  const streamSrc = React.useMemo(() => {
    const isCloud =
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      !window.location.hostname.includes("localhost") &&
      window.location.hostname !== "127.0.0.1";

    let targetBase = edgeServerUrl;
    if (
      isCloud &&
      (!targetBase ||
        targetBase.includes("localhost") ||
        targetBase.includes("127.0.0.1") ||
        targetBase.includes("trycloudflare.com"))
    ) {
      targetBase = "https://smart-learning.de.deplexo.com";
    }

    const params = new URLSearchParams();
    if (activeChannel?.id) {
      params.set("class_id", activeChannel.id);
    }
    params.set("t", String(feedTimestamp));

    if (useProxy) {
      return `/api/camera/stream?target=video_feed&${params.toString()}&tunnel=${encodeURIComponent(targetBase)}`;
    }

    return `${targetBase}/video_feed?${params.toString()}`;
  }, [edgeServerUrl, activeChannel?.id, feedTimestamp, useProxy]);

  const handleImageError = () => {
    if (!useProxy) {
      // Direct stream gagal (mungkin Cloudflare buffering atau mixed content), coba lewat Next.js proxy
      setUseProxy(true);
    } else {
      setStreamError(true);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        setUseProxy(false);
        setStreamError(false);
      }, 3000);
    }
  };

  const handleImageLoad = () => {
    setStreamError(false);
  };

  const [isStartingEngine, setIsStartingEngine] = React.useState(false);

  const handleStartEngine = async () => {
    setIsStartingEngine(true);
    try {
      const res = await fetch("/api/camera/engine", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTimeout(() => {
          setStreamOnline(true);
          setIsStartingEngine(false);
        }, 1500);
      } else {
        setIsStartingEngine(false);
      }
    } catch {
      setIsStartingEngine(false);
    }
  };

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
                key={streamSrc}
                src={streamSrc}
                alt={`Live Stream ${activeChannel.name}`}
                className="w-full h-full object-contain"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />

              {streamError && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500 mb-2" />
                  <p className="text-xs font-medium text-slate-200">Menghubungkan aliran video kamera HP...</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs text-center font-mono">
                    {useProxy ? "Menggunakan jalur proksi backend" : "Menggunakan jalur cloud langsung"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUseProxy(false);
                      setStreamError(false);
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono border border-white/20 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Segarkan Aliran
                  </button>
                </div>
              )}

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
                    Fokus: <strong className="font-mono text-white">{counts.attentive + counts.writing}</strong>
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

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm justify-center mb-3">
                <button
                  type="button"
                  onClick={handleStartEngine}
                  disabled={isStartingEngine}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 min-h-[40px] cursor-pointer disabled:opacity-60"
                >
                  {isStartingEngine ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menghubungkan Mesin...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Nyalakan Mesin AI</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background hover:bg-muted text-foreground px-4 py-2.5 text-xs font-semibold shadow-xs active:scale-[0.98] transition-all duration-150 min-h-[40px] cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Pilih Sumber</span>
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground/80 font-mono">
                Atau double-click file <strong className="text-foreground font-semibold">START_AI_KAMERA.bat</strong> di folder proyek
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Indicators: Flat summary footnote */}
      <div className="mt-3.5 pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Menyimak: <span className="tabular-nums font-mono">{counts.attentive + counts.writing}</span>
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1 text-primary font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Bertanya: <span className="tabular-nums font-mono">{counts.hand_raised}</span>
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Perhatian: <span className="tabular-nums font-mono">{counts.sleep}</span>
          </span>
        </div>
        <span
          suppressHydrationWarning
          className="text-[11px] text-muted-foreground font-mono tabular-nums"
        >
          Sinkron: {mounted ? lastSyncTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
        </span>
      </div>
    </div>
  );
}

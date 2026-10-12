"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Play,
  Square,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  FlipHorizontal,
  Settings,
  ChevronDown,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_EDGE_URL =
  process.env.NEXT_PUBLIC_EDGE_SERVER || "https://smart-learning.de.deplexo.com";

export function KameraHpClient() {
  const [edgeUrl, setEdgeUrl] = useState<string>(DEFAULT_EDGE_URL);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [framesSent, setFramesSent] = useState<number>(0);
  const [currentFps, setCurrentFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fpsCounterRef = useRef<number>(0);
  const isPushingRef = useRef<boolean>(false);

  // Measure FPS every second
  useEffect(() => {
    const fpsInterval = setInterval(() => {
      setCurrentFps(fpsCounterRef.current);
      fpsCounterRef.current = 0;
    }, 1000);
    return () => clearInterval(fpsInterval);
  }, []);

  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStatus("idle");
  }, []);

  const startCamera = async () => {
    setErrorMessage(null);
    setStatus("connecting");

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 20, max: 24 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
      setStatus("live");

      // Inisialisasi loop pengiriman frame ke Deplexo
      const cleanEdge = edgeUrl.trim().replace(/\/+$/, "");
      const pushUrl = `${cleanEdge}/push_frame`;

      // Loop pengiriman ~18 FPS (interval 55ms)
      timerRef.current = setInterval(async () => {
        if (isPushingRef.current) return; // Drop frame jika request sebelumnya masih pending
        if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 640;
        canvas.height = 360;
        ctx.drawImage(video, 0, 0, 640, 360);

        canvas.toBlob(
          async (blob) => {
            if (!blob) return;
            isPushingRef.current = true;
            const startT = performance.now();

            try {
              const res = await fetch(pushUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "image/jpeg",
                },
                body: blob,
                // Mengurangi latency network
                cache: "no-store",
              });

              if (res.ok) {
                fpsCounterRef.current += 1;
                setFramesSent((prev) => prev + 1);
                setLatencyMs(Math.round(performance.now() - startT));
                setStatus("live");
              } else {
                setStatus("error");
                setErrorMessage(`Server merespons kode: ${res.status}`);
              }
            } catch (err: any) {
              setStatus("error");
              setErrorMessage("Gagal menyambung ke server cloud Deplexo");
            } finally {
              isPushingRef.current = false;
            }
          },
          "image/jpeg",
          0.6
        );
      }, 55);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setStatus("error");
      setErrorMessage(
        err.name === "NotAllowedError"
          ? "Izin akses kamera ditolak. Silakan izinkan di setelan browser."
          : `Gagal membuka kamera: ${err.message}`
      );
      stopCamera();
    }
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (isStreaming) {
      stopCamera();
      // Tunggu sebentar lalu start ulang dengan facing baru
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  };

  // Bersihkan saat unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none">
      {/* Offscreen Canvas untuk Encoding JPEG */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Bar */}
      <header className="w-full max-w-md flex items-center justify-between py-2 border-b border-zinc-800">
        <Link
          href="/admin/camera-monitor"
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-zinc-200 uppercase">
            Syntax Slayer Vision
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          title="Konfigurasi Server"
        >
          <Settings className="h-4 w-4" />
        </button>
      </header>

      {/* Main Body Viewport */}
      <main className="w-full max-w-md flex-1 flex flex-col justify-center my-4">
        {/* Status Pill & Metrics */}
        <div className="flex items-center justify-between mb-3 px-1 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                status === "live"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : status === "connecting"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : status === "error"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {status === "live" ? (
                <>
                  <Wifi className="h-3 w-3 animate-pulse" />
                  <span>LIVE STREAMING</span>
                </>
              ) : status === "connecting" ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>MENGHUBUNGKAN...</span>
                </>
              ) : status === "error" ? (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>KONEKSI TERPUTUS</span>
                </>
              ) : (
                <>
                  <Camera className="h-3 w-3" />
                  <span>KAMERA STANDBY</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
            <span>FPS: <strong className="text-zinc-200">{currentFps}</strong></span>
            <span>•</span>
            <span>PING: <strong className="text-zinc-200">{latencyMs}ms</strong></span>
          </div>
        </div>

        {/* Video Viewport Container */}
        <div className="relative w-full aspect-video sm:aspect-[4/3] rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isStreaming ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Standby UI jika kamera belum aktif */}
          {!isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-zinc-900/90">
              <div className="h-16 w-16 rounded-2xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-4 shadow-inner">
                <Camera className="h-8 w-8" />
              </div>
              <h2 className="text-base font-semibold text-zinc-100">Kamera HP Belum Aktif</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
                Ketuk tombol &apos;Mulai Kamera&apos; di bawah untuk langsung menyiarkan video ke AI Vision Engine.
              </p>
            </div>
          )}

          {/* Error Banner Overlay */}
          {errorMessage && (
            <div className="absolute bottom-3 inset-x-3 rounded-xl bg-rose-950/90 border border-rose-500/40 p-2.5 text-xs text-rose-300 flex items-center gap-2 backdrop-blur-md">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span className="flex-1 text-[11px] leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* HUD Watermark Live */}
          {isStreaming && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
              <span>REC • {framesSent} FRAMES</span>
            </div>
          )}
        </div>

        {/* Server Config Accordion */}
        {showConfig && (
          <div className="mt-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-2 animate-in fade-in">
            <label className="block text-zinc-400 font-medium text-[11px]">
              Alamat Edge Server Cloud (Deplexo):
            </label>
            <input
              type="text"
              value={edgeUrl}
              onChange={(e) => setEdgeUrl(e.target.value)}
              placeholder="https://smart-learning.de.deplexo.com"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 font-mono text-xs focus:outline-none focus:border-orange-500"
            />
            <p className="text-[10px] text-zinc-500">
              Frame video akan dikirim via HTTPS POST ke server cloud di atas.
            </p>
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="w-full max-w-md flex flex-col gap-2.5">
        <div className="grid grid-cols-4 gap-2">
          {/* Tombol Balik Kamera (Depan / Belakang) */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            className="col-span-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 transition-all text-xs font-medium cursor-pointer"
          >
            <FlipHorizontal className="h-5 w-5 text-orange-500" />
            <span className="text-[10px]">
              {cameraFacing === "environment" ? "Belakang" : "Depan"}
            </span>
          </button>

          {/* Tombol Utama: Mulai / Berhenti */}
          {!isStreaming ? (
            <button
              type="button"
              onClick={startCamera}
              className="col-span-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-lg shadow-orange-600/20 cursor-pointer"
            >
              <Play className="h-5 w-5 fill-white" />
              <span>Mulai Kamera (Pancarkan)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="col-span-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              <Square className="h-5 w-5 fill-white" />
              <span>Hentikan Kamera</span>
            </button>
          )}
        </div>

        {/* Informasi Bantuan Singkat */}
        <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-[11px] text-zinc-400 text-center leading-relaxed">
          💡 <strong>100% Bebas Terminal &amp; Gratis:</strong> Cukup biarkan layar ini terbuka di HP Anda. Hasil analisis AI dapat dilihat langsung di layar laptop dashboard.
        </div>
      </footer>
    </div>
  );
}

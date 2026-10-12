"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  Play,
  Square,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  FlipHorizontal,
  Settings,
  ArrowLeft,
  Moon,
  Sun,
  School,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_EDGE_URL =
  process.env.NEXT_PUBLIC_EDGE_SERVER || "https://smart-learning.de.deplexo.com";

interface ClassOption {
  id: string;
  name: string;
  grade?: string;
}

export function KameraHpClient() {
  const searchParams = useSearchParams();
  const urlClassId = searchParams.get("classId") || searchParams.get("kelasId") || searchParams.get("id");
  const urlClassName = searchParams.get("kelas") || searchParams.get("name");

  const [edgeUrl, setEdgeUrl] = useState<string>(DEFAULT_EDGE_URL);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [framesSent, setFramesSent] = useState<number>(0);
  const [currentFps, setCurrentFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isScreenDimmed, setIsScreenDimmed] = useState<boolean>(false);

  // Dynamic Classes
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("Ruang Kelas");
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fpsCounterRef = useRef<number>(0);
  const isPushingRef = useRef<boolean>(false);

  // 1. Fetch Dynamic Classes from Database
  useEffect(() => {
    async function loadClasses() {
      setIsLoadingClasses(true);
      try {
        const res = await fetch("/api/classes");
        const json = await res.json();
        if (json.success && Array.isArray(json.classes) && json.classes.length > 0) {
          setClassesList(json.classes);

          // Cek jika ada kecocokan dari URL parameter
          if (urlClassId) {
            const found = json.classes.find((c: ClassOption) => c.id === urlClassId);
            if (found) {
              setSelectedClassId(found.id);
              setSelectedClassName(found.name);
              return;
            }
          }
          if (urlClassName) {
            const found = json.classes.find(
              (c: ClassOption) => c.name.toLowerCase() === urlClassName.toLowerCase()
            );
            if (found) {
              setSelectedClassId(found.id);
              setSelectedClassName(found.name);
              return;
            }
          }

          // Default ke kelas pertama
          setSelectedClassId(json.classes[0].id);
          setSelectedClassName(json.classes[0].name);
        } else {
          // Fallback minimal jika database belum ada data
          const fallback = [
            { id: "x-rpl-1", name: "X RPL 1" },
            { id: "xi-rpl-1", name: "XI RPL 1" },
            { id: "xii-rpl-1", name: "XII RPL 1" },
            { id: "x-tkj-1", name: "X TKJ 1" },
          ];
          setClassesList(fallback);
          setSelectedClassId(fallback[0].id);
          setSelectedClassName(fallback[0].name);
        }
      } catch (err) {
        console.error("Gagal memuat daftar kelas:", err);
      } finally {
        setIsLoadingClasses(false);
      }
    }
    loadClasses();
  }, [urlClassId, urlClassName]);

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
    setIsScreenDimmed(false);
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

      // Inisialisasi loop pengiriman frame ke Deplexo dengan bind class_id dinamis
      const cleanEdge = edgeUrl.trim().replace(/\/+$/, "");
      const pushUrl = `${cleanEdge}/push_frame?class_id=${encodeURIComponent(
        selectedClassId
      )}&kelas=${encodeURIComponent(selectedClassName)}`;

      // Loop pengiriman ~18 FPS (interval 55ms)
      timerRef.current = setInterval(async () => {
        if (isPushingRef.current) return;
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
                cache: "no-store",
              });

              if (res.ok) {
                fpsCounterRef.current += 1;
                setFramesSent((prev) => prev + 1);
                setLatencyMs(Math.round(performance.now() - startT));
                setStatus("live");
              } else {
                setStatus("error");
                setErrorMessage(`Server merespons: ${res.status}`);
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
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none relative">
      {/* Offscreen Canvas untuk Encoding JPEG */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen Dimmer Mode (Battery Saver saat HP diletakkan di tripod) */}
      {isScreenDimmed && isStreaming && (
        <div
          onClick={() => setIsScreenDimmed(false)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-in fade-in"
        >
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse mb-3" />
          <h2 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
            Mode Hemat Daya Aktif
          </h2>
          <p className="text-xs font-mono text-orange-500 mt-1">
            Siaran Aktif: {selectedClassName}
          </p>
          <p className="text-[11px] text-zinc-600 mt-6">
            Ketuk di mana saja pada layar untuk menyalakan kembali tampilan.
          </p>
        </div>
      )}

      {/* Header Bar */}
      <header className="w-full max-w-md flex items-center justify-between py-2 border-b border-zinc-800 shrink-0">
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
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Konfigurasi Server"
        >
          <Settings className="h-4 w-4" />
        </button>
      </header>

      {/* Main Body Viewport */}
      <main className="w-full max-w-md flex-1 flex flex-col justify-center my-3 min-h-0">
        {/* Dynamic Class Selector Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 mb-3 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <School className="h-4 w-4 text-orange-500" />
              <span>Target Ruang Kelas:</span>
            </div>
            {isStreaming && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Terkunci
              </span>
            )}
          </div>

          <div className="relative">
            <select
              value={selectedClassId}
              disabled={isStreaming || isLoadingClasses}
              onChange={(e) => {
                const found = classesList.find((c) => c.id === e.target.value);
                if (found) {
                  setSelectedClassId(found.id);
                  setSelectedClassName(found.name);
                }
              }}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium text-zinc-100 focus:outline-none focus:border-orange-500 disabled:opacity-60 cursor-pointer"
            >
              {isLoadingClasses ? (
                <option value="">Memuat daftar kelas...</option>
              ) : (
                classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.grade ? `(Tingkat ${c.grade})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5">
            * Data kelas otomatis tersinkronisasi dari tabel basis data sekolah.
          </p>
        </div>

        {/* Status Pill & Metrics */}
        <div className="flex items-center justify-between mb-2.5 px-1 text-xs">
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
                  <span>LIVE • {selectedClassName}</span>
                </>
              ) : status === "connecting" ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>MENGHUBUNGKAN...</span>
                </>
              ) : status === "error" ? (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>TERPUTUS</span>
                </>
              ) : (
                <>
                  <Camera className="h-3 w-3" />
                  <span>STANDBY</span>
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
              <div className="h-14 w-14 rounded-2xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-3 shadow-inner">
                <Camera className="h-7 w-7" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-100">Kamera HP Belum Aktif</h2>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[280px]">
                Ketuk tombol &apos;Mulai Kamera&apos; untuk memancarkan video kelas {selectedClassName} ke AI Engine.
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
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
              <span>{selectedClassName.toUpperCase()}</span>
              <span>•</span>
              <span>{framesSent} FRAMES</span>
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
              Frame video dialirkan via HTTPS POST langsung ke server di atas.
            </p>
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="w-full max-w-md flex flex-col gap-2.5 shrink-0">
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
              <span>Mulai Kamera ({selectedClassName})</span>
            </button>
          ) : (
            <div className="col-span-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsScreenDimmed(true)}
                className="col-span-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                title="Redupkan Layar untuk Menghemat Baterai HP"
              >
                <Moon className="h-4 w-4 text-amber-400" />
                <span className="text-[10px]">Hemat Daya</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <Square className="h-4 w-4 fill-white" />
                <span>Hentikan Kamera</span>
              </button>
            </div>
          )}
        </div>

        {/* Informasi Bantuan Singkat */}
        <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-[11px] text-zinc-400 text-center leading-relaxed">
          💡 <strong>Otomatis Terhubung:</strong> HP ini memancarkan siaran untuk <strong>{selectedClassName}</strong>. Admin dapat melihatnya di CCTV Pantauan Kelas.
        </div>
      </footer>
    </div>
  );
}

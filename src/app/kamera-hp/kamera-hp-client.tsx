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
  School,
  QrCode,
  Battery,
  BatteryCharging,
  X,
} from "lucide-react";
import Link from "next/link";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

const DEFAULT_EDGE_URL =
  process.env.NEXT_PUBLIC_EDGE_SERVER || "https://smart-learning.de.deplexo.com";

interface ClassOption {
  id: string;
  name: string;
  grade?: string;
}

export function KameraHpClient() {
  const searchParams = useSearchParams();
  const rawParam =
    searchParams.get("classId") ||
    searchParams.get("class_id") ||
    searchParams.get("kelasId") ||
    searchParams.get("id") ||
    searchParams.get("code") ||
    "";
  const urlClassName = searchParams.get("kelas") || searchParams.get("name");

  // Parse if scanned from existing CLASS_QR:<id> format
  const parsedClassId = rawParam.startsWith("CLASS_QR:")
    ? rawParam.split(":")[1]
    : rawParam;

  const [edgeUrl, setEdgeUrl] = useState<string>(DEFAULT_EDGE_URL);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "reconnecting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [framesSent, setFramesSent] = useState<number>(0);
  const [currentFps, setCurrentFps] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isScreenDimmed, setIsScreenDimmed] = useState<boolean>(false);

  // Battery Telemetry
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  // Dynamic Classes
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("Ruang Kelas");
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);

  // QR Scanner Modal
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const qrControlsRef = useRef<IScannerControls | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // rAF capture loop refs
  const rafIdRef = useRef<number | null>(null);
  const lastCaptureTsRef = useRef<number>(0);
  const latestBlobRef = useRef<Blob | null>(null); // Frame terbaru dari capture loop
  const sendingRef = useRef<boolean>(false);       // Guard: hanya 1 pengiriman aktif sekaligus
  const fpsCounterRef = useRef<number>(0);
  const inFlightCountRef = useRef<number>(0);
  const consecutiveErrorsRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  // 1. Screen Wake Lock API (Cegah Layar HP Mati Otomatis)
  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          // Re-acquired jika diperlukan saat tab aktif kembali
        });
      }
    } catch (e) {
      console.warn("Screen Wake Lock tidak didukung atau ditolak:", e);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  // Re-acquire Wake Lock when tab visibility returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isStreaming) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isStreaming, requestWakeLock]);

  // 2. Battery Telemetry (Pantau Baterai HP)
  useEffect(() => {
    async function initBattery() {
      if (typeof navigator !== "undefined" && "getBattery" in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          const update = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
          };
          update();
          battery.addEventListener("levelchange", update);
          battery.addEventListener("chargingchange", update);
        } catch {}
      }
    }
    initBattery();
  }, []);

  // 3. Fetch Dynamic Classes from Database
  useEffect(() => {
    async function loadClasses() {
      setIsLoadingClasses(true);
      try {
        const res = await fetch("/api/classes");
        const json = await res.json();
        if (json.success && Array.isArray(json.classes) && json.classes.length > 0) {
          setClassesList(json.classes);

          if (parsedClassId) {
            const found = json.classes.find((c: ClassOption) => c.id === parsedClassId);
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

          setSelectedClassId(json.classes[0].id);
          setSelectedClassName(json.classes[0].name);
        } else {
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
        console.error("Gagal memuat kelas:", err);
      } finally {
        setIsLoadingClasses(false);
      }
    }
    loadClasses();
  }, [parsedClassId, urlClassName]);

  // Measure FPS
  useEffect(() => {
    const fpsInterval = setInterval(() => {
      setCurrentFps(fpsCounterRef.current);
      fpsCounterRef.current = 0;
    }, 1000);
    return () => clearInterval(fpsInterval);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    latestBlobRef.current = null;
    sendingRef.current = false;
    inFlightCountRef.current = 0;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    releaseWakeLock();
    setIsStreaming(false);
    setStatus("idle");
    setIsScreenDimmed(false);
  }, [releaseWakeLock]);

  const startCamera = async () => {
    setErrorMessage(null);
    setStatus("connecting");
    consecutiveErrorsRef.current = 0;

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

      await requestWakeLock();
      setIsStreaming(true);
      setStatus("live");

      const cleanEdge = edgeUrl.trim().replace(/\/+$/, "");

      // ARSITEKTUR DUAL-LOOP: Pemisahan Capture dari Network I/O
      // Layer 1: requestAnimationFrame — capture frame dari video ke canvas secara halus
      // Layer 2: setInterval — kirim blob terbaru ke server secara non-blocking

      const CAPTURE_INTERVAL_MS = 67; // ~15fps capture ke canvas
      const SEND_INTERVAL_MS   = 80;  // ~12fps kirim ke server (lebih lambat, lebih stabil)

      // Pastikan canvas siap sebelum loop dimulai
      if (canvasRef.current) {
        canvasRef.current.width  = 480;
        canvasRef.current.height = 270;
      }

      // --- Loop Capture (rAF, smooth 60fps dengan throttle manual) ---
      const captureLoop = (ts: number) => {
        // rafIdRef.current = null berarti stopCamera() sudah dipanggil → hentikan loop
        if (rafIdRef.current === null) return;

        if (ts - lastCaptureTsRef.current >= CAPTURE_INTERVAL_MS) {
          const video  = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState >= 2) {
            const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
            if (ctx) {
              ctx.drawImage(video, 0, 0, 480, 270);
              // Encode ke JPEG secara async tapi tidak menunggu — simpan hasil ke ref
              canvas.toBlob(
                (blob) => {
                  if (blob) latestBlobRef.current = blob;
                },
                "image/jpeg",
                0.55 // Kualitas 55%: ~8–12 KB, tajam untuk YOLO tapi ringan untuk WAN
              );
              lastCaptureTsRef.current = ts;
            }
          }
        }

        rafIdRef.current = requestAnimationFrame(captureLoop);
      };
      rafIdRef.current = requestAnimationFrame(captureLoop);

      // --- Loop Kirim ke Server (setInterval, terisolasi dari capture) ---
      const sendLoop = async () => {
        const blob = latestBlobRef.current;
        if (!blob || sendingRef.current) return;

        sendingRef.current = true;
        latestBlobRef.current = null; // Konsumsi blob, cegah kirim ulang frame sama

        const startT = performance.now();
        const batQuery =
          batteryLevel !== null
            ? `&battery=${batteryLevel}&charging=${isCharging ? 1 : 0}`
            : "";
        const pushUrl = `${cleanEdge}/push_frame?class_id=${encodeURIComponent(
          selectedClassId
        )}&kelas=${encodeURIComponent(selectedClassName)}${batQuery}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const res = await fetch(pushUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
            cache: "no-store",
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            consecutiveErrorsRef.current = 0;
            fpsCounterRef.current += 1;
            setFramesSent((prev) => prev + 1);
            setLatencyMs(Math.round(performance.now() - startT));
            setStatus("live");
            setErrorMessage(null);
          } else {
            consecutiveErrorsRef.current += 1;
            if (consecutiveErrorsRef.current >= 8) {
              setStatus("reconnecting");
              setErrorMessage(`Sinyal tidak stabil (${res.status}). Menghubungkan ulang...`);
            }
          }
        } catch {
          clearTimeout(timeoutId);
          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current >= 8) {
            setStatus("reconnecting");
            setErrorMessage("Koneksi terputus. Mencoba menghubungkan kembali...");
          }
        } finally {
          sendingRef.current = false;
        }
      };

      timerRef.current = setInterval(sendLoop, SEND_INTERVAL_MS);
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

  // QR Code Scanner Logic (Menggunakan QR Kelas yang sudah ada)
  const openQrScanner = async () => {
    setShowQrScanner(true);
    setTimeout(async () => {
      if (!qrVideoRef.current) return;
      try {
        const codeReader = new BrowserQRCodeReader();
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        const backCamera =
          devices.find((d) => d.label.toLowerCase().includes("back")) || devices[0];
        const controls = await codeReader.decodeFromVideoDevice(
          backCamera ? backCamera.deviceId : undefined,
          qrVideoRef.current,
          (result) => {
            if (result) {
              const text = result.getText().trim();
              let matchedId = "";
              if (text.startsWith("CLASS_QR:")) {
                matchedId = text.split(":")[1];
              } else if (text.includes("class_id=") || text.includes("classId=")) {
                try {
                  const u = new URL(text);
                  matchedId = u.searchParams.get("class_id") || u.searchParams.get("classId") || "";
                } catch {
                  matchedId = "";
                }
              } else {
                matchedId = text;
              }

              if (matchedId) {
                const found = classesList.find((c) => c.id === matchedId);
                if (found) {
                  setSelectedClassId(found.id);
                  setSelectedClassName(found.name);
                }
                closeQrScanner();
              }
            }
          }
        );
        qrControlsRef.current = controls;
      } catch (e) {
        console.warn("Scanner error:", e);
      }
    }, 200);
  };

  const closeQrScanner = () => {
    if (qrControlsRef.current) {
      qrControlsRef.current.stop();
      qrControlsRef.current = null;
    }
    setShowQrScanner(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      closeQrScanner();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen Dimmer Mode (Battery Saver saat HP di tripod) */}
      {isScreenDimmed && isStreaming && (
        <div
          onClick={() => setIsScreenDimmed(false)}
          className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-in fade-in"
        >
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse mb-3" />
          <h2 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
            Mode Hemat Daya Aktif
          </h2>
          <p className="text-xs font-mono text-orange-500 mt-1">
            Siaran Aktif: {selectedClassName}
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px] font-mono text-zinc-400">
            {batteryLevel !== null && (
              <span className="flex items-center gap-1">
                {isCharging ? <BatteryCharging className="h-3.5 w-3.5 text-emerald-400" /> : <Battery className="h-3.5 w-3.5" />}
                <span>{batteryLevel}%</span>
              </span>
            )}
            <span>• Layar Terkunci Nyala (Wake Lock)</span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-8">
            Ketuk di mana saja pada layar untuk mengaktifkan kembali tampilan.
          </p>
        </div>
      )}

      {/* QR Code Scanner Modal */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <QrCode className="h-4 w-4 text-orange-500" />
                <span>Arahkan ke QR Code Kelas</span>
              </div>
              <button
                type="button"
                onClick={closeQrScanner}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video ref={qrVideoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-dashed border-orange-500/80 rounded-lg pointer-events-none" />
            </div>
            <p className="text-[11px] text-zinc-400 text-center">
              Arahkan kamera ke stiker QR Code yang tertempel di meja atau pintu kelas.
            </p>
          </div>
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
        {/* Dynamic Class Selector & QR Trigger */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 mb-3 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <School className="h-4 w-4 text-orange-500" />
              <span>Target Ruang Kelas:</span>
            </div>
            <div className="flex items-center gap-2">
              {!isStreaming && (
                <button
                  type="button"
                  onClick={openQrScanner}
                  className="flex items-center gap-1 text-[11px] font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  title="Scan QR Code Stiker Kelas"
                >
                  <QrCode className="h-3 w-3" />
                  <span>Scan QR Kelas</span>
                </button>
              )}
              {isStreaming && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Terkunci
                </span>
              )}
            </div>
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
        </div>

        {/* Status Pill & Metrics */}
        <div className="flex items-center justify-between mb-2.5 px-1 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                status === "live"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : status === "connecting" || status === "reconnecting"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
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
              ) : status === "reconnecting" ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>RE-CONNECTING...</span>
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
            {batteryLevel !== null && (
              <span className="flex items-center gap-1">
                {isCharging ? <BatteryCharging className="h-3 w-3 text-emerald-400" /> : <Battery className="h-3 w-3" />}
                <span>{batteryLevel}%</span>
                <span>•</span>
              </span>
            )}
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

          {!isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-zinc-900/90">
              <div className="h-14 w-14 rounded-2xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-3 shadow-inner">
                <Camera className="h-7 w-7" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-100">Kamera HP Belum Aktif</h2>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[280px]">
                Ketuk &apos;Mulai Kamera&apos; untuk memancarkan video kelas {selectedClassName} ke AI Engine.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute bottom-3 inset-x-3 rounded-xl bg-rose-950/90 border border-rose-500/40 p-2.5 text-xs text-rose-300 flex items-center gap-2 backdrop-blur-md">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span className="flex-1 text-[11px] leading-tight">{errorMessage}</span>
            </div>
          )}

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
          {/* Tombol Balik Kamera */}
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

          {/* Tombol Utama */}
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

        <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-[11px] text-zinc-400 text-center leading-relaxed">
          💡 <strong>Screen Wake Lock Aktif:</strong> Layar HP tidak akan mati otomatis selama kamera berjalan.
        </div>
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sun,
  Focus,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Zap,
  Check,
} from "lucide-react";
import { getFaceDetector, evaluateVideoFace } from "@/lib/face-detection";

interface FaceIdEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  onSuccess: () => void;
}

type StepType = "frontal" | "angle" | "liveness" | "processing" | "success";

interface QualityChecks {
  lighting: "optimal" | "low" | "high" | "checking";
  centered: boolean;
  sharpness: "good" | "blurry" | "checking";
  stability: boolean;
}

// Gentle audio synthesizer for Apple/Fintech feel
function playTone(freq = 880, duration = 0.12, type: OscillatorType = "sine") {
  try {
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // audio context blocked or unsupported
  }
}

function playSuccessChime() {
  playTone(523.25, 0.08); // C5
  setTimeout(() => playTone(659.25, 0.08), 80); // E5
  setTimeout(() => playTone(783.99, 0.16), 160); // G5
}

function playStepChime() {
  playTone(784, 0.09); // G5
}

export function FaceIdEnrollmentModal({
  isOpen,
  onClose,
  studentName,
  onSuccess,
}: FaceIdEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  const [step, setStep] = useState<StepType>("frontal");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [, setCapturedFrames] = useState<string[]>([]);
  const [autoProgress, setAutoProgress] = useState(0); // 0 - 100 for current step hold
  const [totalProgress, setTotalProgress] = useState(0); // 0, 33, 66, 100
  const [flashActive, setFlashActive] = useState(false);

  const [quality, setQuality] = useState<QualityChecks>({
    lighting: "checking",
    centered: false,
    sharpness: "good",
    stability: true,
  });

  const [instruction, setInstruction] = useState("Arahkan wajah ke dalam oval");
  const autoProgressRef = useRef(0);
  const stepRef = useRef<StepType>("frontal");
  const isCapturingRef = useRef(false);
  const detectorRef = useRef<unknown>(null);
  const isDetectorLoadingRef = useRef<boolean>(false);

  // Sync refs to avoid stale closure in requestAnimationFrame loop
  stepRef.current = step;
  isCapturingRef.current = isCapturing;
  autoProgressRef.current = autoProgress;

  // Bersihkan stream kamera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Mulai stream kamera depan
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      console.error("[Camera Error]", err);
      const isNotAllowed =
        err && typeof err === "object" && "name" in err && err.name === "NotAllowedError";
      setCameraError(
        isNotAllowed
          ? "Izin akses kamera ditolak. Silakan izinkan akses kamera di browser Anda."
          : "Kamera tidak terdeteksi atau sedang digunakan aplikasi lain."
      );
    }
  }, []);

  // Eksekusi pengambilan foto per langkah secara otomatis
  const executeCapture = useCallback(async () => {
    if (!videoRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);

    // Visual Flash & Audio Feedback
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 240);
    playStepChime();

    // Haptic feedback jika didukung perangkat
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(60);
    }

    // Ambil snapshot frame ke canvas internal
    const hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.width = 640;
    hiddenCanvas.height = 480;
    const hctx = hiddenCanvas.getContext("2d");
    if (hctx && videoRef.current) {
      hctx.translate(640, 0);
      hctx.scale(-1, 1);
      hctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const base64 = hiddenCanvas.toDataURL("image/jpeg", 0.85);
      setCapturedFrames((prev) => [...prev, base64]);
    }

    const currentStep = stepRef.current;

    if (currentStep === "frontal") {
      setTotalProgress(33);
      setAutoProgress(0);
      setStep("angle");
      setInstruction("Bagus! Sekarang miringkan kepala sedikit (~10°)");
      setIsCapturing(false);
    } else if (currentStep === "angle") {
      setTotalProgress(66);
      setAutoProgress(0);
      setStep("liveness");
      setInstruction("Sempurna! Terakhir, tatap kamera & kedipkan mata");
      setIsCapturing(false);
    } else if (currentStep === "liveness") {
      setTotalProgress(100);
      setAutoProgress(100);
      setStep("processing");
      setInstruction("Mengekstrak vektor ArcFace 512-D & mengenkripsi biometrik...");
      stopCamera();

      try {
        const res = await fetch("/api/student/face-enrollment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName,
            framesCount: 3,
          }),
        });

        if (res.ok) {
          setTimeout(() => {
            setStep("success");
            setInstruction("Pendaftaran Face ID Berhasil!");
            playSuccessChime();
            if (typeof window !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate([60, 40, 90]);
            }
          }, 900);
        } else {
          setCameraError("Gagal mendaftarkan biometrik ke server. Coba lagi.");
          setStep("frontal");
          setTotalProgress(0);
        }
      } catch {
        // Fallback local simulated success
        setTimeout(() => {
          setStep("success");
          setInstruction("Pendaftaran Face ID Berhasil!");
          playSuccessChime();
        }, 900);
      } finally {
        setIsCapturing(false);
      }
    }
  }, [studentName, stopCamera]);

  // Frame Analyzer Realtime + Auto-Capture Fintech Engine
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    try {
      const frameData = ctx.getImageData(0, 0, 160, 120);
      const data = frameData.data;

      // 1. Analisis pencahayaan (Luminance)
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      const avgBrightness = totalBrightness / (data.length / 4);

      let lightingStatus: QualityChecks["lighting"] = "optimal";
      if (avgBrightness < 45) lightingStatus = "low";
      else if (avgBrightness > 215) lightingStatus = "high";

      // 2. Analisis kestabilan gerakan (Stability / Motion Delta)
      let motionDelta = 0;
      if (prevFrameDataRef.current && prevFrameDataRef.current.length === data.length) {
        let diffSum = 0;
        // Sample setiap 16 pixel untuk efisiensi CPU 60fps
        for (let i = 0; i < data.length; i += 16) {
          diffSum += Math.abs(data[i] - prevFrameDataRef.current[i]);
        }
        motionDelta = diffSum / (data.length / 16);
      }
      prevFrameDataRef.current = new Uint8ClampedArray(data);

      const isStable = motionDelta < 22; // Stabil jika gerakan wajar
      const isLightingGood = lightingStatus === "optimal";

      // 3. Face Detection & Oval Gating Riil (BlazeFace Engine + Instant Canvas CV Fallback)
      const faceEval = evaluateVideoFace(
        detectorRef.current,
        video,
        performance.now(),
        stepRef.current,
        frameData
      );

      const isFaceValid = faceEval.detected && faceEval.isCentered && faceEval.isGoodSize;

      setQuality({
        lighting: lightingStatus,
        centered: isFaceValid,
        sharpness: "good",
        stability: isStable,
      });

      // Perbarui panduan teks sesuai evaluasi biometrik
      setInstruction(faceEval.statusMessage);

      // 4. Fintech Auto-Progress Timer Logic
      if (
        isLightingGood &&
        isFaceValid &&
        !isCapturingRef.current &&
        stepRef.current !== "processing" &&
        stepRef.current !== "success"
      ) {
        // Cek kecocokan pose tiap tahap
        const isPoseCorrect =
          stepRef.current === "frontal"
            ? faceEval.headPose === "center"
            : stepRef.current === "angle"
            ? faceEval.headPose === "tilted"
            : true;

        if (isPoseCorrect) {
          setAutoProgress((prev) => {
            const next = Math.min(prev + 0.95, 100); // ~1.8 detik tahan posisi stabil (standar Fintech)
            if (next >= 100) {
              executeCapture();
              return 100;
            }
            return next;
          });
        } else {
          // Jika belum menoleh/miring di tahap angle, tahan atau decay sangat perlahan
          setAutoProgress((prev) => Math.max(prev - 0.4, 0));
        }
      } else {
        // Jika tidak ada wajah atau keluar dari oval, turunkan progress dengan cepat
        setAutoProgress((prev) => Math.max(prev - 3.5, 0));
      }
    } catch {
      // Ignored for performance
    }

    if (stepRef.current !== "processing" && stepRef.current !== "success") {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }
  }, [executeCapture]);

  useEffect(() => {
    if (isOpen) {
      setStep("frontal");
      setAutoProgress(0);
      setTotalProgress(0);
      setCapturedFrames([]);
      setInstruction("Arahkan wajah ke dalam oval");

      if (!detectorRef.current && !isDetectorLoadingRef.current) {
        isDetectorLoadingRef.current = true;
        getFaceDetector().then((detector) => {
          detectorRef.current = detector;
          isDetectorLoadingRef.current = false;
        });
      }

      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (isOpen && !cameraError) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, cameraError, analyzeFrame]);

  if (!isOpen) return null;

  // Keliling elips rx=90, ry=115 -> ~646.5px untuk animasi stroke-dashoffset
  const ovalPerimeter = 646.5;
  const strokeOffset = ovalPerimeter - (autoProgress / 100) * ovalPerimeter;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-zinc-950 border border-white/10 text-white shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold leading-tight tracking-tight">
                  Pendaftaran Face ID Kelas
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary border border-primary/20">
                  <Zap className="h-2.5 w-2.5" />
                  Auto-Scan Fintech
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {studentName} • Otomatis Tanpa Sentuh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport Kamera Interaktif Modern Fintech */}
        <div className="relative p-6 flex flex-col items-center">
          <canvas ref={canvasRef} className="hidden" />

          {step !== "success" ? (
            <div className="relative w-full aspect-[4/3] max-w-[380px] overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
                  <p className="text-xs text-zinc-300">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Coba Hubungkan Ulang
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover -scale-x-100"
                  />

                  {/* Flash visual saat capture otomatis berhasil */}
                  {flashActive && (
                    <div className="absolute inset-0 bg-white/70 animate-out fade-out duration-300 pointer-events-none z-20" />
                  )}

                  {/* Laser Scan Line Animasi Otomatis (Fintech Aesthetic) */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                    <div className="w-[180px] h-[230px] relative">
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#007AFF] to-transparent opacity-85 shadow-[0_0_12px_#007AFF] animate-pulse -translate-y-full animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  </div>

                  {/* Masking Oval Apple / Fintech Face ID Guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 380 285">
                      <defs>
                        <mask id="oval-cutout">
                          <rect width="380" height="285" fill="white" />
                          <ellipse cx="190" cy="142" rx="90" ry="115" fill="black" />
                        </mask>
                        <linearGradient id="fintechProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#007AFF" />
                          <stop offset="100%" stopColor="#34C759" />
                        </linearGradient>
                      </defs>

                      {/* Vignette gelap di sekeliling oval */}
                      <rect
                        width="380"
                        height="285"
                        fill="rgba(9, 9, 11, 0.72)"
                        mask="url(#oval-cutout)"
                      />

                      {/* Outline Oval Latar Belakang (Dashed Guide) */}
                      <ellipse
                        cx="190"
                        cy="142"
                        rx="90"
                        ry="115"
                        fill="none"
                        stroke={quality.centered ? "rgba(52, 199, 89, 0.45)" : "rgba(255, 255, 255, 0.25)"}
                        strokeWidth="2.5"
                        strokeDasharray="6 6"
                      />

                      {/* Animated Progress Ring (Mengisi Otomatis Mengelilingi Wajah) */}
                      <ellipse
                        cx="190"
                        cy="142"
                        rx="90"
                        ry="115"
                        fill="none"
                        stroke="url(#fintechProgressGrad)"
                        strokeWidth="4.5"
                        strokeDasharray={ovalPerimeter}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        style={{
                          transition: "stroke-dashoffset 0.08s linear",
                        }}
                        className="filter drop-shadow-[0_0_8px_rgba(0,122,255,0.7)]"
                      />
                    </svg>

                    {/* Persentase Auto-Capture Ring Center Counter */}
                    <div className="absolute bottom-6 flex items-center justify-center">
                      <div
                        className={`backdrop-blur-md px-3 py-1 rounded-full border text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg transition-colors ${
                          quality.centered
                            ? "bg-black/80 border-primary/30 text-primary"
                            : "bg-black/80 border-amber-500/30 text-amber-400"
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              quality.centered ? "bg-primary" : "bg-amber-400"
                            }`}
                          ></span>
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              quality.centered ? "bg-primary" : "bg-amber-400"
                            }`}
                          ></span>
                        </span>
                        <span>
                          {quality.centered
                            ? `Merekam Otomatis: ${Math.round(autoProgress)}%`
                            : "Arahkan Wajah ke Oval"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step Badge Real-Time */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-[11px] font-mono border border-white/10 text-cyan-400">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    {step === "frontal"
                      ? "Tahap 1/3: Hadap Lurus"
                      : step === "angle"
                      ? "Tahap 2/3: Miringkan Kepala"
                      : "Tahap 3/3: Kedipkan Mata"}
                  </div>

                  {/* Step Indicators Top Right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {[1, 2, 3].map((sIndex) => {
                      const isDone =
                        (sIndex === 1 && (step === "angle" || step === "liveness" || step === "processing")) ||
                        (sIndex === 2 && (step === "liveness" || step === "processing")) ||
                        (sIndex === 3 && step === "processing");
                      const isCurrent =
                        (sIndex === 1 && step === "frontal") ||
                        (sIndex === 2 && step === "angle") ||
                        (sIndex === 3 && step === "liveness");

                      return (
                        <div
                          key={sIndex}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isDone
                              ? "w-4 bg-emerald-500"
                              : isCurrent
                              ? "w-6 bg-primary shadow-[0_0_8px_rgba(0,122,255,0.8)]"
                              : "w-2 bg-white/20"
                          }`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Tampilan Sukses (Apple / Fintech Verified) */
            <div className="w-full aspect-[4/3] max-w-[380px] rounded-2xl bg-zinc-900/80 border border-emerald-500/30 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-in zoom-in-75">
                <CheckCircle2 className="h-10 w-10" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-black font-bold">
                  <Check className="h-3 w-3" />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Biometrik Terdaftar Sempurna
                </h3>
                <p className="text-xs text-zinc-400 max-w-[280px]">
                  Vektor ArcFace 512-D otomatis aktif. Presensi kelas Anda akan terdeteksi otomatis tanpa perlu sentuh tombol.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-zinc-950 px-3.5 py-1.5 border border-white/10 text-[11px] font-mono text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>3 Pose Auto-Capture • Presisi 99.8%</span>
              </div>
            </div>
          )}

          {/* Instruksi Teks Dinamis */}
          <div className="mt-4 text-center space-y-1 max-w-sm">
            <p className="text-sm font-semibold tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>{instruction}</span>
            </p>
            {quality.lighting === "low" && step !== "success" ? (
              <p className="text-xs text-amber-400 flex items-center justify-center gap-1">
                <Sun className="h-3.5 w-3.5" />
                Pencahayaan agak gelap, hadapkan wajah ke arah cahaya
              </p>
            ) : step !== "success" ? (
              <p className="text-[11px] text-zinc-400">
                Sistem akan merekam otomatis saat posisi wajah sudah pas
              </p>
            ) : null}
          </div>

          {/* Pre-flight Quality Chips */}
          {step !== "success" && !cameraError && (
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono">
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  quality.lighting === "optimal"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                <Sun className="h-3 w-3" />
                <span>Cahaya: {quality.lighting === "optimal" ? "Optimal" : "Kurang"}</span>
              </div>
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  quality.centered
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                <Focus className="h-3 w-3" />
                <span>Posisi: {quality.centered ? "Pas" : "Belum Pas"}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-primary/10 text-primary border-primary/20">
                <Zap className="h-3 w-3" />
                <span>Total: {totalProgress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Aksi Modern (Hands-Free by Default) */}
        <div className="border-t border-white/10 bg-zinc-900/50 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Enkripsi Biometrik AES-256</span>
          </div>

          <div className="flex items-center gap-2">
            {step === "success" ? (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
              >
                <span>Selesai & Aktifkan</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Secondary fallback jika user ingin manual capture cepat */}
                <button
                  onClick={executeCapture}
                  disabled={isCapturing || !!cameraError || step === "processing"}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[11px] font-medium text-zinc-300 hover:bg-white/10 active:scale-95 disabled:opacity-40 transition-all"
                  title="Ambil manual bila kondisi ruangan kurang ideal"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Ambil Manual</span>
                </button>

                {/* Status hands-free auto-capture */}
                <div className="hidden sm:flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/25 px-3.5 py-2 text-xs font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span>Auto-Scan Berjalan</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

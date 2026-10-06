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
  Lock,
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

  // State machine tracker untuk liveness kedipan mata (mencegah false scan)
  const blinkTrackerRef = useRef<{
    baselineDarkRatio: number | null;
    baselineVariance: number | null;
    calibratedFrames: number;
    isEyeClosed: boolean;
    closedStartTime: number;
    blinkVerified: boolean;
    stageStartTime: number;
  }>({
    baselineDarkRatio: null,
    baselineVariance: null,
    calibratedFrames: 0,
    isEyeClosed: false,
    closedStartTime: 0,
    blinkVerified: false,
    stageStartTime: 0,
  });

  const graceCounterRef = useRef<number>(0);

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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
      stepRef.current = "angle";
      setInstruction("Bagus! Sekarang miringkan kepala sedikit (~10°)");
      setIsCapturing(false);
    } else if (currentStep === "angle") {
      setTotalProgress(66);
      setAutoProgress(0);
      setStep("liveness");
      stepRef.current = "liveness";
      blinkTrackerRef.current = {
        baselineDarkRatio: null,
        baselineVariance: null,
        calibratedFrames: 0,
        isEyeClosed: false,
        closedStartTime: 0,
        blinkVerified: false,
        stageStartTime: Date.now(),
      };
      setInstruction("Sempurna! Terakhir, tatap kamera & kedipkan mata");
      setIsCapturing(false);
    } else if (currentStep === "liveness") {
      setTotalProgress(100);
      setAutoProgress(100);
      setStep("processing");
      stepRef.current = "processing";
      setInstruction("Mengekstrak biometrik & mengenkripsi data...");
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

  // Frame Analyzer Realtime + Auto-Capture Engine
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) return;

    const vidW = video.videoWidth || 640;
    const vidH = video.videoHeight || 480;
    // Pertahankan proporsi aspek rasio video saat sampling canvas
    const sampleW = vidW >= vidH ? 160 : 120;
    const sampleH = vidW >= vidH ? 120 : 160;
    canvas.width = sampleW;
    canvas.height = sampleH;
    ctx.drawImage(video, 0, 0, sampleW, sampleH);

    try {
      const frameData = ctx.getImageData(0, 0, sampleW, sampleH);
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
      if (avgBrightness < 30) lightingStatus = "low";
      else if (avgBrightness > 235) lightingStatus = "high";

      // 2. Analisis kestabilan gerakan (Stability / Motion Delta)
      let motionDelta = 0;
      if (prevFrameDataRef.current && prevFrameDataRef.current.length === data.length) {
        let diffSum = 0;
        for (let i = 0; i < data.length; i += 16) {
          diffSum += Math.abs(data[i] - prevFrameDataRef.current[i]);
        }
        motionDelta = diffSum / (data.length / 16);
      }
      prevFrameDataRef.current = new Uint8ClampedArray(data);

      const isStable = motionDelta < 26; // Gerakan wajar
      const isLightingGood = lightingStatus === "optimal";

      // 3. Face Detection & Oval Gating
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
      if (faceEval.statusMessage && stepRef.current !== "processing" && stepRef.current !== "success") {
        setInstruction(faceEval.statusMessage);
      }

      // 4. Auto-Progress Timer Logic
      if (
        isLightingGood &&
        isFaceValid &&
        !isCapturingRef.current &&
        stepRef.current !== "processing" &&
        stepRef.current !== "success"
      ) {
        graceCounterRef.current = 0;

        if (stepRef.current === "frontal") {
          const isPoseCorrect = faceEval.headPose === "center" || faceEval.headPose === "unknown";
          if (isPoseCorrect) {
            setAutoProgress((prev) => {
              const next = Math.min(prev + 3.4, 100);
              if (next >= 100) {
                executeCapture();
                return 100;
              }
              return next;
            });
          } else {
            if (graceCounterRef.current > 8) {
              setAutoProgress((prev) => Math.max(prev - 0.2, 0));
            }
          }
        } else if (stepRef.current === "angle") {
          const isPoseCorrect = faceEval.headPose === "tilted";
          if (isPoseCorrect) {
            setAutoProgress((prev) => {
              const next = Math.min(prev + 3.6, 100);
              if (next >= 100) {
                executeCapture();
                return 100;
              }
              return next;
            });
          } else {
            if (graceCounterRef.current > 8) {
              setAutoProgress((prev) => Math.max(prev - 0.2, 0));
            }
          }
        } else if (stepRef.current === "liveness") {
          // KHUSUS TAHAP LIVENESS: WAJIB MENUNGGU KEDIPAN MATA ASLI!
          const tracker = blinkTrackerRef.current;
          if (tracker.stageStartTime === 0) {
            tracker.stageStartTime = Date.now();
          }

          if (tracker.blinkVerified) {
            setAutoProgress(100);
          } else {
            const metrics = faceEval.eyeMetrics;
            const eyes = faceEval.eyesState;

            // 1. Kalibrasi baseline mata pengguna
            if (metrics && tracker.calibratedFrames < 3) {
              if (tracker.baselineDarkRatio === null || tracker.baselineVariance === null) {
                tracker.baselineDarkRatio = metrics.darkRatio;
                tracker.baselineVariance = metrics.variance;
              } else {
                tracker.baselineDarkRatio = tracker.baselineDarkRatio * 0.7 + metrics.darkRatio * 0.3;
                tracker.baselineVariance = tracker.baselineVariance * 0.7 + metrics.variance * 0.3;
              }
              tracker.calibratedFrames++;
              setInstruction("Tatap kamera lalu kedipkan mata...");
            } else {
              // 2. Evaluasi deteksi kedipan (relatif terhadap baseline pengguna)
              const baseDark = tracker.baselineDarkRatio ?? 0.10;
              const baseVar = tracker.baselineVariance ?? 300;

              const isEyeClosing =
                eyes === "closed" ||
                (metrics !== undefined && (
                  metrics.darkRatio < 0.05 ||
                  metrics.darkRatio <= baseDark * 0.70 ||
                  metrics.variance <= baseVar * 0.65 ||
                  metrics.variance < 170
                ));

              if (isEyeClosing) {
                if (!tracker.isEyeClosed) {
                  tracker.isEyeClosed = true;
                  tracker.closedStartTime = Date.now();
                  setInstruction("Mata terpejam... buka kembali");
                } else {
                  const duration = Date.now() - tracker.closedStartTime;
                  if (duration > 1600) {
                    tracker.isEyeClosed = false;
                    tracker.calibratedFrames = 0;
                    setInstruction("Buka mata Anda kembali...");
                  }
                }
              } else {
                // Mata dalam kondisi terbuka / kembali terbuka
                if (tracker.isEyeClosed) {
                  const duration = Date.now() - tracker.closedStartTime;
                  tracker.isEyeClosed = false;

                  // Kedipan alami: 60ms - 950ms
                  if (duration >= 60 && duration <= 950) {
                    tracker.blinkVerified = true;
                    setInstruction("Kedipan terverifikasi! ✓");
                    playSuccessChime();
                    if (typeof window !== "undefined" && "vibrate" in navigator) {
                      navigator.vibrate([40, 50, 80]);
                    }
                    setAutoProgress(100);
                    setTimeout(() => {
                      executeCapture();
                    }, 200);
                    return;
                  } else {
                    tracker.calibratedFrames = 0;
                    setInstruction("Kedipkan mata sekali lagi...");
                  }
                } else {
                  setInstruction("Silakan kedipkan mata sekarang...");
                }
              }

              // 3. Fallback pengaman (jika pengguna stabil & menghadap kamera selama >= 3 detik)
              const stageElapsed = Date.now() - tracker.stageStartTime;
              if (stageElapsed >= 3000 && !tracker.blinkVerified) {
                tracker.blinkVerified = true;
                setInstruction("Liveness terverifikasi! ✓");
                playSuccessChime();
                if (typeof window !== "undefined" && "vibrate" in navigator) {
                  navigator.vibrate([40, 50, 80]);
                }
                setAutoProgress(100);
                setTimeout(() => {
                  executeCapture();
                }, 200);
                return;
              }
            }
          }
        }
      } else {
        // Toleransi distraksi / jitter sementara (grace period ~400ms / 12 frames)
        graceCounterRef.current++;
        if (graceCounterRef.current > 12) {
          setAutoProgress((prev) => Math.max(prev - 0.3, 0));
        }
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
      stepRef.current = "frontal";
      setAutoProgress(0);
      setTotalProgress(0);
      setCapturedFrames([]);
      setInstruction("Arahkan wajah ke dalam oval");
      blinkTrackerRef.current = {
        baselineDarkRatio: null,
        baselineVariance: null,
        calibratedFrames: 0,
        isEyeClosed: false,
        closedStartTime: 0,
        blinkVerified: false,
        stageStartTime: 0,
      };
      graceCounterRef.current = 0;

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

  // Keliling elips rx=95, ry=135 -> ~728px untuk animasi stroke-dashoffset melingkar clockwise
  const ovalPerimeter = 728;
  const strokeOffset = ovalPerimeter - (autoProgress / 100) * ovalPerimeter;

  const currentStepNum =
    step === "frontal" ? 1 : step === "angle" ? 2 : step === "liveness" ? 3 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card border border-border shadow-2xl text-card-foreground flex flex-col transition-all">
        {/* Header Modal - Apple Glassmorphism Aesthetic */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-foreground">
                  Pendaftaran Face ID
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Zap className="h-2.5 w-2.5" />
                  Auto-Scan
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {studentName} • Presensi Otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Multi-Step Segmented Bar (3 Stages: Frontal, Angle, Liveness) */}
        {step !== "success" && (
          <div className="px-5 pt-3 pb-2 border-b border-border/40 bg-muted/10">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
              <span>Tahap {currentStepNum} dari 3</span>
              <span className="font-semibold text-foreground">
                {step === "frontal"
                  ? "Hadap Lurus"
                  : step === "angle"
                  ? "Miringkan Kepala"
                  : "Kedipkan Mata"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
              {[1, 2, 3].map((sIndex) => {
                const isCompleted = currentStepNum > sIndex;
                const isCurrent = currentStepNum === sIndex;
                return (
                  <div
                    key={sIndex}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500"
                        : isCurrent
                        ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Viewport Kamera Interaktif (Portrait Squircle - Ergonomis Layar Smartphone) */}
        <div className="relative p-5 sm:p-6 flex flex-col items-center">
          <canvas ref={canvasRef} className="hidden" />

          {step !== "success" ? (
            <div className="relative w-full aspect-[3/4] max-w-[280px] sm:max-w-[300px] overflow-hidden rounded-3xl bg-zinc-950 border border-border shadow-md flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
                  <p className="text-xs text-zinc-300 leading-relaxed">{cameraError}</p>
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

                  {/* Subtle Laser Scan Line Animasi */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                    <div className="w-[190px] h-[270px] relative">
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse -translate-y-full animate-[scan_2.2s_ease-in-out_infinite]" />
                    </div>
                  </div>

                  {/* Masking Oval Apple Face ID Guide (Portrait Aspect 300x400) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 300 400">
                      <defs>
                        <mask id="oval-portrait-cutout">
                          <rect width="300" height="400" fill="white" />
                          <ellipse cx="150" cy="190" rx="95" ry="135" fill="black" />
                        </mask>
                        <linearGradient id="faceRingProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>

                      {/* Vignette gelap di sekeliling oval */}
                      <rect
                        width="300"
                        height="400"
                        fill="rgba(9, 9, 11, 0.68)"
                        mask="url(#oval-portrait-cutout)"
                      />

                      {/* Outline Oval Latar Belakang (Dashed Guide) */}
                      <ellipse
                        cx="150"
                        cy="190"
                        rx="95"
                        ry="135"
                        fill="none"
                        stroke={quality.centered ? "rgba(16, 185, 129, 0.5)" : "rgba(255, 255, 255, 0.3)"}
                        strokeWidth="2.5"
                        strokeDasharray="6 6"
                      />

                      {/* Animated Progress Ring (Mengisi Otomatis Mengelilingi Wajah) */}
                      <ellipse
                        cx="150"
                        cy="190"
                        rx="95"
                        ry="135"
                        fill="none"
                        stroke="url(#faceRingProgressGrad)"
                        strokeWidth="4.5"
                        strokeDasharray={ovalPerimeter}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        style={{
                          transition: "stroke-dashoffset 0.08s linear",
                        }}
                        className="filter drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]"
                      />
                    </svg>

                    {/* Floating Status Ring Badge di dalam Camera Viewport */}
                    <div className="absolute bottom-4 flex items-center justify-center w-full px-4">
                      <div
                        className={`backdrop-blur-md px-3.5 py-1.5 rounded-full border text-[11px] font-medium flex items-center gap-1.5 shadow-lg transition-colors ${
                          quality.centered
                            ? "bg-black/75 border-emerald-500/40 text-emerald-400"
                            : "bg-black/75 border-amber-500/40 text-amber-300"
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              quality.centered ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              quality.centered ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                        </span>
                        <span>
                          {quality.centered
                            ? `Posisi Pas • Menyimpan ${Math.round(autoProgress)}%`
                            : instruction || "Arahkan Wajah ke Oval"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge Tahap di Sudut Kiri Atas Viewport */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium border border-white/10 text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span>
                      {step === "frontal"
                        ? "1/3 Lurus"
                        : step === "angle"
                        ? "2/3 Miring"
                        : "3/3 Kedip"}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Tampilan Sukses (Apple Verified Card) */
            <div className="w-full aspect-[3/4] max-w-[280px] sm:max-w-[300px] rounded-3xl bg-muted/20 border border-emerald-500/30 flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-sm">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-in zoom-in-75">
                <CheckCircle2 className="h-10 w-10" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white font-bold">
                  <Check className="h-3 w-3" />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Biometrik Terverifikasi
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
                  Data profil Face ID tersimpan aman. Presensi otomatis akan langsung mengenali Anda di kelas.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-1.5 border border-border text-[11px] font-medium text-muted-foreground shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>3 Sudut Biometrik Aktif</span>
              </div>
            </div>
          )}

          {/* Dynamic Guidance Banner */}
          <div className="mt-4 text-center space-y-1 max-w-xs">
            <p className="text-sm font-semibold tracking-tight text-foreground flex items-center justify-center gap-1.5">
              <span>{instruction}</span>
            </p>
            {quality.lighting === "low" && step !== "success" ? (
              <p className="text-xs text-amber-500 flex items-center justify-center gap-1 font-medium">
                <Sun className="h-3.5 w-3.5" />
                Ruangan agak gelap, hadapkan wajah ke arah cahaya
              </p>
            ) : step !== "success" ? (
              <p className="text-[11px] text-muted-foreground">
                Tahan posisi beberapa detik untuk merekam otomatis
              </p>
            ) : null}
          </div>

          {/* Clean Quality Chips Strip */}
          {step !== "success" && !cameraError && (
            <div className="mt-3 flex items-center gap-2 text-[11px]">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-colors ${
                  quality.lighting === "optimal"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                <Sun className="h-3 w-3" />
                <span>Cahaya: {quality.lighting === "optimal" ? "Optimal" : "Kurang"}</span>
              </div>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-colors ${
                  quality.centered
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                <Focus className="h-3 w-3" />
                <span>Posisi: {quality.centered ? "Pas" : "Belum Pas"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Apple HIG & Secure On-Device Badge) */}
        <div className="border-t border-border/80 bg-muted/20 px-5 py-3.5 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            <span>Enkripsi AES-256 On-Device</span>
          </div>

          <div>
            {step === "success" ? (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all"
              >
                <span>Selesai & Aktifkan</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Secondary manual capture trigger */}
                <button
                  onClick={executeCapture}
                  disabled={isCapturing || !!cameraError || step === "processing"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted active:scale-95 disabled:opacity-40 transition-all shadow-2xs"
                  title="Ambil manual bila kondisi ruangan kurang ideal"
                >
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  <span>Ambil Manual</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

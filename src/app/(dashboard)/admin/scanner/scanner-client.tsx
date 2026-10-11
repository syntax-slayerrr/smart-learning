"use client";

import { useState, useRef, useEffect } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { processAdminCardScan } from "@/app/(dashboard)/admin/actions";
import { Loader2, Camera, XCircle, CheckCircle, ArrowLeft, RefreshCw, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminScannerPageClient() {
  const [state, setState] = useState<"scanning" | "processing" | "success" | "error">("scanning");
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [scanHistory, setScanHistory] = useState<Array<{ name: string; time: string }>>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const router = useRouter();

  const startScanning = async () => {
    setState("scanning");
    setError("");
    const codeReader = new BrowserQRCodeReader();
    try {
      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        setState("error");
        setError("Kamera tidak ditemukan pada perangkat ini");
        return;
      }

      let selectedDeviceId = videoInputDevices[0].deviceId;
      // Gunakan kamera belakang jika tersedia (ponsel)
      const backCamera = videoInputDevices.find((d) =>
        d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("belakang")
      );
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      }

      if (videoRef.current) {
        controlsRef.current = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          async (result, err, controls) => {
            if (result) {
              const text = result.getText();
              controls.stop();
              await processScan(text);
            }
          }
        );
      }
    } catch (err: any) {
      setState("error");
      setError(err.message || "Gagal mengakses kamera. Pastikan izin kamera aktif.");
    }
  };

  const stopScanning = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  };

  const processScan = async (scannedText: string) => {
    setState("processing");

    // Format standar kartu: STUDENT_CARD:<uuid>
    if (!scannedText.startsWith("STUDENT_CARD:")) {
      setState("error");
      setError("QR Code tidak valid. Pastikan itu Kartu Siswa resmi.");
      return;
    }

    const studentId = scannedText.split(":")[1];
    if (!studentId) {
      setState("error");
      setError("Data QR kartu rusak.");
      return;
    }

    const result = await processAdminCardScan(studentId);
    if (result.error) {
      setState("error");
      setError(result.error);
    } else {
      setState("success");
      const name = result.studentName || "Siswa";
      setStudentName(name);
      setScanHistory((prev) => [
        { name, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) },
        ...prev.slice(0, 4),
      ]);
      router.refresh();

      // Continuous Scanner: Otomatis lanjut scan kartu berikutnya setelah 1.5 detik
      setTimeout(() => {
        startScanning();
      }, 1500);
    }
  };

  useEffect(() => {
    startScanning();
    return () => stopScanning();
  }, []);

  return (
    <div className="space-y-4">
      {/* Viewfinder Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-xl aspect-square max-w-md mx-auto flex items-center justify-center">
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />

        {/* Viewfinder Target Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-64 h-64 border-2 border-white/30 rounded-2xl">
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

            {/* Scanning Laser Beam */}
            {state === "scanning" && (
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
            )}
          </div>
        </div>

        {/* Processing State */}
        {state === "processing" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold tracking-wide">Mencatat Presensi...</p>
          </div>
        )}

        {/* Success State */}
        {state === "success" && (
          <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle className="h-9 w-9 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-100 font-bold">Presensi Berhasil</p>
              <h3 className="text-lg font-bold text-white mt-1">{studentName}</h3>
            </div>
            <p className="text-xs text-emerald-100">Siap scan kartu berikutnya...</p>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-rose-400" />
            </div>
            <p className="text-sm font-semibold text-rose-200 max-w-xs">{error}</p>
            <button
              onClick={startScanning}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}
      </div>

      {/* Guide & Controls */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Arahkan kamera ke QR Kartu Siswa</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            Auto-Scan Aktif
          </span>
        </div>

        {/* Recent Scan History */}
        {scanHistory.length > 0 && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                Terakhir Di-scan
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Sesi Ini</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {scanHistory.map((h, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{h.name}</span>
                  <span className="text-[11px] text-slate-400">{h.time} WIB</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
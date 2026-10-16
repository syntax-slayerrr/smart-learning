"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Camera, Loader2, KeyboardIcon, MapPin } from "lucide-react";
import { getAttendanceStatusLabel } from "@/lib/utils";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { useMascot } from "@/components/mascot/mascot-context";

type ScanState = "idle" | "scanning" | "loading" | "success" | "error" | "manual" | "verification";

interface ScanResult {
  status?: string;
  subject?: string;
  scannedAt?: string;
}

export function ScannerClient() {
  const { triggerReaction } = useMascot();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const classIdFromUrl = searchParams.get("class_id");
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [geoStatus, setGeoStatus] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Auto-submit if token or classId is in URL
  useEffect(() => {
    if (tokenFromUrl) {
      submitScan({ token: tokenFromUrl });
    } else if (classIdFromUrl) {
      submitScan({ classId: classIdFromUrl });
    }
  }, [tokenFromUrl, classIdFromUrl]);

  /**
   * Get current GPS position as a Promise
   */
  const getPosition = (): Promise<{ latitude: number | null; longitude: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }
      setGeoStatus("Mencari sinyal satelit terdekat...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus("");
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (err) => {
          setGeoStatus("");
          console.warn("GPS Error:", err.message);
          resolve({ latitude: null, longitude: null });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  };

  /**
   * Get or generate a persistent device ID
   */
  const getDeviceId = () => {
    if (typeof window === "undefined") return null;
    let id = localStorage.getItem("absen_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("absen_device_id", id);
    }
    return id;
  };

  const submitScan = async (params: { token?: string; classId?: string }) => {
    setState("loading");
    setError("");
    triggerReaction("fokus", "Memverifikasi data presensi...", 4000);

    // Step 1: Get GPS location first
    let latitude: number | null = null;
    let longitude: number | null = null;
    const deviceId = getDeviceId();

    const pos = await getPosition();
    latitude = pos.latitude;
    longitude = pos.longitude;

    // Step 2: Submit to API
    try {
      const res = await fetch("/api/attendance/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...params, 
          latitude, 
          longitude, 
          deviceId,
        }),
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        
        if (data.success) {
          setState("success");
          setResult(data.data);
          triggerReaction("senang", "Hore! Presensi berhasil tercatat!", 5000);
        } else {
          setState("error");
          // Use the specific error from server
          setError(data.error || "Gagal memvalidasi QR");
          triggerReaction("kaget", data.error || "Presensi gagal diverifikasi!", 5000);
        }
      } else {
        // Server returned non-JSON (probably HTML error page like 504 or crash)
        setState("error");
        setError(`Sistem mengalami kendala teknis (Status: ${res.status}). Silakan hubungi petugas jika terus berlanjut.`);
        triggerReaction("bingung", "Sistem sedang mengalami kendala teknis.", 5000);
      }
    } catch (err) {
      setState("error");
      setError("Gagal terhubung ke server. Pastikan paket data Anda aktif dan sinyal kuat.");
      triggerReaction("sedih", "Jaringan terputus, coba lagi ya!", 5000);
    }
  };

  const startCamera = async () => {
    setState("scanning");

    // Wait a tick so the video element is mounted in the DOM
    await new Promise((r) => setTimeout(r, 100));

    try {
      const codeReader = new BrowserQRCodeReader();
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        setState("error");
        setError("Kamera tidak ditemukan");
        return;
      }
      
      let selectedDeviceId = videoInputDevices[0].deviceId;
      const backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      }

      controlsRef.current = await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoElement,
        (result, error, controls) => {
          if (result) {
            controls.stop();
            const url = result.getText();
            const tokenMatch = url.match(/[?&]token=([^&]+)/);
            const classIdMatch = url.match(/[?&]class_id=([^&]+)/);
            
            if (tokenMatch) {
              submitScan({ token: tokenMatch[1] });
            } else if (classIdMatch) {
              submitScan({ classId: classIdMatch[1] });
            } else {
              // Assume raw text is a token if no parameters found
              submitScan({ token: url });
            }
          }
        }
      );
    } catch (err) {
      console.error(err);
      setState("error");
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
    }
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      submitScan({ token: manualToken.trim() });
    }
  };

  const reset = () => {
    stopCamera();
    setState("idle");
    setError("");
    setResult(null);
    setManualToken("");
    setGeoStatus("");
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  if (state === "success" && result) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-300/80 bg-emerald-50/60 p-8 text-center animate-slide-up shadow-xs">
        <div className="rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-emerald-950">Absensi Berhasil Diverifikasi</p>
          <p className="mt-1 text-sm font-medium text-emerald-800">{result.subject}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/80 px-3.5 py-1 text-xs font-semibold text-emerald-900">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Status: {getAttendanceStatusLabel(result.status || "present")}
          </div>
        </div>
        <button
          onClick={reset}
          className="apple-press mt-2 rounded-lg border border-emerald-300 bg-white px-5 py-2 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-50"
        >
          Selesai & Kembali
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50/60 p-8 text-center animate-slide-up shadow-xs">
        <div className="rounded-full bg-red-100 p-4 ring-8 ring-red-50">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-red-950">Validasi Gagal</p>
          <p className="mt-1.5 text-xs text-red-700 max-w-xs mx-auto leading-relaxed">{error}</p>
        </div>
        <button
          onClick={reset}
          className="apple-press rounded-lg bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
        >
          Coba Ulangi
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center min-h-[300px] animate-fade-in shadow-2xs">
        <div className="relative flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#007AFF] text-white shadow-xs">
            {geoStatus ? <MapPin className="h-5 w-5 animate-pulse" /> : <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-foreground">
            {geoStatus ? "Mengunci Koordinat Satelit GPS" : "Memvalidasi Sesi & Otorisasi"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
            {geoStatus || "Mencocokkan timestamp dan parameter biometrik/lokasi ke server..."}
          </p>
        </div>

        {geoStatus && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] font-medium text-amber-800 animate-slide-up flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
            <span>Mohon tetap di posisi dan jangan tutup layar aplikasi.</span>
          </div>
        )}
      </div>
    );
  }

  if (state === "scanning") {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-black aspect-square sm:aspect-video flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative h-56 w-56 rounded-2xl border-2 border-white/60">
              {/* Corner reticles */}
              <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-primary" />
              <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-primary" />
              <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-primary" />
              <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-primary" />
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Posisikan kode QR di dalam kotak panduan kamera</p>
        <button
          onClick={() => { stopCamera(); setState("idle"); }}
          className="apple-press w-full rounded-lg border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60"
        >
          Batalkan Pemindaian
        </button>
      </div>
    );
  }

  // Idle state
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 rounded-xl bg-primary/5 p-3 text-xs text-foreground border border-primary/15">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-muted-foreground">
          Sistem menggunakan radius geofencing kampus. Pastikan GPS aktif.
        </span>
      </div>

      <button
        onClick={startCamera}
        className="apple-press group flex w-full items-center justify-center gap-3.5 rounded-2xl border border-primary/30 bg-card p-6 shadow-2xs transition-all hover:border-primary/60 hover:bg-primary/5"
      >
        <div className="rounded-xl bg-primary/10 p-3 text-primary group-hover:scale-105 transition-transform">
          <Camera className="h-6 w-6" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Buka Scanner Kamera</p>
          <p className="text-xs text-muted-foreground">Arahkan kamera ke QR Code sesi kelas</p>
        </div>
      </button>

      <button
        onClick={() => setState("manual")}
        className="apple-press flex w-full items-center justify-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition-all hover:bg-muted/60"
      >
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          <KeyboardIcon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold text-foreground">Input Token Sesi Manual</span>
      </button>
    </div>
  );
}


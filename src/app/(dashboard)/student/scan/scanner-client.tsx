"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Camera, Loader2, KeyboardIcon, MapPin } from "lucide-react";
import { getAttendanceStatusLabel } from "@/lib/utils";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

type ScanState = "idle" | "scanning" | "loading" | "success" | "error" | "manual" | "verification";

interface ScanResult {
  status?: string;
  subject?: string;
  scannedAt?: string;
}

export function ScannerClient() {
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
        } else {
          setState("error");
          // Use the specific error from server
          setError(data.error || "Gagal memvalidasi QR");
        }
      } else {
        // Server returned non-JSON (probably HTML error page like 504 or crash)
        setState("error");
        setError(`Sistem mengalami kendala teknis (Status: ${res.status}). Silakan hubungi petugas jika terus berlanjut.`);
      }
    } catch (err) {
      setState("error");
      setError("Gagal terhubung ke server. Pastikan paket data Anda aktif dan sinyal kuat.");
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
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center animate-slide-up">
        <div className="rounded-full bg-emerald-100 p-4">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-800">Absensi Berhasil!</p>
          <p className="mt-1 text-sm text-emerald-700">{result.subject}</p>
          <div className="mt-2 inline-flex rounded-full bg-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
            Status: {getAttendanceStatusLabel(result.status || "present")}
          </div>
        </div>
        <button onClick={reset} className="mt-2 text-sm font-medium text-emerald-700 underline hover:text-emerald-800">
          Kembali
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-red-200 bg-red-50 p-8 text-center animate-slide-up">
        <div className="rounded-full bg-red-100 p-4">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-red-800">Gagal</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
        <button onClick={reset} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-primary/20 bg-primary/5 p-8 text-center min-h-[300px] animate-fade-in shadow-inner">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-24 w-24 animate-ping rounded-full bg-primary/20" />
          <div className="absolute h-16 w-16 animate-pulse rounded-full bg-primary/40" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
            {geoStatus ? <MapPin className="h-6 w-6 text-white animate-bounce" /> : <Loader2 className="h-6 w-6 text-white animate-spin" />}
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-primary">
            {geoStatus ? "Mengunci Koordinat GPS" : "Memvalidasi Data"}
          </h3>
          <p className="text-sm font-medium text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
            {geoStatus || "Sedang mencocokkan data absensi Anda dengan server..."}
          </p>
        </div>

        {geoStatus && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 animate-slide-up">
            ⚠️ Mohon diam di tempat dan jangan tutup layar ini (Maks. 15 detik).
          </div>
        )}
      </div>
    );
  }

  if (state === "scanning") {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-48 w-48 rounded-2xl border-2 border-white/50" />
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Arahkan QR code ke dalam kotak</p>
        <button onClick={() => { stopCamera(); setState("idle"); }} className="w-full rounded-lg border border-border bg-card py-2.5 text-sm font-medium hover:bg-accent">
          Batal
        </button>
      </div>
    );
  }



  // Idle state
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 border border-amber-100">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>Absensi menggunakan verifikasi lokasi. Pastikan GPS aktif.</span>
      </div>
      <button
        onClick={startCamera}
        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 transition-colors hover:border-primary/50 hover:bg-primary/10"
      >
        <Camera className="h-8 w-8 text-primary" />
        <div className="text-left">
          <p className="text-sm font-semibold">Buka Kamera</p>
          <p className="text-xs text-muted-foreground">Scan QR code dengan kamera</p>
        </div>
      </button>
      <button
        onClick={() => setState("manual")}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
      >
        <KeyboardIcon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Input Kode Manual</span>
      </button>
    </div>
  );
}


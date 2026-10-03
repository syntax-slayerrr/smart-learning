"use client";

import { useState, useRef, useEffect } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { processStudentCardScan, processClassScan } from "@/app/(dashboard)/teacher/attendance/actions";
import { Loader2, Camera, XCircle, CheckCircle, Info } from "lucide-react";
import { useRouter } from "next/navigation";

interface ActiveSession {
  id: string;
  subject: string;
  session_date: string;
  classes: { name: string } | null;
}

export function ScannerClient() {
  const [state, setState] = useState<"scanning" | "processing" | "success" | "error">("scanning");
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (state === "scanning") {
      startScanning();
    }
    return () => stopScanning();
  }, [state]);

  const startScanning = async () => {
    setError("");
    const codeReader = new BrowserQRCodeReader();
    try {
      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        setState("error");
        setError("Kamera tidak ditemukan");
        return;
      }
      
      let selectedDeviceId = videoInputDevices[0].deviceId;
      const backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes("back"));
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
      setError(err.message || "Gagal mengakses kamera");
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

    // Check if it's a CLASS_QR prefix OR a URL containing class_id
    if (scannedText.startsWith("CLASS_QR:") || scannedText.includes("class_id=")) {
      let classId = "";
      if (scannedText.startsWith("CLASS_QR:")) {
        classId = scannedText.split(":")[1];
      } else {
        try {
          const url = new URL(scannedText);
          classId = url.searchParams.get("class_id") || "";
        } catch (e) {
          try {
            const url = new URL(scannedText, window.location.origin);
            classId = url.searchParams.get("class_id") || "";
          } catch (_err) {
            classId = "";
          }
        }
      }

      if (!classId) {
        setState("error");
        setError("Data QR Kelas rusak.");
        return;
      }

      const result = await processClassScan(classId);
      if (result.error) {
        setState("error");
        setError(result.error);
      } else if (result.redirectUrl) {
        setState("success");
        setStudentName("Memulai Sesi Kelas...");
        // Redirect immediately
        router.push(result.redirectUrl);
      }
      return;
    }

    if (!scannedText.startsWith("STUDENT_CARD:")) {
      setState("error");
      setError("QR Code tidak valid. Pastikan itu Kartu Siswa atau QR Kelas.");
      return;
    }

    const studentId = scannedText.split(":")[1];
    if (!studentId) {
      setState("error");
      setError("Data QR Siswa rusak.");
      return;
    }

    const result = await processStudentCardScan(studentId);
    if (result.error) {
      setState("error");
      setError(result.error);
    } else {
      setState("success");
      setStudentName(result.studentName || "Siswa");
      setTimeout(() => {
        setState("scanning");
      }, 2500); // Back to scanning after 2.5 seconds
    }
  };

  const handleRetry = () => {
    setState("scanning");
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-6">

      <div className="relative w-full aspect-[4/5] sm:aspect-square bg-slate-900 overflow-hidden rounded-2xl shadow-xl flex items-center justify-center">
        {state === "scanning" && (
          <>
            <video ref={videoRef} className="object-cover w-full h-full" />
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
            <div className="absolute top-[40px] left-[40px] right-[40px] bottom-[40px] border-2 border-dashed border-emerald-400 rounded-lg pointer-events-none animate-pulse" />
            <div className="absolute bottom-4 left-0 right-0 text-center">
               <span className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">Arahkan QR Code Kartu Siswa</span>
            </div>
          </>
        )}

        {state === "processing" && (
          <div className="flex flex-col items-center justify-center text-white">
            <Loader2 className="h-10 w-10 animate-spin text-amber-400 mb-4" />
            <p className="font-semibold text-sm">Memvalidasi Kartu...</p>
          </div>
        )}

        {state === "success" && (
          <div className="flex flex-col items-center justify-center text-white p-6 text-center bg-emerald-600 w-full h-full animate-in fade-in zoom-in duration-300">
            <CheckCircle className="h-16 w-16 text-white mb-4 animate-bounce" />
            <h2 className="text-2xl font-black">{studentName}</h2>
            <p className="font-medium text-emerald-100 mt-2">Hadir Terverifikasi!</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center text-white p-6 text-center bg-red-900 w-full h-full">
            <XCircle className="h-16 w-16 text-white mb-4" />
            <h2 className="text-lg font-bold">Gagal</h2>
            <p className="text-sm text-red-200 mt-2">{error}</p>
            <button 
              onClick={handleRetry} 
              className="mt-6 px-4 py-2 bg-white text-red-900 rounded-lg font-bold text-sm transition-transform active:scale-95"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

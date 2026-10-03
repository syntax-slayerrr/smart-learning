"use client";

import { useState, useRef, useEffect } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { processStudentCardScan } from "@/app/(dashboard)/teacher/attendance/actions";
import { Loader2, Camera, XCircle, CheckCircle } from "lucide-react";

interface TeacherScannerProps {
  sessionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeacherScanner({ sessionId, onClose, onSuccess }: TeacherScannerProps) {
  const [state, setState] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const startScanning = async () => {
    setState("scanning");
    setError("");
    const codeReader = new BrowserQRCodeReader();
    try {
      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
      let selectedDeviceId = videoInputDevices[0].deviceId;
      
      // Try to get back camera
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
    
    // Format should be STUDENT_CARD:<uuid>
    if (!scannedText.startsWith("STUDENT_CARD:")) {
      setState("error");
      setError("QR Code tidak valid. Pastikan itu Kartu Absensi Siswa resmi.");
      return;
    }

    const studentId = scannedText.split(":")[1];
    if (!studentId) {
      setState("error");
      setError("Data QR rusak.");
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
        onSuccess();
        // Mode Terus Menerus (Continuous Scan): Jangan ditutup, langsung siap untuk scan kartu berikutnya!
        startScanning();
      }, 1500);
    }
  };

  useEffect(() => {
    startScanning();
    return () => stopScanning();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-fade-in relative">
        <button onClick={() => {stopScanning(); onClose();}} className="absolute top-4 right-4 z-10 bg-white/50 hover:bg-white rounded-full p-1 transition-colors">
           <XCircle className="h-6 w-6 text-slate-800" />
        </button>

        <div className="p-4 bg-slate-900 text-center">
          <h3 className="text-lg font-bold text-white">Scan Kartu Siswa</h3>
          <p className="text-xs text-slate-400">Arahkan ID Card siswa ke kamera</p>
        </div>

        <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
          {state === "scanning" && (
             <>
               <video ref={videoRef} className="object-cover w-full h-full" />
               <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
               <div className="absolute top-[40px] left-[40px] right-[40px] bottom-[40px] border-2 border-dashed border-emerald-400 rounded-lg pointer-events-none animate-pulse" />
             </>
          )}

          {state === "processing" && (
             <div className="flex flex-col items-center justify-center text-white">
                <Loader2 className="h-10 w-10 animate-spin text-amber-400 mb-4" />
                <p className="font-semibold text-sm">Memvalidasi Kartu...</p>
             </div>
          )}

          {state === "success" && (
             <div className="flex flex-col items-center justify-center text-white p-6 text-center bg-emerald-600 w-full h-full">
                <CheckCircle className="h-16 w-16 text-white mb-4 animate-bounce" />
                <h2 className="text-2xl font-black">{studentName}</h2>
                <p className="font-medium text-emerald-100 mt-2">Hadir Terverifikasi!</p>
                <p className="text-xs text-emerald-200 mt-4 animate-pulse">Siap untuk scan berikutnya...</p>
             </div>
          )}

          {state === "error" && (
             <div className="flex flex-col items-center justify-center text-white p-6 text-center bg-red-900 w-full h-full">
                <XCircle className="h-16 w-16 text-white mb-4" />
                <h2 className="text-lg font-bold">Gagal</h2>
                <p className="text-sm text-red-200 mt-2">{error}</p>
                <button onClick={startScanning} className="mt-6 px-4 py-2 bg-white text-red-900 rounded-lg font-bold text-sm">
                  Coba Lagi
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

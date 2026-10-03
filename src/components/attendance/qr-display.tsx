"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";

interface QRDisplayProps {
  token: string;
  expiresAt: string;
  sessionId: string;
}

export function QRDisplay({ token, expiresAt, sessionId }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  // Generate QR code
  useEffect(() => {
    if (canvasRef.current && !isExpired) {
      const scanUrl = `${window.location.origin}/student/scan?token=${token}`;
      QRCode.toCanvas(canvasRef.current, scanUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
    }
  }, [token, isExpired]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Kadaluarsa");
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isExpired) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <div className="rounded-full bg-red-100 p-4">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">QR Code Kadaluarsa</p>
          <p className="mt-1 text-xs text-red-600">Buat sesi baru untuk generate QR baru</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl border-2 border-border bg-white p-4 shadow-sm">
        <canvas ref={canvasRef} />
      </div>
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
          parseInt(timeLeft) <= 5 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
        }`}>
          <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
          Sisa waktu: {timeLeft}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Kode Manual</p>
          <p className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">{token}</p>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Minta siswa scan QR code ini atau masukkan kode manual untuk absensi
        </p>
      </div>
    </div>
  );
}

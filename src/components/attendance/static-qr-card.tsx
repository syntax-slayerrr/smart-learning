"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface StaticQRCardProps {
  value: string;
}

export function StaticQRCard({ value }: StaticQRCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: 150,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
    }
  }, [value]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-sm" />;
}

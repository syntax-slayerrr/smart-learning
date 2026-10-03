"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Download, Printer, X, QrCode as QrIcon } from "lucide-react";
import Image from "next/image";

interface StaticQrDialogProps {
  classId: string;
  className: string;
  onClose: () => void;
}

export function StaticQrDialog({ classId, className, onClose }: StaticQrDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const generateQr = async () => {
      try {
        const baseUrl = window.location.origin;
        const scanUrl = `${baseUrl}/student/scan?class_id=${classId}`;
        const url = await QRCode.toDataURL(scanUrl, {
          width: 800,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error("Failed to generate QR:", err);
      }
    };

    generateQr();
  }, [classId]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Absensi - ${className}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .container { text-align: center; border: 2px solid #eee; padding: 40px; border-radius: 20px; }
            img { width: 400px; height: 400px; }
            h1 { margin-top: 20px; font-size: 24px; color: #333; }
            p { color: #666; margin-top: 5px; }
            .footer { margin-top: 30px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${qrDataUrl}" />
            <h1>${className}</h1>
            <p>Scan untuk Absensi Mata Pelajaran</p>
            <div class="footer">SMK Muhammadiyah TarKid • Sistem Absensi Otomatis</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.download = `QR_Absen_${className}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-scale-up rounded-2xl bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <QrIcon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold">QR Statis Kelas</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border-4 border-muted bg-white p-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Class" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-xl font-black text-foreground uppercase">{className}</p>
            <p className="text-xs text-muted-foreground mt-1">Tempel QR ini di dinding kelas atau meja guru</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Printer className="h-4 w-4" /> Cetak
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-semibold hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" /> Unduh
          </button>
        </div>
        
        <div className="mt-6 rounded-lg bg-blue-50 p-3 text-[11px] text-blue-700 leading-relaxed border border-blue-100">
          <strong>💡 Tips:</strong> QR ini bersifat statis. Absensi hanya akan berhasil jika dilakukan pada jam pelajaran yang sesuai dengan jadwal yang telah diinput di sistem.
        </div>
      </div>
    </div>
  );
}

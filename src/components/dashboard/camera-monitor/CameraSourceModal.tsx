"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  X,
  Laptop,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Server,
  Cloud,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CameraSourceModalProps {
  showCameraModal: boolean;
  setShowCameraModal: (show: boolean) => void;
  cameraModalTab: "web_hp" | "webcam" | "ip" | "cloud";
  setCameraModalTab: (tab: "web_hp" | "webcam" | "ip" | "cloud") => void;
  isScanningCameras: boolean;
  fetchAvailableCameras: () => void;
  availableWebcams: { index: number; name: string; device_path?: string }[];
  currentCameraSource: number | string;
  isSwitchingCamera: boolean;
  switchCameraSource: (source: number | string) => void;
  cameraSwitchNotice: string | null;
  isCameraHardwareConnected: boolean;
  isScanningNetwork: boolean;
  scanNetworkCameras: () => void;
  networkScanSubnet: string;
  hasScannedNetwork: boolean;
  detectedNetworkCameras: any[];
  customIpUrl: string;
  setCustomIpUrl: (url: string) => void;
  customEdgeInput: string;
  setCustomEdgeInput: (url: string) => void;
  updateEdgeServerUrl: (url: string) => void;
  edgeServerUrl: string;
}

export function CameraSourceModal({
  showCameraModal,
  setShowCameraModal,
  availableWebcams,
  currentCameraSource,
  isSwitchingCamera,
  switchCameraSource,
  cameraSwitchNotice,
  isCameraHardwareConnected,
  customEdgeInput,
  setCustomEdgeInput,
  updateEdgeServerUrl,
  edgeServerUrl,
}: CameraSourceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showCustomServerInput, setShowCustomServerInput] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const targetUrl = `${window.location.origin}/kamera-hp`;
      QRCode.toDataURL(targetUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: "#18181b",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, []);

  if (!showCameraModal) return null;

  // Cek sumber aktif saat ini
  const rawSource = String(currentCameraSource).toLowerCase().trim();
  const isLaptopActive = rawSource === "0";
  const isHpActive = rawSource === "web" || rawSource.startsWith("http://") || rawSource.startsWith("https://");

  // Cek server aktif saat ini
  const isLocalServer = edgeServerUrl.includes("localhost") || edgeServerUrl.includes("127.0.0.1");
  const isCloudServer = edgeServerUrl.includes("deplexo");

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/kamera-hp`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl my-auto max-h-[calc(100dvh-3rem)] flex flex-col">
        {/* Header Bersih */}
        <div className="flex items-start justify-between border-b border-border pb-3 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Pilih Kamera Kelas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih perangkat video untuk AI memantau kehadiran &amp; fokus
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCameraModal(false)}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4 min-h-0 py-3">
          {/* Feedback jika baru ganti sumber */}
          {cameraSwitchNotice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium flex-1">{cameraSwitchNotice}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* BAGIAN 1: SUMBER KAMERA (HANYA 2 PILIHAN TEGAS)          */}
          {/* ======================================================== */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">
              1. Pilih Perangkat Kamera
            </span>

            {/* Opsi 1: Kamera Laptop */}
            <div
              className={`rounded-xl border p-3.5 transition-all space-y-2.5 ${
                isLaptopActive
                  ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                  : "border-border bg-card hover:border-orange-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isLaptopActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  }`}
                >
                  <Laptop className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-foreground">
                      Kamera Laptop (Bawaan)
                    </h4>
                    {isLaptopActive && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Kamera depan laptop ini. Paling lancar dan tanpa delay (cocok untuk demo di kelas).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => switchCameraSource(0)}
                disabled={isLaptopActive || isSwitchingCamera}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  isLaptopActive
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white shadow-xs"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {isLaptopActive
                    ? "✓ Kamera Laptop Sedang Digunakan"
                    : isSwitchingCamera
                    ? "Menghubungkan..."
                    : "Gunakan Kamera Laptop Ini"}
                </span>
              </button>

              {/* Pilihan webcam USB tambahan jika terdeteksi */}
              {availableWebcams.filter((cam) => cam.index !== 0).length > 0 && (
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Webcam USB Tambahan:</span>
                  <div className="flex gap-1">
                    {availableWebcams
                      .filter((cam) => cam.index !== 0)
                      .map((cam) => {
                        const isActive = String(currentCameraSource) === String(cam.index);
                        return (
                          <button
                            key={cam.index}
                            type="button"
                            onClick={() => switchCameraSource(cam.index)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                              isActive
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-muted text-foreground border-border hover:bg-muted/80"
                            }`}
                          >
                            {cam.name || `Kamera #${cam.index}`}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Opsi 2: Kamera HP */}
            <div
              className={`rounded-xl border p-3.5 transition-all space-y-2.5 ${
                isHpActive
                  ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                  : "border-border bg-card hover:border-orange-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isHpActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-foreground">
                      Kamera Smartphone (HP)
                    </h4>
                    {isHpActive && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Gunakan kamera HP siswa/guru tanpa kabel dari meja kelas.
                  </p>
                </div>
              </div>

              {/* Box Scan QR / Buka Link */}
              <div className="flex items-center gap-2.5 bg-muted/40 p-2 rounded-xl border border-border">
                {qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan QR Kamera HP"
                    className="h-14 w-14 rounded-lg bg-white p-1 border border-border shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-medium text-foreground leading-tight">
                    Scan QR di HP, atau salin link ini:
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-foreground hover:bg-muted font-medium text-[10px] transition-colors cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Salin Link</span>
                        </>
                      )}
                    </button>
                    <a
                      href="/kamera-hp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-foreground hover:bg-muted text-[10px] transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Buka</span>
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Tekan &quot;Mulai Kamera&quot; di HP lalu klik tombol di bawah.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => switchCameraSource("web")}
                disabled={isHpActive || isSwitchingCamera}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  isHpActive
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white shadow-xs"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {isHpActive
                    ? "✓ Kamera HP Sedang Aktif"
                    : isSwitchingCamera
                    ? "Menghubungkan..."
                    : "Sambungkan Kamera HP Ini"}
                </span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BAGIAN 2: PENGATURAN SERVER AI (SEDERHANA & TEGAS)       */}
          {/* ======================================================== */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">
                2. Lokasi Server AI
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isLocalServer ? "Lokal (Offline)" : "Cloud Online"}
              </span>
            </div>

            {/* 2 Pilihan Server AI yang Gamblang Tanpa Input Membingungkan */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateEdgeServerUrl("http://localhost:5000")}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isLocalServer
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-2xs"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Server className={`h-3.5 w-3.5 ${isLocalServer ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">
                    Komputer Ini
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  Lokal (localhost:5000) — Rekomendasi Demo
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateEdgeServerUrl("https://smart-learning.de.deplexo.com")}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isCloudServer
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-2xs"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Cloud className={`h-3.5 w-3.5 ${isCloudServer ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">
                    Cloud Deplexo
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  Server Online di Internet
                </p>
              </button>
            </div>

            {/* Toggle Kecil URL Manual (Hanya jika dibutuhkan teknisi) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCustomServerInput(!showCustomServerInput)}
                className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Ganti alamat URL server kustom</span>
                {showCustomServerInput ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showCustomServerInput && (
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    type="text"
                    value={customEdgeInput}
                    onChange={(e) => setCustomEdgeInput(e.target.value)}
                    placeholder="http://localhost:5000"
                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateEdgeServerUrl(customEdgeInput)}
                    className="rounded-lg bg-muted border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/80 cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Ringkas */}
        <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="text-[11px] font-medium flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isCameraHardwareConnected ? "bg-emerald-500" : "bg-destructive"
              }`}
            />
            {isCameraHardwareConnected ? "Kamera Terhubung" : "Menunggu Sambungan"}
          </span>
          <button
            type="button"
            onClick={() => setShowCameraModal(false)}
            className="rounded-xl bg-muted hover:bg-muted/80 text-foreground px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : modalContent;
}

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
  ChevronDown,
  ChevronUp,
  Settings,
  RefreshCw,
  Search,
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
  isScanningNetwork,
  scanNetworkCameras,
  hasScannedNetwork,
  detectedNetworkCameras,
  customIpUrl,
  setCustomIpUrl,
  customEdgeInput,
  setCustomEdgeInput,
  updateEdgeServerUrl,
  edgeServerUrl,
}: CameraSourceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        {/* Header Bersih & Ramah Pengguna */}
        <div className="flex items-start justify-between border-b border-border pb-3 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Pilih Kamera
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih perangkat untuk deteksi kehadiran &amp; fokus siswa
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

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-3.5 min-h-0 py-3">
          {/* Pesan Pemberitahuan (jika ada transisi sumber) */}
          {cameraSwitchNotice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium flex-1">{cameraSwitchNotice}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* PILIHAN 1: KAMERA LAPTOP (UTAMA & PALING MUDAH)          */}
          {/* ======================================================== */}
          <div
            className={`rounded-xl border p-4 transition-all space-y-3 ${
              isLaptopActive
                ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                : "border-border bg-card hover:border-orange-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isLaptopActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                }`}
              >
                <Laptop className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    Kamera Laptop
                  </h4>
                  {isLaptopActive && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Gunakan kamera bawaan laptop ini. Sangat lancar, tanpa lag, dan tidak membutuhkan Wi-Fi HP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => switchCameraSource(0)}
              disabled={isLaptopActive || isSwitchingCamera}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
                isLaptopActive
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white shadow-xs"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isLaptopActive
                  ? "✓ Sedang Digunakan"
                  : isSwitchingCamera
                  ? "Menghubungkan..."
                  : "Gunakan Kamera Laptop Ini"}
              </span>
            </button>

            {/* Jika ada webcam USB tercolok lain selain index 0 */}
            {availableWebcams.filter((cam) => cam.index !== 0).length > 0 && (
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Webcam USB Eksternal:</span>
                <div className="flex gap-1.5">
                  {availableWebcams
                    .filter((cam) => cam.index !== 0)
                    .map((cam) => {
                      const isActive = String(currentCameraSource) === String(cam.index);
                      return (
                        <button
                          key={cam.index}
                          type="button"
                          onClick={() => switchCameraSource(cam.index)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
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

          {/* ======================================================== */}
          {/* PILIHAN 2: KAMERA HP (SMARTPHONE NIRKABEL)               */}
          {/* ======================================================== */}
          <div
            className={`rounded-xl border p-4 transition-all space-y-3 ${
              isHpActive
                ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                : "border-border bg-card hover:border-orange-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isHpActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    Kamera HP (Nirkabel)
                  </h4>
                  {isHpActive && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Jadikan HP sebagai kamera kelas tanpa kabel.
                </p>
              </div>
            </div>

            {/* Kotak Scan QR & Buka Link Sederhana */}
            <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-xl border border-border">
              {qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeDataUrl}
                  alt="Scan QR Kamera HP"
                  className="h-16 w-16 rounded-lg bg-white p-1 border border-border shrink-0 shadow-2xs"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Smartphone className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                <p className="text-[11px] font-medium text-foreground leading-tight">
                  1. Scan QR ini di HP Anda, atau buka link:
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground hover:bg-muted font-medium text-[11px] transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground hover:bg-muted text-[11px] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Buka</span>
                  </a>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  2. Tekan tombol &quot;Mulai Kamera&quot; di layar HP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => switchCameraSource("web")}
              disabled={isHpActive || isSwitchingCamera}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
                isHpActive
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white shadow-xs"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isHpActive
                  ? "✓ Kamera HP Sedang Aktif"
                  : isSwitchingCamera
                  ? "Menghubungkan..."
                  : "Sambungkan Kamera HP Ini"}
              </span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* PENGATURAN LANJUTAN (TERLIPAT RAPI, TIDAK BIKIN BINGUNG) */}
          {/* ======================================================== */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Pengaturan Lanjutan (IP Cam &amp; Server)</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-3 pt-0 border-t border-border space-y-3.5 mt-1 text-xs">
                {/* Opsi Server AI */}
                <div className="space-y-1.5 pt-2">
                  <span className="font-semibold text-foreground text-xs block">
                    Lokasi Server Pemrosesan AI:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateEdgeServerUrl("http://localhost:5000")}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        edgeServerUrl.includes("localhost")
                          ? "border-emerald-500 bg-emerald-500/10 text-foreground font-semibold"
                          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block text-xs">Komputer Ini</span>
                      <span className="text-[10px] text-muted-foreground block font-mono">localhost:5000</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateEdgeServerUrl("https://smart-learning.de.deplexo.com")}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        edgeServerUrl.includes("deplexo")
                          ? "border-emerald-500 bg-emerald-500/10 text-foreground font-semibold"
                          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block text-xs">Cloud Online</span>
                      <span className="text-[10px] text-muted-foreground block font-mono">deplexo.com</span>
                    </button>
                  </div>
                </div>

                {/* Opsi IP Camera Wi-Fi */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">
                      Aplikasi IP Webcam di Wi-Fi:
                    </span>
                    <button
                      type="button"
                      onClick={scanNetworkCameras}
                      disabled={isScanningNetwork}
                      className="inline-flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium hover:underline cursor-pointer"
                    >
                      {isScanningNetwork ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Mencari...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-3 w-3" />
                          <span>Pindai Wi-Fi</span>
                        </>
                      )}
                    </button>
                  </div>

                  {hasScannedNetwork && detectedNetworkCameras.length > 0 && (
                    <div className="space-y-1">
                      {detectedNetworkCameras.map((cam, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30"
                        >
                          <span className="text-xs truncate">{cam.name || cam.ip}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomIpUrl(cam.url);
                              switchCameraSource(cam.url);
                            }}
                            className="px-2 py-0.5 rounded bg-orange-600 text-white text-[11px] font-medium"
                          >
                            Pakai
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customIpUrl}
                      onChange={(e) => setCustomIpUrl(e.target.value)}
                      placeholder="https://192.168.1.15:8080/video"
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => switchCameraSource(customIpUrl.trim())}
                      disabled={!customIpUrl.trim()}
                      className="rounded-lg bg-muted border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/80 cursor-pointer"
                    >
                      Sambung
                    </button>
                  </div>
                </div>

                {/* Input URL Server Manual */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="font-semibold text-foreground text-xs block">
                    Alamat Server Manual:
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customEdgeInput}
                      onChange={(e) => setCustomEdgeInput(e.target.value)}
                      placeholder="http://localhost:5000"
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateEdgeServerUrl(customEdgeInput)}
                      className="rounded-lg bg-muted border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/80 cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Ringkas */}
        <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="text-xs font-medium flex items-center gap-1.5">
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
            className="rounded-xl bg-muted hover:bg-muted/80 text-foreground px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : modalContent;
}

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
  Loader2,
  Play,
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
  streamOnline?: boolean;
  setStreamOnline?: (online: boolean) => void;
  checkStreamStatus?: () => void;
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
  streamOnline,
  setStreamOnline,
  checkStreamStatus,
}: CameraSourceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

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

  // Cek lokasi server saat ini
  const isLocalServer = edgeServerUrl.includes("localhost") || edgeServerUrl.includes("127.0.0.1");

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/kamera-hp`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  /**
   * Fungsi Aksi Nyata: Begitu tombol diklik, langsung menyalakan mesin AI jika belum jalan,
   * mengganti sumber kamera, dan langsung mengaktifkan video feed (tanpa standby lagi)!
   */
  const handleActivateCamera = async (targetSource: number | string) => {
    setIsActivating(true);
    try {
      // 1. Jika mode lokal dan stream belum online, panggil API penyala otomatis
      if (isLocalServer && !streamOnline) {
        try {
          await fetch("/api/camera/engine", { method: "POST" });
        } catch {
          // Abaikan error jika sudah jalan
        }
      }

      // 2. Alihkan sumber kamera ke target
      await switchCameraSource(targetSource);

      // 3. Pastikan status stream langsung ONLINE agar video langsung tampil
      if (setStreamOnline) {
        setStreamOnline(true);
      }

      // 4. Trigger cek status
      if (checkStreamStatus) {
        setTimeout(() => checkStreamStatus(), 400);
      }
    } finally {
      setIsActivating(false);
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
              Pilih kamera yang ingin dinyalakan untuk analisis siswa
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
          {/* Status Sistem Saat Ini (Jelas & Terbuka) */}
          <div className="rounded-xl border border-border bg-muted/40 p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  streamOnline && isCameraHardwareConnected
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <span className="font-medium text-foreground">
                {streamOnline
                  ? "Status: Video Menyala"
                  : "Status: Kamera Belum Nyala (Pilih di bawah untuk mulai)"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {isLocalServer ? "Mode Laptop" : "Mode Cloud"}
            </span>
          </div>

          {/* Feedback jika baru beralih kamera */}
          {cameraSwitchNotice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium flex-1">{cameraSwitchNotice}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* OPSI 1: KAMERA LAPTOP (UNTUK DEMO LANGSUNG)             */}
          {/* ======================================================== */}
          <div
            className={`rounded-xl border p-4 transition-all space-y-3 ${
              isLaptopActive && streamOnline
                ? "border-emerald-500/50 bg-emerald-500/5 shadow-xs"
                : "border-border bg-card hover:border-orange-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isLaptopActive && streamOnline
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                }`}
              >
                <Laptop className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    Kamera Depan Laptop
                  </h4>
                  {isLaptopActive && streamOnline && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Aktif &amp; Menyala
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Menggunakan kamera bawaan laptop ini. Langsung aktif tanpa perlu koneksi internet atau HP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleActivateCamera(0)}
              disabled={isActivating || isSwitchingCamera}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
                isLaptopActive && streamOnline
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white shadow-xs"
              }`}
            >
              {isActivating || isSwitchingCamera ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyalakan Kamera Laptop...</span>
                </>
              ) : isLaptopActive && streamOnline ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>✓ Kamera Laptop Sedang Aktif (Klik untuk Segarkan)</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Nyalakan &amp; Gunakan Kamera Laptop</span>
                </>
              )}
            </button>

            {/* Jika ada webcam USB eksternal yang dicolok */}
            {availableWebcams.filter((cam) => cam.index !== 0).length > 0 && (
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Kamera USB Eksternal:</span>
                <div className="flex gap-1.5">
                  {availableWebcams
                    .filter((cam) => cam.index !== 0)
                    .map((cam) => (
                      <button
                        key={cam.index}
                        type="button"
                        onClick={() => handleActivateCamera(cam.index)}
                        className="px-2 py-1 rounded text-[11px] font-medium border border-border bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                      >
                        {cam.name || `Kamera #${cam.index}`}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* OPSI 2: KAMERA SMARTPHONE (HP)                          */}
          {/* ======================================================== */}
          <div
            className={`rounded-xl border p-4 transition-all space-y-3 ${
              isHpActive && streamOnline
                ? "border-emerald-500/50 bg-emerald-500/5 shadow-xs"
                : "border-border bg-card hover:border-orange-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isHpActive && streamOnline
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    Kamera Smartphone (HP)
                  </h4>
                  {isHpActive && streamOnline && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Aktif &amp; Menyala
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Gunakan kamera smartphone tanpa kabel sebagai pemantau kelas.
                </p>
              </div>
            </div>

            {/* Kotak Panduan Ringkas (Scan QR atau Salin Link) */}
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
                  1. Buka tautan ini di browser HP Anda:
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
                <p className="text-[10px] text-muted-foreground leading-tight">
                  2. Di HP, tekan tombol &quot;Mulai Kamera&quot;, lalu klik tombol di bawah:
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleActivateCamera("web")}
              disabled={isActivating || isSwitchingCamera}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
                isHpActive && streamOnline
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white shadow-xs"
              }`}
            >
              {isActivating || isSwitchingCamera ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyambungkan ke Kamera HP...</span>
                </>
              ) : isHpActive && streamOnline ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>✓ Kamera HP Sedang Aktif (Klik untuk Segarkan)</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Sambungkan &amp; Nyalakan Kamera HP</span>
                </>
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* PENGATURAN SERVER (TERLIPAT RAPI, HANYA JIKA DIBUTUHKAN)  */}
          {/* ======================================================== */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowServerSettings(!showServerSettings)}
              className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Server className="h-3.5 w-3.5" />
                <span>Pengaturan Server AI (Opsional)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                  {isLocalServer ? "Lokal (localhost)" : "Cloud Deplexo"}
                </span>
                {showServerSettings ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </div>
            </button>

            {showServerSettings && (
              <div className="p-3 pt-0 border-t border-border space-y-2 mt-1 text-xs">
                <p className="text-[11px] text-muted-foreground pt-2">
                  Secara default sistem otomatis memilih server yang sesuai. Ganti hanya jika Anda ingin beralih antara server lokal dan online:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => updateEdgeServerUrl("http://localhost:5000")}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      isLocalServer
                        ? "border-emerald-500 bg-emerald-500/10 font-semibold"
                        : "border-border bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <Server className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                      <span>Laptop Ini</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-mono">localhost:5000</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateEdgeServerUrl("https://smart-learning.de.deplexo.com")}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      !isLocalServer
                        ? "border-emerald-500 bg-emerald-500/10 font-semibold"
                        : "border-border bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <Cloud className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                      <span>Cloud Online</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-mono">deplexo.com</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-border flex gap-1.5">
                  <input
                    type="text"
                    value={customEdgeInput}
                    onChange={(e) => setCustomEdgeInput(e.target.value)}
                    placeholder="URL Server Manual (contoh: http://localhost:5000)"
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
              </div>
            )}
          </div>
        </div>

        {/* Footer Ringkas */}
        <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="text-[11px] font-medium flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                streamOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {streamOnline ? "Kamera Siap & Aktif" : "Klik tombol di atas untuk menyalakan"}
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

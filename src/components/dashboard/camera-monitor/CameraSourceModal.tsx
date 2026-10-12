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
  HelpCircle,
  AlertTriangle,
  Info,
  Terminal,
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
  const [showGuide, setShowGuide] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isLocalEngineActive, setIsLocalEngineActive] = useState<boolean | null>(null);

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

      // Periksa apakah engine lokal di port 5000 sedang aktif
      const checkLocal = async () => {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 1200);
          const res = await fetch("http://localhost:5000/status", {
            signal: controller.signal,
            mode: "cors",
          });
          clearTimeout(t);
          setIsLocalEngineActive(res.ok);
        } catch {
          setIsLocalEngineActive(false);
        }
      };
      checkLocal();
    }
  }, [showCameraModal]);

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
   * Menyalakan kamera dan mengaktifkan feed ke layar
   */
  const handleActivateCamera = async (targetSource: number | string) => {
    setIsActivating(true);
    try {
      if (isLocalServer && !streamOnline) {
        try {
          await fetch("/api/camera/engine", { method: "POST" });
        } catch {}
      }

      await switchCameraSource(targetSource);

      if (setStreamOnline) {
        setStreamOnline(true);
      }

      if (checkStreamStatus) {
        setTimeout(() => checkStreamStatus(), 400);
      }
    } finally {
      setIsActivating(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl my-auto max-h-[calc(100dvh-3rem)] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-border pb-3 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
              <span>Pilih &amp; Nyalakan Kamera</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih kamera yang ingin digunakan untuk deteksi siswa di kelas
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
          {/* Banner Status Koneksi Saat Ini */}
          <div className="rounded-xl border border-border bg-muted/30 p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  streamOnline && isCameraHardwareConnected
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <span className="font-medium text-foreground">
                {streamOnline && isCameraHardwareConnected
                  ? "Status Kamera: Sedang Menayangkan Video"
                  : "Status Kamera: Belum Menyala (Ikuti panduan di bawah)"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-[11px] font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <HelpCircle className="h-3 w-3" />
              <span>{showGuide ? "Tutup Panduan" : "Panduan Singkat"}</span>
            </button>
          </div>

          {/* Kotak Panduan Umum (Jika tombol bantuan diklik) */}
          {showGuide && (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs space-y-2 animate-in fade-in">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                <span>Kapan Menggunakan Masing-masing Kamera?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                <li>
                  <strong className="text-foreground">Kamera Laptop:</strong> Terbaik untuk <strong>demo langsung di laptop</strong>. Bebas internet dan tanpa delay (0 ms), tapi membutuhkan aplikasi server AI berjalan di laptop ini.
                </li>
                <li>
                  <strong className="text-foreground">Kamera Smartphone (HP):</strong> Terbaik untuk <strong>memantau kelas dari sudut ruangan</strong> atau saat membuka web dari link Vercel online. Cukup scan QR dengan HP siswa/guru.
                </li>
              </ul>
            </div>
          )}

          {/* Feedback jika baru beralih kamera */}
          {cameraSwitchNotice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium flex-1">{cameraSwitchNotice}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* OPSI 1: KAMERA LAPTOP (DEMO LANGSUNG)                   */}
          {/* ======================================================== */}
          <div
            className={`rounded-xl border p-4 transition-all space-y-3 ${
              isLaptopActive && streamOnline
                ? "border-emerald-500/50 bg-emerald-500/5 shadow-xs"
                : "border-border bg-card"
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
                    1. Kamera Depan Laptop
                  </h4>
                  {isLaptopActive && streamOnline ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Aktif &amp; Menyala
                    </span>
                  ) : isLocalEngineActive ? (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Mesin Laptop Siap
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Perlu Mesin Lokal
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Gunakan kamera depan laptop ini untuk demonstrasi langsung dengan respon instan.
                </p>
              </div>
            </div>

            {/* Kotak Petunjuk Cara Menyalakan Kamera Laptop */}
            <div className="rounded-lg bg-muted/40 p-2.5 border border-border text-xs space-y-1.5">
              <span className="font-semibold text-foreground text-[11px] block">
                📋 Cara Menyalakan Kamera Laptop:
              </span>
              <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1 leading-normal">
                <li>
                  Buka folder proyek ini di laptop Anda, lalu klik dua kali file:
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] bg-background border border-border rounded px-2 py-1 text-foreground select-all">
                    <Terminal className="h-3 w-3 text-orange-600" />
                    <strong>START_AI_KAMERA.bat</strong>
                  </div>
                </li>
                <li>
                  Buka dashboard di alamat: <code className="font-mono text-orange-600 font-semibold select-all">http://localhost:3000</code>
                </li>
                <li>
                  Tekan tombol di bawah untuk menghubungkan kamera laptop:
                </li>
              </ol>
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
                  <span>Menghubungkan ke Kamera Laptop...</span>
                </>
              ) : isLaptopActive && streamOnline ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>✓ Kamera Laptop Sedang Digunakan (Klik untuk Refresh)</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Hubungkan &amp; Gunakan Kamera Laptop</span>
                </>
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* OPSI 2: KAMERA SMARTPHONE (HP NIRKABEL)                  */}
          {/* ======================================================== */}
          <div
            className={`rounded-xl border p-4 transition-all space-y-3 ${
              isHpActive && streamOnline
                ? "border-emerald-500/50 bg-emerald-500/5 shadow-xs"
                : "border-border bg-card"
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
                    2. Kamera Smartphone (HP)
                  </h4>
                  {isHpActive && streamOnline && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Aktif &amp; Menyala
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Bagus untuk memantau kelas dari sudut ruangan (bisa diakses via internet / Vercel).
                </p>
              </div>
            </div>

            {/* Kotak Panduan 1-2-3 Kamera HP */}
            <div className="rounded-lg bg-muted/40 p-2.5 border border-border text-xs space-y-2">
              <span className="font-semibold text-foreground text-[11px] block">
                📋 Cara Menyalakan Kamera HP:
              </span>

              <div className="flex items-start gap-3">
                {qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan QR Kamera HP"
                    className="h-18 w-18 rounded-lg bg-white p-1 border border-border shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="h-18 w-18 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Smartphone className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    <strong className="text-foreground">Langkah 1:</strong> Buka tautan ini di browser Google Chrome HP Anda (atau scan QR di samping):
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground hover:bg-muted font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Tersalin!</span>
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
                      <span>Buka di Tab Baru</span>
                    </a>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-tight pt-1">
                    <strong className="text-foreground">Langkah 2:</strong> Di layar HP, ketuk tombol hijau <strong>&quot;Mulai Kamera&quot;</strong> dan izinkan akses kamera.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    <strong className="text-foreground">Langkah 3:</strong> Tekan tombol di bawah untuk menampilkan siaran HP di monitor ini.
                  </p>
                </div>
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
                  <span>✓ Kamera HP Sedang Digunakan (Klik untuk Refresh)</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Sambungkan &amp; Tampilkan Kamera HP</span>
                </>
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* PENGATURAN SERVER AI (OPSIONAL / TERLIPAT RAPI)           */}
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
                  {isLocalServer ? "Mode Laptop (localhost:5000)" : "Mode Cloud (Deplexo)"}
                </span>
                {showServerSettings ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </div>
            </button>

            {showServerSettings && (
              <div className="p-3 pt-0 border-t border-border space-y-2.5 mt-1 text-xs">
                <p className="text-[11px] text-muted-foreground pt-2 leading-relaxed">
                  Pilih lokasi server AI yang sedang aktif. Gunakan <strong>Laptop Ini</strong> jika menjalankan mesin lokal, atau <strong>Cloud Online</strong> jika mengakses dari luar:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateEdgeServerUrl("http://localhost:5000")}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isLocalServer
                        ? "border-emerald-500 bg-emerald-500/10 font-semibold"
                        : "border-border bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Server className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      <span>Laptop Ini</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                      http://localhost:5000
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateEdgeServerUrl("https://smart-learning.de.deplexo.com")}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      !isLocalServer
                        ? "border-emerald-500 bg-emerald-500/10 font-semibold"
                        : "border-border bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Cloud className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      <span>Cloud Online</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                      smart-learning.de.deplexo.com
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="text-[11px] font-medium flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                streamOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {streamOnline ? "Kamera Siap & Aktif" : "Ikuti langkah di atas untuk mulai"}
          </span>
          <button
            type="button"
            onClick={() => setShowCameraModal(false)}
            className="rounded-xl bg-muted hover:bg-muted/80 text-foreground px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : modalContent;
}

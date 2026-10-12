"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  Camera,
  X,
  Laptop,
  Smartphone,
  Server,
  RefreshCw,
  Search,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Wifi,
  Sparkles,
  Radio,
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
  cameraModalTab,
  setCameraModalTab,
  isScanningCameras,
  fetchAvailableCameras,
  availableWebcams,
  currentCameraSource,
  isSwitchingCamera,
  switchCameraSource,
  cameraSwitchNotice,
  isCameraHardwareConnected,
  isScanningNetwork,
  scanNetworkCameras,
  networkScanSubnet,
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
  const [showManualIp, setShowManualIp] = useState(false);
  const [showManualServer, setShowManualServer] = useState(false);

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

  // Nama ramah manusia untuk sumber kamera saat ini
  const getFriendlySourceTitle = () => {
    const raw = String(currentCameraSource).toLowerCase().trim();
    if (raw === "0") return "Kamera Laptop (Bawaan)";
    if (raw === "web") return "Kamera HP (Browser Web)";
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return "Kamera HP (Wi-Fi)";
    }
    return `Kamera USB #${currentCameraSource}`;
  };

  const isLaptopActive = String(currentCameraSource).trim() === "0";
  const isWebHpActive = String(currentCameraSource).toLowerCase().trim() === "web";

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/kamera-hp`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  // Kategori Tab Utama: 'laptop' | 'hp' | 'server'
  const isHpCategory = cameraModalTab === "web_hp" || cameraModalTab === "ip";

  const modalContent = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xl my-auto max-h-[calc(100dvh-3rem)] flex flex-col">
        {/* Header Bersih & Ramah Pengguna */}
        <div className="flex items-start justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Pilih Sumber Kamera
              </h3>
              <p className="text-xs text-muted-foreground">
                Gunakan kamera laptop atau sambungkan smartphone Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCameraModal(false)}
            aria-label="Tutup jendela"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-3.5 min-h-0 py-3">
          {/* Status Kamera Aktif Saat Ini */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  isCameraHardwareConnected ? "bg-emerald-500 animate-pulse" : "bg-destructive"
                }`}
              />
              <span className="text-muted-foreground shrink-0">Kamera Saat Ini:</span>
              <span className="font-semibold text-foreground truncate">
                {getFriendlySourceTitle()}
              </span>
            </div>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                isCameraHardwareConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {isCameraHardwareConnected ? "Aktif" : "Menghubungkan..."}
            </span>
          </div>

          {/* Notifikasi feedback jika baru beralih kamera */}
          {cameraSwitchNotice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium flex-1">{cameraSwitchNotice}</span>
            </div>
          )}

          {/* 3 Tab Pilihan Utama yang Sederhana & Tidak Membingungkan */}
          <div className="grid grid-cols-3 rounded-xl bg-muted/60 p-1 border border-border text-xs font-medium gap-1">
            <button
              type="button"
              onClick={() => setCameraModalTab("webcam")}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-all cursor-pointer text-center ${
                cameraModalTab === "webcam"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Laptop className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="truncate">Kamera Laptop</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraModalTab(cameraModalTab === "ip" ? "ip" : "web_hp")}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-all cursor-pointer text-center ${
                isHpCategory
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="truncate">Kamera HP</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraModalTab("cloud")}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-all cursor-pointer text-center ${
                cameraModalTab === "cloud"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Server className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="truncate">Server AI</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: KAMERA LAPTOP / USB (Pilihan Utama untuk Demo)   */}
          {/* ======================================================== */}
          {cameraModalTab === "webcam" && (
            <div className="space-y-3">
              {/* Kartu Rekomendasi Utama: 1-Klik Langsung Pakai Kamera Laptop */}
              <div
                className={`rounded-xl border p-3.5 transition-all space-y-3 ${
                  isLaptopActive
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-xs">
                        Kamera Depan Laptop (Bawaan)
                      </span>
                      <span className="text-[10px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                        Paling Cepat (0 Lag)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Sangat direkomendasikan untuk demo langsung di depan kelas. Tidak butuh koneksi internet atau Wi-Fi HP.
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
                      : "bg-orange-600 hover:bg-orange-700 text-white active:scale-[0.98] shadow-xs"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isLaptopActive
                      ? "✓ Sedang Digunakan Sekarang"
                      : isSwitchingCamera
                      ? "Menghubungkan ke Kamera Laptop..."
                      : "Gunakan Kamera Laptop Ini"}
                  </span>
                </button>
              </div>

              {/* Daftar Kamera Eksternal / USB jika ada */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Kamera USB Tambahan:</span>
                  <button
                    type="button"
                    onClick={fetchAvailableCameras}
                    disabled={isScanningCameras}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isScanningCameras ? "animate-spin" : ""}`} />
                    <span>Periksa Port USB</span>
                  </button>
                </div>

                {availableWebcams.filter((cam) => cam.index !== 0).length > 0 ? (
                  <div className="space-y-1.5">
                    {availableWebcams
                      .filter((cam) => cam.index !== 0)
                      .map((cam) => {
                        const isThisActive = String(currentCameraSource) === String(cam.index);
                        return (
                          <div
                            key={cam.index}
                            className="rounded-lg border border-border bg-background p-2.5 flex items-center justify-between"
                          >
                            <span className="text-xs font-medium text-foreground truncate">
                              {cam.name || `Kamera Eksternal #${cam.index}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => switchCameraSource(cam.index)}
                              disabled={isThisActive || isSwitchingCamera}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                isThisActive
                                  ? "bg-emerald-600 text-white"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                            >
                              {isThisActive ? "Aktif" : "Pilih"}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Tidak ada webcam USB tambahan yang tercolok. Kamera laptop bawaan sudah siap digunakan di atas.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: KAMERA HP (NIRKABEL)                             */}
          {/* ======================================================== */}
          {isHpCategory && (
            <div className="space-y-3">
              {/* Sub-Pilihan Cara Menghubungkan HP */}
              <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setCameraModalTab("web_hp")}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cameraModalTab === "web_hp"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  <span>Lewat Browser Web HP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCameraModalTab("ip");
                    if (!hasScannedNetwork && !isScanningNetwork) {
                      scanNetworkCameras();
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    cameraModalTab === "ip"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Wifi className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  <span>Lewat Aplikasi Wi-Fi</span>
                </button>
              </div>

              {/* Sub-Opsi A: Buka Link di HP (Paling Praktis, Tanpa Pasang Aplikasi) */}
              {cameraModalTab === "web_hp" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3.5 space-y-3">
                    <div className="flex items-start gap-3">
                      {qrCodeDataUrl ? (
                        <div className="rounded-lg bg-white p-1 border border-border shadow-xs shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrCodeDataUrl}
                            alt="Scan QR Kamera HP"
                            className="h-20 w-20 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <Radio className="h-8 w-8 text-orange-600" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <span className="font-semibold text-foreground text-xs block">
                          Scan QR atau Buka Link di HP:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            {copiedLink ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-semibold">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Salin Link</span>
                              </>
                            )}
                          </button>

                          <a
                            href="/kamera-hp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Buka di Tab</span>
                          </a>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          Arahkan kamera HP ke kode QR di samping untuk langsung membuka pemancar video.
                        </p>
                      </div>
                    </div>

                    {/* Langkah Singkat */}
                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-orange-500/10">
                      <div className="rounded-lg bg-card/60 p-1.5">
                        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 block">1. Buka di HP</span>
                        <span className="text-[10px] text-muted-foreground block">Scan kode QR</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-1.5">
                        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 block">2. Tekan Mulai</span>
                        <span className="text-[10px] text-muted-foreground block">Izinkan kamera</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-1.5">
                        <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 block">3. Hubungkan</span>
                        <span className="text-[10px] text-muted-foreground block">Klik tombol bawah</span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Nyalakan Siaran HP */}
                  <button
                    type="button"
                    onClick={() => switchCameraSource("web")}
                    disabled={isWebHpActive || isSwitchingCamera}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all cursor-pointer min-h-[40px] ${
                      isWebHpActive
                        ? "bg-emerald-600 text-white cursor-default"
                        : "bg-orange-600 hover:bg-orange-700 text-white active:scale-[0.98] shadow-xs"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {isWebHpActive
                        ? "✓ Kamera HP Sedang Aktif"
                        : isSwitchingCamera
                        ? "Menghubungkan ke HP..."
                        : "Sambungkan Kamera HP Ini"}
                    </span>
                  </button>
                </div>
              )}

              {/* Sub-Opsi B: Aplikasi Wi-Fi IP Webcam */}
              {cameraModalTab === "ip" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Gunakan jika Anda memakai aplikasi <strong>IP Webcam</strong> di HP Android yang tersambung ke Wi-Fi yang sama dengan laptop.
                    </p>

                    <button
                      type="button"
                      onClick={scanNetworkCameras}
                      disabled={isScanningNetwork}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white py-2.5 px-4 text-xs font-semibold transition-all shadow-xs disabled:opacity-60 cursor-pointer min-h-[38px]"
                    >
                      {isScanningNetwork ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Mencari HP di Wi-Fi...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-3.5 w-3.5" />
                          <span>Cari Kamera HP di Wi-Fi Otomatis</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Hasil Pindai Kamera Wi-Fi */}
                  {hasScannedNetwork && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Hasil Pencarian:</span>
                        <span className="font-semibold text-foreground">
                          {detectedNetworkCameras.length} Ditemukan
                        </span>
                      </div>

                      {detectedNetworkCameras.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {detectedNetworkCameras.map((cam, idx) => {
                            const isCurrentActive = String(currentCameraSource) === cam.url;
                            return (
                              <div
                                key={`${cam.ip}-${cam.port}-${idx}`}
                                className={`rounded-xl border p-2.5 flex items-center justify-between transition-all ${
                                  isCurrentActive
                                    ? "border-emerald-500/30 bg-emerald-500/5"
                                    : "border-border bg-card"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">
                                    {cam.name || `Kamera Wi-Fi (${cam.ip})`}
                                  </p>
                                  {cam.battery !== undefined && cam.battery !== null && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      Baterai: {cam.battery}%
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomIpUrl(cam.url);
                                    switchCameraSource(cam.url);
                                  }}
                                  disabled={isCurrentActive || isSwitchingCamera}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                    isCurrentActive
                                      ? "bg-emerald-600 text-white cursor-default"
                                      : "bg-orange-600 text-white hover:bg-orange-700 cursor-pointer shadow-xs"
                                  }`}
                                >
                                  {isCurrentActive ? "✓ Aktif" : "Hubungkan"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
                          Belum ada kamera HP terdeteksi di Wi-Fi. Pastikan tombol &apos;Start Server&apos; di aplikasi HP sudah aktif.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion Alamat IP Manual (Disembunyikan agar tidak membingungkan) */}
                  <div className="border border-border rounded-xl p-2.5 bg-card">
                    <button
                      type="button"
                      onClick={() => setShowManualIp(!showManualIp)}
                      className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <span>Ketik Alamat IP Manual (Opsional)</span>
                      {showManualIp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showManualIp && (
                      <div className="pt-2.5 mt-2 border-t border-border space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customIpUrl}
                            onChange={(e) => setCustomIpUrl(e.target.value)}
                            placeholder="Contoh: https://192.168.1.15:8080/video"
                            className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              let url = customIpUrl.trim();
                              if (!url) return;
                              if (!url.startsWith("http://") && !url.startsWith("https://")) {
                                url = `https://${url}`;
                              }
                              if (!url.includes("/video") && !url.includes("/video_feed")) {
                                url = `${url.replace(/\/+$/, "")}/video`;
                              }
                              setCustomIpUrl(url);
                              switchCameraSource(url);
                            }}
                            disabled={isSwitchingCamera || !customIpUrl.trim()}
                            className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer"
                          >
                            Sambungkan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SERVER ENGINE AI (Lokal vs Cloud)                 */}
          {/* ======================================================== */}
          {cameraModalTab === "cloud" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pilih lokasi komputer yang memproses deteksi AI. Untuk presentasi atau demo di sekolah, pilih <strong>Komputer Ini</strong>.
              </p>

              {/* 2 Pilihan Server yang Jelas */}
              <div className="space-y-2">
                {/* Opsi 1: Server Lokal */}
                <div
                  className={`rounded-xl border p-3 flex items-center justify-between transition-all ${
                    edgeServerUrl.includes("localhost") || edgeServerUrl.includes("127.0.0.1")
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        Komputer Ini (Lokal)
                      </span>
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        Rekomendasi Demo
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Respon cepat tanpa internet (http://localhost:5000)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateEdgeServerUrl("http://localhost:5000")}
                    disabled={edgeServerUrl.includes("localhost")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 ${
                      edgeServerUrl.includes("localhost")
                        ? "bg-emerald-600 text-white cursor-default"
                        : "bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                    }`}
                  >
                    {edgeServerUrl.includes("localhost") ? "✓ Aktif" : "Gunakan"}
                  </button>
                </div>

                {/* Opsi 2: Server Cloud Deplexo */}
                <div
                  className={`rounded-xl border p-3 flex items-center justify-between transition-all ${
                    edgeServerUrl.includes("deplexo")
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-foreground block">
                      Server Cloud Online (Deplexo)
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Untuk pengujian jarak jauh via internet
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateEdgeServerUrl("https://smart-learning.de.deplexo.com")}
                    disabled={edgeServerUrl.includes("deplexo")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 ${
                      edgeServerUrl.includes("deplexo")
                        ? "bg-emerald-600 text-white cursor-default"
                        : "bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                    }`}
                  >
                    {edgeServerUrl.includes("deplexo") ? "✓ Aktif" : "Gunakan"}
                  </button>
                </div>
              </div>

              {/* Accordion Alamat Kustom Manual (Untuk Teknisi) */}
              <div className="border border-border rounded-xl p-2.5 bg-card">
                <button
                  type="button"
                  onClick={() => setShowManualServer(!showManualServer)}
                  className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <span>Atur Alamat Server Manual (Khusus Teknisi)</span>
                  {showManualServer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showManualServer && (
                  <div className="pt-2.5 mt-2 border-t border-border space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customEdgeInput}
                        onChange={(e) => setCustomEdgeInput(e.target.value)}
                        placeholder="http://localhost:5000"
                        className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateEdgeServerUrl(customEdgeInput)}
                        className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Ringkas */}
        <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isCameraHardwareConnected ? "bg-emerald-500" : "bg-destructive"
              }`}
            />
            {isCameraHardwareConnected ? "Siap Digunakan" : "Menunggu Sambungan"}
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

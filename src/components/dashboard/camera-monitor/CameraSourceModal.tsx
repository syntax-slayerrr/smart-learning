"use client";

import React from "react";
import {
  Camera,
  X,
  Usb,
  Smartphone,
  Globe,
  RefreshCw,
  Search,
  Zap,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from "lucide-react";

interface CameraSourceModalProps {
  showCameraModal: boolean;
  setShowCameraModal: (show: boolean) => void;
  cameraModalTab: "webcam" | "ip" | "cloud";
  setCameraModalTab: (tab: "webcam" | "ip" | "cloud") => void;
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
  if (!showCameraModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Pengaturan Sumber Kamera & Webcam
              </h3>
              <p className="text-xs text-muted-foreground">
                Alihkan sumber video langsung dari UI tanpa restart engine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCameraModal(false)}
            aria-label="Tutup modal"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4 min-h-0 py-2">
          {/* Notification / Feedback Banner */}
          {cameraSwitchNotice && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 flex items-center gap-2 text-xs text-primary animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium flex-1">{cameraSwitchNotice}</span>
            </div>
          )}

        {/* Current Active Source Pill */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isCameraHardwareConnected ? "bg-emerald-500 animate-pulse" : "bg-destructive"
              }`}
            />
            <span className="font-medium text-muted-foreground">Sumber Aktif:</span>
            <span className="font-mono font-semibold text-foreground bg-background px-2 py-0.5 rounded border border-border">
              {typeof currentCameraSource === "number" ? `Webcam #${currentCameraSource}` : currentCameraSource}
            </span>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              isCameraHardwareConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {isCameraHardwareConnected ? "Terhubung" : "Menghubungkan..."}
          </span>
        </div>

        {/* Tab Navigation (Segmented Pill) */}
        <div className="flex rounded-xl bg-muted/60 p-1 border border-border text-xs font-medium gap-1">
          <button
            type="button"
            onClick={() => {
              setCameraModalTab("ip");
              if (!hasScannedNetwork && !isScanningNetwork) {
                scanNetworkCameras();
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              cameraModalTab === "ip"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            <span>Kamera HP (Wi-Fi)</span>
          </button>
          <button
            type="button"
            onClick={() => setCameraModalTab("webcam")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              cameraModalTab === "webcam"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Usb className="h-3.5 w-3.5 text-primary" />
            <span>Webcam Laptop</span>
          </button>
          <button
            type="button"
            onClick={() => setCameraModalTab("cloud")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              cameraModalTab === "cloud"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>Server Edge</span>
          </button>
        </div>

        {/* Tab Content: IP Webcam (Phone / Wireless) */}
        {cameraModalTab === "ip" && (
          <div className="space-y-3">
            {/* Clean Visual Guide */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Wifi className="h-3.5 w-3.5 text-primary" />
                <span>Panduan Menghubungkan Kamera HP (IP Webcam):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-card p-2 border border-border shadow-2xs">
                  <span className="font-semibold text-primary block text-[11px] mb-0.5">1. Buka Aplikasi</span>
                  <span className="text-muted-foreground text-[11px] leading-tight block">Buka aplikasi <strong>IP Webcam</strong> di HP Android.</span>
                </div>
                <div className="rounded-lg bg-card p-2 border border-border shadow-2xs">
                  <span className="font-semibold text-primary block text-[11px] mb-0.5">2. Jalankan Server</span>
                  <span className="text-muted-foreground text-[11px] leading-tight block">Ketuk tombol <strong>Start Server</strong> di bagian bawah.</span>
                </div>
                <div className="rounded-lg bg-card p-2 border border-border shadow-2xs">
                  <span className="font-semibold text-primary block text-[11px] mb-0.5">3. Sambungkan</span>
                  <span className="text-muted-foreground text-[11px] leading-tight block">Pindai otomatis atau masukkan IP HP di bawah.</span>
                </div>
              </div>
            </div>

            {/* Network Scanner Button */}
            <button
              type="button"
              onClick={scanNetworkCameras}
              disabled={isScanningNetwork}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground py-2.5 px-4 text-xs font-semibold transition-all shadow-xs disabled:opacity-60 cursor-pointer min-h-[40px]"
            >
              {isScanningNetwork ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Mencari Kamera di Wi-Fi...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Pindai Kamera di Jaringan Wi-Fi Otomatis</span>
                </>
              )}
            </button>

            {/* Scan Results */}
            {hasScannedNetwork && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Subnet: <code className="font-mono text-foreground">{networkScanSubnet}</code></span>
                  <span className="font-semibold text-foreground">{detectedNetworkCameras.length} Ditemukan</span>
                </div>

                {detectedNetworkCameras.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {detectedNetworkCameras.map((cam, idx) => {
                      const isCurrentActive = String(currentCameraSource) === cam.url;
                      return (
                        <div
                          key={`${cam.ip}-${cam.port}-${idx}`}
                          className={`rounded-xl border p-2.5 flex items-center justify-between transition-all ${
                            isCurrentActive
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-border bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Smartphone className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                <span>{cam.name}</span>
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-xs font-mono text-muted-foreground truncate">
                                  {cam.url}
                                </span>
                                {cam.battery !== undefined && cam.battery !== null && (
                                  <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-mono">
                                    🔋 {cam.battery}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCustomIpUrl(cam.url);
                              switchCameraSource(cam.url);
                            }}
                            disabled={isCurrentActive || isSwitchingCamera}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.98] shrink-0 ${
                              isCurrentActive
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
                            }`}
                          >
                            <Zap className="h-3 w-3" />
                            <span>{isCurrentActive ? "✓ Aktif" : isSwitchingCamera ? "Menyambung..." : "Hubungkan"}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Belum Ada Kamera Ditemukan di Subnet {networkScanSubnet}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Pastikan server IP Webcam aktif dan terhubung ke Wi-Fi yang sama, lalu coba lagi atau masukkan URL manual.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Input Fallback */}
            <div className="border-t border-border pt-2.5">
              <label htmlFor="custom-ip-stream-url" className="block text-xs font-medium text-muted-foreground mb-1">
                Atau Masukkan URL Stream Manual:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customIpUrl}
                  onChange={(e) => setCustomIpUrl(e.target.value)}
                  id="custom-ip-stream-url"
                  aria-label="URL Stream Manual"
                  placeholder="http://192.168.1.15:8080/video"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    let url = customIpUrl.trim();
                    if (!url) return;
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                      url = `http://${url}`;
                    }
                    if (!url.includes("/video") && !url.includes("/video_feed")) {
                      url = `${url.replace(/\/+$/, "")}/video`;
                    }
                    setCustomIpUrl(url);
                    switchCameraSource(url);
                  }}
                  disabled={isSwitchingCamera || !customIpUrl.trim()}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-xs font-medium transition-all active:scale-[0.98] shrink-0 disabled:opacity-50 cursor-pointer min-h-[38px]"
                >
                  {isSwitchingCamera ? "Menyambung..." : "Sambungkan"}
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Preset Contoh:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomIpUrl("http://192.168.1.15:8080/video")}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  IP Webcam (:8080)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomIpUrl("http://192.168.1.15:4747/video")}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  DroidCam (:4747)
                </button>
                <button
                  type="button"
                  onClick={() => switchCameraSource(0)}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Webcam Laptop (0)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Local Webcams */}
        {cameraModalTab === "webcam" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Perangkat Terdeteksi:</span>
              <button
                type="button"
                onClick={fetchAvailableCameras}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Pindai Port USB</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {availableWebcams.length > 0 ? (
                availableWebcams.map((cam) => {
                  const isActive = String(currentCameraSource) === String(cam.index);
                  return (
                    <div
                      key={cam.index}
                      className={`rounded-xl border p-3 flex items-center justify-between transition-all ${
                        isActive
                          ? "border-primary/40 bg-primary/5 shadow-2xs"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Usb className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {cam.name}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            Indeks #{cam.index} {cam.device_path ? `(${cam.device_path})` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => switchCameraSource(cam.index)}
                        disabled={isActive || isSwitchingCamera}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.98] shrink-0 ${
                          isActive
                            ? "bg-emerald-600 text-white cursor-default"
                            : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                        }`}
                      >
                        {isActive ? "✓ Aktif" : isSwitchingCamera ? "Menghubungkan..." : "Pilih"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
                  <p>Tidak ada device tambahan terdeteksi.</p>
                  <button
                    type="button"
                    onClick={() => switchCameraSource(0)}
                    className="mt-2 text-primary font-medium hover:underline cursor-pointer"
                  >
                    Gunakan Webcam Default (Device 0)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3 Content: Edge Server Setup */}
        {cameraModalTab === "cloud" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
                <Globe className="h-4 w-4" />
                <span>Akses Kamera dari Vercel (HTTPS)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Saat membuka dashboard dari Vercel HTTPS, browser memblokir HTTP localhost (Mixed Content). Gunakan HTTPS tunnel jika mengakses jarak jauh.
              </p>
            </div>

            <div>
              <label htmlFor="custom-edge-server-url" className="block text-xs font-medium text-muted-foreground mb-1">
                Alamat Edge Server Kamera (Localhost / HTTPS Tunnel)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customEdgeInput}
                  onChange={(e) => setCustomEdgeInput(e.target.value)}
                  id="custom-edge-server-url"
                  aria-label="Alamat Edge Server Kamera"
                  placeholder="https://xxxx.loca.lt atau http://localhost:5000"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => updateEdgeServerUrl(customEdgeInput)}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-xs font-medium transition-all active:scale-[0.98] shrink-0 cursor-pointer shadow-2xs"
                >
                  Simpan
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">💡 Buat HTTPS Tunnel Lokal (Opsional):</p>
              <div className="bg-muted text-foreground rounded-lg p-2 font-mono text-xs select-all border border-border">
                npx localtunnel --port 5000
              </div>
              <p className="text-[11px]">
                Salin link yang muncul dan tempelkan di kotak di atas.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateEdgeServerUrl("https://kid-earned-floors-blogging.trycloudflare.com")}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Gunakan URL Cloudflare Tunnel Aktif
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Jaringan Siap Terhubung
          </span>
          <button
            type="button"
            onClick={() => setShowCameraModal(false)}
            className="rounded-xl bg-muted hover:bg-muted/80 text-foreground px-4 py-2 text-xs font-medium transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

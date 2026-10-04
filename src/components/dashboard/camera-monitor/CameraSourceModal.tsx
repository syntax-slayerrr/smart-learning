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
    <>
{/* MODAL / DIALOG: PENGATURAN SUMBER KAMERA & WEBCAM EKSTERNAL                */}
      {/* ========================================================================= */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-background p-5 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-200/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-primary">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                    Pengaturan Sumber Kamera & Webcam
                  </h3>
                  <p className="text-xs text-stone-500">
                    Alihkan sumber video langsung dari UI tanpa restart engine Python
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCameraModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Notification / Feedback Banner */}
            {cameraSwitchNotice && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-2.5 flex items-center gap-2 text-xs text-orange-900 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium flex-1">{cameraSwitchNotice}</span>
              </div>
            )}

            {/* Current Active Source Pill */}
            <div className="rounded-xl border border-stone-200 bg-white p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCameraHardwareConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="font-semibold text-stone-700">Sumber Aktif:</span>
                <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  {typeof currentCameraSource === "number" ? `Webcam Device #${currentCameraSource}` : currentCameraSource}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isCameraHardwareConnected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {isCameraHardwareConnected ? "Kamera Terhubung" : "Menghubungkan..."}
              </span>
            </div>

            {/* Tab Navigation */}
            <div className="flex rounded-lg bg-stone-200/60 p-1 text-xs font-semibold gap-1">
              <button
                onClick={() => setCameraModalTab("webcam")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                  cameraModalTab === "webcam"
                    ? "bg-white text-stone-900 shadow-2xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Usb className="h-3.5 w-3.5 text-primary" />
                <span>Webcam USB / Laptop</span>
              </button>
              <button
                onClick={() => {
                  setCameraModalTab("ip");
                  if (!hasScannedNetwork && !isScanningNetwork) {
                    scanNetworkCameras();
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                  cameraModalTab === "ip"
                    ? "bg-white text-stone-900 shadow-2xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                <span>Kamera HP (WiFi)</span>
              </button>
              <button
                onClick={() => setCameraModalTab("cloud")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                  cameraModalTab === "cloud"
                    ? "bg-white text-stone-900 shadow-2xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span>Vercel / Cloud</span>
              </button>
            </div>

            {/* Tab 1 Content: Local Webcams */}
            {cameraModalTab === "webcam" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Perangkat Terdeteksi:</span>
                  <button
                    onClick={fetchAvailableCameras}
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-orange-600 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Pindai Ulang Port USB</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableWebcams.length > 0 ? (
                    availableWebcams.map((cam) => {
                      const isActive = String(currentCameraSource) === String(cam.index);
                      return (
                        <div
                          key={cam.index}
                          className={`rounded-xl border p-3 flex items-center justify-between transition-all ${
                            isActive
                              ? "border-orange-500/40 bg-orange-50/50 shadow-2xs"
                              : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive ? "bg-primary text-white" : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              <Usb className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-stone-900 truncate">
                                {cam.name}
                              </p>
                              <p className="text-xs font-mono text-stone-500">
                                Indeks Device: #{cam.index} {cam.device_path ? `(${cam.device_path})` : ""}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => switchCameraSource(cam.index)}
                            disabled={isActive || isSwitchingCamera}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.98] shrink-0 ${
                              isActive
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-stone-900 hover:bg-stone-800 text-white"
                            }`}
                          >
                            {isActive ? "✓ Aktif" : isSwitchingCamera ? "Menghubungkan..." : "Pilih Kamera"}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-xl border border-stone-200 bg-white text-center text-xs text-stone-500">
                      <p>Tidak ada device tambahan terdeteksi.</p>
                      <button
                        onClick={() => switchCameraSource(0)}
                        className="mt-2 text-primary font-bold hover:underline"
                      >
                        Gunakan Webcam Default (Device 0)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2 Content: IP Webcam (Phone / Wireless RTSP/HTTP) with Network Scanner */}
            {cameraModalTab === "ip" && (
              <div className="space-y-3.5">
                {/* Info Box */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 text-xs text-stone-700">
                  <div className="flex items-center gap-1.5 font-bold text-stone-900 mb-1">
                    <Wifi className="h-4 w-4 text-primary" />
                    <span>Pemindai Otomatis Kamera HP (WiFi)</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Buka aplikasi <strong>IP Webcam</strong> di HP Anda, tekan <em>Start Server</em>, lalu klik tombol pindai di bawah. Sistem akan mendeteksi HP Anda secara otomatis dan menghubungkannya dalam <strong>sekali tekan</strong>.
                  </p>
                </div>

                {/* Network Scanner Button */}
                <button
                  type="button"
                  onClick={scanNetworkCameras}
                  disabled={isScanningNetwork}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-orange-700 active:scale-[0.98] text-white py-2.5 px-4 text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isScanningNetwork ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Memindai WiFi Subnet {networkScanSubnet || "Lokal"}... (1-2 detik)</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 text-white" />
                      <span>Pindai Kamera di Jaringan WiFi Otomatis</span>
                    </>
                  )}
                </button>

                {/* Scan Results */}
                {hasScannedNetwork && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                      <span>Hasil Pindaian Subnet: <code className="font-mono text-stone-800">{networkScanSubnet}</code></span>
                      <span className="font-bold text-stone-700">{detectedNetworkCameras.length} Kamera Ditemukan</span>
                    </div>

                    {detectedNetworkCameras.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {detectedNetworkCameras.map((cam, idx) => {
                          const isCurrentActive = String(currentCameraSource) === cam.url;
                          return (
                            <div
                              key={`${cam.ip}-${cam.port}-${idx}`}
                              className={`rounded-xl border p-2.5 flex items-center justify-between transition-all ${
                                isCurrentActive
                                  ? "border-emerald-500/50 bg-emerald-50/50"
                                  : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-orange-100 text-primary flex items-center justify-center shrink-0">
                                  <Smartphone className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-stone-900 truncate flex items-center gap-1.5">
                                    <span>{cam.name}</span>
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-xs font-mono text-stone-500 truncate">
                                      {cam.url}
                                    </span>
                                    {cam.battery !== undefined && cam.battery !== null && (
                                      <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-xs font-bold font-mono">
                                        🔋 {cam.battery}%
                                      </span>
                                    )}
                                    {cam.resolution && (
                                      <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-xs font-mono">
                                        📐 {cam.resolution}
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
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.98] shrink-0 ${
                                  isCurrentActive
                                    ? "bg-emerald-600 text-white cursor-default"
                                    : "bg-stone-900 hover:bg-stone-800 text-white shadow-2xs cursor-pointer"
                                }`}
                              >
                                <Zap className="h-3.5 w-3.5 text-orange-400" />
                                <span>{isCurrentActive ? "✓ Aktif" : isSwitchingCamera ? "Menyambung..." : "Hubungkan Kamera Ini"}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 text-xs text-stone-600 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-stone-800">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Belum Ada Kamera Ditemukan di Subnet {networkScanSubnet}</span>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          1. Pastikan aplikasi <strong>IP Webcam</strong> di HP Anda sudah ditekan tombol <em>Start Server</em>.<br />
                          2. Pastikan HP dan laptop terhubung ke WiFi atau Hotspot yang sama.<br />
                          3. Klik tombol pindai di atas lagi, atau masukkan alamat IP secara manual di bawah.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Input Fallback */}
                <div className="border-t border-stone-200/80 pt-2.5">
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Atau Masukkan URL Stream Secara Manual:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customIpUrl}
                      onChange={(e) => setCustomIpUrl(e.target.value)}
                      id="custom-ip-stream-url" aria-label="URL Stream Manual" placeholder="http://192.168.1.15:8080/video"
                      className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => switchCameraSource(customIpUrl)}
                      disabled={isSwitchingCamera || !customIpUrl.trim()}
                      className="rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {isSwitchingCamera ? "Menyambung..." : "Sambungkan"}
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 mb-1">Preset Cepat / Reset:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomIpUrl("http://10.10.10.33:8080/video")}
                      className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-mono hover:bg-stone-100 text-stone-700 cursor-pointer"
                    >
                      IP Webcam (:8080/video)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomIpUrl("http://192.168.1.15:4747/video")}
                      className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-mono hover:bg-stone-100 text-stone-700 cursor-pointer"
                    >
                      DroidCam (:4747/video)
                    </button>
                    <button
                      type="button"
                      onClick={() => switchCameraSource(0)}
                      className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium hover:bg-stone-100 text-stone-700 cursor-pointer"
                    >
                      Kembali ke Webcam Laptop (0)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3 Content: Vercel / Cloud Tunnel Setup */}
            {cameraModalTab === "cloud" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Globe className="h-4 w-4 text-blue-700" />
                    <span>Akses Kamera dari Domain Vercel (HTTPS)</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Saat membuka dashboard dari <strong>https://smart-learning-black.vercel.app</strong>, browser memblokir <em>http://localhost:5000</em> (Mixed Content). Gunakan URL HTTPS tunnel gratis di bawah ini.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alamat Edge Server Kamera (Localhost / HTTPS Tunnel)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customEdgeInput}
                      onChange={(e) => setCustomEdgeInput(e.target.value)}
                      id="custom-edge-server-url" aria-label="Alamat Edge Server Kamera" placeholder="https://xxxx.loca.lt atau http://localhost:5000"
                      className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <button
                      onClick={() => updateEdgeServerUrl(customEdgeInput)}
                      className="rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] shrink-0"
                    >
                      Simpan Alamat
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-100/70 p-3 text-xs text-stone-700 space-y-1.5">
                  <p className="font-bold text-stone-900">💡 Cara Buat URL HTTPS Tunnel Gratis (1 Menit):</p>
                  <p className="text-stone-600">Jalankan perintah ini di terminal laptop tempat kamera berada:</p>
                  <div className="bg-stone-900 text-stone-100 rounded-lg p-2 font-mono text-xs select-all">
                    npx localtunnel --port 5000
                  </div>
                  <p className="text-xs text-stone-500">
                    Salin link <code>https://xxxx.loca.lt</code> yang muncul di terminal dan tempelkan di kotak di atas.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => updateEdgeServerUrl("http://localhost:5000")}
                    className="text-xs text-stone-600 hover:text-stone-900 hover:underline"
                  >
                    Reset ke default (http://localhost:5000)
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="border-t border-stone-200/80 pt-3 flex items-center justify-between text-xs text-stone-400">
              <span className="font-mono text-xs">
                Engine: EDUAI_V4 • Port 5000
              </span>
              <button
                onClick={() => setShowCameraModal(false)}
                className="rounded-lg bg-stone-200 hover:bg-stone-300/80 text-stone-800 px-3.5 py-1.5 text-xs font-semibold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * NetworkStatusIndicator — Detektor resiliensi jaringan sekolah & PWA.
 * Memberi feedback halus saat Wi-Fi kelas/sekolah flicker/terputus tanpa memblokir interaksi pengguna.
 */
export function NetworkStatusIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inisialisasi status awal
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showRestored) return null;

  return (
    <aside
      aria-live="polite"
      aria-label={isOffline ? "Peringatan koneksi terputus" : "Pemberitahuan koneksi terhubung kembali"}
      className="fixed top-3 inset-x-0 z-50 flex justify-center pointer-events-none px-4 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {isOffline ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-card/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 shadow-md ring-1 ring-black/[0.04]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Koneksi Terputus • Menggunakan cache lokal</span>
        </div>
      ) : showRestored ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-card/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-md ring-1 ring-black/[0.04]">
          <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Terhubung Kembali • Sistem tersinkronisasi</span>
        </div>
      ) : null}
    </aside>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePathname } from "next/navigation";

export function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if app is already installed
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable || isDismissed) return null;

  // Konteks spesifik per-role
  const roleContext = pathname?.startsWith("/teacher")
    ? { role: "Guru", desc: "Akses cepat presensi & input materi" }
    : pathname?.startsWith("/parent")
    ? { role: "Wali Murid", desc: "Pantau kehadiran & notifikasi anak" }
    : pathname?.startsWith("/admin")
    ? { role: "Admin", desc: "Monitoring & administrasi terpadu" }
    : { role: "Siswa", desc: "Buka materi, tugas, dan QR offline" };

  return (
    <aside
      aria-label="Instalasi Aplikasi PWA"
      className="fixed bottom-[96px] sm:bottom-6 left-3.5 right-3.5 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-slide-up"
      style={{
        marginBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Instal Aplikasi
              </span>
              <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.2 rounded">
                {roleContext.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {roleContext.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Download className="h-3 w-3" />
            <span>Pasang</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Tutup banner instal"
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

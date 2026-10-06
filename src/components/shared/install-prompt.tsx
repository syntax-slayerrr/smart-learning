"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
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
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-4 shadow-2xl animate-slide-up sm:bottom-8 sm:left-1/2 sm:right-auto sm:w-[400px] sm:-translate-x-1/2">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Install Aplikasi</p>
          <p className="text-xs text-muted-foreground">Lebih cepat & hemat kuota</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDismissed(true)}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={handleInstallClick}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-xs border border-white/10"
        >
          Install
        </button>
      </div>
    </div>
  );
}

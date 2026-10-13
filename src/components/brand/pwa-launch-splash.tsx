"use client";

import { useEffect, useState, useRef } from "react";

/**
 * PwaLaunchSplash
 * Launch screen untuk PWA Standalone / Home Screen.
 * Animasi logo Syntax Slayer saat aplikasi dibuka dari home screen.
 */
export function PwaLaunchSplash() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");

      // Cek apakah sudah pernah muncul di sesi tab aktif
      const hasSeen = sessionStorage.getItem("syntax_slayer_pwa_launched");
      const forceSplash = new URLSearchParams(window.location.search).has("splash");

      // Tampilkan animasi jika standalone atau di mobile viewport saat first visit
      const isMobileScreen = window.innerWidth <= 768;

      if ((isStandalone || isMobileScreen || forceSplash) && !hasSeen) {
        setIsVisible(true);
        sessionStorage.setItem("syntax_slayer_pwa_launched", "true");
      }
    } catch {
      // Fallback aman jika akses window / storage terkendala
    }
  }, []);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 550);
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-[99999] bg-[#07090E] flex items-center justify-center overflow-hidden select-none cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Ethereal ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(56,189,248,0.09),rgba(139,92,246,0.06),transparent_70%)] pointer-events-none" />

      {/* Video backdrop blur for ultrawide / desktop screens */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110 pointer-events-none"
      >
        <source src="/assets/syntax-slayer-loading.webm" type="video/webm" />
        <source src="/assets/syntax-slayer-loading.mp4" type="video/mp4" />
      </video>

      {/* Main 60 FPS Motion Graphics */}
      <div className="relative z-10 w-full h-full max-w-lg max-h-[85vh] flex items-center justify-center p-4">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onEnded={handleFinish}
          className="w-full h-full object-contain filter drop-shadow-[0_0_40px_rgba(56,189,248,0.25)]"
        >
          <source src="/assets/syntax-slayer-loading.webm" type="video/webm" />
          <source src="/assets/syntax-slayer-loading.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Subtle Skip Indicator */}
      <div className="absolute bottom-8 z-20 text-[11px] font-mono tracking-widest text-slate-500/70 uppercase flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
        Ketuk untuk lewati
      </div>
    </div>
  );
}

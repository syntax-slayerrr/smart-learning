"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Mascot } from "@/components/Mascot";
import { useMascot } from "./mascot-context";

export function GlobalMascotWidget() {
  const pathname = usePathname();
  const {
    mood,
    say,
    isVisible,
    isCopilotOpen,
    setIsCopilotOpen,
    triggerReaction,
    cycleNextMood,
  } = useMascot();

  // Sembunyikan jika tidak visible, di halaman login, di galeri maskot,
  // atau saat Smart AI Copilot drawer sedang terbuka (agar tidak bertumpuk/bertabrakan)
  if (!isVisible || pathname === "/login" || pathname === "/mascot" || isCopilotOpen) {
    return null;
  }

  const isGuidePage = pathname === "/panduan";
  const isCopilotEligible = pathname.startsWith("/admin") || pathname.startsWith("/teacher") || isGuidePage;

  const handleMascotClick = () => {
    if (isCopilotEligible) {
      triggerReaction("senang", isGuidePage ? "Smart AI Panduan siap!" : "Smart AI siap membantu!", 3000);
      setIsCopilotOpen(true);
    } else {
      handlePoke();
    }
  };

  const handlePoke = () => {
    const cheers: Array<{
      mood: "semangat" | "senang" | "wink" | "termotivasi" | "cinta" | "penasaran" | "tertawa" | "fokus";
      text: string;
    }> = [
      { mood: "semangat", text: "Ayo fokus dan semangat!" },
      { mood: "senang", text: "Hari yang menyenangkan untuk belajar!" },
      { mood: "wink", text: "Aku siap menemanimu belajar!" },
      { mood: "termotivasi", text: "Kerja bagus, teruskan!" },
      { mood: "cinta", text: "Tetap jaga kesehatan dan terhidrasi ya!" },
      { mood: "penasaran", text: "Ada materi atau tugas baru hari ini?" },
      { mood: "fokus", text: "Semua sistem berjalan optimal 100%!" },
      { mood: "tertawa", text: "Haha! Selalu asyik belajar bersama!" },
    ];
    const pick = cheers[Math.floor(Math.random() * cheers.length)];
    triggerReaction(pick.mood, pick.text, 3500);
  };

  return (
    <div
      aria-label="Smart AI Asisten Maskot"
      className="fixed bottom-24 sm:bottom-26 right-3.5 sm:right-6 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end pointer-events-none select-none transition-all duration-300"
    >
      {/* Sleek Pill Badge (Hanya tampil untuk Asisten AI atau Sahabat Belajar) */}
      <div
        onClick={handleMascotClick}
        className="pointer-events-auto cursor-pointer mb-1.5 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-0.5 border border-blue-200/80 shadow-[0_4px_14px_rgba(37,99,235,0.12)] text-[10.5px] font-bold text-slate-800 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 group"
        title={isCopilotEligible ? (isGuidePage ? "Tanya Smart AI Panduan Aplikasi" : "Buka Smart AI Copilot") : "Sahabat Belajar"}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>{isCopilotEligible ? (isGuidePage ? "Tanya AI Panduan" : "Smart AI") : "Sahabat Belajar"}</span>
      </div>

      {/* Maskot Karakter Utama */}
      <div
        className="pointer-events-auto cursor-pointer group"
        onClick={handleMascotClick}
        onDoubleClick={cycleNextMood}
        title={isCopilotEligible ? "Klik untuk membuka Smart AI (Double klik untuk ganti ekspresi)" : "Klik untuk interaksi maskot"}
      >
        <Mascot
          mood={mood}
          size={56}
          say={say || undefined}
          follow={true}
          interactive={false}
          showBadge={false}
          className="hover:scale-108 active:scale-95 transition-transform duration-200 drop-shadow-[0_8px_20px_rgba(37,99,235,0.16)]"
        />
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Mascot } from "@/components/Mascot";
import { useMascot } from "./mascot-context";

export function GlobalMascotWidget() {
  const pathname = usePathname();
  const { mood, say, isVisible, triggerReaction } = useMascot();

  // Jangan tampilkan floating widget di halaman login (karena sudah ada maskot di header form)
  // dan di halaman showcase /mascot
  if (!isVisible || pathname === "/login" || pathname === "/mascot") {
    return null;
  }

  const handlePoke = () => {
    const cheers: Array<{ mood: "semangat" | "senang" | "wink" | "termotivasi" | "cinta"; text: string }> = [
      { mood: "semangat", text: "Ayo fokus dan semangat!" },
      { mood: "senang", text: "Hari yang menyenangkan untuk belajar!" },
      { mood: "wink", text: "Aku siap menemanimu belajar!" },
      { mood: "termotivasi", text: "Kerja bagus, teruskan!" },
      { mood: "cinta", text: "Tetap jaga kesehatan ya!" },
    ];
    const pick = cheers[Math.floor(Math.random() * cheers.length)];
    triggerReaction(pick.mood, pick.text, 3500);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end pointer-events-none select-none">
      <div
        className="pointer-events-auto cursor-pointer"
        onClick={handlePoke}
        title="Sahabat Belajar Smart Learning"
      >
        <Mascot
          mood={mood}
          size={58}
          say={say || undefined}
          follow={true}
          interactive={false}
          showBadge={false}
          className="hover:scale-110 active:scale-95 transition-transform drop-shadow-md"
        />
      </div>
    </div>
  );
}

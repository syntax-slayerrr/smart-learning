"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { usePathname } from "next/navigation";
import { MOODS, SAY, MOOD_KEYS } from "@/components/Mascot";

export type MascotMood = keyof typeof MOODS;

interface MascotContextValue {
  mood: MascotMood;
  say: string | null;
  isVisible: boolean;
  isMinimized: boolean;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  setMood: (mood: MascotMood, say?: string) => void;
  setSay: (say: string | null) => void;
  setIsVisible: (visible: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  triggerReaction: (mood: MascotMood, say: string, durationMs?: number) => void;
  cycleNextMood: () => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

const DEFAULT_MOOD: MascotMood = "semangat";

const ROUTE_GREETINGS: Record<string, { mood: MascotMood; say: string }> = {
  "/admin": { mood: "fokus", say: "Pusat Kendali Admin siap!" },
  "/admin/attendance": { mood: "fokus", say: "Monitoring presensi real-time!" },
  "/admin/students": { mood: "penasaran", say: "Data profil siswa aktif terverifikasi." },
  "/admin/classes": { mood: "semangat", say: "Kelola ruang & rombel kelas." },
  "/admin/reports": { mood: "termotivasi", say: "Laporan analitik akademik terpadu." },
  "/teacher": { mood: "semangat", say: "Halo Guru hebat, siap mengajar?" },
  "/teacher/attendance": { mood: "fokus", say: "Sesi presensi kelas sedang aktif." },
  "/teacher/assignments": { mood: "termotivasi", say: "Daftar evaluasi tugas siswa." },
  "/teacher/materials": { mood: "penasaran", say: "Materi pembelajaran siap diakses." },
  "/student": { mood: "senang", say: "Ayo belajar dan raih prestasi!" },
  "/student/assignments": { mood: "penasaran", say: "Cek tugas aktifmu hari ini!" },
  "/student/attendance": { mood: "fokus", say: "Scan presensi wajah aktif." },
  "/student/notebook": { mood: "fokus", say: "Ruang Catatan Pintar aktif!" },
  "/parent": { mood: "cinta", say: "Pantau tumbuh kembang ananda tercinta." },
  "/panduan": { mood: "penasaran", say: "Ada materi yang ingin dipelajari?" },
  "/mascot": { mood: "tertawa", say: "Halo! Ini galeri 15 karakterku!" },
};

const DYNAMIC_IDLE_MESSAGES: Array<{ mood: MascotMood; say: string }> = [
  { mood: "semangat", say: "Tetap fokus dan konsisten hari ini!" },
  { mood: "wink", say: "Butuh bantuan analitik? Klik aku ya!" },
  { mood: "fokus", say: "AI Vision siap memantau presensi kelas." },
  { mood: "senang", say: "Belajar lebih asyik bersama Smart Learning!" },
  { mood: "termotivasi", say: "Setiap progres kecil adalah kemenangan." },
  { mood: "penasaran", say: "Sudah cek pembaharuan data terbaru?" },
  { mood: "cinta", say: "Jaga kesehatan dan jangan lupa istirahat!" },
  { mood: "termotivasi", say: "Hebat! Kamu terus melangkah maju." },
  { mood: "salam", say: "Smart Learning siap mendampingi belajarmu." },
];

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mood, setMoodState] = useState<MascotMood>(DEFAULT_MOOD);
  const [say, setSay] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setMood = useCallback((newMood: MascotMood, newSay?: string) => {
    setMoodState(newMood);
    if (newSay !== undefined) {
      setSay(newSay);
    } else {
      setSay(SAY[newMood] || null);
    }
  }, []);

  const triggerReaction = useCallback(
    (reactionMood: MascotMood, reactionSay: string, durationMs = 3800) => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      setMoodState(reactionMood);
      setSay(reactionSay);

      resetTimerRef.current = setTimeout(() => {
        setMoodState(DEFAULT_MOOD);
        setSay(null);
        resetTimerRef.current = null;
      }, durationMs);
    },
    []
  );

  const cycleNextMood = useCallback(() => {
    setMoodState((prev) => {
      const idx = MOOD_KEYS.indexOf(prev);
      const nextIdx = (idx + 1) % MOOD_KEYS.length;
      const nextMood = MOOD_KEYS[nextIdx];
      const nextSay = SAY[nextMood] || "Halo!";
      triggerReaction(nextMood, nextSay, 3500);
      return nextMood;
    });
  }, [triggerReaction]);

  // Update mascot reaction when navigating to different routes
  useEffect(() => {
    if (!pathname) return;

    // Sembunyikan floating widget jika di /login karena sudah punya maskot embedded
    if (pathname.startsWith("/login")) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const greeting = ROUTE_GREETINGS[pathname];
    if (greeting) {
      triggerReaction(greeting.mood, greeting.say, 4000);
    }
  }, [pathname, triggerReaction]);

  // Dynamic periodic idle cycle (setiap 20 detik saat santai)
  useEffect(() => {
    if (!isVisible || isMinimized || isCopilotOpen) return;

    let index = 0;
    const interval = setInterval(() => {
      // Hanya tampilkan jika sedang tidak ada bubble aktif
      if (!resetTimerRef.current) {
        const item = DYNAMIC_IDLE_MESSAGES[index % DYNAMIC_IDLE_MESSAGES.length];
        index++;
        triggerReaction(item.mood, item.say, 4000);
      }
    }, 22000);

    return () => clearInterval(interval);
  }, [isVisible, isMinimized, isCopilotOpen, triggerReaction]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  return (
    <MascotContext.Provider
      value={{
        mood,
        say,
        isVisible,
        isMinimized,
        isCopilotOpen,
        setIsCopilotOpen,
        setMood,
        setSay,
        setIsVisible,
        setIsMinimized,
        triggerReaction,
        cycleNextMood,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot(): MascotContextValue {
  const context = useContext(MascotContext);
  if (!context) {
    // Fallback safe no-op if outside provider
    return {
      mood: DEFAULT_MOOD,
      say: null,
      isVisible: false,
      isMinimized: false,
      isCopilotOpen: false,
      setIsCopilotOpen: () => {},
      setMood: () => {},
      setSay: () => {},
      setIsVisible: () => {},
      setIsMinimized: () => {},
      triggerReaction: () => {},
      cycleNextMood: () => {},
    };
  }
  return context;
}

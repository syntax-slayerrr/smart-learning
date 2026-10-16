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
  "/teacher": { mood: "semangat", say: "Selamat mengajar!" },
  "/student": { mood: "senang", say: "Ayo belajar hal seru hari ini!" },
  "/parent": { mood: "cinta", say: "Pantau prestasi ananda tercinta." },
  "/student/assignments": { mood: "penasaran", say: "Cek tugas aktifmu!" },
  "/student/attendance": { mood: "fokus", say: "Siapkan wajah untuk presensi." },
  "/teacher/attendance": { mood: "fokus", say: "Sesi presensi kelas aktif." },
  "/teacher/assignments": { mood: "termotivasi", say: "Evaluasi tugas siswa." },
  "/panduan": { mood: "penasaran", say: "Ada yang butuh bantuan?" },
  "/mascot": { mood: "tertawa", say: "Halo! Ini galeri 15 karakterku!" },
};

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mood, setMoodState] = useState<MascotMood>(DEFAULT_MOOD);
  const [say, setSay] = useState<string | null>(SAY[DEFAULT_MOOD] || "Halo!");
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setMood = useCallback((newMood: MascotMood, newSay?: string) => {
    setMoodState(newMood);
    if (newSay !== undefined) {
      setSay(newSay);
    } else {
      setSay(SAY[newMood] || null);
    }
  }, []);

  const triggerReaction = useCallback(
    (reactionMood: MascotMood, reactionSay: string, durationMs = 3500) => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      setMoodState(reactionMood);
      setSay(reactionSay);

      resetTimerRef.current = setTimeout(() => {
        setMoodState(DEFAULT_MOOD);
        setSay(SAY[DEFAULT_MOOD] || null);
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
      setSay(SAY[nextMood] || "Halo!");
      return nextMood;
    });
  }, []);

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

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
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

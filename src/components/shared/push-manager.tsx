"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, X } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Convert base64 public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushManager() {
  const [showModal, setShowModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isTeacher = pathname?.startsWith("/teacher");
  const isDashboardRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/teacher") || pathname?.startsWith("/student");

  useEffect(() => {
    // Only prompt on actual protected dashboard views
    if (!isDashboardRoute) return;

    async function checkStatus() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return; // Push not supported
      }

      // Force showing modal if permission is NOT granted
      const permission = Notification.permission;
      
      if (permission === "denied") {
        setIsDenied(true);
        setShowModal(true);
      } else if (permission !== "granted") {
        // Wait a bit to not interrupt initial page load immediately
        setTimeout(() => setShowModal(true), 1500);
      } else {
        // Permission is already granted
        setShowModal(false);
      }
    }

    checkStatus();
  }, [searchParams, isDashboardRoute]);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      if (!('serviceWorker' in navigator)) throw new Error("Service Worker not supported");
      
      // Asking for permission after the user explicitly clicked the button
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error("Izin ditolak. Aplikasi tidak dapat digunakan tanpa mengaktifkan notifikasi.");
        if (permission === 'denied') setIsDenied(true);
        setIsSubscribing(false);
        return;
      }

      // Permission granted: immediately dismiss modal so user doesn't get blocked
      setShowModal(false);

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!subscription && vapidPublicKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      if (subscription) {
        // Send subscription to server silently in background
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        }).catch((err) => console.warn("Failed saving subscription:", err));
      }

      toast.success("Notifikasi berhasil diaktifkan!");
      
      // Remove query param if exists
      if (searchParams.get("setup") === "notif") {
        router.replace(window.location.pathname);
      }
    } catch (error) {
      console.error("Error setting up push notifications:", error);
      toast.success("Izin notifikasi browser telah aktif.");
      setShowModal(false);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    // Dismissing is no longer allowed in Forced Mode
    // Users MUST accept to proceed.
  };

  if (!showModal || !isDashboardRoute) return null;

  const roleText = isTeacher
    ? { title: "Notifikasi Pengingat Kelas", desc: "Aktifkan notifikasi untuk peringatan jadwal mengajar & presensi otomatis." }
    : pathname?.startsWith("/parent")
    ? { title: "Notifikasi Presensi Anak", desc: "Dapatkan info langsung saat anak hadir atau terlambat di sekolah." }
    : pathname?.startsWith("/admin")
    ? { title: "Notifikasi Sistem Sekolah", desc: "Terima peringatan anomali presensi & sistem secara langsung." }
    : { title: "Notifikasi Jadwal & Tugas", desc: "Jangan lewatkan jadwal pelajaran, tugas baru, dan pengumuman kelas." };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            <Bell className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {roleText.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {roleText.desc}
            </p>
          </div>
        </div>

        {isDenied ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/40 text-xs">
            Izin notifikasi diblokir browser. Buka pengaturan browser (ikon gembok URL) dan aktifkan notifikasi.
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {isSubscribing && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isSubscribing ? "Mengaktifkan..." : "Aktifkan"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

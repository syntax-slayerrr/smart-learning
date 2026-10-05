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
      }
    }

    checkStatus();
  }, [searchParams, isDashboardRoute]);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      if (!('serviceWorker' in navigator)) throw new Error("Service Worker not supported");
      
      const registration = await navigator.serviceWorker.ready;
      
      // Asking for permission after the user explicitly clicked the button
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error("Izin ditolak. Aplikasi tidak dapat digunakan tanpa mengaktifkan notifikasi.");
        if (permission === 'denied') setIsDenied(true);
        setIsSubscribing(false);
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("Missing VAPID public key");
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (res.ok) {
        toast.success("Notifikasi berhasil diaktifkan!");
        setShowModal(false);
        
        // Remove the query param if it exists
        if (searchParams.get("setup") === "notif") {
          router.replace(window.location.pathname);
        }
      } else {
        throw new Error("Failed to save subscription");
      }
    } catch (error) {
      console.error("Error setting up push notifications:", error);
      toast.error("Gagal mengaktifkan notifikasi.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    // Dismissing is no longer allowed in Forced Mode
    // Users MUST accept to proceed.
  };

  if (!showModal || !isDashboardRoute) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="card-3d-ceramic w-full max-w-md rounded-3xl overflow-hidden flex flex-col relative shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border-t border-white/80 animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-b from-blue-50/80 to-transparent p-6 flex justify-center border-b border-slate-100">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-3xl flex items-center justify-center relative shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)] border-t border-white/40">
            <Bell className="w-9 h-9 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
          </div>
        </div>
        
        <div className="p-6 text-center space-y-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-xs font-semibold text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
              Sistem Presensi Aktif
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight pt-1">
              {isTeacher ? "Peringatan Sistem: Wajib Akses ⏱" : "Peringatan Sistem: Wajib Akses"}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            {isTeacher 
              ? "Sekolah mewajibkan seluruh Guru untuk mengaktifkan Notifikasi agar tidak terlewat peringatan jadwal dan tugas kelas otomatis."
              : "Demi kelancaran informasi dan pengawasan presensi, fitur Notifikasi wajib diaktifkan untuk sinkronisasi real-time."}
          </p>
          
          {isDenied ? (
            <div className="bg-amber-50 text-amber-800 p-3.5 rounded-2xl border border-amber-200/80 text-xs font-medium text-left space-y-1">
              <p className="font-semibold">Akses Notifikasi Terkunci</p>
              <p className="text-amber-700">Mohon buka pengaturan browser Anda (ikon gembok di URL bar), pilih Izinkan Notifikasi, lalu refresh halaman.</p>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.35)] active:scale-98 disabled:opacity-70 flex items-center justify-center gap-2 border-t border-white/20"
            >
              {isSubscribing ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span className="text-sm">{isSubscribing ? "Menghubungkan..." : "Izinkan Notifikasi Sistem"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

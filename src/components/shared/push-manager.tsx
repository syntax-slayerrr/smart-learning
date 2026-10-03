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

  useEffect(() => {
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
  }, [searchParams]);

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

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        <div className="bg-primary/10 p-6 flex justify-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center relative">
            <Bell className="w-10 h-10 text-primary animate-pulse" />
            <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-card"></div>
          </div>
        </div>
        
        <div className="p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            {isTeacher ? "Peringatan Sistem: Wajib Akses ⏱" : "Peringatan Sistem: Wajib Akses"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isTeacher 
              ? "Sekolah mewajibkan seluruh Guru untuk mengaktifkan Notifikasi agar tidak terlewat peringatan jadwal dan tugas kelas otomatis."
              : "Demi kelancaran informasi dan pengawasan siswa, fitur Push Notification WAJIB diaktifkan sebelum Anda bisa menggunakan aplikasi."}
          </p>
          
          {isDenied ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium">
              Akses Notifikasi diblokir oleh browser Anda. Mohon buka pengaturan browser (ikon gembok di url bar), izinkan Notifikasi, lalu muat ulang halaman ini.
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubscribing ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Bell className="w-5 h-5" />
              )}
              {isSubscribing ? "Mengaktifkan..." : "Wajib Izinkan Notifikasi"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

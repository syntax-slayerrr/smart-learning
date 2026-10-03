"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Trash2, CheckCircle2 } from "lucide-react";

interface PushNotification {
  id: number;
  title: string;
  body: string;
  url: string;
  icon: string;
  type: string;
  timestamp: number;
  read: boolean;
}

const DB_NAME = 'absen-smk-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'inbox';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load from IndexedDB
  useEffect(() => {
    const loadInbox = () => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) return;
        
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          // Sort descending by timestamp
          const sorted = (getAllRequest.result || []).sort((a: any, b: any) => b.timestamp - a.timestamp);
          setNotifications(sorted);
        };
      };
    };

    loadInbox();
    // Re-check periodically in case service worker adds new ones while app is open
    const interval = setInterval(loadInbox, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      
      notifications.forEach(n => {
        if (!n.read) {
          store.put({ ...n, read: true });
        }
      });
      
      tx.oncomplete = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      };
    };
  };

  const clearInbox = () => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => setNotifications([]);
    };
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border/40 bg-background/95 p-0 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="font-semibold text-sm">Notifikasi</h3>
              <p className="text-xs text-muted-foreground">{unreadCount} pesan baru</p>
            </div>
            <div className="flex gap-1">
              <button 
                className="flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50" 
                onClick={markAllAsRead} 
                title="Tandai semua sudah dibaca"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button 
                className="flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50" 
                onClick={clearInbox} 
                title="Hapus semua riwayat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center text-muted-foreground">
                <Bell className="mb-2 h-10 w-10 text-muted/30" />
                <p className="text-sm font-medium">Kotak Masuk Kosong</p>
                <p className="text-xs">Belum ada notifikasi baru.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`cursor-pointer p-4 transition-colors hover:bg-muted/50 ${notif.read ? 'opacity-70' : 'bg-primary/5'}`}
                    onClick={() => {
                      if (notif.url && notif.url !== '/') {
                        window.location.href = notif.url;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <img src={notif.icon || '/icon.png'} alt="icon" className="h-8 w-8 shrink-0 rounded-full border bg-background object-cover" />
                      <div>
                        <h4 className="mb-1 text-sm font-medium leading-none">{notif.title}</h4>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{notif.body}</p>
                        <span className="mt-2 block text-[10px] text-muted-foreground">
                          {new Date(notif.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {!notif.read && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

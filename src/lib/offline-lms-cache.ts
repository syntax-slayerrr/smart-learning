"use client";

import { useState, useEffect, useCallback } from "react";

const DB_NAME = "smart_learning_offline_db";
const DB_VERSION = 1;

export interface CachedMaterial {
  id: string;
  data: any;
  cachedAt: number;
}

export interface OfflineNote {
  client_id: string;
  material_id: string;
  chapter_id?: string;
  quote?: string;
  my_note: string;
  created_at: string;
  synced: boolean;
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB tidak didukung pada browser ini."));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("materials")) {
        db.createObjectStore("materials", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("offline_notes_queue")) {
        db.createObjectStore("offline_notes_queue", { keyPath: "client_id" });
      }
    };
  });
}

/**
 * Cache current active material and chapters to IndexedDB for offline reading
 */
export async function cacheActiveMaterial(data: any): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("materials", "readwrite");
    const store = tx.objectStore("materials");
    store.put({
      id: "active_material",
      data,
      cachedAt: Date.now(),
    });
  } catch (err) {
    console.warn("Offline Cache: Gagal menyimpan materi ke IndexedDB", err);
  }
}

/**
 * Retrieve cached active material from IndexedDB
 */
export async function getCachedActiveMaterial(): Promise<any | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction("materials", "readonly");
      const store = tx.objectStore("materials");
      const req = store.get("active_material");

      req.onsuccess = () => {
        resolve(req.result?.data || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Cache notes list to IndexedDB
 */
export async function cacheStudyNotes(notes: any[]): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");
    notes.forEach((note) => {
      store.put(note);
    });
  } catch (err) {
    console.warn("Offline Cache: Gagal menyimpan notes ke IndexedDB", err);
  }
}

/**
 * Retrieve all cached notes from IndexedDB
 */
export async function getCachedStudyNotes(): Promise<any[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction("notes", "readonly");
      const store = tx.objectStore("notes");
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Save note locally while offline and enqueue for sync
 */
export async function saveOfflineNote(note: Omit<OfflineNote, "client_id" | "synced" | "created_at">): Promise<OfflineNote> {
  const offlineNote: OfflineNote = {
    ...note,
    client_id: "local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString(),
    synced: false,
  };

  try {
    const db = await openOfflineDB();
    const tx = db.transaction(["notes", "offline_notes_queue"], "readwrite");
    tx.objectStore("notes").put({ ...offlineNote, id: offlineNote.client_id });
    tx.objectStore("offline_notes_queue").put(offlineNote);
  } catch (err) {
    console.warn("Offline Cache: Gagal menyimpan draf offline note", err);
  }

  return offlineNote;
}

/**
 * Sync all pending offline notes to remote API
 */
export async function syncPendingOfflineNotes(): Promise<{ synced: number }> {
  try {
    const db = await openOfflineDB();
    const pendingNotes: OfflineNote[] = await new Promise((resolve) => {
      const tx = db.transaction("offline_notes_queue", "readonly");
      const store = tx.objectStore("offline_notes_queue");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (!pendingNotes || pendingNotes.length === 0) {
      return { synced: 0 };
    }

    let syncedCount = 0;
    for (const note of pendingNotes) {
      try {
        const res = await fetch("/api/lms/student/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: "student-mock-zaldy",
            material_id: note.material_id,
            chapter_id: note.chapter_id,
            quote: note.quote,
            my_note: note.my_note,
          }),
        });

        if (res.ok) {
          // Remove from queue
          const delTx = db.transaction("offline_notes_queue", "readwrite");
          delTx.objectStore("offline_notes_queue").delete(note.client_id);
          syncedCount++;
        }
      } catch (e) {
        console.warn("Sync failed for note", note.client_id, e);
      }
    }

    return { synced: syncedCount };
  } catch (err) {
    console.error("Gagal sinkronisasi catatan offline", err);
    return { synced: 0 };
  }
}

/**
 * Hook for monitoring online/offline status and queue size
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkQueue = useCallback(async () => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction("offline_notes_queue", "readonly");
      const countReq = tx.objectStore("offline_notes_queue").count();
      countReq.onsuccess = () => {
        setOfflineQueueCount(countReq.result);
      };
    } catch {
      setOfflineQueueCount(0);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncPendingOfflineNotes();
      await checkQueue();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkQueue]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    checkQueue();

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkQueue, triggerSync]);

  return {
    isOnline,
    offlineQueueCount,
    isSyncing,
    triggerSync,
  };
}

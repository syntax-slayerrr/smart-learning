// IndexedDB wrapper for notifications and offline cache
const DB_NAME = 'smart-learning-notifications';
const DB_VERSION = 1;
const STORE_NAME = 'inbox';
const CACHE_NAME = 'smart-learning-offline-v1';

// Static resources to cache for offline shell
const OFFLINE_URLS = [
  '/',
  '/icon.png',
  '/apple-icon.png',
  '/logo_square_192.png',
  '/logo_square_512.png',
  '/brand/syntax-slayer-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn('SW: Non-critical cache error on install', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function saveNotification(data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({
      ...data,
      timestamp: Date.now(),
      read: false
    });
    return tx.complete;
  } catch (err) {
    console.error('SW: Error saving to IndexedDB', err);
  }
}

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    
    // Default options
    const options = {
      body: data.body,
      icon: data.icon || '/icon.png',
      badge: '/icon.png',
      image: data.image || null, // Rich media image
      vibrate: data.vibrate || [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/'
      },
      actions: data.actions || [
        {
          action: 'open_dashboard',
          title: 'Buka Dasbor'
        }
      ],
      requireInteraction: data.requireInteraction !== false
    };

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title, options),
        saveNotification({
          title: data.title,
          body: data.body,
          url: data.url || '/',
          icon: data.icon || '/icon.png',
          type: data.type || 'info'
        })
      ])
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  const action = event.action;
  let urlToOpen = event.notification.data.url;

  // Custom action routing can be added here
  if (action === 'action_1' && event.notification.data.action1Url) {
    urlToOpen = event.notification.data.action1Url;
  }

  if (urlToOpen) {
    event.waitUntil(clients.openWindow(urlToOpen));
  }
});

/**
 * Service Worker — Matrix Spins Casino
 *
 * Provides:
 * 1. Offline shell caching (app shell strategy)
 * 2. Runtime cache for API responses (stale-while-revalidate)
 * 3. Offline fallback page
 */

const CACHE_NAME = 'matrix-spins-v1';
const OFFLINE_URL = '/';

// App shell — essential files cached on install
const PRECACHE_URLS = [
  '/',
  '/styles.css',
  '/visual-overhaul.css',
  '/manifest.json',
  '/favicon.svg'
];

// ─── Install: Pre-cache the app shell ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: Clean up old caches ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch Strategy ───────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests (POST spins, payments, etc.)
  if (request.method !== 'GET') return;

  // Skip API requests — always go to network
  if (request.url.includes('/api/')) return;

  // For navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        // Only cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => cached); // If network fails, fall back to cache

      return cached || fetchPromise;
    })
  );
});

// ─── Push Notifications ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Matrix Spins Casino',
    body: 'You have a new message!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'matrix-spins-notification'
  };

  if (event.data) {
    try {
      // Try parsing as JSON first
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: data.data || {}
      };
    } catch (e) {
      // Fall back to text payload
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data || {}
    })
  );
});

// ─── Notification Click Handler ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const casinoUrl = '/';
  const urlToOpen = event.notification.data.url || casinoUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if a window with the casino is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

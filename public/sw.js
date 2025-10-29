// Service Worker for TokenQuest PWA - v1.2.1 (Fix stale chunks)
const CACHE_NAME = 'questcord-v1.2.1';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/offline.html'
];

// Install - Cache ONLY essential static files (NO HTML!)
self.addEventListener('install', (event) => {
  console.log('⚙️ Service Worker v1.2.1: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching essential assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - DELETE ALL old caches to force fresh start
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker v1.2.1: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL caches (will force fresh reload)
          console.log('🗑️ Service Worker: Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✨ All caches cleared! Fresh start.');
      return self.clients.claim();
    })
  );
});

// Fetch - NETWORK-FIRST for EVERYTHING (prevent stale chunks)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip chrome-extension and non-http requests
  if (!url.protocol.startsWith('http')) return;
  
  // Skip Supabase API calls (always network, never cache)
  if (url.host.includes('supabase.co')) return;

  // NETWORK-FIRST for ALL requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ❌ DO NOT CACHE:
        // - HTML pages (they reference chunk filenames that change every build)
        // - Root path
        // - Failed responses
        if (
          url.pathname === '/' ||
          url.pathname.endsWith('.html') ||
          !response.ok ||
          response.status !== 200
        ) {
          return response;
        }

        // ✅ Cache static assets (images, fonts, manifest, icons)
        // But NOT JS/CSS chunks (they have hashes that change)
        const shouldCache = (
          url.pathname.includes('/icon-') ||
          url.pathname.includes('.png') ||
          url.pathname.includes('.jpg') ||
          url.pathname.includes('.svg') ||
          url.pathname.includes('.woff') ||
          url.pathname === '/manifest.json' ||
          url.pathname === '/favicon.svg'
        );

        if (shouldCache) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        
        return response;
      })
      .catch((error) => {
        console.log('🌐 Network failed, trying cache:', url.pathname);
        // Fallback to cache only if network completely fails
        return caches.match(event.request).then((cached) => {
          if (cached) {
            console.log('📦 Serving from cache:', url.pathname);
            return cached;
          }
          
          // Last resort: offline page
          if (url.pathname.endsWith('.html') || url.pathname === '/') {
            return caches.match('/offline.html');
          }
          
          // Return error for other resources
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

console.log('🚀 Service Worker v1.2.1: Loaded and ready!');

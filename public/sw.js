const CACHE_NAME = 'backcountry-gps-core-v2';
const TILE_CACHE_NAME = 'backcountry-map-tiles-v1';

// Recursos esenciales del App Shell
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== TILE_CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Manejo de Mosaicos de Mapa (Google Satélite, Esri, OpenTopoMap)
  if (
    url.hostname.includes('google.com') && url.pathname.includes('/vt') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('opentopomap.org') ||
    url.hostname.includes('tile.openstreetmap.org')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (tileCache) => {
        const cachedResponse = await tileCache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            tileCache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Si estamos offline y no está en caché, devolver imagen vacía transparente o respuesta neutra
          return cachedResponse || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 2. Manejo de CDN externo (Leaflet CSS/JS, Google Fonts)
  if (url.hostname.includes('unpkg.com') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);
      })
    );
    return;
  }

  // 3. Manejo de la aplicación local (Network First con fallback a caché para garantizar datos frescos en dev)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Si solicita navegación HTML, devolver index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

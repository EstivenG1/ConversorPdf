const CACHE_NAME = 'conversorg-cache-v2';
const APP_SCOPE = self.registration.scope;
const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/app.js',
  'js/converter-client.js',
  'js/libs/pdf-lib.min.js',
  'js/libs/pdf.min.js',
  'js/libs/pdf.worker.min.js',
  'js/libs/docx.umd.js',
  'js/libs/xlsx.full.min.js',
  'js/libs/pptxgen.bundle.js',
  'js/libs/jszip.min.js',
  'js/libs/qrcode.min.js',
  'js/libs/lucide.min.js',
  'assets/logo.svg',
  'assets/icon-192.png',
  'assets/icon-512.png'
].map(asset => new URL(asset, APP_SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(error => {
        console.error('No se pudieron guardar los archivos de la aplicación para uso sin conexión.', error);
        throw error;
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('conversorg-cache-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  const scopeUrl = new URL(APP_SCOPE);
  const apiPath = new URL('api/', APP_SCOPE).pathname;

  if (
    event.request.method !== 'GET' ||
    requestUrl.origin !== scopeUrl.origin ||
    !requestUrl.href.startsWith(APP_SCOPE) ||
    requestUrl.pathname.startsWith(apiPath)
  ) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    let response;

    try {
      response = await fetch(event.request);
    } catch (error) {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;

      if (event.request.mode === 'navigate') {
        const cachedIndex = await cache.match(new URL('index.html', APP_SCOPE).href);
        if (cachedIndex) return cachedIndex;
      }

      throw error;
    }

    if (response.ok) {
      try {
        await cache.put(event.request, response.clone());
      } catch (error) {
        console.error('No se pudo actualizar el archivo guardado en caché.', error);
      }
    }

    return response;
  })());
});

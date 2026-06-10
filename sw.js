/* ══════════════════════════════════════════
   Dalty Grades — Service Worker
   النسخة: 1.0.0
   ══════════════════════════════════════════ */

const CACHE_NAME = 'dalty-grades-v26';
const STATIC_CACHE = 'dalty-static-v26';
const DYNAMIC_CACHE = 'dalty-dynamic-v26';

/* ── الملفات المخزنة مسبقاً عند التثبيت ── */
const PRE_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
];

/* ── الموارد الخارجية المُخزنة ── */
const EXTERNAL_CACHE = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
];

/* ── نطاقات Whisper/Transformers — تُخزَّن ديناميكياً عند أول استخدام ── */
const WHISPER_HOSTS = [
  'cdn.jsdelivr.net',
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'cdn-lfs-us-1.huggingface.co',
];

/* ════════════════════════════════
   حدث التثبيت — Install
   ════════════════════════════════ */
self.addEventListener('install', event => {
  console.log('[SW] Installing Dalty Grades Service Worker...');

  event.waitUntil(
    Promise.all([
      /* تخزين الملفات المحلية */
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(PRE_CACHE);
      }),

      /* تخزين الموارد الخارجية (بتجاهل الأخطاء) */
      caches.open(DYNAMIC_CACHE).then(async cache => {
        for (const url of EXTERNAL_CACHE) {
          try {
            await cache.add(url);
            console.log('[SW] Cached external:', url);
          } catch (e) {
            console.warn('[SW] Could not cache external resource:', url);
          }
        }
      }),
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting(); /* تفعيل فوري بدون انتظار */
    })
  );
});

/* ════════════════════════════════
   حدث التفعيل — Activate
   ════════════════════════════════ */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Activated and controlling all clients');
      return self.clients.claim();
    })
  );
});

/* ════════════════════════════════
   حدث الطلب — Fetch
   استراتيجية: Cache First ثم Network
   ════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* تجاهل طلبات غير GET */
  if (request.method !== 'GET') return;

  /* تجاهل طلبات chrome-extension وغيرها */
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  const url = new URL(request.url);

  /* ── ملف index.html: Network First (للحصول على أحدث نسخة) ── */
  if (url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    return networkFirst(request);
  }

  /* ── الخطوط من Google: Cache First ── */
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    return cacheFirst(request, DYNAMIC_CACHE);
  }

  /* ── مكتبات CDN: Cache First ── */
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    return cacheFirst(request, DYNAMIC_CACHE);
  }

  /* ── Whisper / Transformers.js / HuggingFace models: Cache First ── */
  if (WHISPER_HOSTS.some(h => url.hostname.includes(h))) {
    return cacheFirst(request, DYNAMIC_CACHE);
  }

  /* ── الملفات المحلية (أيقونات، manifest): Cache First ── */
  return cacheFirst(request, STATIC_CACHE);
}

/* ── استراتيجية: Cache First ── */
async function cacheFirst(request, cacheName = STATIC_CACHE) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    /* إذا فشل الشبكة والكاش فارغ */
    return offlineFallback(request);
  }
}

/* ── استراتيجية: Network First ── */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    /* الشبكة فشلت — نرجع من الكاش */
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/* ── صفحة بديلة عند انقطاع الإنترنت ── */
function offlineFallback(request) {
  const url = new URL(request.url);

  /* إذا كان طلب صفحة HTML */
  if (request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('./index.html');
  }

  /* للموارد الأخرى: استجابة فارغة بدلاً من خطأ */
  return new Response('', {
    status: 503,
    statusText: 'Service Unavailable — Offline',
  });
}

/* ════════════════════════════════
   رسائل من التطبيق — Message
   ════════════════════════════════ */
self.addEventListener('message', event => {
  /* طلب تحديث فوري */
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }

  /* طلب مسح الكاش */
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => {
      console.log('[SW] All caches cleared');
      event.source?.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

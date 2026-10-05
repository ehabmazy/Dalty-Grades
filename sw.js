/* ══════════════════════════════════════════
   Dalty Grades — Service Worker
   النسخة: v52 — عمل كامل بدون إنترنت (Offline-first)

   ما تغيّر عن v51:
   1) تخزين مسبق لكل ملفات التطبيق (JS / CSS / auth / sync) وليس index.html فقط.
   2) النسخة الجديدة تُبنى كاملة قبل حذف القديمة (لا يعود الكاش فارغاً بعد التحديث).
   3) فتح الصفحات من الكاش فوراً ثم التحديث في الخلفية (لا انتظار للشبكة الضعيفة).
   4) لا يتدخل في طلبات Firebase (قاعدة البيانات / الدخول) إطلاقاً.
   ══════════════════════════════════════════ */

const VERSION     = 'v52';
const CACHE       = 'dalty-app-' + VERSION;   /* ملفات التطبيق + المكتبات */
const MODEL_CACHE = 'dalty-models';           /* ملفات كبيرة (Whisper) — لا تُحذف عند التحديث */

/* ── ملفات أساسية: بدونها لا يعمل التطبيق (فشل أي منها يُلغي التحديث ويُبقي النسخة القديمة) ── */
const CORE = [
  './',
  './index.html',
  './style.css',
  './auth.js',
  './firebase-sync.js',
  './js/app-01-core.js',
  './js/app-02-schedule.js',
  './js/app-03-grades.js',
  './js/app-04-stats-sick.js',
  './js/app-05-weekly.js',
  './js/app-06-settings.js',
  './js/app-07-notif.js',
  './js/app-08-curric-report.js',
  './js/app-09-backup-witness.js',
  './js/app-10-report-tafrigh.js',
  './js/app-11-numpad.js',
];

/* ── ملفات ثانوية: يُحاول تخزينها ولا يفشل التثبيت إن تعذّر أحدها ── */
const NICE = [
  './manifest.json',
  './favicon.ico',
  './images/logo.jpg',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './grades-viewer.html',
  './supervisor-profile.html',
  './sounds/alarm_beep.wav',
  './sounds/alert_double.wav',
  './sounds/alert_important.wav',
  './sounds/chime_long.wav',
  './sounds/chime_short.wav',
  './sounds/ding.wav',
  './sounds/gentle_alert.wav',
  './sounds/melody.wav',
  './sounds/notification_ping.wav',
  './sounds/phone_ring.wav',
  './sounds/school_bell.wav',
  './sounds/success.wav',
];

/* ── مكتبات خارجية يعتمد عليها التطبيق ── */
const EXTERNAL = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
];

/* ── خطوط Google: يُخزَّن ملف الـ CSS وملفات الخط المشار إليها بداخله ── */
const FONT_CSS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700;900&display=swap',
];

/* ── نطاقات خارجية يُسمح للـ SW بالتعامل معها (غيرها لا يُمَس) ── */
const EXTERNAL_HOSTS = [
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com',
];
const MODEL_HOSTS = [
  'cdn.jsdelivr.net',
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'cdn-lfs-us-1.huggingface.co',
];

const NETWORK_TIMEOUT = 8000;  /* مهلة الشبكة عند غياب الملف من الكاش */

/* ════════════════════════════════
   أدوات مساعدة
   ════════════════════════════════ */
function fetchWithTimeout(input, init, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || NETWORK_TIMEOUT);
  return fetch(input, Object.assign({}, init || {}, { signal: ctrl.signal }))
    .finally(() => clearTimeout(timer));
}

/* يجلب ملفاً ويخزّنه؛ عند الفشل ينسخه من أي كاش قديم؛ يرجع true لو صار الملف متاحاً */
async function addOne(cache, url, external) {
  try {
    const res = await fetchWithTimeout(
      url,
      external ? { mode: 'cors' } : { cache: 'reload' },
      20000
    );
    if (res && res.ok) {
      await cache.put(url, res.clone());
      return res;
    }
  } catch (e) { /* تابع للنسخة القديمة */ }
  try {
    const old = await caches.match(url, { ignoreSearch: true });
    if (old) { await cache.put(url, old.clone()); return old; }
  } catch (e) {}
  return null;
}

/* يقرأ CSS الخط ويخزّن ملفات woff2 المذكورة فيه */
async function cacheFont(cache, cssUrl) {
  const res = await addOne(cache, cssUrl, true);
  if (!res) return;
  try {
    const text = await res.clone().text();
    const files = Array.from(new Set((text.match(/https:\/\/fonts\.gstatic\.com[^)'"\s]+/g) || [])));
    await Promise.all(files.map(f => addOne(cache, f, true)));
  } catch (e) {}
}

/* ════════════════════════════════
   التثبيت — Install
   ════════════════════════════════ */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    /* 1) الملفات الأساسية — لازم تكتمل */
    const coreResults = await Promise.all(CORE.map(u => addOne(cache, u, false)));
    const missing = CORE.filter((u, i) => !coreResults[i]);
    if (missing.length) {
      console.warn('[SW] ملفات أساسية ناقصة — إلغاء التحديث:', missing);
      await caches.delete(CACHE);
      throw new Error('core files missing: ' + missing.join(', '));
    }

    /* 2) المكتبات الخارجية + الخطوط + الملفات الثانوية — أفضل جهد */
    await Promise.all([
      ...EXTERNAL.map(u => addOne(cache, u, true)),
      ...FONT_CSS.map(u => cacheFont(cache, u)),
      ...NICE.map(u => addOne(cache, u, false)),
    ]);

    console.log('[SW] ✅ اكتمل التخزين المسبق', VERSION);
    await self.skipWaiting();
  })());
});

/* ════════════════════════════════
   التفعيل — Activate
   (لا تُحذف النسخ القديمة إلا بعد اكتمال الجديدة، لأن التفعيل يأتي بعد نجاح التثبيت)
   ════════════════════════════════ */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('dalty-') && k !== CACHE && k !== MODEL_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ════════════════════════════════
   الطلبات — Fetch
   ════════════════════════════════ */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (!url.protocol.startsWith('http')) return;

  /* ملفات التطبيق نفسه */
  if (url.origin === self.location.origin) {
    event.respondWith(handleLocal(event, req, url));
    return;
  }

  /* مكتبات وخطوط معروفة */
  if (EXTERNAL_HOSTS.includes(url.hostname)) {
    event.respondWith(handleExternal(req, CACHE));
    return;
  }
  if (MODEL_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(handleExternal(req, MODEL_CACHE));
    return;
  }

  /* أي شيء آخر (Firebase وقاعدة البيانات والدخول وAPI...) لا نتدخل فيه */
});

/* ── ملفات التطبيق: من الكاش فوراً + تحديث في الخلفية ── */
async function handleLocal(event, req, url) {
  const isNav = req.mode === 'navigate';
  const cache = await caches.open(CACHE);

  let cached = await cache.match(req.url, { ignoreSearch: true });
  if (!cached) cached = await caches.match(req.url, { ignoreSearch: true });

  /* تحديث الملف في الخلفية (لا يعطّل الفتح) */
  const revalidate = fetchWithTimeout(req.url, { cache: 'no-cache' }, isNav ? NETWORK_TIMEOUT : 15000)
    .then(async res => {
      if (res && res.ok && !res.redirected) {
        await cache.put(req.url, res.clone());
        /* حافظ على تطابق './' و './index.html' */
        if (/\/$/.test(url.pathname)) await cache.put(new URL('index.html', req.url).href, res.clone());
        else if (/\/index\.html$/.test(url.pathname)) await cache.put(new URL('./', req.url).href, res.clone());
      }
      return res;
    });

  if (cached) {
    event.waitUntil(revalidate.catch(() => {}));
    return cached;
  }

  /* غير موجود بالكاش: جرّب الشبكة */
  try {
    const res = await revalidate;
    if (res && !res.redirected) return res;
    if (res) return res;
  } catch (e) { /* لا شبكة */ }

  if (isNav) {
    const home = (await cache.match('./index.html')) || (await caches.match('./index.html', { ignoreSearch: true }));
    if (home) return home;
  }
  return new Response('', { status: 503, statusText: 'Service Unavailable' });
}

/* ── مكتبات وخطوط خارجية: الكاش أولاً ── */
async function handleExternal(req, cacheName) {
  const cache = await caches.open(cacheName);
  let cached = await cache.match(req.url, { ignoreVary: true });
  if (!cached) cached = await caches.match(req.url, { ignoreVary: true });
  if (cached) return cached;

  try {
    /* طلب CORS حتى تكون الاستجابة قابلة للتخزين (no-cors يعطي استجابة معتمة لا تُخزَّن) */
    const res = await fetchWithTimeout(req.url, { mode: 'cors' }, NETWORK_TIMEOUT);
    if (res && res.ok) {
      await cache.put(req.url, res.clone());
      return res;
    }
  } catch (e) { /* جرّب الطلب الأصلي */ }

  try {
    return await fetchWithTimeout(req, undefined, NETWORK_TIMEOUT);
  } catch (e) {
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

/* ════════════════════════════════
   رسائل من التطبيق — Message
   ════════════════════════════════ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => {
      event.source?.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

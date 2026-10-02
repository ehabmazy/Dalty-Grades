/* ══════════════════════════════════════════════════════════════
   Dalty Grades — Service Worker (النسخة 2: يعمل بدون إنترنت)

   المبادئ:
   ١) كل ملفات التطبيق تُخزَّن مسبقاً عند التثبيت، وإن تعذّر تخزين أي ملف
      أساسي يفشل التثبيت فتبقى النسخة القديمة الكاملة تعمل (لا نصف نسخة).
   ٢) لا ننتظر شبكة ميتة: عند "واي فاي بدون إنترنت" نستخدم النسخة المخزنة
      بعد مهلة قصيرة، ونتذكر أن الشبكة معطلة فلا نعيد الانتظار لكل ملف.
   ٣) نمرّر طلبات Firebase (قاعدة البيانات/الدخول) كما هي بدون تدخل.

   ⚠️ عند أي تعديل على ملفات التطبيق: غيّر رقم VERSION بالأسفل.
   ══════════════════════════════════════════════════════════════ */

const VERSION       = 'v56';
const STATIC_CACHE  = 'dalty-static-'  + VERSION;
const DYNAMIC_CACHE = 'dalty-dynamic-' + VERSION;

const NET_TIMEOUT_MS   = 3000;   /* مهلة انتظار الشبكة قبل استخدام النسخة المخزنة */
const EXT_TIMEOUT_MS   = 6000;   /* مهلة المكتبات الخارجية غير المخزنة */
const NET_DOWN_HOLD_MS = 20000;  /* مدة اعتبار الشبكة معطلة بعد أول مهلة */

/* مسارات نسبية لمجلد التطبيق (تعمل على GitHub Pages داخل مجلد فرعي) */
const rel = p => new URL(p, self.registration.scope).href;

/* ── أساسي: إن فشل أي منها يفشل التثبيت ── */
const CORE = [
  'index.html', 'style.css', 'manifest.json',
  'auth.js', 'firebase-sync.js',
  'js/app-01-core.js', 'js/app-02-schedule.js', 'js/app-03-grades.js',
  'js/app-04-stats-sick.js', 'js/app-05-weekly.js', 'js/app-06-settings.js',
  'js/app-07-notif.js', 'js/app-08-curric-report.js', 'js/app-09-backup-witness.js',
  'js/app-10-report-tafrigh.js', 'js/app-11-numpad.js', 'js/app-12-ai.js',
];

/* ── اختياري: يُخزَّن إن أمكن ── */
const OPTIONAL = [
  './', 'favicon.ico', 'images/logo.jpg', '404.html',
  'grades-viewer.html', 'supervisor-profile.html',
  'icons/icon-72.png', 'icons/icon-96.png', 'icons/icon-128.png', 'icons/icon-144.png',
  'icons/icon-152.png', 'icons/icon-192.png', 'icons/icon-384.png', 'icons/icon-512.png',
  'sounds/success.wav', 'sounds/chime_long.wav', 'sounds/notification_ping.wav',
  'sounds/alarm_beep.wav', 'sounds/alert_important.wav', 'sounds/gentle_alert.wav',
  'sounds/phone_ring.wav', 'sounds/ding.wav', 'sounds/alert_double.wav',
  'sounds/school_bell.wav', 'sounds/chime_short.wav', 'sounds/melody.wav',
];

/* ── مكتبات خارجية يعتمد عليها التطبيق ── */
const EXTERNAL = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
];

/* نطاقات خارجية نخزّنها (ما عداها مثل Firebase يمر مباشرة للشبكة) */
function isCacheableExternal(url) {
  const h = url.hostname;
  if (h === 'www.gstatic.com') return url.pathname.startsWith('/firebasejs/');
  return h === 'cdnjs.cloudflare.com' || h === 'fonts.googleapis.com' ||
         h === 'fonts.gstatic.com'    || h === 'cdn.jsdelivr.net' ||
         h === 'huggingface.co'       || h.endsWith('.huggingface.co');
}

/* ───────────── أدوات ───────────── */
function raceTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); },
                 e => { clearTimeout(t); reject(e); });
  });
}

let netDownUntil = 0;
const netLooksDown = () => Date.now() < netDownUntil;
const markNetDown  = () => { netDownUntil = Date.now() + NET_DOWN_HOLD_MS; };
const markNetUp    = () => { netDownUntil = 0; };

async function fetchAndStore(url, cacheName, mode) {
  const res = await fetch(new Request(url, { cache: 'reload', mode: mode || 'same-origin' }));
  if (!res || !res.ok) throw new Error('bad status ' + (res && res.status) + ' for ' + url);
  const cache = await caches.open(cacheName);
  await cache.put(url, res);
}

/* استجابة جزئية 206 للملفات الصوتية (المتصفح يطلب Range) */
async function withRange(request, response) {
  const range = request.headers.get('range');
  if (!range || !response || response.status !== 200) return response;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return response;
  const buf = await response.arrayBuffer();
  const total = buf.byteLength;
  let start = m[1] === '' ? Math.max(0, total - Number(m[2])) : Number(m[1]);
  let end   = (m[1] === '' || m[2] === '') ? total - 1 : Math.min(Number(m[2]), total - 1);
  if (start > end || start >= total) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type':   response.headers.get('Content-Type') || 'audio/wav',
      'Content-Range':  'bytes ' + start + '-' + end + '/' + total,
      'Content-Length': String(end - start + 1),
    },
  });
}

/* ════════════════ التثبيت ════════════════ */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    /* ١) الأساسي: يجب أن ينجح كله */
    await Promise.all(CORE.map(p => fetchAndStore(rel(p), STATIC_CACHE)));

    /* ٢) الاختياري والخارجي: بأفضل جهد دون إفشال التثبيت */
    await Promise.all([
      ...OPTIONAL.map(p => fetchAndStore(rel(p), STATIC_CACHE).catch(() => {})),
      ...EXTERNAL.map(u => fetchAndStore(u, DYNAMIC_CACHE, 'cors').catch(() => {})),
    ]);
    await self.skipWaiting();
  })());
});

/* ════════════════ التفعيل ════════════════ */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ════════════════ الطلبات ════════════════ */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;

  if (url.origin === self.location.origin) {
    const accept = req.headers.get('accept') || '';
    if (req.mode === 'navigate' || accept.includes('text/html')) {
      event.respondWith(networkFirst(event, STATIC_CACHE, true));
    } else if (/\.(js|css|json|html)$/i.test(url.pathname)) {
      event.respondWith(networkFirst(event, STATIC_CACHE, false));   /* الكود: الأحدث إن توفر النت */
    } else {
      event.respondWith(cacheFirstMedia(event));                      /* صور/أصوات/أيقونات */
    }
    return;
  }

  if (isCacheableExternal(url)) {
    event.respondWith(cacheFirstExternal(event));
  }
  /* غير ذلك (Firebase وغيره): لا تدخّل */
});

/* شبكة أولاً مع مهلة، ثم النسخة المخزنة */
async function networkFirst(event, cacheName, isNavigation) {
  const req   = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: true });

  const update = fetch(req).then(res => {
    markNetUp();
    if (res && res.ok && res.status === 200) cache.put(req, res.clone());
    return res;
  });

  /* لا توجد نسخة مخزنة: لا خيار سوى انتظار الشبكة */
  if (!cached) {
    try { return await update; }
    catch (e) { return isNavigation ? offlinePage(cache) : new Response('', { status: 503 }); }
  }

  /* الشبكة معروفة أنها معطلة: استخدم المخزن فوراً وحدّث في الخلفية إن أمكن */
  if (netLooksDown()) {
    event.waitUntil(update.catch(() => {}));
    return cached;
  }

  try {
    const res = await raceTimeout(update, NET_TIMEOUT_MS);
    if (res && res.ok) return res;
    return cached;                      /* خطأ من الخادم (404/5xx): الأفضل المخزن */
  } catch (e) {
    markNetDown();
    event.waitUntil(update.catch(() => {}));   /* أكمل التحديث بالخلفية إن عادت الشبكة */
    return cached;
  }
}

/* صور/أصوات: المخزن أولاً */
async function cacheFirstMedia(event) {
  const req   = event.request;
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return withRange(req, cached);
  try {
    const res = await raceTimeout(fetch(new Request(req.url)), EXT_TIMEOUT_MS);
    if (res && res.ok && res.status === 200) {
      cache.put(req.url, res.clone());
      return withRange(req, res);
    }
    return res;
  } catch (e) {
    return new Response('', { status: 503 });
  }
}

/* مكتبات خارجية: المخزن أولاً، وإن لم توجد فمهلة قصيرة حتى لا تعلّق الصفحة */
async function cacheFirstExternal(event) {
  const req   = event.request;
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await raceTimeout(fetch(req), EXT_TIMEOUT_MS);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/* آخر ملاذ: صفحة التطبيق الرئيسية أو رسالة بسيطة */
async function offlinePage(cache) {
  const home = (await cache.match(rel('index.html'))) || (await cache.match(rel('./')));
  if (home) return home;
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body dir="rtl" style="font-family:sans-serif;background:#0a0f1e;color:#f1f5f9;text-align:center;padding:40px">' +
    '<h2>📴 لا يوجد اتصال</h2><p>افتح التطبيق مرة واحدة وأنت متصل بالإنترنت ليعمل بعدها بدون نت.</p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ════════════════ رسائل من التطبيق ════════════════ */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => { if (event.source) event.source.postMessage({ type: 'CACHE_CLEARED' }); });
  }
});

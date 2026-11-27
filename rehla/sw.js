// Service worker: التطبيق يشتغل أوفلاين بالكامل
// غيّر الرقم ده (ومعاه APP_VERSION في js/update.js) مع كل إصدار جديد
const VERSION = 'rehla-v1.3.1';
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/db.js', './js/store.js', './js/auth.js', './js/util.js', './js/ui.js', './js/art.js',
  './js/stats.js', './js/notify.js', './js/prayertimes.js', './js/assistant.js', './js/install.js', './js/update.js',
  './js/data/azkar.js', './js/data/quran.js', './js/data/content.js',
  './js/screens/home.js', './js/screens/worship.js', './js/screens/habits.js', './js/screens/journal.js',
  './js/screens/mood.js', './js/screens/health.js', './js/screens/journey.js', './js/screens/achievements.js',
  './js/screens/reports.js', './js/screens/support.js', './js/screens/profile.js', './js/screens/notifications.js',
  './js/screens/auth.js', './js/screens/onboarding.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

// الإصدار الجديد بيستنى لحد ما المستخدم يدوس "حدّث دلوقتي"
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
    // الإصدارات القديمة (قبل ١.٣) مكانش فيها زرار تحديث، فبنحدّثها على طول
    const keys = await caches.keys();
    if (keys.some((k) => /^rehla-v1\.[0-2]\./.test(k))) self.skipWaiting();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k.startsWith('rehla')).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // الخطوط: cache-first
  if (url.host.includes('fonts.g')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; } catch { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // ملفات التطبيق: stale-while-revalidate
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') return c.match('./index.html');
    return new Response('', { status: 504 });
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const w = list.find((c) => c.url.includes(self.registration.scope));
    if (w) return w.focus();
    return self.clients.openWindow('./index.html#/home');
  }));
});

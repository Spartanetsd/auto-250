/* «250: Автомобілі та довіра» — офлайн.
   Після першого відкриття з сайту гра зберігається в кеші телефона й запускається без інтернету.
   Кеш має версію збірки: коли на сайті з'являється нова версія, вона тихо завантажується у фоні
   й відкривається з наступного запуску, а стара видаляється. */
const V = 'avto250-45ed530c10';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // no-cache: сервер підтвердить, що файл свіжий (304), або віддасть нову версію — без зайвого завантаження
  e.waitUntil(caches.open(V)
    .then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'no-cache' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('avto250-') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Спершу кеш (миттєвий запуск і без мережі), а чого в кеші немає — з мережі
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(V).then(c => c.match(r, { ignoreSearch: true }).then(hit => {
    if (hit) return hit;
    if (r.mode === 'navigate') return c.match('./index.html').then(h => h || fetch(r));
    return fetch(r);
  })));
});

/* «250: Автомобілі та довіра» — офлайн.
   Після першого відкриття з сайту гра зберігається в кеші телефона й запускається без інтернету.
   Кеш має версію збірки: коли на сайті з'являється нова версія, вона тихо завантажується у фоні
   й відкривається з наступного запуску, а стара видаляється.
   Воркер чіпає лише файли цієї гри: інші сторінки й ігри на тому ж сайті він пропускає. */
const V = 'avto250-d506db0da9';
const at = u => new URL(u, self.location);
const PAGE = at('./index.html').href;                       // одна копія гри в кеші
const PAGE_PATHS = [at('./').pathname, at('./index.html').pathname];
const SMALL = ['./manifest.webmanifest', './icon-192.png', './icon-512.png'];
const OWN = new Set(PAGE_PATHS.concat(SMALL.map(u => at(u).pathname)));

// Сторінку беремо за тією адресою, яку щойно відкрив браузер (./): no-cache питає сервер,
// чи файл не змінився, і при відповіді 304 бере тіло з кешу браузера — гра не завантажується вдруге.
function fill(c) {
  return fetch(new Request('./', { cache: 'no-cache' }))
    .then(res => res.ok ? res : fetch(new Request('./index.html', { cache: 'no-cache' })))
    .then(res => {
      if (!res.ok) throw new Error('page ' + res.status);
      return c.put(PAGE, res);
    })
    .then(() => c.addAll(SMALL.map(u => new Request(u, { cache: 'no-cache' }))));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(fill).then(() => self.skipWaiting()));
});

// Видаляємо лише старі версії цієї гри — кеші інших ігор на сайті не чіпаємо
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('avto250-') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Спершу кеш (миттєвий запуск і без мережі). Якщо файлу в кеші немає — наприклад, його стерла
// інша гра з цього сайту, — беремо з мережі й кладемо назад, щоб наступного разу знову працювало офлайн.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin || !OWN.has(u.pathname)) return;
  const page = PAGE_PATHS.includes(u.pathname);
  const key = page ? PAGE : u.origin + u.pathname;
  let heal = null;
  const res = caches.open(V).then(c => c.match(key).then(hit => hit || fetch(r).then(net => {
    if (net.ok && !net.redirected && net.type === 'basic') {
      heal = c.put(key, net.clone()).then(() => page ? c.addAll(SMALL) : null).catch(() => {});
    }
    return net;
  })));
  e.respondWith(res);
  e.waitUntil(res.then(() => heal, () => null));
});

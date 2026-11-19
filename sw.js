/* Son Sığınak Motel — çevrim dışı önbellek
   Oyun sayfası: önce internetten en yeni sürüm denenir (3 sn), olmazsa önbellekteki sürüm açılır.
   Simgeler ve yazı tipleri: önbellekten gelir, arka planda tazelenir.
   Not: oyunun kendisini güncellemek için sadece index.html'i değiştirmek yeterli, bu dosyaya dokunmana gerek yok. */
const CACHE = 'son-siginak-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));

  if (isPage) {
    // en yeni oyun: ağdan al ve önbelleğe yaz; internet yoksa önbellekteki son sürüm
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req, { cache: 'no-store' }), timeout(3000)]);
        if (res && res.ok) { cache.put('./index.html', res.clone()); return res; }
        throw new Error('bad');
      } catch (_) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // diğer dosyalar (simgeler, Google yazı tipleri): önbellek önce, arka planda tazele
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});

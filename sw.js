/* Раскрой труб — service worker.
   Страница всегда запрашивается заново (свежая версия), офлайн берётся из кэша.
   Версию CACHE менять нужно только при замене иконок или manifest.json. */
var CACHE = 'raskroy-v3';
var FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(FILES.map(function (f) {
        return fetch(new Request(f, { cache: 'reload' })).then(function (res) {
          if (res.ok) return c.put(f, res);
        });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Проверка новой версии идёт мимо кэша
  if (url.searchParams.has('chk')) return;

  if (req.mode === 'navigate') {
    // Страница: сначала сеть (с проверкой на сервере), без сети — из кэша.
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Остальное: сначала кэш, затем сеть.
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

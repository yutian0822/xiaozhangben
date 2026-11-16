/* 小账本 service worker —— 让 App 离线能开，不缓存任何账目数据 */
const CACHE = 'xiaozhangben-v38';
const SHELL = ['./', './index.html', './manifest.webmanifest', './pet.webp', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // 页面本身走网络优先：联网时永远拿到最新的，断网才用缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put('./index.html', res.clone()));
        return res;
      }).catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // 图标、动画这些走缓存优先，后台悄悄更新
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then((res) => { if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

const CACHE_NAME = 'xiaozhu-saving-v1.0.1';

// 预缓存核心静态文件
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/mascot-piggy.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/goal-car.jpg',
  './assets/goal-house.jpg',
  './assets/goal-switch.jpg',
  './assets/goal-travel.jpg',
  './assets/goal-camera.svg',
  './assets/goal-cat.svg',
  './assets/empty-dream.svg'
];

// 安装时预缓存
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('Pre-cache partial item missed:', err);
      });
    })
  );
});

// 激活时清理旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截策略：HTML 优先走网络以保证热更新，图片等资源走缓存优先 + 后台更新
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 对 HTML 页面采取 Network First 策略，确保服务器发布新代码后手机端第一时间获取最新内容
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req) || caches.match('./index.html'))
    );
    return;
  }

  // 对其它静态资源采用 Stale-While-Revalidate 策略
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// 支持客户端主动触发跳过等待
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

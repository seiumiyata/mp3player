const CACHE_NAME = 'mp3-player-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// インストール時にキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => {
        // キャッシュ失敗時のエラーハンドリング
        console.error('ServiceWorker install error:', err);
      })
  );
  self.skipWaiting();
});

// リソース取得時のキャッシュ制御
self.addEventListener('fetch', event => {
  // POSTや外部リソースは除外
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(err => {
        // オフライン時などのエラー時
        return new Response('オフラインです。', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

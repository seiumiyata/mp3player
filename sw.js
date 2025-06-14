/**
 * PWA MP3 Player - Service Worker
 * 静的リソースのキャッシュとオフライン機能を提供
 * 音声ファイルはユーザーのローカルファイルなのでキャッシュ対象外
 */

const CACHE_NAME = 'mp3-player-pwa-v2';
const CACHE_VERSION = '2.0.0';

// キャッシュする静的リソース（App Shell）
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// オフライン用フォールバック
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>オフライン - MP3プレイヤー</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; }
        .offline-message { color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>オフラインです</h1>
    <p class="offline-message">インターネット接続を確認してください。</p>
</body>
</html>
`;

/**
 * Service Worker インストール時の処理
 * 静的リソースをプリキャッシュ
 */
self.addEventListener('install', event => {
  console.log(`[Service Worker] Installing version ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[Service Worker] Install completed');
        // 新しいService Workerを即座にアクティブ化
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Install failed:', error);
      })
  );
});

/**
 * Service Worker アクティベート時の処理
 * 古いキャッシュを削除
 */
self.addEventListener('activate', event => {
  console.log(`[Service Worker] Activating version ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(
          keyList.map(key => {
            if (key !== CACHE_NAME) {
              console.log(`[Service Worker] Removing old cache: ${key}`);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation completed');
        // 既存のクライアントをすぐに制御下に置く
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[Service Worker] Activation failed:', error);
      })
  );
});

/**
 * ネットワークリクエストの処理
 * キャッシュファーストストラテジー（静的リソース）
 * ネットワークファーストストラテジー（API等）
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 外部リソースやPOST等のリクエストは処理しない
  if (!url.origin.includes(self.location.origin) || request.method !== 'GET') {
    return;
  }
  
  // blob: URLは処理しない（音声ファイル用）
  if (url.protocol === 'blob:') {
    return;
  }
  
  // データURL も処理しない
  if (url.protocol === 'data:') {
    return;
  }
  
  event.respondWith(
    handleFetchRequest(request)
  );
});

/**
 * リクエスト処理のメイン関数
 * @param {Request} request - リクエストオブジェクト
 * @returns {Promise<Response>} - レスポンス
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 静的リソース（App Shell）の場合：Cache First
    if (isStaticResource(url)) {
      return await cacheFirst(request);
    }
    
    // その他のリソース：Network First with Cache Fallback
    return await networkFirst(request);
    
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    
    // HTML リクエストの場合はオフラインページを返す
    if (request.destination === 'document') {
      return new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // その他のリクエストはエラーレスポンス
    return new Response('リソースが利用できません', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/**
 * 静的リソースかどうかを判定
 * @param {URL} url - URL オブジェクト
 * @returns {boolean} - 静的リソースの場合true
 */
function isStaticResource(url) {
  const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.json'];
  const staticPaths = ['/', '/index.html', '/manifest.json'];
  
  // パスが静的リソースリストに含まれるか
  if (staticPaths.includes(url.pathname)) {
    return true;
  }
  
  // 拡張子で判定
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Cache First ストラテジー
 * @param {Request} request - リクエスト
 * @returns {Promise<Response>} - レスポンス
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log(`[Service Worker] Cache hit: ${request.url}`);
    return cachedResponse;
  }
  
  console.log(`[Service Worker] Cache miss, fetching: ${request.url}`);
  const response = await fetch(request);
  
  // 成功したレスポンスのみキャッシュ
  if (response.ok) {
    const responseClone = response.clone();
    cache.put(request, responseClone);
  }
  
  return response;
}

/**
 * Network First ストラテジー
 * @param {Request} request - リクエスト
 * @returns {Promise<Response>} - レスポンス
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // 成功したレスポンスをキャッシュ
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    
    return response;
    
  } catch (error) {
    console.log(`[Service Worker] Network failed, checking cache: ${request.url}`);
    
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * エラーハンドリング
 */
self.addEventListener('error', event => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});

/**
 * メッセージ処理（クライアントとの通信用）
 */
self.addEventListener('message', event => {
  const { action, payload } = event.data || {};
  
  switch (action) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
      
    case 'CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    default:
      console.log('[Service Worker] Unknown message:', event.data);
  }
});

/**
 * キャッシュの状態を取得
 * @returns {Promise<Object>} - キャッシュ状態
 */
async function getCacheStatus() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    return {
      cacheName: CACHE_NAME,
      version: CACHE_VERSION,
      cachedItems: keys.length,
      appShellItems: APP_SHELL.length
    };
  } catch (error) {
    console.error('[Service Worker] Cache status error:', error);
    return { error: error.message };
  }
}

console.log(`[Service Worker] Service Worker script loaded, version ${CACHE_VERSION}`);
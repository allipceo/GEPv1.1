/**
 * sw.js — GEP Service Worker
 * 전략: Cache-First (캐시 우선, 없으면 네트워크 → 캐시 저장)
 * 오프라인에서도 문제 풀기 가능하도록 exams.json 포함 캐시
 */

const CACHE_NAME = 'gep-v1';

// install 시 앱 셸 사전 캐시 (가벼운 것만)
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ── install ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── activate: 이전 버전 캐시 삭제 ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── fetch: 캐시 우선, 없으면 네트워크 후 캐시 저장 ────
self.addEventListener('fetch', (event) => {
  // GET 요청만 캐시 처리
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // 유효한 응답만 캐시 저장
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 오프라인 + 캐시 없음: 루트 HTML 반환 (SPA 폴백)
        return caches.match('/index.html');
      });
    })
  );
});

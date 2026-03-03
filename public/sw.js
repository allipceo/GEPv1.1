/**
 * sw.js — GEP Service Worker
 * 전략: Network-First (네트워크 우선, 실패 시 캐시 폴백)
 *
 * GEP_111 긴급 수정:
 *   - CACHE_NAME gep-v1 → gep-v3 (이전 캐시 강제 삭제)
 *   - Supabase / OAuth 요청은 캐시 완전 제외 (LockManager/Cache API 충돌 방지)
 *   - 전략 Cache-First → Network-First (항상 최신 JS 번들 사용)
 */

const CACHE_NAME = 'gep-v3';

// ── install ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── activate: 이전 버전 캐시 전체 삭제 ────────────────
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

// ── fetch: Network-First ──────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Supabase API / OAuth 요청은 캐시 완전 제외 (항상 네트워크)
  if (
    url.includes('supabase.co') ||
    url.includes('supabase.io') ||
    url.includes('accounts.google.com') ||
    url.includes('oauth')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 유효한 응답만 캐시 저장
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 → 캐시 폴백
        return caches.match(event.request)
          .then((cached) => cached || caches.match('/index.html'));
      })
  );
});

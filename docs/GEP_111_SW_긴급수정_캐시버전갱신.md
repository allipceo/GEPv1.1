# GEP_111_SW_긴급수정_캐시버전갱신

**작성일:** 2026.03.03
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-3
**지시자:** 노팀장 (개발관리창006)

---

## 1. 작업 목적

PWA Service Worker의 구버전 캐시로 인해 최신 JS 번들이 적용되지 않는 문제 및 Supabase OAuth 요청이 SW에 가로채여 발생하는 LockManager/Cache API 충돌 문제를 긴급 수정.

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `public/sw.js` | CACHE_NAME 갱신, 전략 변경, Supabase/OAuth 캐시 제외 |

---

## 3. 주요 변경사항

### public/sw.js

```javascript
// 변경 전
const CACHE_NAME = 'gep-v1'
// 전략: Cache-First (캐시 우선, 네트워크 fallback)
// Supabase 요청도 SW가 가로채고 있었음

// 변경 후
const CACHE_NAME = 'gep-v3'   // 이전 캐시(v1, v2) 강제 전체 삭제
// 전략: Network-First (항상 최신 JS 번들 사용)
// Supabase(.co/.io), Google OAuth 요청 캐시 완전 제외
// install 시 사전 캐시 제거 (skipWaiting만 유지)
```

### 변경 요약

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| CACHE_NAME | `gep-v1` | `gep-v3` |
| 캐싱 전략 | Cache-First | Network-First |
| Supabase 요청 | SW가 가로챔 | 캐시 제외 (passthrough) |
| Google OAuth | SW가 가로챔 | 캐시 제외 (passthrough) |
| install 사전 캐시 | 있음 | 제거 (skipWaiting만 유지) |

### 문제 원인
- `gep-v1` 캐시가 구버전 JS 번들을 계속 반환 → 최신 배포가 적용 안 되는 현상
- Supabase 인증 요청을 SW가 가로채면서 LockManager API 충돌 발생

---

## 4. 테스트 결과

- 빌드: ✅ 성공 (public/sw.js는 빌드 대상 외, 직접 배포)
- 실서비스: ✅ 이전 캐시 강제 삭제 확인, OAuth 정상 동작

---

## 5. 배포 결과

- Commit: e33df12
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app

---

## 6. 다음 작업

- Phase 6 다음 단계 노팀장 지시 대기

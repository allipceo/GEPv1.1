# GEP 프로젝트 메모리 — 고팀장용

> 세션 시작 시 이 파일을 읽고 현재 상태를 파악한다.
> 작업 완료 후 변경된 내용을 반드시 업데이트한다.

---

## 현재 상태 (2026-08-08 기준)

| 항목 | 내용 |
|------|------|
| 배포 URL | https://gepv11.vercel.app |
| 최신 문서 번호 | GEPv30-079 |
| 브랜치 | main (Vercel 자동배포) |
| 인증 방식 | 사번@gep.local + 8자리 전화번호 뒷자리 |
| 로그인 UI | 010- 하드코딩, 8자리만 입력 |

---

## 미완료 / 진행 예정

| 우선순위 | 항목 | 비고 |
|----------|------|------|
| 🔴 즉시 | GEPv30-079 배포 확인 | 로그아웃 수정 — 고팀장 push 후 Chrome 검증 필요 |
| 🟡 예정 | OX 진위형 통계 화면 | S2 단계 — 현재 미개발 |
| 🟡 예정 | 원래 개발 순서 복귀 | 버그 수정 완료 후 |

---

## 절대 잊으면 안 되는 것

**1. 로그아웃은 반드시 이 패턴:**
```javascript
useAuthStore.getState().clearAuth()
await supabase.auth.signOut({ scope: 'global' })  // scope 생략 금지
Object.keys(localStorage).filter(k => k.startsWith('sb-') || k.startsWith('gep')).forEach(k => localStorage.removeItem(k))
window.location.href = '/'
```

**2. 신규 store 추가 시 체크리스트:**
- [ ] `getStorageKey(userId)` 패턴 적용했는가?
- [ ] `bindUser(userId)` 함수 추가했는가?
- [ ] App.jsx의 userId useEffect에 연결했는가?

**3. 버그 디버깅 순서:**
콘솔 에러 확인 → 원인 특정 → 수정. "코드가 맞아 보인다"는 추론으로 수정하지 않는다.

**4. localStorage 키 구조:**
```
sb-{project_ref}-auth-token   → Supabase 세션
gep_auth_v1                   → authStore (persist)
gep_stats_v1:{userId}         → statsStore
gep:v1:examStore:{userId}     → examStore
```

---

## GEPv3.0 Phase 2 — 주요 변경 히스토리

| 문서 | 내용 |
|------|------|
| GEPv30-077 | 로그인 UI 수정 (010- 하드코딩, 8자리 입력), 대표님 계정 등록 |
| GEPv30-078 | examStore userId 분리 버그 수정 |
| GEPv30-079 | 로그아웃 버그 수정 (scope:global + clearAuth 선행) |

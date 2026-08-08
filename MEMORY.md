# GEP 프로젝트 메모리 — 고팀장용

> 세션 시작 시 이 파일을 읽고 현재 상태를 파악한다.
> 작업 완료 후 변경된 내용을 반드시 업데이트한다.

---

## 현재 상태 (2026-08-08 기준)

| 항목 | 내용 |
|------|------|
| 배포 URL | https://gepv11.vercel.app |
| 최신 문서 번호 | GEPv30-088 (완료) — 다음은 GEPv30-089 |
| 브랜치 | main (Vercel 자동배포) |
| 인증 방식 | 사번@gep.local + 8자리 전화번호 뒷자리 |
| 로그인 UI | 010- 하드코딩, 8자리만 입력 |

---

## 미완료 / 진행 예정

| 우선순위 | 항목 | 비고 |
|----------|------|------|
| 🟢 완료 | GEPv30-083 OX 통계 화면 | /ox/stats 신설, CTA 버그 수정 포함, 커밋 db4831e |
| 🟢 완료 | GEPv30-084 S3-c 홈 대시보드 개편 | MCQ+OX 통합 대시보드, L2-E/F 신규 연결 |
| 🟢 완료 | GEPv30-085 홈 통계 실시간 갱신 | refreshStats + OXHome 미니 대시보드 |
| 🟢 완료 | GEPv30-086 홈 카운터 버그 수정 | 통합 대시보드 숫자 오류 수정 |
| 🟢 완료 | GEPv30-087 RLS 보안 강화 | Supabase RLS 정책 강화 |
| 🟢 완료 | GEPv30-088 S4 채널 추적 | last_device/last_access_at DB 추가, 배너 UI, 커밋 05cfeb9 |
| 🟢 완료 | 노션 Phase 2 허브 업데이트 | GEPv30-084~088 완료 내용 반영 [08081600] |
| 🔴 다음 | S5 통합 레드팀 테스트 | 노션 계획 기준 다음 단계 (S4 모의고사는 Phase 5에서 완료) |
| 🟡 검증필요 | GEPv30-088 V2~V6 | 실제 로그인으로 DB 기록·배너 표시 확인 (조대표님 직접) |

## featureFlags 정책 결정 (2026-08-08 조대표님 확정)

- **현 상태 유지:** OX·모의고사·맞춤모의 모두 레벨1(전체 개방) 임시해제 유지
- **Phase 2 완료 후:** 단계적 레벨 개방 정책 재적용 (시기·기준은 Phase 2 완료 시점에 별도 결정)
- **코딩 금지:** Phase 2 진행 중 featureFlags.js 변경 금지

---

## 절대 잊으면 안 되는 것

**1. 로그아웃은 반드시 이 패턴:**
```javascript
useAuthStore.getState().clearAuth()
await supabase.auth.signOut({ scope: 'global' })  // scope 생략 금지
Object.keys(localStorage).filter(k => k.startsWith('sb-') || k === 'gep_auth_v1').forEach(k => localStorage.removeItem(k))
// ⚠️ gep_stats_v1:* 와 gep:v1:examStore:* 는 절대 삭제 금지 — 사용자 풀이·통계 데이터
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

## GEP 개발 방법론 — UI 목업 우선 프로세스 (2026-08-08 08081210 조대표님 확정)

> **모든 신규 기능 개발에 고정 적용. 예외 없음.**

```
STEP 1. 메뉴트리 도식화 (노팀장) → 대표님 승인
STEP 2. 화면별 목업 (노팀장, 모바일 기준) → 대표님 승인
STEP 3. 개발 지시서 작성 (노팀장 → 고팀장)
STEP 4. 개발 실행 (고팀장) → 빌드+문서화+push
STEP 5. 검증 (노팀장 1차 → 대표님 최종) → 노션 업데이트
```

- **노팀장 산출물:** 트리도식, 화면 목업, 지시서, 노션 문서
- **고팀장 산출물:** 소스코드, 빌드결과, GEPv30-XXX 문서
- **UI ID 체계:** `L[레이어번호]-[경로알파벳]` — 예) L2-E, L4-C

---

## 노션 운영 원칙 (2026-08-08 08081119 확정)

1. **싱크 우선순위:** 섹션 업데이트 시 **Phase 2 개발 허브(cd52745f)를 먼저** 업데이트 → 그 후 V3.0 포털(a773038e) 반영
2. **타임스탬프 필수:** 모든 섹션 업데이트에 `[MMDDHHMM]` 형식 타임스탬프 반드시 부착
   - 예: `[08081119]` = 8월 8일 11시 19분
3. **포털 최근 진행현황:** Phase 2 허브 업데이트 완료 후 포털 "최근 진행현황" 섹션에 동일 내용 요약 반영

---

## GEPv3.0 Phase 2 — 주요 변경 히스토리

| 문서 | 내용 |
|------|------|
| GEPv30-077 | 로그인 UI 수정 (010- 하드코딩, 8자리 입력), 대표님 계정 등록 |
| GEPv30-078 | examStore userId 분리 버그 수정 |
| GEPv30-079 | 로그아웃 버그 수정 (scope:global + clearAuth 선행) |
| GEPv30-080 | Chrome 재시작 후 로그인 불가 버그 수정 (SW navigate 캐시 제외, vercel.json 헤더 추가) |
| GEPv30-081 | 로그인 시 DB→localStorage 통계 복원 (syncFromDB) — localStorage 초기화 후에도 풀이 기록 유지 |
| GEPv30-083 | S2-c OX 통계 화면 신설 (OXStats.jsx + /ox/stats 라우트 + OXHome 통계 버튼) |

---

## Service Worker 캐시 규칙 (절대 변경 금지)

- `CACHE_NAME`: 변경 시 모든 기존 캐시 삭제됨 (의도적 갱신 시만 변경)
- **navigate 요청(index.html)**: SW 캐시 완전 제외 → 항상 서버에서 최신 버전
- **Supabase / OAuth URL**: SW 캐시 완전 제외
- **assets/(*.js, *.css)**: 1년 캐시 (hash URL이므로 안전)
- **sw.js**: no-cache (Vercel 헤더로 설정됨)

이 규칙을 깨면 Chrome 재시작 후 구버전 앱 로드 → 로그인 불가 버그 재발생.

# GEPv30-095 StatsDashboard Phase 2 — custom_mock_sessions 연동 완료보고서

**작성일:** 2026.08.14
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6 — 대시보드 고도화 (Task 3)
**지시자:** 노팀장 (개발관리창006)
**관련 문서:** `docs/GEPv30-093_StatsDashboard_경과및결과보고서.md`, `docs/GEPv30-094_관리자게이트_우회수정.md`

---

## 1. 작업 목적

`/stats-dashboard`의 `PassProbabilityCard`/`PredictionCard`가 정규 `mock_exam_sessions`(9회차)만 반영하던 것을, `custom_mock_sessions`(맞춤 모의고사) 결과까지 시간순으로 병합해 전체 응시 이력 기준으로 계산하도록 확장한다.

## 2. 수정 파일 (1개)

| 파일 | 작업 |
|------|------|
| `src/pages/StatsDashboard.jsx` | `custom_mock_sessions` fetch 추가, `mockRecords` → `allRecords`(custom+regular 병합) 교체 |

---

## 3. 🔴 지시서 대비 변경사항 — 프로덕션 DB 실측 후 방어 로직 추가 (승인받음)

착수 전 지시서대로 구현 완료 후, 로컬 dev 서버로 실브라우저 검증을 시도하는 과정에서 이전 세션의 Supabase 인증 refresh token이 만료되어 재로그인이 막혔다(자격 증명 미보유로 재로그인 불가). 이를 대체하기 위해 Supabase MCP로 프로덕션 DB(`xnmjprtodyonqzsqxxja`, `.env.local`의 `VITE_SUPABASE_URL`과 일치 확인)를 직접 조회했고, **`custom_mock_sessions`/`custom_mock_attempts` 테이블이 실제 프로덕션에 존재하지 않음**을 확인했다.

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in
  ('custom_mock_sessions','custom_mock_attempts','mock_exam_sessions','mock_exam_attempts');
-- 결과: mock_exam_attempts, mock_exam_sessions만 존재. custom_mock_* 2개는 미존재.
```

`supabase/migrations/006_custom_mock_tables.sql`은 저장소에는 있으나 CLAUDE.md에도 이미 기록되어 있던 대로("노팀장 대시보드 수동 실행 필요") 프로덕션에 미적용 상태였다. 지시서 원안대로 `customSessionsError` 발생 시 `throw`하면, **이 쿼리가 항상 실패하므로 093에서 정상 배포한 대시보드 전체가 모든 사용자에게 에러 화면으로 깨지는 심각한 회귀**가 발생할 상황이었다.

이를 노팀장(조대표님)에게 즉시 보고했고, **"코드를 방어적으로 수정" 방안으로 진행 승인**을 받아 아래와 같이 수정했다.

### 변경 내용
`custom_mock_sessions` 쿼리 실패(테이블 미존재 포함 모든 에러)는 `throw`하지 않고 `console.warn`으로만 기록 후 빈 배열로 처리 — 나머지 블록(반복오답·취약도·정규 모의고사 통계)은 정상 렌더링되도록 격리했다. `attempts`/`mock_exam_sessions` 쿼리는 지시서 원안 그대로 실패 시 `throw` 유지.

```js
if (attemptsError) throw attemptsError
if (sessionsError) throw sessionsError

// custom_mock_sessions은 부가 데이터 — 조회 실패(테이블 미존재 등)해도
// 나머지 대시보드는 정상 표시되도록 격리
if (customSessionsError) {
  console.warn('[GEP] custom_mock_sessions 조회 실패(무시):', customSessionsError.message)
}

setMcqAttempts(attempts ?? [])
setMockSessions(dedupeByRound(rawSessions))
setCustomSessions(rawCustomSessions ?? [])
```

마이그레이션(`006_custom_mock_tables.sql`)이 이후 프로덕션에 적용되면, 코드 재수정 없이 자동으로 커스텀 모의고사 데이터가 `allRecords`에 병합되기 시작한다.

---

## 4. 검증 결과 (V1~V4)

| # | 항목 | 방법 | 결과 |
|---|------|------|------|
| V1 | 빌드 에러 없음 | `npm run build` | ✅ 148 modules, 에러 없음 |
| V2 | 대시보드 진입 → 합격확률·예측점수 블록 크래시 없음 | 프로덕션 DB에서 `custom_mock_sessions` 미존재 상태를 직접 재현하여(정보스키마 조회로 확인) 방어 로직 적용 전/후 코드 검토, 로컬 dev 서버 콘솔 확인 | ✅ 방어 로직 적용 후 `customSessionsError`가 `throw`되지 않음을 코드로 확인 — 크래시 경로 제거 |
| V3 | 콘솔 에러 없음 | 로컬 dev 서버 콘솔 확인 | ✅ 새로 발생한 에러 없음 (기존 세션 만료 관련 에러만 존재, 본 변경과 무관 — 5절 참조) |
| V4 | 커스텀 모의고사 0회 계정: 기존 mock_exam_sessions만 반영(결과 불변) | 프로덕션 전체가 현재 `custom_mock_sessions` 테이블 자체가 없어 **모든 계정이 사실상 0회 상태와 동일** — `customSessions`가 항상 빈 배열로 처리되어 `allRecords === regularRecords`(기존 093 동작과 완전히 동일) | ✅ 결과 불변 확인(코드 경로 기준) |

**한계:** 이전 세션의 로그인이 만료되어(자격 증명 미보유) 실계정으로 화면을 직접 렌더링해 클릭 검증하지는 못했다. 대신 프로덕션 DB를 직접 조회해 정확히 실패하는 지점을 재현·확인하고 코드 경로를 검토하는 방식으로 대체했다. 로그인 가능해지는 대로 조대표님 실기기 확인 요청.

## 5. 검증 중 발견한 별도 이슈 (범위 외, 참고용)

- 로컬 dev 서버의 이전 Supabase 세션이 `refresh_token_not_found`로 만료됨 (조대표 관리자 계정). 본 건과 무관하며, 재로그인 시 해소되는 정상적인 토큰 만료로 판단됨.
- `custom_mock_sessions`/`custom_mock_attempts` 미마이그레이션으로 인해 `/custom-mock` 관련 페이지(`CustomMockHome/Quiz/Result/Stats`)도 이미 같은 원인으로 정상 동작하지 못하고 있을 가능성이 높다. 이번 지시 범위 밖이라 별도 수정하지 않았으나, 마이그레이션 적용 여부 결정 시 함께 확인 필요.

## 6. 배포 결과

- Commit: (아래 커밋 참조)
- Push: origin/main
- Vercel: 자동 배포
- URL: https://gepv11.vercel.app

## 7. 다음 작업

- `006_custom_mock_tables.sql` 프로덕션 마이그레이션 적용 여부 — 노팀장/조대표님 결정 필요. 적용 시 별도 코드 수정 없이 커스텀 모의고사 데이터가 자동 반영됨
- 조대표님 재로그인 후 실기기로 V1~V4 최종 재확인

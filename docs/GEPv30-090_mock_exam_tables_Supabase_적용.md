# GEPv30-090 mock_exam_tables Supabase 적용

**작성일:** 2026.08.08  
**작성자:** 노팀장 (개발관리창 / Cowork)  
**Phase:** Phase 2 — S5 레드팀 테스트 중 발견  
**지시자:** 조대표님 (S5 자동 디버깅 위임)

---

## 1. 작업 목적

S5 레드팀 테스트 중 모의고사(`/mock`) 진입 시 404 오류 발생.  
원인: `supabase/migrations/mock_exam_tables.sql`이 CLAUDE.md에 "수동 실행 필요"로 표기된 채 Supabase에 미적용 상태.  
Supabase MCP `apply_migration`으로 즉시 적용하여 해결.

---

## 2. 수정/추가 내용

| 대상 | 변경 내용 |
|------|----------|
| Supabase DB | `mock_exam_sessions`, `mock_exam_attempts` 테이블 신규 생성 (migration: `create_mock_exam_tables`) |
| CLAUDE.md | "Supabase 미적용 — 수동 실행 필요" 항목 → 적용 완료로 상태 변경 불필요 (문서 내 완료 현황에 반영) |

---

## 3. 적용 내용

`supabase/migrations/mock_exam_tables.sql` 기존 파일을 그대로 `apply_migration`으로 적용.  
`IF NOT EXISTS` 구문 포함으로 안전하게 처리.

### 생성된 테이블
- **mock_exam_sessions**: 모의고사 세션 (회차·교시별 점수·완료 여부)
- **mock_exam_attempts**: 모의고사 문제별 응답 원장

### RLS 정책
- `mock_exam_sessions`: 본인 세션만 SELECT/INSERT/UPDATE
- `mock_exam_attempts`: 본인 응답만 SELECT/INSERT/UPDATE

---

## 4. 테스트 결과

- 모의고사 404 오류: ✅ 해결
- `/mock` 진입: ✅ 정상
- 회차 선택 → 문제풀기 → 성적표: ✅ 정상

---

## 5. 배포 결과

- DB Migration: ✅ Supabase MCP apply_migration 성공
- 소스코드 변경 없음 (DB만 적용)
- URL: https://gepv11.vercel.app

---

## 6. 다음 작업

S6 파일럿 릴리스 준비

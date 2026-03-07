# GEP_125_Phase7_STEP1_Supabase_마이그레이션

**작성일:** 2026.03.07
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 7 STEP 1
**지시자:** 노팀장 (개발관리창008)
**상태:** ✅ 완료 (노팀장 승인)

---

## 1. 작업 목적

Phase 7 서비스 인프라 구축에 필요한 Supabase DB 마이그레이션.
기존 데이터 영향 없음 (IF NOT EXISTS + DEFAULT 사용).

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/phase7_tables.sql` | Phase 7 마이그레이션 SQL (신규) |

---

## 3. 주요 변경사항

### users 테이블 확장 (13개 컬럼)

| 컬럼 | 타입 | 목적 |
|------|------|------|
| is_verified | BOOLEAN DEFAULT false | 실명 인증 여부 |
| verified_name | TEXT | 인증된 실명 |
| verified_method | TEXT | kakao / pass / naver |
| verified_at | TIMESTAMPTZ | 인증 일시 |
| exam_type | TEXT DEFAULT 'insurance_broker' | 응시 시험 종류 |
| exam_date | DATE | 개인 시험 예정일 |
| is_exam_date_set | BOOLEAN DEFAULT false | 시험일 설정 여부 |
| billing_cycle | TEXT DEFAULT 'weekly' | 결제 주기 |
| next_billing_date | DATE | 다음 결제일 |
| auto_renew | BOOLEAN DEFAULT true | 자동 갱신 여부 |
| is_paused | BOOLEAN DEFAULT false | 중단 여부 |
| paused_at | TIMESTAMPTZ | 중단 일시 |
| data_retention_until | TIMESTAMPTZ | 데이터 보관 만료일 |

### 신규 테이블 3개

| 테이블 | 컬럼 수 | RLS | 주요 기능 |
|--------|---------|-----|----------|
| billing_history | 9개 | ✅ 본인만 | 결제 이력 원장 |
| level_change_history | 7개 | ✅ 본인만 | 레벨 변경 이력 |
| exam_types | 5개 | ✅ 전체 읽기 | 시험 종류·일정 마스터 |

`exam_types` 초기 데이터:
```json
{ "id": "insurance_broker", "name": "손해보험중개사", "is_enabled": true,
  "exam_schedule": [{"year":2026,"date1":"2026-06-14","date2":"2026-09-27"}] }
```

### service_level_at_attempt — 추가 불필요 (자체 수정)

초기 설계에서 `attempts`, `ox_attempts` 테이블에 `service_level_at_attempt` 컬럼 추가를 계획했으나,
실행 중 다음 사실을 확인하여 해당 섹션을 제거함:

| 항목 | 사실 |
|------|------|
| `ox_attempts` 테이블 | Supabase에 존재하지 않음. OX 풀이는 `attempts` 테이블 공용 사용 |
| `attempts.service_level` | `schema.sql`에 이미 `service_level INTEGER NOT NULL DEFAULT 1` 존재 |
| 결론 | 기존 `attempts.service_level` 컬럼으로 충분. 별도 ALTER 불필요 |

> **교훈:** CLAUDE.md에 `ox_attempts`가 기재되어 있으나 실제 스키마 및 코드에는 없음.
> 문서와 실제 DB 구조가 불일치. 향후 CLAUDE.md 수정 필요.

---

## 4. 테스트 결과

- 빌드: 해당 없음 (SQL 파일만, JS 코드 무변경)
- Supabase 실행: ✅ Success (노팀장 대시보드 실행 확인)

---

## 5. 배포 결과

| 항목 | 내용 |
|------|------|
| Commit (최초) | `5cd99f1` — SQL 파일 신규 생성 |
| Commit (수정) | `1ddd72d` — ox_attempts 오류 제거 |
| Push | ✅ origin/main |
| Vercel | ✅ 자동 배포 (SQL 파일은 프론트 영향 없음) |

---

## 6. Supabase 실행 결과 확인 항목

| 항목 | 결과 |
|------|------|
| users 컬럼 13개 추가 | ✅ |
| billing_history 테이블 생성 | ✅ |
| level_change_history 테이블 생성 | ✅ |
| exam_types 테이블 생성 + 초기 데이터 1행 | ✅ |

---

## 7. 교훈

| 항목 | 내용 |
|------|------|
| 오류 패턴 | 문서(CLAUDE.md)에 기재된 테이블명이 실제 Supabase 스키마와 불일치 |
| 발견 방법 | Supabase 실행 오류 → 서비스 코드 grep으로 실제 테이블명 확인 |
| 예방책 | 신규 ALTER 전 서비스 코드의 `.from('테이블명')` 확인 필수 |
| CLAUDE.md | `ox_attempts` 항목 삭제 필요 (Phase 7 완료 후 일괄 수정) |

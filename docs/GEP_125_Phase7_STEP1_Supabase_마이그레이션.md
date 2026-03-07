# GEP_125_Phase7_STEP1_Supabase_마이그레이션

**작성일:** 2026.03.07
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 7 STEP 1
**지시자:** 노팀장 (개발관리창008)

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

| 테이블 | 컬럼 수 | 주요 기능 |
|--------|---------|----------|
| billing_history | 9개 | 결제 이력, RLS |
| level_change_history | 7개 | 레벨 변경 이력, RLS |
| exam_types | 5개 | 시험 종류·일정 마스터, 공개 읽기 |

### attempts / ox_attempts 컬럼 추가

| 테이블 | 추가 컬럼 | 목적 |
|--------|----------|------|
| attempts | service_level_at_attempt INTEGER DEFAULT 1 | 풀이 시점 서비스 레벨 |
| ox_attempts | service_level_at_attempt INTEGER DEFAULT 1 | 풀이 시점 서비스 레벨 |

---

## 4. 테스트 결과

- 빌드: 해당 없음 (SQL 파일만 생성)
- Supabase 실행: 노팀장이 대시보드에서 수동 실행 필요

---

## 5. 배포 결과

- Commit: (아래 참조)
- Push: ✅ origin/main
- Vercel: 자동 배포 (SQL 파일은 Vercel 영향 없음)

---

## 6. Supabase 실행 방법

```
Supabase 대시보드 → SQL Editor
→ supabase/migrations/phase7_tables.sql 내용 붙여넣기
→ Run 실행
→ 테이블별 생성 확인:
   - billing_history
   - level_change_history
   - exam_types (초기 데이터 1행 포함)
   - users 컬럼 13개 추가 확인
   - attempts.service_level_at_attempt 컬럼 확인
   - ox_attempts.service_level_at_attempt 컬럼 확인
```

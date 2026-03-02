# GEP_095_unifiedWrongService_통합오답관리

**작성일:** 2026.03.03
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-3
**지시자:** 노팀장 (개발관리창006)

---

## 1. 작업 목적

Phase 6-3 통합 오답 관리 기능의 데이터 엔진 구축.
MCQ / OX / MOCK / CUSTOM 4개 소스의 오답 데이터를 단일 API로 제공하여
향후 통합 오답 복습 UI가 이 서비스 하나만 바라보도록 설계.

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/services/unifiedWrongService.js` | 신규 생성 — 5개 함수, 261줄 |
| `scripts/verify-gep095-step1.mjs` | 신규 생성 — 검증 스크립트 (64 PASS) |

---

## 3. 주요 구현 내용

### 3.1 상수

```js
const CACHE_TTL_MS    = 60 * 60 * 1000  // localStorage TTL: 1시간
const STATS_CACHE_KEY = 'gep:unified_wrong_stats'  // sessionStorage 키
// 캐시 키: `gep:unified_wrong:${userId}`
```

### 3.2 함수 5개

**`getCachedWrongQuestions(userId)`**
- localStorage에서 `gep:unified_wrong:{userId}` 조회
- TTL(1시간) 초과 시 null 반환
- userId 없으면 null early-return (게스트 처리)

**`fetchAllWrongQuestions(userId)`**
- 캐시 히트 → 즉시 반환
- 캐시 미스 → 4개 테이블 `Promise.all` 병렬 조회

| 소스 | 테이블 | 조회 방식 |
|------|-------|---------|
| MCQ | `wrong_questions` | `question_id, wrong_count` 직접 조회 |
| OX | `ox_wrong_questions` | `question_id, wrong_count` 직접 조회 |
| MOCK | `mock_exam_attempts` | `is_correct=false` 필터 후 question_id별 집계 |
| CUSTOM | `custom_mock_attempts` | `is_correct=false` 필터 후 question_id별 집계 |

- 반환 형태: `[{ id, source: 'MCQ'|'OX'|'MOCK'|'CUSTOM', wrong_count }]`
- 정렬: `wrong_count` 내림차순
- 결과를 localStorage에 TTL 1시간 캐시 저장

**`calculateWrongCountStats(questions)`**
- 분포 계산: `{ '6+', '5', '4', '3', '2', '1' }`
- sessionStorage 캐시 (items 개수 같으면 재사용, 달라지면 재계산)

**`reclassifyResults(userId, results)`**
- 입력: `[{ id, source: 'MCQ'|'OX'|'MOCK'|'CUSTOM', isCorrect: boolean }]`
- MOCK/CUSTOM은 전용 wrong 테이블 없으므로 MCQ/OX만 처리
- `Promise.all` 2-슬롯 병렬:
  - 슬롯 1(DELETE): 정답 항목을 wrong_questions/ox_wrong_questions에서 제거
  - 슬롯 2(UPDATE): 오답 항목 wrong_count +1 (RPC `increment_wrong_count_mcq/ox` 사용)
- 완료 후 `invalidateCache` 호출 → 다음 조회 시 최신 데이터 반영

**`filterByWrongCount(questions, minCount)`**
- 클라이언트 사이드 필터
- minCount ≤ 1 → 전체 반환
- minCount=3 → 3회 이상 오답만 반환

---

## 4. 설계 결정 사항

| 결정 | 이유 |
|------|------|
| 4-테이블 개별 조회 (JOIN 없음) | 비용 최적화, 각 테이블 스키마 독립성 유지 |
| MOCK/CUSTOM은 attempts 테이블 집계 | 전용 wrong 테이블 없음 — 클라이언트에서 집계 |
| wrong_count 증가 RPC 설계 | Supabase SDK는 `SET col = col + 1` 미지원 — DB 함수 필요 |
| localStorage TTL 1시간 | 빈번한 DB 조회 방지, 복습 세션 중 일관성 유지 |
| sessionStorage stats 캐시 | 페이지 내 분포 통계 반복 계산 방지 |

### RPC DDL (Supabase 대시보드 수동 실행 필요)

```sql
-- MCQ wrong_count 증가
CREATE OR REPLACE FUNCTION increment_wrong_count_mcq(
  p_user_id UUID, p_question_ids TEXT[]
) RETURNS void AS $$
  UPDATE wrong_questions
    SET wrong_count = wrong_count + 1
    WHERE user_id = p_user_id AND question_id = ANY(p_question_ids);
$$ LANGUAGE sql SECURITY DEFINER;

-- OX wrong_count 증가
CREATE OR REPLACE FUNCTION increment_wrong_count_ox(
  p_user_id UUID, p_question_ids TEXT[]
) RETURNS void AS $$
  UPDATE ox_wrong_questions
    SET wrong_count = wrong_count + 1
    WHERE user_id = p_user_id AND question_id = ANY(p_question_ids);
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 5. 테스트 결과

- 빌드: ✅ 성공 (131 modules)
- 검증: ✅ **64 PASS / 0 FAIL** (`node scripts/verify-gep095-step1.mjs`)

검증 시나리오 12개:
1. getCachedWrongQuestions 캐시 없음
2. 캐시 히트 / TTL 만료
3. clientMerge 4개 소스 병합 + 정렬
4. clientMerge 엣지 케이스 (빈/null/기본값)
5. calculateWrongCountStats 분포 계산
6. sessionStorage 캐시
7. 빈/null 입력
8. filterByWrongCount N회 이상 필터
9. classifyResults 분류 로직
10. 빈/전체정답/전체오답 케이스
11. invalidateCache 무효화
12. 파일 구조 — export 함수 17개 항목 확인

---

## 6. 배포 결과

- Commit: `ecda3ec`
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app

---

## 7. 미결 사항 (STEP 2 이후)

| 항목 | 내용 |
|------|------|
| RPC 미생성 | `increment_wrong_count_mcq/ox` — 노팀장 Supabase 대시보드 수동 실행 필요 |
| wrong_count 컬럼 확인 | `wrong_questions`, `ox_wrong_questions` 테이블에 `wrong_count` 컬럼 존재 여부 |
| STEP 2 | 통합 오답 복습 UI 페이지 구축 |

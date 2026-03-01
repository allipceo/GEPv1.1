# GEP_059_STEP5_Supabase_연동

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_059 지시서

## 1. 작업 목적

Phase 5 모의고사 Supabase 연동.
게스트: localStorage만 / 회원: localStorage(즉시) + Supabase(백그라운드).

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/mock_exam_tables.sql` | 신규 생성 — 테이블 2개 + RLS + 트리거 |
| `src/services/mockExamService.js` | `mockExamSupabase` 객체 추가 (5개 함수) |
| `src/pages/MockExamHome.jsx` | 실제 세션 이력 조회 (Supabase/localStorage) |
| `src/pages/MockExamQuiz.jsx` | handleSubmit에 Supabase 저장 트리거 추가 |

## 3. SQL 스키마

### mock_exam_sessions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID FK | REFERENCES users(user_id) |
| round | INTEGER | 23~31 |
| attempt_number | INTEGER | 재응시 차수 |
| part1_score | NUMERIC(5,1) | 법령 점수 |
| part1_completed | BOOLEAN | 1교시 완료 여부 |
| part1_time_spent | INTEGER | 초 단위 |
| part2_score | NUMERIC(5,1) | 손보 평균 점수 |
| part2_completed | BOOLEAN | 2교시 완료 여부 |
| part2_time_spent | INTEGER | 초 단위 |
| total_average | NUMERIC(5,1) | 3과목 전체 평균 |
| is_pass | BOOLEAN | 합격 여부 |
| is_complete | BOOLEAN | 전체 완료 여부 |

### mock_exam_attempts
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| session_id | UUID FK | REFERENCES mock_exam_sessions(id) |
| user_id | UUID FK | REFERENCES users(user_id) |
| question_id | TEXT | |
| selected_answer | INTEGER | 1~4, null=미응답 |
| is_correct | BOOLEAN | |

## 4. mockExamSupabase 함수

| 함수 | 설명 |
|------|------|
| `getAttemptNumber(userId, round)` | 다음 재응시 차수 계산 |
| `saveSession(userId, round, part, scores, elapsedTime)` | 세션 생성/업데이트 → sessionId 반환 |
| `saveAttempts(userId, sessionId, answers, questions)` | 문제별 응답 bulk INSERT |
| `getSessionHistory(userId)` | 전체 회차 이력 조회 → `{ round: sessionData }` |

## 5. 데이터 흐름

### 회원 (제출 시)
```
MockExamQuiz.handleSubmit()
  → saveResult(round, part, data)          // localStorage 즉시
  → mockExamSupabase.saveSession(...)       // Supabase 백그라운드
    → mockExamSupabase.saveAttempts(...)   // 문제별 기록
```

### MockExamHome 로드 시
```
회원: mockExamSupabase.getSessionHistory(userId) → sessions state
게스트: buildGuestSessions() (localStorage 조합) → sessions state
```

### 게스트 세션 구성 로직
```javascript
// part2 결과 있음 → isComplete: true
// part1만 있음   → progress: part1Done=true, 50%
// 진행 중 데이터  → progress: part1Done=false, x%
// 없음           → new
```

## 6. MockExamQuiz.jsx 추가 사유

지시서에 명시되지 않았으나, Supabase 저장 호출점이 없으면 기능이 동작하지 않음.
handleSubmit에 fire-and-forget 패턴으로 최소 추가. 보고서에 명시.

## 7. Supabase 대시보드 적용 방법

1. Supabase 대시보드 → SQL Editor
2. `supabase/migrations/mock_exam_tables.sql` 내용 전체 실행
3. 테이블 2개 (mock_exam_sessions, mock_exam_attempts) 생성 확인
4. RLS 정책 확인 (auth.uid() = user_id)

## 8. 테스트 결과

- 빌드: ✅ 성공 (6.77s, 116 modules)
- 게스트 localhost 로드: ✅ localStorage 기반 (DB 없이 동작)
- Supabase DB 적용: ⏳ 노팀장 대시보드 적용 필요

## 9. 다음 작업

GEP_060 STEP 6 — 통계 화면 (MockExamStats.jsx) 생성

# GEP_063_Phase5_완료보고서

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 5 완료
**보고 대상:** 노팀장 (개발관리창006) → 조대표님

---

## 1. Phase 5 개요

**서비스명:** 모의고사 (Mock Exam)
**레벨 게이트:** Level 4 이상 전용
**대상 회차:** 23~31회 (총 9회)
**문제 구성:** 1교시 법령 40문제(40분) + 2교시 손보1부+2부 80문제(80분) = 120문제/회

---

## 2. 완료 STEP 목록

| GEP 번호 | STEP | 내용 | 상태 |
|----------|------|------|------|
| GEP_053 | STEP 1 | mockExamConfig.js + mockExamStore.js 생성 | ✅ |
| GEP_055 | STEP 2 | MockExamHome.jsx 회차 선택 화면 | ✅ |
| GEP_056 | 수정 | featureFlags MOCKEXAM_MIN_LEVEL 4 수정 | ✅ |
| GEP_057 | STEP 3 | MockExamQuiz.jsx 문제풀이 화면 | ✅ |
| GEP_058 | STEP 4 | mockExamService.js + MockExamResult.jsx + MockExamBreak.jsx | ✅ |
| GEP_059 | STEP 5 | Supabase 연동 (SQL 마이그레이션 + 서비스 + MockExamHome 실데이터) | ✅ |
| GEP_061 | STEP 6 | MockExamStats.jsx 통계 화면 (SVG 차트) | ✅ |
| GEP_062 | STEP 7 | 통합 테스트 + 버그 수정 (4개) | ✅ |

---

## 3. 신규 파일 목록

| 파일 | 설명 |
|------|------|
| `src/config/mockExamConfig.js` | 모의고사 설정 (회차, 시간, 합격기준) |
| `src/stores/mockExamStore.js` | Zustand 스토어 (기존 스토어 완전 독립) |
| `src/services/mockExamService.js` | 채점, localStorage 저장, Supabase 연동 |
| `src/pages/MockExamHome.jsx` | `/mock` — 회차 선택 |
| `src/pages/MockExamQuiz.jsx` | `/mock/:round/:part` — 문제풀이 |
| `src/pages/MockExamResult.jsx` | `/mock/:round/:part/result` — 교시 성적표 |
| `src/pages/MockExamBreak.jsx` | `/mock/:round/break` — 교시 간 휴식 |
| `src/pages/MockExamStats.jsx` | `/mock/stats` — 응시 통계 |
| `supabase/migrations/mock_exam_tables.sql` | DB 스키마 (sessions + attempts 테이블) |

---

## 4. 라우트 구조

```
/mock                           MockExamHome    회차 선택
/mock/:round/:part              MockExamQuiz    문제풀이 (part1/part2)
/mock/:round/:part/result       MockExamResult  교시 성적표
/mock/:round/result             MockExamResult  최종 종합 성적표
/mock/:round/break              MockExamBreak   교시 간 휴식
/mock/stats                     MockExamStats   응시 통계
```

---

## 5. 주요 기능 구현 내용

### 5-1. 문제 필터링
- exams.json에서 `q.round === round && q.subject === '법령'` (part1)
- part2: `손보1부` 40문제 + `손보2부` 40문제 순서대로 배열

### 5-2. 타이머
- `Date.now()` 절대 시간 기반 (탭 전환/백그라운드 무관)
- 이어하기: `startTime = Date.now() - elapsedTime * 1000` 재계산

### 5-3. 진행 저장
- localStorage: `gep:mock:${round}:${part}` (answers + currentIndex + elapsedTime)
- 자동 저장: 10문제마다 / 수동 저장: 💾 버튼
- 나가기: ExitModal → 저장하고 나가기

### 5-4. 채점 및 합격 판정
- `calculateScore(answers, questions)` → `{ '법령': { correct, total, score }, ... }`
- 합격: 과목당 40점 이상 AND 전체 평균 60점 이상
- 결과 저장: `gep:mock:result:${round}:${part}`

### 5-5. Supabase 연동
- 회원만 / 게스트는 완전히 localStorage 전용
- fire-and-forget 패턴 (네트워크 실패 시 앱 무중단)
- `mock_exam_sessions` → 세션별 점수/완료 여부
- `mock_exam_attempts` → 문제별 선택 답안

### 5-6. 통계 화면
- 전체 요약: 총 응시 / 합격률 / 평균 점수
- SVG Line Chart: 외부 라이브러리 없음, 순수 SVG 구현
- 회차별 이력: 탭 시 성적표로 이동

---

## 6. Supabase 적용 방법 (노팀장 대시보드 작업 필요)

1. Supabase 대시보드 → SQL Editor
2. `supabase/migrations/mock_exam_tables.sql` 전체 실행
3. 테이블 생성 확인: `mock_exam_sessions`, `mock_exam_attempts`
4. RLS 정책 확인: `auth.uid() = user_id`

---

## 7. 알려진 제약사항

| 항목 | 내용 |
|------|------|
| 재응시 통계 | 통계 화면에서 차수별 분리 미지원 (최신 회차별 1개만 표시) |
| 게스트 통계 | 9회차 전체 완료 기준만 표시 (진행 중 제외) |
| 오프라인 Supabase | 게스트는 정상 동작, 회원은 localStorage 기록 후 다음 접속 시 미싱 발생 가능 |

---

## 8. 빌드 / 배포

- **최종 빌드:** ✅ 성공 (117 modules, 6.16s)
- **Commit:** `38b2760` (Phase 5 전체) + GEP_062 버그 수정 커밋
- **Vercel:** GitHub push → 자동 배포
- **URL:** https://gepv11.vercel.app

---

## 9. Phase 5 완료 선언

**GEP Phase 5 모의고사 서비스 개발 완료.**

STEP 1~7 전체 지시서 이행 완료. 빌드 성공. 배포 완료.
Supabase DB 적용은 노팀장 대시보드 작업 후 회원 기능 활성화 예정.

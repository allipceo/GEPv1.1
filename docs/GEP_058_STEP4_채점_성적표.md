# GEP_058_STEP4_채점_성적표

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_058 지시서

## 1. 작업 목적

Phase 5 채점 로직 + 1교시/2교시/최종 성적표 + 휴식 화면 구현.
MockExamQuiz 제출 → 채점 → 성적표 → 2교시 → 최종 성적표 전체 플로우 완성.

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/services/mockExamService.js` | 신규 생성 — 채점·합격판정·결과저장/로드 |
| `src/pages/MockExamResult.jsx` | 신규 생성 — 1교시/2교시/최종 성적표 (3-in-1) |
| `src/pages/MockExamBreak.jsx` | 신규 생성 — 15분 휴식 화면 |
| `src/App.jsx` | 라우트 3개 추가 |
| `src/pages/MockExamQuiz.jsx` | handleSubmit 수정 — 채점 후 성적표 이동 |

## 3. 주요 구현 내용

### mockExamService.js API

| 함수 | 설명 |
|------|------|
| `calculateScore(answers, questions)` | 과목별 정답수·점수 계산 |
| `checkPass(allScores)` | 합격/불합격 판정 (40점·60점 기준) |
| `calcAverage(allScores)` | 전체 평균 점수 |
| `saveResult(round, part, data)` | localStorage 저장 |
| `loadResult(round, part)` | localStorage 로드 |

### 채점 로직
```javascript
// answers: { 1: 2, 2: null, 3: 4, ... }  (questionNumber → answer, 1-based)
// questions[i].subject: '법령' | '손보1부' | '손보2부'
score = (correct / total) × 100  // 소수점 1자리
```

### MockExamResult.jsx — 3가지 모드

| URL | params.part | 표시 내용 |
|-----|-------------|----------|
| `/mock/30/part1/result` | 'part1' | 법령 점수 + 합격선 + 2교시 버튼 |
| `/mock/30/part2/result` | 'part2' | 손보1부+2부 점수 + 최종 성적표 버튼 |
| `/mock/30/result` | undefined | 전체 평균 + 합격/불합격 + 과목별 바 |

### 라우트 흐름
```
MockExamQuiz(part1) → [제출] → /mock/30/part1/result
  → [15분 휴식] → /mock/30/break → /mock/30/part2
  → [바로 2교시] → /mock/30/part2
MockExamQuiz(part2) → [제출] → /mock/30/part2/result
  → [최종 성적표] → /mock/30/result
```

### 점수 컬러 기준
| 점수 | 색상 |
|------|------|
| 60점 이상 | 초록 (green-500/600) |
| 40~59점 | 노랑 (amber-400/500) |
| 40점 미만 | 빨강 (red-400/500) |

### MockExamBreak.jsx
- 15분 (`breakTime: 900초`) 카운트다운
- 1분 이하: red + animate-pulse
- 00:00 → 자동 모달 (2교시 시작 확인)
- "바로 2교시 시작" 버튼 → `/mock/:round/part2`

### MockExamQuiz.jsx 수정 (handleSubmit)
```javascript
// 변경 전: alert placeholder
// 변경 후:
const scores = calculateScore(answers, questions)
saveResult(round, part, { scores, elapsedTime })
localStorage.removeItem(MOCK_LS_KEY(round, part))  // 진행 클리어
navigate(`/mock/${round}/${part}/result`, { state: { scores, elapsedTime } })
```

## 4. 추가된 라우트 (App.jsx)

```javascript
<Route path="/mock/:round/:part/result" element={<MockExamResult />} />
<Route path="/mock/:round/result"       element={<MockExamResult />} />
<Route path="/mock/:round/break"        element={<MockExamBreak />} />
```

## 5. 금지사항 준수

- Supabase 저장: ✅ 없음 (STEP 5 대기)
- 오답확인 기능: ✅ 없음 (Phase 7 대기)
- 통계 화면: ✅ 없음 (STEP 6 대기 — 버튼만 표시)

## 6. 테스트 결과

- 빌드: ✅ 성공 (6.79s, 116 modules)

## 7. 다음 작업

GEP_059 STEP 5 — Supabase 연동 (mock_exam_sessions, mock_exam_results)

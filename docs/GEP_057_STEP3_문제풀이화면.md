# GEP_057_STEP3_문제풀이화면

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_057 지시서

## 1. 작업 목적

Phase 5 모의고사 문제 풀기 화면 (`/mock/:round/:part`) 구현.
1교시(part1)/2교시(part2) 공용 컴포넌트. 타이머, 팔레트, 저장, 제출 모달 포함.

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/MockExamQuiz.jsx` | 신규 생성 — 문제 풀기 화면 |
| `src/App.jsx` | 라우트 1개 추가 (`/mock/:round/:part`) |
| `src/pages/MockExamHome.jsx` | 시작/이어하기 버튼 URL 수정 (`/mock/:round/part1·2`) |

## 3. 주요 구현 내용

### 라우트
- `/mock/:round/:part` (part = 'part1' | 'part2')
- 예: `/mock/30/part1`, `/mock/30/part2`

### 문제 필터링 (exams.json 활용)
```javascript
// part1: 법령 40문제
allQuestions.filter(q => q.round === round && q.subject === '법령')
// part2: 손보1부(40) + 손보2부(40) = 80문제
[...손보1부, ...손보2부].sort by roundNumber
```

### 타이머
| 남은 시간 | 색상 |
|-----------|------|
| 정상 | `text-white/90` |
| 5분 이하 | `text-yellow-200 font-semibold` |
| 1분 이하 | `text-red-200 animate-pulse font-bold` |
| 0 | 자동 제출 모달 |

- `Date.now()` 절대 시간 기반 → 탭 전환 시에도 정확

### 저장 (localStorage)
- key: `gep:mock:{round}:{part}`
- 자동: 10문제마다 (`autoSaveInterval = 10`)
- 수동: 💾 버튼 클릭
- 이어하기: `resumeExam(answers, currentIndex, elapsedTime)` 호출

### 모달
| 모달 | 트리거 | 동작 |
|------|--------|------|
| 제출 확인 | 마지막 문제 "제출하기" / 시간 종료 | 미응답 목록 표시 후 제출 |
| 나가기 확인 | 🏠 나가기 버튼 | 저장하고 나가기 / 계속 풀기 |

### 문제 팔레트
- 우측 상단 `{n}/{total}` 버튼 클릭 시 토글
- 응답 완료: blue-500, 미응답: white/border, 현재: ring-2

### 제출 처리 (STEP 4 placeholder)
```javascript
// STEP 4에서 MockExamResult.jsx로 라우팅 예정
alert('[STEP 4 미구현] 제출 완료')
navigate('/mock')
```

## 4. 데이터 구조 확인 (exams.json)

- `subject`: '법령' | '손보1부' | '손보2부' (직접 필터 가능)
- `roundNumber`: 1~40 (과목내 순서, 정렬 기준)
- `part` 필드: undefined (사용 안 함)
- 회차당: 법령40 + 손보1부40 + 손보2부40 = 120문제 ✅

## 5. 테스트 결과

- 빌드: ✅ 성공 (6.65s, 113 modules)
- Supabase 연동: ✅ 없음 (지시 준수)
- 채점 로직: ✅ 없음 (STEP 4 대기)

## 6. 배포 결과

- Commit: 미배포 (STEP 4 이후 통합 배포 예정)

## 7. 다음 작업

GEP_058 STEP 4 — MockExamResult.jsx (채점 + 성적표 화면) 생성

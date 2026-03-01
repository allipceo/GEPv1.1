# GEP_053_STEP1_Config_Store_생성

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_052 지시서

## 1. 작업 목적

Phase 5 모의고사 서비스의 기반 파일 2개 생성.
레고블럭 원칙에 따라 기존 파일 수정 없이 신규 파일만 추가.

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/config/mockExamConfig.js` | 신규 생성 — 회차, 시험 구조, 시간 제한, 합격 기준 설정 |
| `src/stores/mockExamStore.js` | 신규 생성 — 모의고사 전용 Zustand 스토어 |

## 3. 주요 변경사항

### mockExamConfig.js
- 회차 배열: `[23, 24, 25, 26, 27, 28, 29, 30, 31]`
- 1교시 법령: 40문제, 40분 (2,400초)
- 2교시 손보: 80문제 (1부40+2부40), 80분 (4,800초)
- 휴식 시간: 15분 (900초)
- 합격 기준: 과목당 40점 이상, 전체 평균 60점 이상
- 자동 저장: 10문제마다
- study_mode: `'mock_exam'`

### mockExamStore.js (Actions)
| Action | 설명 |
|--------|------|
| `startExam(round, questions, part)` | 새 모의고사 시작 |
| `resumeExam(...)` | 이어하기 (절대 시간 재계산) |
| `selectAnswer(questionNumber, answer)` | 답안 선택 |
| `nextQuestion()` | 다음 문제 |
| `prevQuestion()` | 이전 문제 |
| `goToQuestion(index)` | 문제 직접 이동 |
| `getElapsedTime()` | 경과 시간 (초) |
| `getRemainingTime()` | 남은 시간 (초) |
| `isTimeout()` | 타임아웃 여부 |
| `getUnansweredQuestions()` | 미응답 문제 목록 |
| `completePart1(score)` | 1교시 완료 처리 |
| `completePart2(scores)` | 2교시 완료 처리 |
| `resetExam()` | 전체 초기화 |

## 4. 테스트 결과

- 빌드: ✅ 성공 (7.00s, 109 modules)
- 기존 파일 수정: ✅ 없음
- Import 에러: ✅ 없음

## 5. 배포 결과

- Commit: 미배포 (STEP 2 이후 통합 배포 예정)
- URL: https://gepv11.vercel.app

## 6. 다음 작업

GEP_054 STEP 2 — MockExamHome.jsx (회차 선택 화면) 생성

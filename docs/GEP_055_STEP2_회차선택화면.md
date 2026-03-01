# GEP_055_STEP2_회차선택화면

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_054 지시서

## 1. 작업 목적

Phase 5 모의고사 회차 선택 화면 (`/mock`) 구현.
레벨 게이트, 9개 회차 카드(미응시/진행중/완료 상태), 시험 구조 안내 포함.

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/MockExamHome.jsx` | 신규 생성 — 회차 선택 화면 |
| `src/App.jsx` | 라우트 1개 추가 (`/mock`) |

## 3. 주요 변경사항

### App.jsx — 라우트 추가
```javascript
// 추가된 라인 (import + Route)
import MockExamHome from './pages/MockExamHome'
<Route path="/mock" element={<MockExamHome />} />
```

### MockExamHome.jsx — 주요 구현 내용

#### 레벨 게이트
- `userFeatures.canMockExam` (MOCKEXAM_MIN_LEVEL = 5) 기준 적용
- featureFlags.js SSOT 준수 (지시서의 "레벨 4" → 실제 레벨 5로 구현)
- 잠금 화면: 🔒 아이콘 + "레벨 5 전용 서비스입니다" 메시지

#### 회차 카드 (9개)
| 상태 | 조건 | 버튼 |
|------|------|------|
| 미응시 (new) | mockSessions에 없음 | 시작하기 (indigo) |
| 진행 중 (progress) | isComplete: false | 이어하기 (amber) + 진행률 바 |
| 완료 (done) | isComplete: true | 성적표 보기 (gray) + 점수 + 합격배지 |

#### 네비게이션
- 상단 좌: `← (화살표)` → `/`
- 상단 우: `통계 ›` → `/mock/stats` (STEP 6 활성화 예정)

#### 시험 구조 안내 배너
- 1교시: 법령 40문제 40분
- 2교시: 손보 80문제 80분
- 합격 기준: 과목당 40점, 전체 평균 60점

#### 임시 데이터
```javascript
// STEP 5에서 Supabase 연동으로 교체 예정
const mockSessions = {
  24: { isComplete: true,  totalAverage: 72.5, isPass: true },
  25: { isComplete: false, part1Done: true,  progressPercent: 50 },
  26: { isComplete: false, part1Done: false, progressPercent: 20 },
}
```

## 4. 특이사항

- **레벨 기준 차이:** GEP_052 지시서는 "레벨 4 미만 잠금"으로 명시했으나,
  `featureFlags.js`의 `MOCKEXAM_MIN_LEVEL = 5`가 SSOT.
  → `userFeatures.canMockExam` (level ≥ 5) 기준으로 구현.
  → 노팀장 확인 후 featureFlags 수정 또는 지시서 기준 변경 결정 필요.

## 5. 테스트 결과

- 빌드: ✅ 성공 (8.04s, 111 modules)
- 기존 파일 수정: App.jsx 2줄만 (import + Route)
- Supabase 연동: ✅ 없음 (지시 준수)
- 신규 페이지 생성: MockExamHome.jsx 1개만

## 6. 배포 결과

- Commit: 미배포 (STEP 3 이후 통합 배포 예정)
- URL: https://gepv11.vercel.app/mock

## 7. 다음 작업

GEP_056 STEP 3 — MockExamQuiz.jsx (문제 풀이 + 타이머) 생성

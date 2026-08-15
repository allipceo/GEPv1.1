# GEPv30-110 고팀장 지시서 정정 — 간이 모의고사 3개 항목

**문서번호**: GEPv30-110  
**작성일**: 2026-08-15  
**작성자**: 노팀장 (Claude Cowork)  
**수신**: 고팀장 (Claude Code)  
**참조 원본**: GEPv30-109  
**성격**: GEPv30-109의 3개 항목 정정. 나머지는 GEPv30-109 원문 그대로.

---

## 정정 1 — 🔴 STEP 9·10: `protectedPage` / `FEATURE_FLAGS` 실제 패턴으로 교체

### 이전 (GEPv30-109 STEP 9 — 잘못됨)

```jsx
{protectedPage(<MiniMockHome />, featureFlags.MINIMOCK_MIN_LEVEL)}
```

```js
// featureFlags.js
export const MINIMOCK_MIN_LEVEL = 1
```

→ `featureFlags`는 App.jsx에 import되지 않음 → `ReferenceError` → 앱 전체 렌더링 불가.  
→ `protectedPage` 두 번째 인자는 숫자가 아닌 옵션 객체 (`{requireApproval: false}` 등).

---

### 정정 후 (GEPv30-110 기준)

**① featureFlags.js — 기존 `FEATURE_FLAGS` 객체에 키 1개 추가**

```js
// src/config/featureFlags.js — 기존 객체에 한 줄 추가
export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,
  WRONGNOTE_MIN_LEVEL:      3,
  OX_MIN_LEVEL:             1,
  MOCKEXAM_MIN_LEVEL:       1,
  ADVANCED_STATS_MIN_LEVEL: 3,
  CUSTOMMOCK_MIN_LEVEL:     1,
  MINIMOCK_MIN_LEVEL:       1,   // ← 추가 (승인 사용자 전체)
};
```

**② App.jsx — 기존 Mock/CustomMock 패턴 그대로 (두 번째 인자 없음)**

```jsx
// App.jsx — import 3개 추가
import MiniMockHome   from './pages/MiniMockHome'
import MiniMockQuiz   from './pages/MiniMockQuiz'
import MiniMockResult from './pages/MiniMockResult'

// Routes 안에 추가 (기존 custom-mock 라우트 아래)
<Route path="/mini-mock"               element={protectedPage(<MiniMockHome />)} />
<Route path="/mini-mock/:setId"        element={protectedPage(<MiniMockQuiz />)} />
<Route path="/mini-mock/:setId/result" element={protectedPage(<MiniMockResult />)} />
```

**③ MiniMockHome.jsx — 레벨 게이트는 컴포넌트 내부에서 직접 체크**

MockExamHome.jsx(line 177) 패턴 그대로:

```jsx
// MiniMockHome.jsx
import { FEATURE_FLAGS } from '../config/featureFlags'
import { useAuthStore }  from '../stores/authStore'

export default function MiniMockHome() {
  const serviceLevel = useAuthStore((s) => s.serviceLevel)
  const canMiniMock  = serviceLevel >= FEATURE_FLAGS.MINIMOCK_MIN_LEVEL

  if (!canMiniMock) {
    return <div>이용 권한이 없습니다.</div>   // 또는 기존 LevelGate 컴포넌트 재사용
  }
  // ... 세트 목록 UI
}
```

---

## 정정 2 — 🟡 STEP 5-2: `calculateMiniMockScore`에 12과목 집계 추가

### 이전 (GEPv30-109 STEP 5-2)

`subjectResults`(3개 대과목)만 반환 → STEP 8의 12과목 취약도 UI에 데이터 없음.

### 정정 후 (GEPv30-110 기준)

```js
// src/services/miniMockService.js
import miniMockConfig from '../config/miniMockConfig'

export function calculateMiniMockScore(questions, answers) {
  const { subjectQuota, passCriteria } = miniMockConfig

  // ── 대과목(3개) 집계 ────────────────────────────────────────────────────
  const subjectMap = {}
  for (const subject of Object.keys(subjectQuota)) {
    subjectMap[subject] = { total: 0, correct: 0 }
  }

  // ── 세부과목(12개) 집계 ─────────────────────────────────────────────────
  const subSubjectMap = {}

  questions.forEach((q, idx) => {
    const selected  = answers[idx] ?? null
    const isCorrect = selected !== null && Number(selected) === Number(q.answer)

    // 대과목
    if (subjectMap[q.subject]) {
      subjectMap[q.subject].total   += 1
      subjectMap[q.subject].correct += isCorrect ? 1 : 0
    }

    // 세부과목 (동적으로 집계 — 12개 모두 자동 처리)
    if (!subSubjectMap[q.subSubject]) {
      subSubjectMap[q.subSubject] = { total: 0, correct: 0 }
    }
    subSubjectMap[q.subSubject].total   += 1
    subSubjectMap[q.subSubject].correct += isCorrect ? 1 : 0
  })

  // ── 대과목별 점수 (100점 환산) ───────────────────────────────────────────
  const subjectResults = {}
  for (const [subject, { total, correct }] of Object.entries(subjectMap)) {
    subjectResults[subject] = {
      total, correct,
      score:  total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  }

  // ── 세부과목별 점수 (100점 환산, 정답률 낮은 순 정렬) ────────────────────
  const subSubjectResults = Object.entries(subSubjectMap)
    .map(([subSubject, { total, correct }]) => ({
      subSubject,
      total,
      correct,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => a.score - b.score)   // 취약과목 먼저

  // ── 전체 ────────────────────────────────────────────────────────────────
  const totalCorrect = Object.values(subjectMap).reduce((s, v) => s + v.correct, 0)
  const averageScore = Math.round((totalCorrect / questions.length) * 100)

  // ── 합격 판정 ────────────────────────────────────────────────────────────
  const subjectPass = Object.entries(subjectResults).every(
    ([, v]) => v.score >= passCriteria.minSubjectScore
  )
  const isPassed = averageScore >= passCriteria.minAverageScore && subjectPass

  return {
    subjectResults,      // 3개 대과목 (합격/과락 판정용)
    subSubjectResults,   // 12개 세부과목 (취약도 UI용, 정답률 낮은 순)
    averageScore,
    totalCorrect,
    isPassed,
  }
}
```

**MiniMockResult.jsx에서 활용:**

```jsx
// state.scores.subSubjectResults 배열을 그대로 map
{scores.subSubjectResults.map(({ subSubject, correct, total, score }) => (
  <div
    key={subSubject}
    style={{ color: score < 40 ? 'red' : score < 60 ? 'orange' : 'inherit' }}
  >
    {subSubject}: {correct}/{total}문 ({score}점)
  </div>
))}
```

---

## 정정 3 — 🟡 STEP 8 / Q6: WrongReview 이동 쿼리 제거

### 이전 (GEPv30-109 Q6·STEP 8)

```js
navigate('/wrong-review?mode=mini_mock&setId={setId}')
```

→ WrongReview.jsx에 `useSearchParams` 없음 — 쿼리 무시됨.

### 정정 후

```js
// MiniMockResult.jsx — 쿼리 없이 단순 이동
navigate('/wrong-review')
```

문구: "오답 재학습" 버튼 클릭 시 전체 오답 이력 화면으로 이동 (mini_mock 필터 없음 — 현재 동작).  
향후 mini_mock 전용 필터가 필요하면 WrongReview.jsx 확장 시 별도 검토.

---

## 영향 없는 항목

| GEPv30-109 섹션 | 변경 여부 |
|----------------|---------|
| STEP 0 Git 선행 작업 | 변경 없음 |
| STEP 1 Q1~Q7 답변 | 변경 없음 |
| STEP 2 세트 생성 스크립트 | 변경 없음 |
| STEP 3 miniMockConfig.js | 변경 없음 |
| STEP 4 miniMockStore.js | 변경 없음 |
| STEP 5-1 세트 로드 | 변경 없음 |
| **STEP 5-2 채점 함수** | **subSubjectResults 추가** ← |
| STEP 5-3 통계 저장 | 변경 없음 |
| STEP 6 MiniMockHome | **레벨 게이트 내부 체크 추가** ← |
| STEP 7 MiniMockQuiz | 변경 없음 |
| **STEP 8 MiniMockResult** | **쿼리 제거, subSubjectResults 활용** ← |
| **STEP 9 App.jsx 라우팅** | **protectedPage 패턴 정정** ← |
| **STEP 10 featureFlags** | **FEATURE_FLAGS 객체 내 키 추가로 정정** ← |
| STEP 11 DB Migration | 변경 없음 (스킵) |
| STEP 12 게이트웨이 | 변경 없음 |
| STEP 13 완료 보고 | 변경 없음 |

---

**GEPv30-110이 GEPv30-109의 위 항목들을 대체한다.**  
구현 기준: GEPv30-109 + GEPv30-110 (두 문서 합산).  
GEPv30-107·108은 참조용으로만 보존.

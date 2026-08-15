# GEPv30-108 고팀장 개발 지시서 보완 — 간이 모의고사 3개 항목 수정

**문서번호**: GEPv30-108  
**작성일**: 2026-08-15  
**작성자**: 노팀장 (Claude Cowork)  
**수신**: 고팀장 (Claude Code)  
**참조 원본**: GEPv30-107  
**성격**: GEPv30-107의 3개 항목 보완 (나머지는 GEPv30-107 원문 그대로 따름)

---

## 배경

고팀장이 GEPv30-107 검토 과정에서 코드베이스 교차검증을 통해 3개 오류를 발견했다.  
GEPv30-107의 해당 섹션을 아래 내용으로 **덮어쓴다**. 나머지 섹션은 변경 없음.

---

## 보완 1 — Section 5: mini_mock_sets.json 문제 스키마에 `round` 필드 추가

### 이전 (GEPv30-107 Section 5 — 잘못됨)

```json
{
  "id": "IBEX_23_1_A01_S01_1",
  "subject": "법령",
  "subSubject": "보험업법",
  "questionRaw": "...",
  "answer": 2
}
```

### 수정 후 (GEPv30-108 기준)

```json
{
  "id": "IBEX_23_1_A01_S01_1",
  "round": 23,
  "subject": "법령",
  "subSubject": "보험업법",
  "questionRaw": "...",
  "answer": 2
}
```

**이유**: `statsService.recordAttempt()`는 내부에서 `Number.isInteger(question.round)`를 검사한다.  
이 값이 없으면 `{ recorded: false, reason: 'invalid_round' }`를 반환하며 통계가 **무음 실패**한다.  
`round` 값은 `exams.json` 각 문제의 `round` 필드에서 세트 생성 시 그대로 복사한다.

**세트 생성 스크립트 수정 포인트**:
```js
// generateMiniMockSets.js
questions.map(q => ({
  id: q.id,
  round: q.round,          // ← 반드시 포함
  subject: q.subject,
  subSubject: q.subSubject,
  questionRaw: q.questionRaw,
  answer: q.answer,
}))
```

---

## 보완 2 — Section 7: `saveToMainAttempts()` 삭제 → `statsService.recordAttempt()` 재사용

### 이전 (GEPv30-107 Section 7 — 잘못됨)

```
제출 시 miniMockService.saveToMainAttempts(answers) 호출
→ attempts 테이블에 INSERT
→ RPC가 자동으로 통계 처리
```

→ **이 설계는 틀렸다.** DB 트리거 없음. 단순 INSERT만 하면 통계(question_stats, subject_stats)에 반영되지 않는다.

### 수정 후 (GEPv30-108 기준)

**`saveToMainAttempts()` 함수를 구현하지 않는다.**

대신 제출 처리 흐름을 다음과 같이 구현한다:

**실제 statsService.js 시그니처 (코드베이스 직접 확인):**
```js
// src/services/statsService.js — 실제 export 형태
export const recordAttempt = async (statsStore, authState, payload) => {
  const { question, selectedAnswer, isCorrect, studyMode = 'round' } = payload
  // ...
}
```

**miniMockService.js 구현:**
```js
// miniMockService.js — submitMiniMock(setQuestions, userAnswers, statsStore, authState)
import { recordAttempt } from './statsService';  // named export, default 아님

export async function submitMiniMock(setQuestions, userAnswers, statsStore, authState) {
  const results = [];

  for (let i = 0; i < setQuestions.length; i++) {
    const question = setQuestions[i];       // round 필드 반드시 포함
    const answer = userAnswers[i];          // null = 미응답

    if (answer === null || answer === undefined) {
      // 미응답 → attempts INSERT 불가 (selected_answer NOT NULL 제약)
      results.push({ question, answer: null, recorded: false });
      continue;
    }

    const isCorrect = answer === question.answer;

    // recordAttempt: named export, 3인자 (statsStore, authState, payload)
    const result = await recordAttempt(statsStore, authState, {
      question,
      selectedAnswer: answer,
      isCorrect,
      studyMode: 'mini_mock',
    });

    results.push({ question, answer, recorded: result.recorded });
  }

  return results;
}
```

**MiniMockQuiz.jsx에서 호출 시:**
```jsx
// miniMockStore와 authState를 각각 주입
const statsStore = useStatsStore();
const authState = useAuthStore();

const results = await submitMiniMock(setQuestions, userAnswers, statsStore, authState);
```

**핵심 규칙**:
- `recordAttempt`는 **named export** — `import { recordAttempt } from './statsService'`
- 시그니처: `recordAttempt(statsStore, authState, { question, selectedAnswer, isCorrect, studyMode })`
- `isCorrect`는 호출 전에 `answer === question.answer`로 계산해서 전달
- 미응답(null) 문제는 루프에서 `continue` — INSERT 시도 금지
- `statsService.js` 파일 자체는 수정 금지 (기존 코드 재사용만)

---

## 보완 3 — Section 11: 제출 버튼 `isSubmitting` 가드 추가

### 이전 (GEPv30-107 Section 11 — 불완전)

```jsx
<button onClick={handleSubmit}>제출</button>
```

### 수정 후 (GEPv30-108 기준)

```jsx
// MiniMockQuiz.jsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return;          // 중복 클릭 방지
  setIsSubmitting(true);
  try {
    const results = await submitMiniMock(setQuestions, userAnswers);
    navigate(`/mini-mock/${setId}/result`, { state: { results } });
  } finally {
    setIsSubmitting(false);          // 에러 시에도 복원
  }
};

// 타이머 만료 자동 제출도 동일한 handleSubmit 사용
// (타이머 콜백에서 handleSubmit() 호출 — 별도 구현 금지)

<button
  onClick={handleSubmit}
  disabled={isSubmitting}
>
  {isSubmitting ? '제출 중...' : '제출'}
</button>
```

**이유**: CLAUDE.md 교훈 — "중복 제출 | isSubmitting 가드 없음 → isSubmitting 상태 추가"  
타이머 만료 자동 제출과 수동 제출 버튼이 동시에 트리거될 수 있음.

---

## 영향 없는 항목 확인

| GEPv30-107 섹션 | 변경 여부 |
|----------------|---------|
| Section 0 핵심 원칙 | 변경 없음 |
| Section 1 서비스 개요 | 변경 없음 |
| Section 2 사용자 플로우 | 변경 없음 |
| Section 3 DB 스키마 | 변경 없음 |
| Section 4 Config | 변경 없음 |
| **Section 5 세트 JSON** | **`round` 필드 추가** ← |
| Section 6 세트 생성 스크립트 구조 | 변경 없음 (스크립트 내 필드 복사만 추가) |
| **Section 7 통계 저장** | **saveToMainAttempts 삭제 → recordAttempt 재사용** ← |
| Section 8 Store | 변경 없음 |
| Section 9 채점 로직 | 변경 없음 |
| Section 10 MiniMockHome | 변경 없음 |
| **Section 11 MiniMockQuiz** | **isSubmitting 가드 추가** ← |
| Section 12 MiniMockResult | 변경 없음 |
| Section 13 라우팅 | 변경 없음 |
| Section 14 AppHeader | 변경 없음 |
| Section 15 featureFlags | 변경 없음 |
| Section 16 금지 사항 | 변경 없음 |
| Section 17 게이트웨이 | 변경 없음 |
| Section 18 보고 기준 | 변경 없음 |

---

## 작업 순서 (보완 반영 후)

1. `gepv30-mini-mock` 브랜치 확인 (이미 생성됨)
2. `scripts/generateMiniMockSets.js` 작성 — `round` 필드 포함하여 세트 JSON 생성
3. `public/data/mini_mock_sets.json` 생성 (30세트)
4. `src/config/miniMockConfig.js` 작성
5. `src/services/miniMockService.js` 작성 — `submitMiniMock()` 포함
6. `src/stores/miniMockStore.js` 작성
7. `src/pages/MiniMockHome.jsx` 작성
8. `src/pages/MiniMockQuiz.jsx` 작성 — `isSubmitting` 가드 포함
9. `src/pages/MiniMockResult.jsx` 작성
10. `src/App.jsx` 라우팅 추가
11. Supabase migration SQL 적용
12. 로컬 빌드 + 게이트웨이 검증
13. 이상 없으면 노팀장에게 보고 → PR 생성

---

**이 문서로 GEPv30-107의 위 3개 항목이 완전히 대체된다.**  
나머지 구현은 GEPv30-107을 기준으로 한다.

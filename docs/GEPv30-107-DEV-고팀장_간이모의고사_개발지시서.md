# GEPv30-107 고팀장 개발 지시서 — 간이 모의고사 (MiniMock)

**문서번호**: GEPv30-107  
**작성일**: 2026-08-15  
**작성자**: 노팀장 (Claude Cowork)  
**수신**: 고팀장 (Claude Code)  
**작업 브랜치**: `gepv30-mini-mock`  
**체크포인트**: `main@7d466c4`

---

## 0. 핵심 원칙

- `main` 브랜치 직접 수정 금지. 반드시 `gepv30-mini-mock` 브랜치에서 작업
- 기존 MockExam, CustomMock 코드 절대 수정 금지
- 기존 `attempts` 테이블 재사용 (`study_mode = 'mini_mock'`)
- 신규 파일은 아래 명시된 것만 추가
- 20분 룰: 빌드 오류 / DB 연결 실패 / 채점 오류 → 즉시 노팀장 보고

---

## 1. 서비스 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | 간이 모의고사 (MiniMock) |
| 문제 수 | 세트당 30문제 |
| 시간 | 40분 (2,400초) |
| 세트 수 | 30세트 (SET 01 ~ SET 30) |
| study_mode | `mini_mock` |
| 최소 레벨 | 1 (승인된 사용자 전체) |

---

## 2. 사용자 플로우

```
홈 → [간이 모의고사] 버튼
  → MiniMockHome: 세트 목록 (SET 01 ~ SET 30)
      - 각 세트: 완료 여부 표시 (미시작 / 진행중 / 완료+점수)
  → 세트 선택 → MiniMockQuiz
      - 진행중 세트: "이어서 풀기 (남은 시간 XX분)" / "처음부터" 선택 다이얼로그
  → 30문제 순차 풀이 (1문제씩, 현재 답 변경 가능)
      - 상단: 타이머 + 진행 (N/30)
      - [나가기] 버튼 → "저장하고 나가기" / "초기화하고 나가기" / "계속 풀기"
      - 타이머 만료 → 자동 제출
  → MiniMockResult
      - 합격 판정 + 점수 + 과목별 분석
      - [오답 재학습] 버튼
```

---

## 3. 신규 파일 목록

### 3-1. 설정

```
src/config/miniMockConfig.js
```

### 3-2. 세트 데이터 (사전 생성)

```
public/data/mini_mock_sets.json
scripts/generate_mini_mock_sets.cjs   ← 세트 생성 스크립트 (1회 실행용)
```

### 3-3. 서비스 / 스토어

```
src/services/miniMockService.js
src/stores/miniMockStore.js
```

### 3-4. 페이지

```
src/pages/MiniMockHome.jsx
src/pages/MiniMockQuiz.jsx
src/pages/MiniMockResult.jsx
```

### 3-5. DB 마이그레이션

```
supabase/migrations/mini_mock_tables.sql
```

### 3-6. 문서

```
docs/GEPv30-107_간이모의고사_구현결과.md   ← 완료 후 작성
```

---

## 4. miniMockConfig.js

```js
// src/config/miniMockConfig.js
export const miniMockConfig = {
  totalSets: 30,
  questionsPerSet: 30,
  timeLimit: 40 * 60, // 2400초

  // 30문제 과목별 배분 (최대잉여법 적용, 합계=30)
  distribution: {
    '법령': {
      total: 10,
      subSubjects: {
        '보험업법': 3,
        '상법':     5,
        '위험관리': 1,
        '세제재무': 1,
      }
    },
    '손보1부': {
      total: 11,
      subSubjects: {
        '자동차보험': 4,
        '특종보험':   3,
        '보증보험':   1,
        '연금저축':   3,
      }
    },
    '손보2부': {
      total: 9,
      subSubjects: {
        '화재보험': 2,
        '해상보험': 4,
        '항공우주': 1,
        '재보험':   2,
      }
    },
  },

  // 합격 기준
  passCriteria: {
    minAverageScore: 60,   // 전체 평균 60점 이상 (18/30 이상)
    minSubjectScore: 40,   // 3대 과목 각 40점 이상
  },

  // 과목별 만점 계산 기준 (문제수 × 점수)
  subjectQuota: {
    '법령':   { count: 10, pointPerQ: 10 },    // 각 10점 → 만점 100
    '손보1부': { count: 11, pointPerQ: 100/11 }, // 각 9.09점 → 만점 100
    '손보2부': { count: 9,  pointPerQ: 100/9 },  // 각 11.11점 → 만점 100
  },

  studyMode: 'mini_mock',
  autoSaveInterval: 5, // 5문제마다 localStorage 저장
};

export default miniMockConfig;
```

---

## 5. 세트 생성 스크립트 (scripts/generate_mini_mock_sets.cjs)

**실행**: `node scripts/generate_mini_mock_sets.cjs`  
**출력**: `public/data/mini_mock_sets.json`

### 알고리즘

```
1. exams.json 로드 (1,080문제)
2. subSubject별로 문제 풀 분류
3. 각 subSubject 풀을 Fisher-Yates 셔플
4. SET 01 ~ SET 30 순서로:
   a. 각 subSubject에서 배분 수만큼 순서대로 추출 (중복 없음)
   b. 추출된 30문제를 과목 순서 섞어 배열
   c. 세트 구성 저장
5. mini_mock_sets.json 출력
```

### 출력 JSON 구조

```json
{
  "version": "1.0",
  "generatedAt": "2026-08-15",
  "totalSets": 30,
  "sets": [
    {
      "setId": 1,
      "setLabel": "SET 01",
      "questions": [
        {
          "id": "IBEX_23_016_T1_S02_016",
          "subject": "법령",
          "subSubject": "상법",
          "questionRaw": "...",
          "answer": 3
        },
        ...
      ]
    },
    ...
  ]
}
```

> **주의**: `questions` 배열은 30개 정확히, answer 필드 포함 (채점용)

---

## 6. DB 스키마 (supabase/migrations/mini_mock_tables.sql)

```sql
-- 간이 모의고사 세션 (세트별 응시 기록)
CREATE TABLE mini_mock_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(user_id),
  set_id          INTEGER     NOT NULL CHECK (set_id BETWEEN 1 AND 30),
  attempt_number  INTEGER     NOT NULL DEFAULT 1,

  -- 결과
  correct_count   INTEGER,
  total_score     NUMERIC(5,1),   -- 전체 환산점수 (correct/30*100)
  law_score       NUMERIC(5,1),   -- 법령 환산점수
  p1_score        NUMERIC(5,1),   -- 손보1부 환산점수
  p2_score        NUMERIC(5,1),   -- 손보2부 환산점수
  is_pass         BOOLEAN,
  time_spent      INTEGER,        -- 소요 시간 (초)

  is_complete     BOOLEAN     NOT NULL DEFAULT false,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 문제별 응답 원장
CREATE TABLE mini_mock_attempts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES mini_mock_sessions(id),
  user_id         UUID        NOT NULL REFERENCES users(user_id),
  question_id     TEXT        NOT NULL,
  subject         TEXT        NOT NULL,
  sub_subject     TEXT        NOT NULL,
  selected_answer INTEGER,        -- 1~4, null=미응답
  is_correct      BOOLEAN     NOT NULL,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_mini_sessions_user ON mini_mock_sessions(user_id);
CREATE INDEX idx_mini_sessions_user_set ON mini_mock_sessions(user_id, set_id);
CREATE INDEX idx_mini_attempts_session ON mini_mock_attempts(session_id);
CREATE INDEX idx_mini_attempts_user ON mini_mock_attempts(user_id);

-- RLS
ALTER TABLE mini_mock_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_mock_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mini_sessions_user_policy ON mini_mock_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY mini_attempts_user_policy ON mini_mock_attempts
  FOR ALL USING (auth.uid() = user_id);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION update_mini_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mini_sessions_updated_at
  BEFORE UPDATE ON mini_mock_sessions
  FOR EACH ROW EXECUTE FUNCTION update_mini_sessions_updated_at();
```

---

## 7. miniMockService.js 주요 함수

```js
// 세트 데이터 로드
export async function loadSet(setId)

// 채점 함수
// returns { totalScore, lawScore, p1Score, p2Score, isPass, subjectResults, wrongQuestions }
export function calculateMiniMockScore(questions, answers)

// localStorage 진행상황 저장 (중간 이탈용)
export function saveProgress(setId, { answers, currentIndex, remainingTime })

// localStorage 진행상황 로드
export function loadProgress(setId)

// localStorage 진행상황 삭제
export function clearProgress(setId)

// Supabase 세션 생성 (시작 시)
export async function createSession(userId, setId)

// Supabase 세션 완료 처리 (제출 시)
export async function completeSession(sessionId, userId, scoreResult, timeSpent)

// Supabase attempts 배치 INSERT (제출 시)
export async function saveAttempts(sessionId, userId, questions, answers)

// 기존 통합 attempts 테이블에도 기록 (통계 반영용)
// study_mode = 'mini_mock'
export async function saveToMainAttempts(userId, questions, answers)

// 사용자의 세트별 완료 현황 조회
export async function getUserSetStatus(userId)
// returns: { [setId]: { isComplete, isPass, totalScore, attemptNumber } }
```

---

## 8. localStorage 키 체계

```js
const MINI_PROGRESS_KEY = (setId) => `gep:mini:progress:${setId}`
const MINI_ACTIVE_KEY   = 'gep:mini:active'  // 현재 진행중인 setId
```

### 저장 데이터 구조

```json
{
  "setId": 3,
  "sessionId": "uuid-...",
  "answers": [2, null, 3, 1, null, ...],  // 30개 배열, null=미응답
  "currentIndex": 12,
  "remainingTime": 1843,
  "savedAt": "2026-08-15T10:23:00.000Z"
}
```

---

## 9. 채점 로직

```js
function calculateMiniMockScore(questions, answers) {
  // 과목별 정답 집계
  const subjects = { '법령': {c:0,t:10}, '손보1부': {c:0,t:11}, '손보2부': {c:0,t:9} }

  questions.forEach((q, i) => {
    if (answers[i] === q.answer) subjects[q.subject].c++
  })

  // 환산점수 (정답수 / 총문제수 × 100)
  const lawScore = subjects['법령'].c   / 10   * 100
  const p1Score  = subjects['손보1부'].c / 11   * 100
  const p2Score  = subjects['손보2부'].c / 9    * 100
  const totalScore = (lawScore + p1Score + p2Score) / 3

  // 합격 판정
  const isPass = totalScore >= 60 && lawScore >= 40 && p1Score >= 40 && p2Score >= 40

  // 세부과목별 정답률
  const subjectResults = {} // { subSubject: { correct, total, accuracy } }

  return { totalScore, lawScore, p1Score, p2Score, isPass, subjectResults, wrongQuestions }
}
```

---

## 10. MiniMockHome.jsx 구성

- 상단: 제목 "간이 모의고사" + 안내 (30문제 / 40분 / 과목 비율 유지)
- 세트 그리드 (30개):
  - 미시작: "SET 01" 회색
  - 진행중: "SET 05" 노란색 + "이어서"
  - 완료(합격): "SET 03" 초록 + 점수
  - 완료(불합격): "SET 07" 빨강 + 점수
- 세트 클릭 시:
  - 진행중이면: 이어서/처음부터 다이얼로그
  - 완료이면: 재도전 여부 다이얼로그

---

## 11. MiniMockQuiz.jsx 구성

- AppHeader 적용 (기존 패턴 동일)
- 상단바: `남은 시간 MM:SS | 12 / 30`
- 문제 영역: questionRaw 렌더링 (기존 Question.jsx 참조)
- 선택지 4개 버튼
- 하단: [이전] [다음] [나가기]
- 나가기 클릭 → 다이얼로그:
  ```
  "저장하고 나가기" → saveProgress() → navigate('/mini-mock')
  "초기화하고 나가기" → clearProgress() → navigate('/mini-mock')
  "계속 풀기" → 닫기
  ```
- 타이머 만료 → 자동 제출 (미응답은 null)
- 마지막 문제(30번) → [제출] 버튼 노출

---

## 12. MiniMockResult.jsx 구성

### 상단: 합격 판정 배너
```
🎉 합격 / ❌ 불합격
전체 평균: 72.3점 (18/30 정답)
```

### 중단: 과목별 성적표
```
┌─────────────┬──────┬──────┬──────────┐
│ 과목        │ 정답 │ 점수 │ 판정     │
├─────────────┼──────┼──────┼──────────┤
│ 법령 (10문) │  7   │ 70점 │ ✅ 통과  │
│ 손보1부(11) │  5   │ 45점 │ ✅ 통과  │
│ 손보2부 (9) │  3   │ 33점 │ ❌ 과락  │
└─────────────┴──────┴──────┴──────────┘
```

### 하단: 12개 세부과목 취약도
- 정답률 낮은 순 정렬
- 컬러 바 표시 (60% 미만 = 빨강, 60~80% = 노랑, 80%↑ = 초록)

### 버튼
- [오답 재학습] → 오답 문제 ID 목록 가지고 WrongReview 또는 UnifiedWrongReview로 이동
- [다시 도전] → 동일 세트 처음부터
- [세트 목록] → MiniMockHome

---

## 13. App.jsx 라우트 추가

```jsx
// 기존 라우트 맨 아래에 추가
import MiniMockHome   from './pages/MiniMockHome'
import MiniMockQuiz   from './pages/MiniMockQuiz'
import MiniMockResult from './pages/MiniMockResult'

// Routes 내부
<Route path="/mini-mock"                    element={protectedPage(<MiniMockHome />)} />
<Route path="/mini-mock/:setId"             element={protectedPage(<MiniMockQuiz />)} />
<Route path="/mini-mock/:setId/result"      element={protectedPage(<MiniMockResult />)} />
```

---

## 14. Home.jsx 버튼 추가

기존 `/mock` 버튼 근처에 추가:

```jsx
<button onClick={() => navigate('/mini-mock')}>
  간이 모의고사
</button>
```

스타일: 기존 모의고사 버튼과 동일한 패턴 유지

---

## 15. 통계 연동 (핵심)

제출 완료 시 두 곳에 기록:

```
1. mini_mock_sessions + mini_mock_attempts (모의고사 전용)
2. 기존 attempts 테이블 (study_mode='mini_mock') → 전체 통계 자동 반영
```

기존 `statsStore.updateStats()` 호출 **불필요** (attempts INSERT 시 RPC가 자동 처리).

---

## 16. 구현 순서 (권장)

```
Step 1: scripts/generate_mini_mock_sets.cjs 작성 및 실행
        → public/data/mini_mock_sets.json 생성 검증

Step 2: supabase/migrations/mini_mock_tables.sql 작성
        → 노팀장에게 확인 요청 (Supabase 적용은 대표님 승인 후)

Step 3: miniMockConfig.js + miniMockService.js 작성

Step 4: miniMockStore.js 작성

Step 5: MiniMockHome.jsx → MiniMockQuiz.jsx → MiniMockResult.jsx 순서

Step 6: App.jsx + Home.jsx 연결

Step 7: 로컬 빌드 검증 (npm run build 오류 없음 확인)

Step 8: 동작 시나리오 전체 테스트:
        - 세트 선택 → 풀이 → 제출 → 결과
        - 중간 이탈 → 저장 → 재진입 → 이어서 풀기
        - 타이머 만료 자동 제출
        - attempts 기록 확인

Step 9: 결과 보고서 docs/GEPv30-107_간이모의고사_구현결과.md 작성
```

---

## 17. 게이트웨이 기준 (검증 완료 조건)

| 항목 | 기준 |
|------|------|
| 빌드 | `npm run build` 오류 없음 |
| 세트 데이터 | 30세트, 각 30문제, 문제 중복 없음 |
| 채점 | 정답 수 → 환산점수 → 합격 판정 정확 |
| 중간 이탈 | 저장 → 재진입 → 이어서 풀기 → 남은 시간 정확 |
| 통계 반영 | attempts 테이블에 30건 기록, study_mode='mini_mock' |
| 기존 서비스 | MockExam, CustomMock, OX 서비스 동작 이상 없음 |

---

## 18. 절대 수정 금지

- `src/services/mockExamService.js`
- `src/services/customMockService.js`
- `src/stores/mockExamStore.js`
- `src/stores/customMockStore.js`
- `public/data/exams.json`
- `supabase/migrations/mock_exam_tables.sql`
- `supabase/migrations/006_custom_mock_tables.sql`
- `main` 브랜치

---

**완료 후 노팀장에게 보고 → 대표님 검토 → 이상 없으면 main 머지**

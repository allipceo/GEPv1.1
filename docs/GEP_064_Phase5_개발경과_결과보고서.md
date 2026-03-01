# GEP_064 Phase 5 개발경과 및 결과 보고서

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**보고 대상:** 노팀장 (개발관리창006) → 조대표님
**참조 범위:** GEP_049 ~ GEP_063

---

## 1. Phase 5 개발 배경 및 목표

### 1-1. 위치

GEPv1.1의 서비스 레벨 체계는 4단계로 구성된다.

```
레벨 1 (게스트)  — MCQ 360문제, 로컬 통계
레벨 2 (회원)   — MCQ 전체 1,080문제, 서버 통계, 틀린문제 풀기
레벨 3 (회원)   — OX 진위형 3,824문제, 모아풀기
레벨 4 (회원)   — 모의고사 ← Phase 5 신규
```

Phase 5는 실전 시험과 동일한 구조(2교시, 120문제, 타이머)를 제공하여 **레벨 4** 이용자가 실전 감각을 익히는 최상위 서비스다.

### 1-2. 개발 목표

- 23~31회 9개 회차, 회차당 120문제 모의고사
- 1교시(법령 40문제·40분) + 휴식 + 2교시(손보 80문제·80분) 2단계 구조
- 이어풀기, 자동 저장, 타임아웃 자동 제출
- 즉시 채점 + 교시별·최종 성적표
- 회원 Supabase 저장 / 게스트 localStorage 전용
- 응시 통계 및 점수 추이 차트

---

## 2. 개발 경과 (STEP별)

### STEP 0 — GEP_049 개발계획서 검토 (사전)

**내용:** Phase 5 전체 설계 검토. 데이터 구조 불일치 1건 선제 발견.

**발견 사항:** GEP_049 지시서는 문제 필터링에 `q.part` 필드를 사용하도록 명시했으나,
실제 `exams.json`에는 `part` 필드가 없고 `subject`('법령'/'손보1부'/'손보2부') 필드로 분류되어 있었다.
즉시 노팀장에게 보고 후 `q.subject`로 필터링 방식을 확정했다.

---

### STEP 1 — GEP_053 Config + Store 생성

**생성 파일:**
- `src/config/mockExamConfig.js`
- `src/stores/mockExamStore.js`

**핵심 결정사항:**

Config를 코드 외부에 분리하여 회차 수 변경, 시간 조정, 합격 기준 변경을 코드 수정 없이 처리할 수 있도록 설계했다.

```javascript
// 단일 수정 포인트 — 회차 추가 시 배열만 수정
rounds: [23, 24, 25, 26, 27, 28, 29, 30, 31],

// 시간 수정 시 여기만
timeLimit: 40 * 60,   // 40분

// 합격 기준 변경 시 여기만
passCriteria: { minSubjectScore: 40, minAverageScore: 60 }
```

Store는 기존 `questionStore`, `oxStore`와 **완전 독립**으로 설계했다. 기존 스토어를 건드리지 않아 Phase 1~4 서비스에 영향 없음.

---

### STEP 2 — GEP_055 MockExamHome (회차 선택)

**생성 파일:** `src/pages/MockExamHome.jsx`

**핵심 구현:** 회차 카드 상태 3분기 — `new` / `progress` / `done`

```
new      → 미응시: "시작하기" 버튼
progress → 진행 중: 진행률 바 + "이어하기" 버튼
done     → 완료: 점수 + 합격/불합격 배지 + "성적표 보기" 버튼
```

**수정 사항 1건:** `featureFlags.js`에 `MOCKEXAM_MIN_LEVEL: 5`로 잘못 설정되어 있던 것을 발견, GEP_056에서 `4`로 수정.

---

### STEP 3 — GEP_057 MockExamQuiz (문제풀이)

**생성 파일:** `src/pages/MockExamQuiz.jsx`

**핵심 구현:**

1. **절대 시간 타이머** — `startTime = Date.now()`로 기록, 1초 setInterval은 표시만 담당.
   탭 전환, 백그라운드 이동, 화면 잠금 여부와 무관하게 실제 경과 시간으로 계산.

2. **이어하기** — localStorage에서 `{ answers, currentIndex, elapsedTime }` 로드,
   `startTime = Date.now() - elapsedTime * 1000`으로 절대 시간 재계산.

3. **문제 팔레트** — 번호 그리드 토글. 응답 문제(파란색)·미응답(흰색)·현재(링) 구분.

4. **자동 저장** — 10문제 이동마다 localStorage 갱신. 💾 수동 저장 버튼.

5. **제출 모달** — 미응답 목록 표시, 타임아웃 시 자동 오픈.

---

### STEP 4 — GEP_058 채점 + 성적표 + 휴식

**생성 파일:**
- `src/services/mockExamService.js` (채점 로직)
- `src/pages/MockExamResult.jsx` (3-in-1 성적표)
- `src/pages/MockExamBreak.jsx` (교시 간 휴식)

**핵심 구현:**

`MockExamResult.jsx`는 라우트 파라미터 하나로 3가지 화면을 분기:

```
/mock/:round/part1/result  →  Part1Result  (법령 1교시 성적표)
/mock/:round/part2/result  →  Part2Result  (손보 2교시 성적표)
/mock/:round/result        →  FinalResult  (최종 종합 성적표)
```

파일 1개로 3개 화면을 처리해 라우트 구조를 단순하게 유지했다.

---

### STEP 5 — GEP_059 Supabase 연동

**생성 파일:** `supabase/migrations/mock_exam_tables.sql`
**수정 파일:** `src/services/mockExamService.js`, `src/pages/MockExamHome.jsx`, `src/pages/MockExamQuiz.jsx`

**핵심 패턴 — 이중 저장 전략:**

```
제출 시점
  ① saveResult(round, part, data)   → localStorage  (즉시, 동기)
  ② mockExamSupabase.saveSession()  → Supabase      (백그라운드, 비동기, 실패 무시)
```

네트워크 불안정 상황에서도 localStorage 결과로 화면 이동이 즉시 처리된다.
Supabase 저장 실패는 fire-and-forget으로 앱 흐름에 영향 없다.

**기존 스키마 패턴 준수:** 기존 DB와 동일하게 `gen_random_uuid()`, `REFERENCES users(user_id)`, `TIMESTAMPTZ` 사용. 임의 스키마 변경 금지 원칙 준수.

---

### STEP 6 — GEP_061 MockExamStats (통계)

**생성 파일:** `src/pages/MockExamStats.jsx`

**핵심 구현 — SVG 순수 차트:**

외부 차트 라이브러리(Chart.js, recharts 등) 없이 순수 SVG로 점수 추이를 구현했다. 번들 크기를 늘리지 않으면서 원하는 디자인(40점·60점 참고선, 합격/불합격 점 색상 구분)을 정밀하게 제어할 수 있다.

```javascript
// 점수 → Y 픽셀 변환 (선형 스케일)
function scoreToY(score) {
  return PAD_T + PLOT_H - (score / 100) * PLOT_H
}

// 인덱스 → X 픽셀 (9회차 등간격)
function idxToX(idx) {
  return PAD_L + (idx / (rounds.length - 1)) * PLOT_W
}
```

---

### STEP 7 — GEP_062 통합 테스트 + 버그 수정

코드 정적 분석으로 4개 버그를 발견·수정했다.

| # | 버그 | 영향 | 수정 |
|---|------|------|------|
| 1 | 더블 클릭 중복 제출 | Supabase 중복 INSERT | `isSubmitting` 가드 |
| 2 | 재응시 결과 혼재 | 게스트 구 결과 잔존 | `RESULT_LS_KEY` 삭제 추가 |
| 3 | 차수 배지 미표시 | `attemptNumber` 반환 누락 | `getSessionHistory` 수정 |
| 4 | alert() 블로킹 | 타이머 중단 위험 | `savedFlash` 인라인 교체 |

---

## 3. 레고블럭 철학 적용 분석

GEP의 레고블럭 철학은 **"기존 파일 수정 최소화, 신규 파일 추가 우선, 독립 모듈 조립"**이다.
Phase 5에서 이 철학이 어떻게 적용되었는지, 그리고 어떤 블럭이 재활용 가능한지를 분석한다.

---

### 3-1. Phase 5가 재활용한 Phase 1~4 블럭

#### 블럭 A — `examStore.loadQuestions()` (Phase 1)

**파일:** `src/stores/examStore.js`
**원래 용도:** MCQ 문제풀기(`/question`)에서 `exams.json` 전체 로드
**Phase 5 재활용:** MockExamQuiz에서 동일 데이터를 회차+과목으로 필터링

```javascript
// MockExamQuiz.jsx
const allQuestions = useExamStore(s => s.questions)   // Phase 1 스토어 그대로 사용
const isReady      = useExamStore(s => s.isReady)

// Phase 5 전용 필터만 추가
const filtered = allQuestions
  .filter(q => q.round === round && q.subject === '법령')
  .sort((a, b) => a.roundNumber - b.roundNumber)
```

`exams.json`을 두 번 로드하지 않는다. App.jsx에서 앱 시작 시 1회 로드한 데이터를 Phase 5가 그대로 슬라이싱해서 쓴다. **메모리·네트워크 자원을 추가 소비하지 않음.**

---

#### 블럭 B — `authStore.userId / authStatus / userFeatures` (Phase 1)

**파일:** `src/stores/authStore.js`
**원래 용도:** Google OAuth 인증, 레벨 게이트
**Phase 5 재활용:** 3곳에서 동일 패턴으로 사용

```javascript
// MockExamHome.jsx — 레벨 게이트
const canMockExam = useAuthStore(s => s.userFeatures.canMockExam)

// MockExamStats.jsx — 회원/게스트 분기
const userId     = useAuthStore(s => s.userId)
const authStatus = useAuthStore(s => s.authStatus)

// MockExamQuiz.jsx — Supabase 저장 조건
const auth = useAuthStore.getState()
if (auth.userId) { ... }   // 게스트 차단
```

인증 로직을 별도로 구현하지 않고 기존 스토어를 그대로 소비한다.

---

#### 블럭 C — `featureFlags.js + canUseFeature()` (Phase 3)

**파일:** `src/config/featureFlags.js`
**원래 용도:** MCQ 통계(레벨 2), 틀린문제(레벨 3) 레벨 게이트
**Phase 5 재활용:** `MOCKEXAM_MIN_LEVEL: 4` 항목 1줄 추가로 레벨 게이트 완성

```javascript
// featureFlags.js에 1줄만 추가
MOCKEXAM_MIN_LEVEL: 4,

// authStore에서 자동으로 canMockExam 계산 (기존 로직 무수정)
canMockExam: canUseFeature(serviceLevel, FEATURE_FLAGS.MOCKEXAM_MIN_LEVEL)
```

레벨 게이트 UI는 `canMockExam` 하나만 체크하면 되므로, Phase 6에서 레벨 5 기능을 추가하더라도 동일한 패턴을 반복한다.

---

#### 블럭 D — 게스트 early-return 패턴 (Phase 2~4)

Phase 2에서 확립된 서비스 레이어의 게스트 처리 패턴을 Phase 5도 그대로 사용한다.

```javascript
// Phase 2 statsService.js의 패턴
if (!userId) { return { success: true, data: [] } }

// Phase 5 mockExamService.js — 동일 패턴
getAttemptNumber: async (userId, round) => {
  if (!userId) return 1          // ← early return
  ...
},
saveSession: async (userId, ...) => {
  if (!userId) return null       // ← early return
  ...
},
getSessionHistory: async (userId) => {
  if (!userId) return {}         // ← early return
  ...
},
```

게스트가 Supabase를 절대 호출하지 않는다. 서비스 레이어에서 차단하므로 페이지 컴포넌트는 userId 존재 여부를 일일이 확인할 필요가 없다.

---

#### 블럭 E — localStorage/Supabase 이중 저장 패턴 (Phase 2)

Phase 2 MCQ에서 확립된 "localStorage 즉시 + Supabase 백그라운드" 패턴을 Phase 5에서 재사용했다.

```javascript
// Phase 2 패턴 (statsService)
// 1. localStorage 즉시 저장 (즉시)
// 2. Supabase 저장 (백그라운드, 실패 무시)

// Phase 5 동일 패턴 (MockExamQuiz handleSubmit)
saveResult(round, part, { scores, elapsedTime })    // ① localStorage 즉시

mockExamSupabase.saveSession(userId, round, part, scores, elapsedTime)  // ② Supabase 백그라운드
  .then(sessionId => { ... })
  .catch(() => {})                                  // 실패 완전 무시
```

---

#### 블럭 F — Supabase RLS + 스키마 패턴 (Phase 2~4)

기존 테이블과 동일한 RLS·스키마 패턴을 신규 테이블에도 적용했다.

```sql
-- Phase 2~4의 기존 패턴
DEFAULT gen_random_uuid()           -- uuid_generate_v4() 아님
REFERENCES users(user_id)           -- users(id) 아님
TIMESTAMPTZ DEFAULT NOW()           -- TIMESTAMP 아님
CREATE POLICY ... USING (auth.uid() = user_id)

-- Phase 5 신규 테이블도 동일 패턴
mock_exam_sessions(id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() ...
)
```

---

### 3-2. Phase 5에서 새로 만든 재활용 가능 블럭

Phase 5에서 새로 구현한 모듈 중 향후 Phase 6 이상 또는 다른 기능에서 재활용할 수 있는 블럭을 정리한다.

---

#### 신규 블럭 1 — `mockExamConfig.js` (단일 설정 진실 소스)

**경로:** `src/config/mockExamConfig.js`
**재활용 방법:** 이 파일만 수정하면 시험 구조 전체에 자동 반영된다.

| 수정 필요 상황 | 수정 위치 |
|----------------|-----------|
| 회차 추가 (32회 신규) | `rounds: [..., 32]` 1줄 추가 |
| 시험 시간 변경 | `timeLimit: Nx60` 1줄 수정 |
| 합격 기준 변경 | `passCriteria.minSubjectScore/minAverageScore` |
| 자동 저장 간격 변경 | `autoSaveInterval: N` |

mockExamConfig를 import하는 파일 목록:
```
mockExamStore.js   → timeLimit 참조
mockExamService.js → passCriteria 참조
MockExamStats.jsx  → rounds 배열로 차트 X축 생성
MockExamBreak.jsx  → breakTime 참조
MockExamQuiz.jsx   → autoSaveInterval 참조
```

모든 파일이 동일 소스를 바라보므로, 하나를 수정하면 전체가 동기화된다.

---

#### 신규 블럭 2 — `mockExamStore.js` (타이머 내장 Zustand 스토어)

**경로:** `src/stores/mockExamStore.js`
**재활용 핵심 기능:**

```javascript
// 절대 시간 기반 타이머 (어떤 시험에도 재사용 가능)
getElapsedTime: () => Math.floor((Date.now() - startTime) / 1000)
getRemainingTime: () => Math.max(0, timeLimit - elapsed)

// 이어하기 (저장된 진행 상태로 재개)
resumeExam: (round, questions, part, savedAnswers, savedIndex, elapsedTime) => {
  startTime = Date.now() - (elapsedTime * 1000)   // 절대 시간 재계산
  ...
}
```

**향후 재활용 시나리오:**
- **Phase 6 미니 모의고사** (20문제·20분): `mockExamConfig.js`에 구조만 추가하면 스토어 수정 불필요
- **시험 모드 단축 테스트** (개발자 도구 없이 1분 제한): `timeLimit` 파라미터만 변경

---

#### 신규 블럭 3 — `mockExamService.js` (채점 + 저장 + Supabase)

**경로:** `src/services/mockExamService.js`

이 파일은 3개의 독립 레이어로 구성되어 있으며 각각 별도로 재활용 가능하다.

**레이어 A — 순수 채점 함수 (완전 독립)**

```javascript
// 어떤 시험 형태에도 재사용 가능 (의존성 zero)
calculateScore(answers, questions) → { subject: { correct, total, score } }
checkPass(allScores)               → boolean
calcAverage(allScores)             → number
```

`calculateScore`는 `answers`(사용자 답안)와 `questions`(정답 포함 문제 배열)만 받으면 되므로, MCQ 오답 분석, 미니 테스트, 복습 채점 등 어디서나 `import { calculateScore }` 하나로 사용 가능하다.

**레이어 B — localStorage CRUD (키 패턴만 일치시키면 재사용)**

```javascript
saveResult(round, part, data)   // gep:mock:result:{round}:{part}
loadResult(round, part)         // 동일 키로 로드
```

키 네이밍 규칙(`gep:mock:*`)을 따르는 한, 어떤 컴포넌트에서도 동일한 결과 데이터를 읽고 쓸 수 있다. MockExamStats가 별도 API 없이 `loadResult()`로 게스트 통계를 구성하는 것이 좋은 예다.

**레이어 C — Supabase 연동 객체 (게스트 차단 내장)**

```javascript
mockExamSupabase.saveSession(userId, round, part, scores, elapsedTime)
mockExamSupabase.saveAttempts(userId, sessionId, answers, questions)
mockExamSupabase.getSessionHistory(userId)
```

`userId`가 null이면 모든 함수가 즉시 반환한다. 호출 측에서 userId 유무를 체크할 필요가 없다.

---

#### 신규 블럭 4 — `MockExamResult.jsx` (3-in-1 성적표 패턴)

**경로:** `src/pages/MockExamResult.jsx`

라우트 파라미터 하나로 3가지 화면을 분기하는 패턴은 유사 구조의 결과 화면에 재사용할 수 있다.

```javascript
// 파라미터 분기 → 서브 컴포넌트 렌더
if (part === 'part1') return <Part1Result ... />
if (part === 'part2') return <Part2Result ... />
return <FinalResult ... />               // part 없음 = 최종
```

**재활용 포인트:**
- `SubjectScoreCard` 컴포넌트 — 과목명 + 점수 + 진행바 + 합격선 텍스트
- `scoreBarColor(score)` / `scoreTextColor(score)` — 점수 구간별 컬러 함수
- `formatDuration(seconds)` — 경과 시간 "N분 N초" 형식 변환

이 3개는 독립 함수·컴포넌트이므로 다른 성적표 화면에서 `import`만으로 재사용 가능하다.

---

#### 신규 블럭 5 — `MockExamStats.jsx` SVG Line Chart

**경로:** `src/pages/MockExamStats.jsx`
**재활용 방법:** `LineChart` 컴포넌트에 `records` 배열만 전달하면 동작한다.

```javascript
// records = [{ round, totalAverage, isPass }, ...]
<LineChart records={records} />
```

Y축 눈금(40점·60점 참고선), X축 회차 레이블, 점 색상(합격/불합격), 연결선이 모두 자동 구성된다. MCQ 회차별 평균 점수, OX 정답률 추이 등에도 `records` 형식만 맞추면 그대로 붙일 수 있다.

---

#### 신규 블럭 6 — `MockExamBreak.jsx` (범용 카운트다운 화면)

**경로:** `src/pages/MockExamBreak.jsx`

```javascript
// 상태 하나로 카운트다운 완성
const [remaining, setRemaining] = useState(mockExamConfig.breakTime)

setInterval(() => {
  setRemaining(prev => {
    if (prev <= 1) { clearInterval(...); setShowTimeup(true); return 0 }
    return prev - 1
  })
}, 1000)
```

`mockExamConfig.breakTime`만 변경하면 다른 대기 화면(시험 시작 전 3초 카운트다운, 채점 로딩 표시 등)에도 그대로 사용 가능하다.

---

### 3-3. 레고블럭 재활용 지도

```
Phase 1~4에서 Phase 5로 흘러온 블럭
─────────────────────────────────────
examStore.questions    →  MockExamQuiz (문제 데이터 재사용)
authStore              →  MockExamHome, MockExamQuiz, MockExamStats (레벨·인증)
featureFlags           →  MockExamHome (레벨 게이트 1줄 추가)
LS+Supabase 이중저장  →  MockExamQuiz (동일 패턴 반복)
RLS/스키마 패턴        →  mock_exam_tables.sql (동일 규칙 적용)
게스트 early-return    →  mockExamService 전 함수

Phase 5에서 만들어진 블럭 (다음 Phase로 재활용 가능)
───────────────────────────────────────────────────
mockExamConfig         →  회차/시간/기준 단일 수정 포인트
calculateScore         →  범용 채점 함수 (의존성 zero)
checkPass/calcAverage  →  합격 판정·평균 유틸 함수
saveResult/loadResult  →  LS 결과 CRUD (키 패턴 재사용)
mockExamSupabase       →  세션·응답 저장 API 객체
SubjectScoreCard       →  과목 점수 카드 컴포넌트
LineChart (SVG)        →  범용 점수 추이 차트
formatDuration         →  경과 시간 표시 유틸
카운트다운 패턴         →  MockExamBreak 패턴 재사용
```

---

## 4. 아키텍처 레이어 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Pages (UI 레이어)                     │
│  MockExamHome  MockExamQuiz  MockExamResult              │
│  MockExamBreak               MockExamStats               │
├─────────────────────────────────────────────────────────┤
│                  Stores (상태 레이어)                    │
│  mockExamStore  ←  기존 examStore (데이터만 공유)        │
├─────────────────────────────────────────────────────────┤
│                 Services (비즈니스 레이어)               │
│  mockExamService                                        │
│  ├─ calculateScore / checkPass / calcAverage            │
│  ├─ saveResult / loadResult (localStorage)              │
│  └─ mockExamSupabase (Supabase API)                     │
├─────────────────────────────────────────────────────────┤
│                  Config (설정 레이어)                    │
│  mockExamConfig  ←  단일 진실 소스                      │
│  featureFlags    ←  레벨 게이트 (기존 파일에 1줄 추가)   │
├─────────────────────────────────────────────────────────┤
│                Infrastructure (인프라 레이어)            │
│  supabase/migrations/mock_exam_tables.sql               │
│  localStorage (gep:mock:* 키 패턴)                      │
└─────────────────────────────────────────────────────────┘
```

각 레이어는 단방향으로 의존한다. Pages는 Stores와 Services에만 의존하며, Infrastructure에 직접 접근하지 않는다. 이 구조는 Phase 1~4와 동일하며 Phase 5가 추가되어도 기존 레이어에 변화가 없다.

---

## 5. 기존 서비스 영향 분석

| 기존 서비스 | Phase 5 영향 |
|-------------|-------------|
| MCQ (Phase 1~2) | **무영향** — examStore 읽기만, 쓰기 없음 |
| OX 진위형 (Phase 4) | **무영향** — 완전 독립 모듈 |
| authStore | **무영향** — 읽기 전용 구독 |
| featureFlags | **최소 영향** — 1줄 추가 (`MOCKEXAM_MIN_LEVEL: 4`) |
| App.jsx | **최소 영향** — import 5줄 + Route 5줄 추가 |

기존 코드 수정은 `featureFlags.js` 1줄, `App.jsx` 10줄이 전부다.

---

## 6. 최종 빌드 지표

| 항목 | 수치 |
|------|------|
| 총 모듈 수 | 117개 |
| JS 번들 | 495.88 kB (gzip: 142.12 kB) |
| CSS 번들 | 28.42 kB (gzip: 6.18 kB) |
| 빌드 시간 | 6.16초 |
| Phase 5 신규 파일 | 9개 |
| Phase 5 기존 파일 수정 | 2개 (featureFlags, App.jsx) |
| 외부 라이브러리 추가 | 0개 |

---

## 7. 결론

Phase 5는 레고블럭 철학이 가장 잘 구현된 단계다.

**재활용:** Phase 1~4에서 검증된 6개 블럭(examStore, authStore, featureFlags, LS+Supabase 패턴, RLS 패턴, 게스트 차단 패턴)을 코드 수정 없이 그대로 조합했다.

**독립성:** 신규 9개 파일 모두 `/mock` 네임스페이스 아래 격리되어 있다. 기존 MCQ·OX 서비스는 Phase 5 존재를 모른다.

**확장성:** `mockExamConfig.js` 한 파일만 수정하면 회차 추가, 시간 조정, 합격 기준 변경이 전체에 자동 반영된다. Phase 6에서 새로운 시험 형태가 추가되더라도 `calculateScore`, `checkPass`, `LineChart`, `SubjectScoreCard`는 즉시 재사용할 수 있다.

**Phase 5 모의고사 서비스 완료 — 2026.03.01**

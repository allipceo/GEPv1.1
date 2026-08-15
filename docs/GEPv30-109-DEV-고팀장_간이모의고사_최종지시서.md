# GEPv30-109 고팀장 최종 지시서 — 간이 모의고사 (MiniMock)

**문서번호**: GEPv30-109  
**작성일**: 2026-08-15  
**작성자**: 노팀장 (Claude Cowork)  
**수신**: 고팀장 (Claude Code)  
**상태**: 승인 완료 — 즉시 착수  
**참조**: GEPv30-107 (원본) + GEPv30-108 (보완) → 본 문서로 통합 대체

---

## 0. 핵심 원칙

- `main` 브랜치 직접 수정 **절대 금지** — `gepv30-mini-mock` 브랜치에서만 작업
- 기존 MockExam · CustomMock 코드 수정 **금지**
- `exams.json` 원천 데이터 수정 **금지**
- `.env.local` · `service_role` · DB 비밀번호 코드 내 삽입 **금지**
- 20분 룰: 빌드 오류 / DB 오류 / 채점 오류 → 즉시 노팀장 보고

---

## STEP 0 — Git 선행 작업 (개발 전 필수)

### 0-1. index.lock 확인 및 제거

```bash
cd C:\dev\GEPv3.0\GEPv1.1-source
# lock 파일이 있으면 제거
Remove-Item .git\index.lock -ErrorAction SilentlyContinue   # PowerShell
# 또는
del .git\index.lock   # cmd
```

### 0-2. 브랜치 확인

```bash
git branch          # gepv30-mini-mock 이미 존재해야 함
git checkout gepv30-mini-mock
git status          # 워킹 트리 클린 확인
```

### 0-3. 문서 3개 커밋 + 푸시

`docs/` 폴더에 이미 복사되어 있음:

```bash
git add docs/GEPv30-106_체크포인트_간이모의고사_개발착수전.md
git add docs/GEPv30-107-DEV-고팀장_간이모의고사_개발지시서.md
git add docs/GEPv30-108-DEV-고팀장_간이모의고사_지시서보완.md
git commit -m "docs: GEPv30-106/107/108 간이 모의고사 기준선·지시서 추가"
git push origin gepv30-mini-mock
```

---

## STEP 1 — 고팀장 검토 질문 답변 (노팀장 최종 확인)

고팀장이 GEPv30-107 검토 시 제기한 질문들에 대한 최종 답변이다.

### Q1 — 세트 수 30개로 충분한가? 풀 고갈 우려

**답변: 진행해도 됨.** 30세트 기준 검증 완료.

- 가장 적은 과목(항공우주·보증보험·위험관리·세제재무): 5문/회차 × 9회차 = 45문 → 세트당 1문 × 30세트 = 30문 필요 → 여유 15문
- 세트 생성 스크립트에서 과목별 풀 고갈 감지 로직 추가할 것 (아래 STEP 2 참고)

### Q2 — localStorage progress 기반이면 기기 전환 시 진행 상태 소실

**답변: 파일럿 단계에서 허용된 트레이드오프.** 변경 없이 진행.

- 기기 전환 시 처음부터 다시 시작하는 것으로 명세 확정
- 나가기 다이얼로그에 "저장하고 나가기 (이 기기에서만 유지됨)" 문구 표시

### Q3 — statsService 재사용 방법이 잘못됨 (GEPv30-108 핵심 수정)

**답변: 아래 STEP 5에 정확한 구현 패턴 명시.** GEPv30-108 보완 내용 통합.

- 실제 시그니처: `recordAttempt(statsStore, authState, payload)` — named export
- 호출 패턴: MockExamQuiz.jsx 기존 코드와 동일하게 사용

### Q4 — mini_mock_sessions 별도 테이블 필요한가

**답변: 파일럿에서는 생략.** 변경 없이 진행.

- 세션 상태는 localStorage만 사용 (CustomMock 방식 동일)
- 통계는 기존 `attempts` 테이블 재사용으로 충분
- 별도 세션 테이블은 Phase 3 이후 검토

### Q5 — 타이머 만료 자동 제출과 수동 제출 동시 트리거 위험

**답변: isSubmitting 가드로 처리.** STEP 6에 구현 명시.

### Q6 — 결과 화면에서 오답 재학습 진입 경로

**답변: WrongReview 기존 화면으로 연결.** `/wrong-review?mode=mini_mock&setId={setId}` 형태로 쿼리파라미터 전달. WrongReview.jsx 수정 없이 기존 라우팅 재사용.

### Q7 — CustomMockQuiz의 isSubmitting 패턴 참조 가능한가

**답변: 가능.** CustomMockQuiz.jsx의 `isSubmitting` 구현을 그대로 참조할 것.

---

## STEP 2 — 세트 데이터 생성 스크립트

파일: `scripts/generateMiniMockSets.js`

### 30문제 과목별 배분표 (Largest Remainder Method 적용 확정값)

| 대과목 | 세부과목 | 원비율 | 30문 배분 |
|--------|---------|--------|---------|
| 법령 | 보험업법 | 10/120 | 3 |
| 법령 | 상법 | 20/120 | 5 |
| 법령 | 위험관리 | 5/120 | 1 |
| 법령 | 세제재무 | 5/120 | 1 |
| 손보1부 | 자동차보험 | 15/120 | 4 |
| 손보1부 | 특종보험 | 10/120 | 3 |
| 손보1부 | 보증보험 | 5/120 | 1 |
| 손보1부 | 연금저축 | 10/120 | 3 |
| 손보2부 | 화재보험 | 10/120 | 2 |
| 손보2부 | 해상보험 | 15/120 | 4 |
| 손보2부 | 항공우주 | 5/120 | 1 |
| 손보2부 | 재보험 | 10/120 | 2 |
| **합계** | | **120** | **30** |

### 스크립트 구현 요건

```js
// scripts/generateMiniMockSets.js
// node scripts/generateMiniMockSets.js 로 실행

const fs = require('fs')
const path = require('path')

const QUOTA = {
  '보험업법': 3, '상법': 5, '위험관리': 1, '세제재무': 1,
  '자동차보험': 4, '특종보험': 3, '보증보험': 1, '연금저축': 3,
  '화재보험': 2, '해상보험': 4, '항공우주': 1, '재보험': 2,
}
const SET_COUNT = 30

// 1. exams.json 로드
const exams = JSON.parse(fs.readFileSync('public/data/exams.json', 'utf8'))

// 2. subSubject별 풀 구성
const pool = {}
for (const [subSubject, count] of Object.entries(QUOTA)) {
  pool[subSubject] = exams.filter(q => q.subSubject === subSubject)
  // 풀 고갈 검증
  if (pool[subSubject].length < count * SET_COUNT) {
    throw new Error(
      `풀 부족: ${subSubject} — 필요 ${count * SET_COUNT}문, 보유 ${pool[subSubject].length}문`
    )
  }
  // Fisher-Yates shuffle
  for (let i = pool[subSubject].length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[subSubject][i], pool[subSubject][j]] = [pool[subSubject][j], pool[subSubject][i]]
  }
}

// 3. 세트 생성 (중복 없이 순서 배분)
const sets = []
for (let s = 0; s < SET_COUNT; s++) {
  const questions = []
  for (const [subSubject, count] of Object.entries(QUOTA)) {
    const picked = pool[subSubject].splice(0, count)  // 앞에서 뽑고 제거
    picked.forEach(q => questions.push({
      id:          q.id,
      round:       q.round,       // ← 필수 (statsService 검증)
      subject:     q.subject,
      subSubject:  q.subSubject,
      questionRaw: q.questionRaw,
      answer:      q.answer,
    }))
  }
  sets.push({
    setId:     s + 1,
    setLabel:  `SET ${String(s + 1).padStart(2, '0')}`,
    questions,
  })
}

// 4. 출력
fs.writeFileSync(
  'public/data/mini_mock_sets.json',
  JSON.stringify(sets, null, 2),
  'utf8'
)
console.log(`✅ mini_mock_sets.json 생성 완료 — ${SET_COUNT}세트`)
```

실행: `node scripts/generateMiniMockSets.js`  
출력: `public/data/mini_mock_sets.json`

---

## STEP 3 — miniMockConfig.js

파일: `src/config/miniMockConfig.js`

```js
// src/config/miniMockConfig.js

const miniMockConfig = {
  studyMode:    'mini_mock',
  totalQuestions: 30,
  timeLimit:    2400,           // 40분 (초)
  setCount:     30,

  subjectQuota: {               // 3대 과목별 문제 수 (채점 기준)
    '법령':    10,
    '손보1부': 11,
    '손보2부':  9,
  },

  passCriteria: {
    minAverageScore:  60,       // 전체 평균 60점 이상
    minSubjectScore:  40,       // 과목당 40점 이상 (과락 방지)
  },
}

export default miniMockConfig
```

---

## STEP 4 — miniMockStore.js

파일: `src/stores/miniMockStore.js`

customMockStore.js 구조 참조. 핵심 상태:

```js
import { create } from 'zustand'

const MINI_PROGRESS_KEY = (setId) => `gep_mini_progress_${setId}`
const MINI_RESULT_KEY   = (setId) => `gep_mini_result_${setId}`

const INITIAL = {
  setId:        null,       // 1~30
  questions:    [],         // 30문제 배열
  answers:      {},         // { questionIndex: selectedAnswer (1-4) | null }
  currentIndex: 0,
  startTime:    null,
  elapsedTime:  0,          // 나가기 시 저장된 경과 시간(초)
  isComplete:   false,
}

const useMiniMockStore = create((set, get) => ({
  ...INITIAL,

  // 세션 시작
  startSet: (setId, questions, resumeData = null) => {
    if (resumeData) {
      set({
        setId, questions,
        answers:      resumeData.answers,
        currentIndex: resumeData.currentIndex,
        elapsedTime:  resumeData.elapsedTime,
        startTime:    Date.now(),
        isComplete:   false,
      })
    } else {
      set({ ...INITIAL, setId, questions, startTime: Date.now() })
    }
  },

  setAnswer: (index, answer) => set(s => ({
    answers: { ...s.answers, [index]: answer }
  })),

  setIndex: (index) => set({ currentIndex: index }),

  // 나가기 시 progress 저장
  saveProgress: () => {
    const s = get()
    const elapsed = s.elapsedTime + Math.floor((Date.now() - s.startTime) / 1000)
    try {
      localStorage.setItem(MINI_PROGRESS_KEY(s.setId), JSON.stringify({
        answers:      s.answers,
        currentIndex: s.currentIndex,
        elapsedTime:  elapsed,
      }))
    } catch (_) {}
  },

  // 진행 데이터 불러오기
  loadProgress: (setId) => {
    try {
      return JSON.parse(localStorage.getItem(MINI_PROGRESS_KEY(setId)) || 'null')
    } catch { return null }
  },

  // 결과 저장
  saveResult: (setId, result) => {
    try {
      localStorage.setItem(MINI_RESULT_KEY(setId), JSON.stringify(result))
    } catch (_) {}
  },

  loadResult: (setId) => {
    try {
      return JSON.parse(localStorage.getItem(MINI_RESULT_KEY(setId)) || 'null')
    } catch { return null }
  },

  clearProgress: (setId) => {
    try { localStorage.removeItem(MINI_PROGRESS_KEY(setId)) } catch (_) {}
  },

  reset: () => set(INITIAL),

  // 남은 시간 계산 (초)
  getRemainingTime: () => {
    const s = get()
    const elapsed = s.elapsedTime + Math.floor((Date.now() - s.startTime) / 1000)
    return Math.max(0, 2400 - elapsed)
  },
}))

export { MINI_PROGRESS_KEY, MINI_RESULT_KEY }
export default useMiniMockStore
```

---

## STEP 5 — miniMockService.js (채점 + 통계 저장)

파일: `src/services/miniMockService.js`

### 5-1. 세트 로드

```js
let _setsCache = null
export async function loadSets() {
  if (_setsCache) return _setsCache
  const res = await fetch('/data/mini_mock_sets.json')
  _setsCache = await res.json()
  return _setsCache
}

export async function loadSet(setId) {
  const sets = await loadSets()
  return sets.find(s => s.setId === setId) ?? null
}
```

### 5-2. 채점 (calculateMiniMockScore)

```js
import miniMockConfig from '../config/miniMockConfig'

export function calculateMiniMockScore(questions, answers) {
  const { subjectQuota, passCriteria } = miniMockConfig

  // 과목별 집계
  const subjectMap = {}
  for (const subject of Object.keys(subjectQuota)) {
    subjectMap[subject] = { total: 0, correct: 0 }
  }

  questions.forEach((q, idx) => {
    const selected = answers[idx] ?? null
    const isCorrect = selected !== null && Number(selected) === Number(q.answer)
    subjectMap[q.subject].total   += 1
    subjectMap[q.subject].correct += isCorrect ? 1 : 0
  })

  // 과목별 점수 (100점 환산)
  const subjectResults = {}
  for (const [subject, { total, correct }] of Object.entries(subjectMap)) {
    subjectResults[subject] = {
      total, correct,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  }

  // 전체 평균
  const totalCorrect = Object.values(subjectMap).reduce((s, v) => s + v.correct, 0)
  const averageScore = Math.round((totalCorrect / questions.length) * 100)

  // 합격 판정
  const subjectPass = Object.entries(subjectResults).every(
    ([, v]) => v.score >= passCriteria.minSubjectScore
  )
  const isPassed = averageScore >= passCriteria.minAverageScore && subjectPass

  return { subjectResults, averageScore, totalCorrect, isPassed }
}
```

### 5-3. 통계 저장 (submitMiniMock) — 핵심 수정 반영

**실제 statsService 호출 패턴 (MockExamQuiz.jsx 기존 코드와 동일):**

```js
import { recordAttempt } from './statsService'   // named export
import useStatsStore from '../stores/statsStore'
import { useAuthStore } from '../stores/authStore'

/**
 * 제출 시 호출 — fire-and-forget (await 불필요)
 * 미응답(null) 문제는 selected_answer NOT NULL 제약으로 skip
 */
export function submitMiniMockStats(questions, answers) {
  const authState = useAuthStore.getState()   // Zustand static getter
  if (!authState.userId) return              // 비로그인 시 skip

  questions.forEach((q, idx) => {
    const selected = answers[idx] ?? null
    if (selected === null) return            // 미응답 skip (NOT NULL 제약)

    recordAttempt(useStatsStore.getState(), authState, {
      question:      q,
      selectedAnswer: selected,
      isCorrect:     Number(selected) === Number(q.answer),
      studyMode:     'mini_mock',
    })
    // fire-and-forget: MockExamQuiz.jsx 동일 패턴, await 없음
  })
}
```

---

## STEP 6 — MiniMockHome.jsx

파일: `src/pages/MiniMockHome.jsx`

기능:
- 세트 목록 (SET 01 ~ SET 30) 표시
- 각 세트 카드: 미시작 / 진행중 (남은시간 표시) / 완료 (점수 표시) 상태 구분
- localStorage에서 progress·result 읽어 상태 계산
- 세트 클릭 → 진행중이면 이어서/처음부터 다이얼로그 → MiniMockQuiz

라우트: `/mini-mock`  
AppHeader: `backTo="/"`

---

## STEP 7 — MiniMockQuiz.jsx

파일: `src/pages/MiniMockQuiz.jsx`

### isSubmitting 가드 — 필수

```jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useMiniMockStore from '../stores/miniMockStore'
import { loadSet, calculateMiniMockScore, submitMiniMockStats } from '../services/miniMockService'

export default function MiniMockQuiz() {
  const { setId } = useParams()
  const navigate  = useNavigate()
  const store     = useMiniMockStore()

  const [isSubmitting, setIsSubmitting] = useState(false)  // ← 필수
  const [showExitModal,   setShowExitModal]   = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const timerRef = useRef(null)

  // ── 타이머 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (store.getRemainingTime() <= 0) {
        clearInterval(timerRef.current)
        handleSubmit()          // 타이머 만료 → 자동 제출 (동일 함수 재사용)
      }
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // ── 제출 핸들러 ──────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (isSubmitting) return          // 중복 트리거 방지 (수동+타이머 동시 방지)
    setIsSubmitting(true)
    clearInterval(timerRef.current)

    const { questions, answers, setId: sid } = useMiniMockStore.getState()
    const scores = calculateMiniMockScore(questions, answers)

    // localStorage 결과 저장
    useMiniMockStore.getState().saveResult(sid, scores)
    useMiniMockStore.getState().clearProgress(sid)

    // 통계 fire-and-forget
    submitMiniMockStats(questions, answers)

    // 결과 화면 이동
    navigate(`/mini-mock/${sid}/result`, { state: { scores } })
    // isSubmitting 복원 불필요 (navigate로 언마운트)
  }

  // ── 나가기 핸들러 ────────────────────────────────────────────────────────
  const handleSaveExit = () => {
    useMiniMockStore.getState().saveProgress()
    navigate('/mini-mock')
  }

  const handleResetExit = () => {
    useMiniMockStore.getState().clearProgress(setId)
    navigate('/mini-mock')
  }

  // ... UI 렌더링
}
```

**제출 버튼:**
```jsx
<button onClick={() => setShowSubmitModal(true)} disabled={isSubmitting}>
  {isSubmitting ? '제출 중...' : '제출'}
</button>
```

---

## STEP 8 — MiniMockResult.jsx

파일: `src/pages/MiniMockResult.jsx`

표시 내용:
- 합격 / 불합격 배너
- 전체 점수 (N/30문 정답, 평균 N점)
- 3대 과목별 점수표 + 과락 여부
- 12개 세부과목별 점수 (취약과목 강조)
- [오답 재학습] 버튼 → `navigate('/wrong-review')` (기존 WrongReview 재사용)
- [다른 세트 풀기] 버튼 → `navigate('/mini-mock')`

라우트: `/mini-mock/:setId/result`  
AppHeader: `backTo="/mini-mock"`

---

## STEP 9 — App.jsx 라우팅 추가

기존 라우트들 아래에 추가 (기존 코드 수정 최소화):

```jsx
// App.jsx — 추가할 라우트 3개
{protectedPage(<MiniMockHome />,  featureFlags.MINIMOCK_MIN_LEVEL)}
{protectedPage(<MiniMockQuiz />,  featureFlags.MINIMOCK_MIN_LEVEL)}
{protectedPage(<MiniMockResult />, featureFlags.MINIMOCK_MIN_LEVEL)}

// 경로
// /mini-mock               → MiniMockHome
// /mini-mock/:setId        → MiniMockQuiz
// /mini-mock/:setId/result → MiniMockResult
```

---

## STEP 10 — featureFlags.js 추가

기존 파일에 1줄 추가:

```js
// src/config/featureFlags.js (기존 파일)
export const MINIMOCK_MIN_LEVEL = 1   // 승인 사용자 전체
```

---

## STEP 11 — Supabase Migration (선택 — 파일럿에서 생략 가능)

파일럿에서는 기존 `attempts` 테이블 재사용만으로 충분.  
별도 `mini_mock_sessions` 테이블은 Phase 3에서 검토.  
→ **이 STEP은 현재 스킵.**

---

## STEP 12 — 게이트웨이 검증 체크리스트

고팀장이 구현 완료 후 아래 항목 순서대로 검증하고 결과를 노팀장에게 보고.

| # | 항목 | 검증 방법 | 기준 |
|---|------|---------|------|
| G1 | 세트 JSON 생성 | `node scripts/generateMiniMockSets.js` 실행 | 오류 없이 30세트 생성 |
| G2 | 로컬 빌드 | `npm run build` | 오류 0 |
| G3 | 세트 로드 | 브라우저에서 SET 01 선택 | 30문제 정상 표시 |
| G4 | 타이머 | 타이머 40분 표시·카운트다운 | 정상 작동 |
| G5 | 답안 저장 | 답안 선택 후 나가기 → 재진입 | 이어서 풀기 정상 |
| G6 | 제출 | 30문제 중 일부만 답한 후 제출 | 미응답 포함 결과 정상 |
| G7 | 채점 | 결과 화면 점수 | 수동 계산과 일치 |
| G8 | 통계 기록 | 제출 후 Home 통계 | 오늘 풀이 수 반영 |
| G9 | attempts | Supabase에서 `study_mode='mini_mock'` 확인 | 응답 문제만 기록됨 |
| G10 | 타이머 만료 | 개발 모드에서 타이머 5초로 단축 후 대기 | 자동 제출 정상 |
| G11 | 중복 제출 방지 | 제출 버튼 빠르게 2회 클릭 | 1회만 처리됨 |

---

## STEP 13 — 완료 보고 및 PR

모든 게이트웨이 통과 후:

```bash
git add .
git commit -m "feat: GEPv30-간이모의고사(MiniMock) 신규 구현"
git push origin gepv30-mini-mock
```

노팀장에게 보고 항목:
1. 게이트웨이 G1~G11 결과표
2. 빌드 성공 스크린샷
3. Supabase attempts 확인 스크린샷
4. 특이사항 또는 설계 변경 내역

노팀장 확인 후 PR (`gepv30-mini-mock` → `main`) 생성.

---

**본 GEPv30-109가 GEPv30-107과 GEPv30-108을 완전히 대체한다.**

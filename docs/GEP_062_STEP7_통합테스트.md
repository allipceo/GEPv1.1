# GEP_062_STEP7_통합테스트

**작업일시:** 2026.03.01
**작업자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_062 지시서

## 1. 작업 목적

Phase 5 통합 테스트 + 버그 수정. 코드 정적 분석(static analysis)으로 예상 버그 체크리스트를 전수 검토하고 발견된 4개 버그를 수정.

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/services/mockExamService.js` | `getSessionHistory()` — `attemptNumber` 반환 추가 |
| `src/pages/MockExamResult.jsx` | `handleRetry()` — `RESULT_LS_KEY` 삭제 추가, import 수정 |
| `src/pages/MockExamQuiz.jsx` | `handleSubmit()` isSubmitting 가드 추가, alert() → 인라인 flash |

## 3. 버그 상세 및 수정

### Bug 1: 중복 제출 (MockExamQuiz.jsx)

**증상:** SubmitModal 제출 버튼 더블 클릭 시 `handleSubmit()` 2회 호출 → Supabase에 중복 세션/응답 INSERT 가능

**변경 전**
```javascript
function handleSubmit() {
  const store = useMockExamStore.getState()
  ...
}
```

**변경 후**
```javascript
const [isSubmitting, setIsSubmitting] = useState(false)

function handleSubmit() {
  if (isSubmitting) return
  setIsSubmitting(true)
  ...
}
```

---

### Bug 2: 재응시 시 결과 혼재 (MockExamResult.jsx)

**증상:** 게스트가 "다시풀기" 후 part1만 완료하고 홈으로 나가면,
`buildGuestSessions()`가 old part2 결과를 읽어 `isComplete: true`로 표시 → "성적표 보기" 클릭 시 새 part1 + 구 part2 혼합 최종 성적표 출력

**변경 전**
```javascript
function handleRetry() {
  try {
    localStorage.removeItem(PROGRESS_LS_KEY(round, 'part1'))
    localStorage.removeItem(PROGRESS_LS_KEY(round, 'part2'))
  } catch (_) {}
  navigate(`/mock/${round}/part1`)
}
```

**변경 후**
```javascript
function handleRetry() {
  try {
    localStorage.removeItem(PROGRESS_LS_KEY(round, 'part1'))
    localStorage.removeItem(PROGRESS_LS_KEY(round, 'part2'))
    localStorage.removeItem(RESULT_LS_KEY(round, 'part1'))   // ← 추가
    localStorage.removeItem(RESULT_LS_KEY(round, 'part2'))   // ← 추가
  } catch (_) {}
  navigate(`/mock/${round}/part1`)
}
```

---

### Bug 3: 통계 차수 배지 미표시 (mockExamService.js)

**증상:** `getSessionHistory()`가 `attempt_number` 컬럼을 SELECT 하지만 반환 객체에 포함하지 않음 → MockExamStats의 `s.attemptNumber`가 항상 undefined → `?? 1` 기본값 → HistoryRow "2차/3차" 배지 영구 숨김

**변경 전**
```javascript
history[session.round] = {
  isComplete:   session.is_complete,
  totalAverage: session.total_average ?? 0,
  isPass:       session.is_pass ?? false,
  part1Done:    session.part1_completed,
  progressPercent: ...
}
```

**변경 후**
```javascript
history[session.round] = {
  isComplete:    session.is_complete,
  totalAverage:  session.total_average ?? 0,
  isPass:        session.is_pass ?? false,
  part1Done:     session.part1_completed,
  attemptNumber: session.attempt_number ?? 1,   // ← 추가
  progressPercent: ...
}
```

---

### Bug 4: alert() 블로킹 (MockExamQuiz.jsx)

**증상:** 수동 저장(💾) 버튼 클릭 시 `alert()` 호출 → 모바일에서 OS 레벨 팝업 발생, 타이머 setTimeout 일시 정지 가능

**변경 전**
```javascript
function handleManualSave() {
  saveProgress(round, part)
  alert('저장되었습니다.')
}
```

**변경 후**
```javascript
const [savedFlash, setSavedFlash] = useState(false)

function handleManualSave() {
  saveProgress(round, part)
  setSavedFlash(true)
  setTimeout(() => setSavedFlash(false), 1500)
}
// 💾 버튼 위 "저장됨" 텍스트 1.5초 표시
```

---

## 4. 예상 버그 체크리스트 전체 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| 타이머 음수 표시 | ✅ 정상 | `formatTime`: `if (seconds <= 0) return '00:00'`, `getRemainingTime`: `Math.max(0,...)` |
| localStorage 키 충돌 | ✅ 정상 | MOCK_LS_KEY=progress, RESULT_LS_KEY=결과 — 키 패턴 분리 |
| 답안 미저장 | ✅ 정상 | 10문제 자동+수동저장, 나가기 시 저장 프롬프트 |
| 중복 제출 | 🐛 → ✅ | Bug 1 수정 |
| 과목별 점수 계산 오류 | ✅ 정상 | `calculateScore` 1-based 인덱스 정합 |
| 합격 판정 로직 오류 | ✅ 정상 | 과목 40점 이상 AND 평균 60점 이상 정확히 구현 |
| 성적표 과목 색상 오류 | ✅ 정상 | scoreTextColor/scoreBarColor: 60이상=green, 40이상=amber, 이하=red |
| 이어하기 타이머 초기화 | ✅ 정상 | `startTime = Date.now() - (elapsedTime * 1000)` 절대 시간 재계산 |
| 게스트 Supabase 호출 시도 | ✅ 정상 | `if (auth.userId)` 가드 + 서비스 레이어 `if (!userId) return null` 이중 방어 |
| RLS 권한 오류 | ✅ 정상 | SQL 마이그레이션: `auth.uid() = user_id` RLS 정책 적용 |
| 재응시 결과 혼재 | 🐛 → ✅ | Bug 2 수정 |
| 통계 차수 배지 | 🐛 → ✅ | Bug 3 수정 |
| alert() 블로킹 | 🐛 → ✅ | Bug 4 수정 |

## 5. 배포 결과

- 빌드: ✅ 성공 (117 modules, 6.16s)
- 배포: git push origin main 완료
- URL: https://gepv11.vercel.app

## 6. 다음 작업

docs/GEP_063_Phase5_완료보고서.md 작성

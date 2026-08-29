# GEPv30-152 OX 진위형 풀이 "누적" 카운터 재진입 시 0으로 초기화되는 결함 수정 결과보고

**작성일:** 2026-08-29 | **작성자:** 고팀장 (Claude Code)
**신고:** 조대표 — 진위형(OX) 과목별 풀기에서 처음 들어가면 "누적 6"으로 표시되다가, 나갔다가 다시 들어오면 "누적 0"으로 바뀜

---

## 1. 증상

`/ox/:subjectKey/:subSubject`(OXQuiz 화면) 상단의 `Round N X/541 (누적 M)` 표시 중 **누적(M)** 값이:
- 같은 세션 안에서 문제를 풀면 정상적으로 누적됨(예: 6)
- 화면을 나갔다가(홈 등) 같은 과목으로 다시 들어오면 **0으로 리셋**됨

## 2. 원인

[oxStore.js](GEPv1.1-source/src/stores/oxStore.js) 상단 주석은 `totalCumulative`(축3)를 "전체 누적 응답 수 — 절대 리셋 금지"라고 명시하지만, 실제로는 **순수 메모리(in-memory) 상태**이고 어디에도 영속화(localStorage·Supabase)되지 않는다.

그런데 [OXSubject.jsx](GEPv1.1-source/src/pages/OXSubject.jsx)의 `handleCardClick()`은 과목 카드를 클릭할 때마다(같은 과목 재진입 포함) **무조건 `resetStore()`를 먼저 호출**하고, `resetStore()`는 `getInitialState()`로 전체 상태를 되돌리며 여기엔 `totalCumulative: 0`도 포함된다.

```js
// OXSubject.jsx — 수정 전
const handleCardClick = async (subSubject) => {
  resetStore()   // ← totalCumulative도 여기서 0으로 리셋됨
  const progress = await oxService.loadProgress(authState, subjectKey, subSubject)
  await loadQuestions(subjectKey, subSubject, progress?.lastQuestionId ?? null)
  navigate(`/ox/${subjectKey}/${subSubject}`)
}
```

즉 "절대 리셋 금지"라는 설계 의도와 실제 동작(카드 재클릭마다 리셋)이 어긋나 있었다. 흥미롭게도 **같은 화근으로 인한 문제를 이미 한 번 발견해 고친 이력이 있다** — `OXSubject.jsx` 67~69행 주석:

> "세부과목별 실제 누적 풀이수 — 세션 스토어(oxStore)는 카드 클릭마다 resetStore()로 0으로 초기화되어 '누적'을 표시할 수 없으므로, Supabase 실측치를 직접 조회한다 (2026-08-20 발견 — OXHome.jsx와 동일한 근본 원인)."

이 수정은 **과목 선택 화면(OXSubject.jsx)의 카드 목록**에는 적용되어 있었지만, **문제 풀이 화면(OXQuiz.jsx) 상단의 `누적` 표시**는 여전히 리셋되는 `totalCumulative`를 그대로 읽고 있어 동일한 결함이 남아 있었다.

## 3. 수정 내용 — 원장(attempts) 실측치로 되살리기

`exams.json`/`ox_*.json`처럼 손대면 안 되는 데이터가 아니라 순수 상태관리 문제이므로, OXSubject.jsx가 이미 쓰는 것과 같은 "표시용 통계는 원장에서 재계산"(GEPv30-149 캐시 정책) 패턴을 OXQuiz 진입 경로에도 적용했다.

| 파일 | 변경 |
|---|---|
| `src/services/oxService.js` | `getCumulativeCount(authState, subject, subSubject)` 신규 추가 — `attempts` 테이블에서 `user_id`+`study_mode='ox'`+`subject`(+`subSubject`≠'ALL'이면 `sub_subject`)로 `count: 'exact', head: true` 집계 조회. 게스트(`userId` 없음)는 0 즉시 반환 |
| `src/stores/oxStore.js` | `loadQuestions(subjectKey, subSubject, resumeQuestionId, initialCumulative = 0)` — 4번째 인자 추가, `set()`에 `totalCumulative: initialCumulative` 반영 |
| `src/pages/OXSubject.jsx` | `handleCardClick()`에서 `loadProgress`와 `getCumulativeCount`를 `Promise.all`로 병렬 조회 후, 그 결과를 `loadQuestions()`의 4번째 인자로 전달 |

## 4. 검증

- `npm run build` — 성공
- 실계정(사번 12345678) 로그인 후 로컬 개발서버에서 재현·검증:
  1. `/ox/p1` 진입 → 자동차보험 카드에 "누적 18문항" 표시(기존 원장 실측치, 정상)
  2. 자동차보험 클릭 → 문제풀이 화면 상단 **"Round 1 0/541 (누적 18)"** — 재진입 즉시 원장 값으로 초기화됨(수정 전이었다면 0)
  3. 1문제 응답 → **"1/541 (누적 19)"**로 정상 증가
  4. 홈으로 나갔다가 `/ox/p1` → 자동차보험 재진입 → **"0/541 (누적 19)"** — 나갔다 들어와도 누적 유지 확인(수정 전 재현 증상이었던 0 리셋 사라짐)

### 디버깅 중 발견한 부수 결함(같은 작업에서 수정)

최초 구현 시 `getCumulativeCount`가 `.select('id', { count: 'exact', head: true })`로 작성되어 400 에러가 발생했다 — `attempts` 테이블의 실제 PK 컬럼명은 `id`가 아니라 `attempt_id`([Home.jsx:63](GEPv1.1-source/src/pages/Home.jsx:63)의 기존 카운트 쿼리와 동일 패턴 확인 후 정정)였다. `attempt_id`로 교체 후 정상 동작 확인.

## 5. 범위 밖 — 참고용 관찰

같은 `resetStore()` 호출이 `wrongMap`(축2, 틀린 횟수)도 매 진입마다 비운다. `wrongMap`은 "모아풀기"(1회/2회/3회 이상 틀린문제) 필터의 근거 데이터인데, 이 역시 세션을 나갔다 들어오면 그 세션에서 새로 틀린 것만 남고 이전 누적 틀린 이력은 사라진다 — `totalCumulative`와 동일한 근본 원인이다. 이번 작업 범위(누적 카운터 표시)에는 포함하지 않았으나, "모아풀기 필터가 재진입 후 문제 수가 줄어드는" 형태로 증상이 나타날 수 있어 별도 확인이 필요하면 후속 작업으로 진행 가능하다.

## 6. 커밋

- `src/services/oxService.js`, `src/stores/oxStore.js`, `src/pages/OXSubject.jsx` 3개 파일 수정
- 로컬 커밋만 수행, origin push는 조대표 승인 후 진행

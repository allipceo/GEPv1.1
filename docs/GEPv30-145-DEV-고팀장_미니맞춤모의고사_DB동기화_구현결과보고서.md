# GEPv30-145 미니/맞춤 모의고사 DB 동기화 구현 결과보고서

**작성일:** 2026-08-20 | **작성자:** 고팀장 (Claude Code) | **선행:** [GEPv30-141](GEPv30-141-DEV-고팀장_통계이어풀기_전체통찰_감사보고서.md) §5 우선순위 4
**브랜치:** `gepv30-138-home-entry-redesign` (미병합)
**확인 요청 승인:** 조대표 — "지금 구현"

---

## 1. 확인된 문제

`miniMockStore.js`(간이 모의고사)와 `customMockStore.js`(맞춤 모의고사)의 진행상황 저장(`saveProgress`/`loadProgress`)이 **localStorage 전용**이었다 — Supabase 동기화가 전혀 없어 브라우저 데이터 삭제·기기 변경 시 진행 중이던 세션이 통째로 사라졌다.

## 2. 조사 결과 — 두 서비스의 구조 차이

- **미니모의고사**: 문제 세트가 `setId`만으로 항상 동일하게 재생성 가능(고정 30문제)하고, `MiniMockHome.jsx`에 이미 "이어서 풀까요?" 재개 UI가 존재한다. → 진행상태(answers/currentIndex/elapsedTime)만 DB에 동기화하면 기존 UI가 그대로 기기 간에도 작동한다.
- **맞춤모의고사**: 문제 세트가 세션마다 랜덤 생성되며, 세션 메타(`allQuestions`/`mode`/`timerType`)는 이미 `custom_mock_sessions.metadata`(jsonb)에 저장되고 있었지만, **"이어하기" 진입 UI 자체가 어디에도 없다**(`CustomMockHome.jsx`에 재개 배너 없음 — 오직 `CustomMockQuiz.jsx` 마운트 시 로컬 `CUSTOM_SESSION_LS_KEY`가 있어야만 복원 경로를 탄다). 완전한 타기기 이어하기는 새 UI(예: CustomMockHome에 "진행 중인 세션 감지" 배너)가 필요한 별도 범위의 작업이라 이번에는 포함하지 않았다.

## 3. 수정 내용

| 파일 | 변경 |
|---|---|
| `supabase/migrations` (`add_state_json_to_progress`) | `progress` 테이블에 `state_json jsonb` 컬럼 추가 — MCQ/OX의 `current_index`(단일 정수)와 달리 answers/currentIndex/elapsedTime을 통째로 담을 그릇이 필요해서 범용 컬럼으로 확장 |
| `src/services/genericProgressService.js` (신규) | `saveState`/`loadState`/`clearState` — `progress.state_json`을 filter_key 기준으로 upsert/조회/삭제하는 범용 서비스 |
| `src/stores/miniMockStore.js` | `saveProgress`가 로컬 즉시 저장 + Supabase fire-and-forget 저장. `loadProgress`가 비동기로 전환되어 로컬/DB 중 `savedAt`이 더 최신인 쪽을 반환. `clearProgress`가 로컬+DB 양쪽 삭제 |
| `src/pages/MiniMockQuiz.jsx` | `store.loadProgress()` 호출에 `await` 추가(비동기 전환 반영) |
| `src/pages/MiniMockHome.jsx` | "처음부터 다시 풀기"/"다시 도전하기" 버튼이 `localStorage.removeItem`만 하던 것을 `store.clearProgress()`로 교체 — 그렇지 않으면 로컬만 지워지고 DB에 남은 예전 진행분이 다음 로드 시 "더 최신"으로 오인되어 되살아나는 회귀가 생긴다 |
| `src/stores/customMockStore.js` | `saveProgress`(모듈 함수)가 `supabaseSessionId`를 filter_key로 사용해 DB에도 저장(세션ID가 아직 없으면 로컬만). `loadProgress`가 비동기 전환, `supabaseSessionId` 인자 추가. `clearProgress`도 DB 삭제 동반. `submitPart1`/`submitPart2`의 `clearProgress` 호출에 `state.supabaseSessionId` 전달 |
| `src/pages/CustomMockQuiz.jsx` | 초기화 `useEffect`를 `async function init()`으로 감싸 `loadProgress(...)`에 `await` + `sessionMeta.supabaseSessionId` 전달 |

## 4. 설계 근거 — filter_key를 sessionLocalId가 아닌 supabaseSessionId로

맞춤모의고사의 `sessionLocalId`는 `custom_${Date.now()}` 형태로 **기기마다 다르게 생성**되므로 DB 조회 키로 쓸 수 없다. 반면 `supabaseSessionId`는 세션 생성 시 서버에서 발급되어 이미 로컬 `sessionMeta`에 저장되고 있으므로, 이를 그대로 filter_key(`custom:{supabaseSessionId}:{part}`)로 재사용했다 — 신규 식별자 체계를 만들지 않고 기존 것을 재사용(레고블럭 원칙).

## 5. 검증

- `npm run build` — 성공
- 비로그인 스모크: `/mini-mock` 라우팅 정상, 콘솔에 새로 발생한 에러 없음
- **로그인 상태 실사용 검증은 조대표 본인 브라우저에서 필요**:
  - 미니모의고사 한 세트를 일부만 풀고 나가기 → 브라우저 데이터(또는 다른 기기)에서 같은 세트 재진입 시 이어지는지 확인
  - "처음부터 다시 풀기" 후에도 예전 진행분이 되살아나지 않는지 확인
  - 맞춤모의고사 1교시 도중 나가기 → 같은 기기에서 재진입 시 이어지는지 확인(타기기 이어하기는 이번 범위 밖)

## 6. 남은 과제 (이번 범위 밖)

맞춤모의고사의 완전한 타기기 이어하기(로컬 세션메타 자체가 없는 새 기기에서 "진행 중인 세션이 있습니다" 배너를 띄우고 `custom_mock_sessions.metadata.questionIds`로 문제 세트를 복원하는 것)는 `CustomMockHome.jsx`에 신규 UI를 추가해야 하는 별도 작업이다. 데이터는 이미 서버에 있으므로(세션 메타 + 이번에 추가한 진행상태) 추후 필요 시 UI만 얹으면 된다.

## 7. 다음 단계

GEPv30-141 §5 우선순위 5(레거시 오답복습 이어풀기)는 이미 낮은 우선순위로 합의된 항목 — 착수 전 재확인 요청.

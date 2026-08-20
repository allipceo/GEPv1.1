# GEPv30-142 OX 이어풀기 ID 앵커 전환 구현 결과보고서

**작성일:** 2026-08-20 | **작성자:** 고팀장 (Claude Code) | **선행:** [GEPv30-141](GEPv30-141-DEV-고팀장_통계이어풀기_전체통찰_감사보고서.md) §5 우선순위 1
**브랜치:** `gepv30-138-home-entry-redesign` (미병합)

---

## 1. 문제

오늘(D9) 연결한 OX 일반풀기 이어풀기는 `progress.current_index`(순수 정수)를 재개 지점으로 저장했다. 이는 GEPv30-141 원칙 9번("이어풀기는 문제 ID 기준이어야 하며 인덱스 기준은 위험하다")을 위반한다 — 해당 과목 JSON 데이터가 갱신되어 문제 순서/개수가 바뀌면 저장된 인덱스가 전혀 다른 문제를 가리키게 된다.

MCQ 서비스B(`examStore.js`)는 이미 `questionOrder`(ID 배열) 앵커 패턴으로 이 문제를 회피하고 있었으나, 오늘 OX 구현 시 이 기존 패턴을 참고하지 못했다.

## 2. 수정 내용

| 파일 | 변경 |
|---|---|
| `supabase/migrations` (`add_last_question_id_to_progress`) | `progress` 테이블에 `last_question_id text` 컬럼 추가 (nullable, 기존 스키마 비파괴적 확장) |
| `src/services/oxService.js` | `saveProgress`/`loadProgress`가 `lastQuestionId`를 함께 저장/반환하도록 확장. `current_index`는 참고용으로만 유지, 재개의 주 신호가 아님을 명시 |
| `src/stores/oxStore.js` | `loadQuestions(subjectKey, subSubject, resumeQuestionId)` — 세 번째 인자를 인덱스에서 문제 ID로 변경. 현재 로드된 목록에서 `questions.findIndex(q => q.ox_id === resumeQuestionId)`로 위치를 재탐색, 못 찾으면 0으로 폴백. `goNext()`는 다음 문항의 `ox_id`를 저장, `completeRound()`는 `lastQuestionId: null`로 초기화 |
| `src/pages/OXSubject.jsx` | `handleCardClick`이 `progress.currentIndex` 대신 `progress.lastQuestionId`를 `loadQuestions`에 전달 |

## 3. 설계 근거

`examStore.js` Service B의 `questionOrder`(전체 순서 배열을 저장) 방식 대신, ID 하나(`last_question_id`)만 저장하는 더 단순한 방식을 택했다:
- OX 문제는 애초에 무작위 셔플이 아니라 JSON 파일 순서 그대로 고정 순차 출제이므로, 순서 전체를 앵커링할 필요가 없다 — "마지막으로 어디까지 했는지" 하나의 ID만 알면 충분하다.
- 데이터 갱신으로 목록이 바뀌어도 `findIndex`가 실패하면 0으로 안전하게 폴백 — 최악의 경우 "처음부터"이지 "엉뚱한 문제"가 아니다.

## 4. 검증

- `npm run build` — 성공 (기존과 동일한 산출물 크기, 신규 경고 없음)
- 비로그인 스모크: `/ox/law` 라우팅 정상, 콘솔에 새로 발생한 에러 없음(기존에도 있던 Supabase 세션락 타임아웃 로그만 확인됨 — 본 변경과 무관)
- **로그인 상태 실사용 검증은 조대표 본인 브라우저에서 필요** — 특정 세부과목 몇 문항 풀고 이탈 후 재진입 시 이어서 나오는지 확인 요청

## 5. 다음 단계

GEPv30-141 §5 우선순위 2("정답률 최근/누적 구분")로 이어가되, 이는 순수 버그 수정이 아니라 "최근 N회를 어떻게 정의할지" 등 신규 설계 결정이 필요한 항목이라 착수 전 조대표 확인을 받는다.

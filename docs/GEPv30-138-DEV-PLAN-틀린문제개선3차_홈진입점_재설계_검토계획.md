# GEPv30-138 틀린문제 기능개선 3차 — 홈 진입점(L2-D) 재설계 검토 및 개발계획

**문서 번호:** GEPv30-138 | **작성일:** 2026-08-20 | **작성자:** 고팀장 (Claude Code) | **상태:** 검토 완료 — **코딩 착수 전 승인 대기**
**선행 문서:** [GEPv30-136](GEPv30-136-DEV-PLAN-틀린문제개선2차_개발계획확정.md) 개발계획, [GEPv30-137](GEPv30-137-DEV-고팀장_틀린문제개선2차_구현결과보고서.md) 구현결과보고서
**지시 근거:** 조대표 2026-08-20 채팅 지시 — "GEP 전체 프로그램에서 나에게는 가장 중요합니다"

> 본 문서는 **계획 검토 문서**다. 조대표 승인 후 STEP 1부터 착수한다. 코드는 아직 수정하지 않았다.

---

## 1. 배경

GEPv30-136/137로 `/unified-wrong`(L2-F, 통합 오답 복습) 경로에 세부과목별·OX 포함 복습 기능을 구축했다. 조대표가 직접 테스트한 결과(자동차보험 복습 — MCQ 2문제 후 OX 6문제 순차 출제, 8/8 정상 확인) 이 경로는 **의도한 대로 정상 작동**하며, 조대표는 이 경로(L2-F)를 현재 방식 그대로 유지하는 데 동의했다.

이번 요청은 L2-F가 아니라 **홈 화면의 "틀린 문제 풀기"(L2-D, 현재 `/wrong-review`로 연결)** 의 진입 흐름을 완전히 새로 설계해 달라는 것이다. 조대표가 GEP 전체에서 가장 중요하다고 명시한 기능이므로, 구현 전 구조를 명확히 정리하고 승인을 받는다.

---

## 2. 요구 프로세스 — 원문 대조 정리

조대표 원문을 단계별로 재정리하면 다음과 같다.

```
1) 대문에서 "틀린 문제 풀기" 진입           (L2-D 버튼)
2) 세부과목 선택                            (12개 세부과목 중 1개)
3) 유형 선택 — 진위형 / 선택형              (신규 — 현재 없음)
   3-1) 진위형 선택 시
        → 해당 세부과목의 진위형(OX) 오답을 "틀린 횟수" 기준으로 선택하는 화면
        3-1-1) 예: "3회" 선택 → 정확히 3회 틀린 문제만 출제
               출제 중 또 틀리면 그 문제의 틀린 횟수는 4로 변경(다음 조회부터 반영)
   3-2) 선택형 선택 시
        → 해당 세부과목의 선택형(MCQ) 오답을 "틀린 횟수" 기준으로 선택하는 화면
        3-2-1) 예: "4회" 선택 → 정확히 4회 틀린 문제만 출제
               출제 중 또 틀리면 5회로 카운트
```

**핵심 차이점 (L2-F와 대비):**

| 구분 | L2-F `/unified-wrong` (현행, 변경 없음) | L2-D 신규 요구사항 |
|---|---|---|
| 세부과목 선택 | 있음 | 있음 |
| 유형(MCQ/OX) 분리 | **없음 — 항상 혼합 출제** | **있음 — 유형을 먼저 선택** |
| 틀린 횟수 필터 | "N회 **이상**"(threshold, 5회+ 등) | "**정확히** N회"(exact bucket) |
| 목적 | 빠른 통합 복습 | 정밀 진단형 반복 학습 |

---

## 3. 실현 가능성 검토

### 3-1. 데이터·카운터 로직 — 이미 충족됨 (재검증 완료)

- `wrong_count`는 `attempts` 원장에서 `get_unified_wrong_questions` RPC가 실시간 집계한다(GEPv30-136 §2 마이그레이션). 문제를 다시 틀리면 다음 조회 시 자동으로 +1 반영된다 — **추가 개발 불필요**, 이미 검증된 값이다(GEPv30-137 §5-1 SQL 실측 확인).
- "정확히 N회" 분포도 이미 부분적으로 존재한다. `unifiedWrongService.calculateWrongCountStats()`가 `{6+, 5, 4, 3, 2, 1}` 정확값 버킷으로 계산하고 있다(현재는 `UnifiedWrongReview.jsx`에서 전체 문제 대상으로만 사용 중). 이번 신규 화면은 이 로직을 **(세부과목 + 유형)으로 스코프를 좁혀 재사용**하면 된다 — 신규 집계 로직이 아니라 기존 함수의 입력 범위만 좁히는 작업.
- 재도전 시 attempts 기록(`recordAttempt`/`oxService.recordAttempt`)과 OX 정답 채점(`ox_result` 맵 로딩)은 GEPv30-137에서 이미 구현·검증됨 — 그대로 재사용 가능.

**결론: 백엔드/데이터 레이어는 100% 재사용 가능. 신규 개발은 전부 프론트엔드 화면 3개 + 라우팅.**

### 3-2. 신규로 필요한 부분

1. **유형 선택 화면** (신규) — 세부과목 선택 후, 그 세부과목의 MCQ/OX 오답 개수를 보여주고 하나를 고르게 함
2. **정확한 틀린횟수 선택 화면** (신규) — (세부과목 + 유형) 스코프에서 실제 존재하는 N값들만 버튼으로 노출(0개인 N은 비활성화), 선택 시 해당 N값 문제만 출제
3. **출제 필터 로직 확장** — 현재 `ChallengeMode.jsx`는 "이상"(`>=`) 필터만 지원. "정확히"(`===`) 필터 모드 추가 필요(기존 L2-F 동작에는 영향 없어야 함 — 파라미터로 모드 분기)

---

## 4. 화면 흐름 설계안

```
Home(L2-D 버튼)
  └─▶ /wrong-review/subjects          [신규] 세부과목 선택 (WrongSubjectSelector 패턴 재사용)
        └─▶ /wrong-review/type/:subject     [신규] 유형 선택 (진위형 vs 선택형, 각 개수 표시)
              └─▶ /wrong-review/count/:subject/:type   [신규] 정확한 틀린횟수 선택
                                                          (버튼: 1회 n개 / 2회 n개 / 3회 n개 ... / 6회+ n개)
                    └─▶ /unified-wrong/challenge/:exactCount
                          (state: { subject, source: 'MCQ'|'OX', exactMode: true })
                          [기존 ChallengeMode.jsx 확장 재사용]
```

기존 `/unified-wrong/subjects`(WrongSubjectSelector.jsx)는 **그대로 유지**한다(L2-F 전용, 변경 없음). 신규 화면은 별도 경로(`/wrong-review/...`)로 분리해 기존 L2-F 흐름과 완전히 독립시킨다 — 레고블럭 철학(기존 파일 수정 최소화) 준수.

### ChallengeMode.jsx 확장 방식 (기존 파일 최소 수정)

현재 필터:
```js
const filtered = subjectFilter
  ? byCount.filter(q => q.sub_subject === subjectFilter)
  : byCount
```

확장안 — `exactCount`/`source` state가 있을 때만 조건 추가, 없으면 기존 동작 100% 그대로 유지(L2-F 무영향 보장):
```js
const sourceFilter = location.state?.source ?? null      // 'MCQ' | 'OX' | null
const exactCount    = location.state?.exactCount ?? null  // number | null (6이면 6회+ 취급)

let filtered = byCount
if (subjectFilter) filtered = filtered.filter(q => q.sub_subject === subjectFilter)
if (sourceFilter)  filtered = filtered.filter(q => q.source === sourceFilter)
if (exactCount)    filtered = filtered.filter(q =>
  exactCount >= 6 ? (q.wrong_count ?? 1) >= 6 : (q.wrong_count ?? 1) === exactCount
)
```

---

## 5. 신규/수정 파일 목록 (예정)

| 파일 | 종류 | 내용 |
|---|---|---|
| `src/pages/WrongReviewSubjects.jsx` | 신규 | 세부과목 선택 (WrongSubjectSelector.jsx 구조 복제, 이동 경로만 다름) |
| `src/pages/WrongReviewTypeSelector.jsx` | 신규 | 진위형/선택형 선택, 각 개수 표시 |
| `src/pages/WrongReviewCountSelector.jsx` | 신규 | 정확한 틀린횟수 선택 (버튼별 실제 존재 개수 표시) |
| `src/pages/ChallengeMode.jsx` | 수정 | `sourceFilter`/`exactCount` 필터 분기 추가 (기존 로직 비침습적 확장) |
| `src/App.jsx` | 수정 | 3개 신규 라우트 추가 |
| `src/pages/Home.jsx` | 수정 | L2-D 버튼 `onClick` 대상을 `/wrong-review` → `/wrong-review/subjects`로 변경 |

**변경하지 않는 파일:** `WrongSubjectSelector.jsx`, `UnifiedWrongReview.jsx`, `unifiedWrongService.js`, RPC — L2-F 및 백엔드는 무변경.

---

## 6. 미결정 사항 — 승인 필요

### 6-1. 레거시 `/wrong-review` 페이지 처리

L2-D 버튼이 새 흐름으로 연결되면, 기존 `/wrong-review`(WrongReview.jsx, MCQ 전용 구식 화면)는 홈 화면에서 더 이상 진입 경로가 없어진다. 세 가지 안 중 결정 필요:

| 안 | 내용 | 장단점 |
|---|---|---|
| **A. 라우트만 유지, 링크 제거 (권장)** | `App.jsx` 라우트는 남기고 Home의 L2-D만 새 경로로 변경 | 기존 코드 삭제 없어 안전, 필요시 롤백 용이 |
| B. 완전 제거 | `WrongReview.jsx` 및 라우트 삭제 | 코드 정리되지만 되돌리기 어려움 |
| C. 유지 + 별도 메뉴로 강등 | 홈 하단 "구버전" 섹션으로 이동 | 메뉴 복잡도 증가 |

→ **A안 권장**: 이번 문서 승인 시 기본값으로 A안 적용, 이견 있으면 알려달라.

### 6-2. "6회 이상" 버킷의 표시 방식

기존 `calculateWrongCountStats`는 6회 이상을 하나의 "6+" 묶음으로 처리한다(개별 7회, 8회... 를 구분하지 않음). 정확한 틀린횟수 선택 화면에서도 동일하게 **"6회+"를 최상위 단일 버킷**으로 유지할 것을 제안한다(무한정 개별 버튼이 늘어나는 것을 방지). 이견 없으면 이대로 진행한다.

### 6-3. 세부과목 12개 중 특정 유형이 0개인 경우 UI

예: "위험관리" 세부과목에 OX 오답이 0개면, 유형 선택 화면에서 "진위형" 버튼을 비활성화(disabled) 처리한다 — WrongSubjectSelector.jsx의 기존 disabled 패턴과 동일하게 적용.

---

## 7. 개발 순서 (승인 후 착수)

```
STEP 1  App.jsx — 3개 신규 라우트 추가 (스켈레톤)
STEP 2  WrongReviewSubjects.jsx — 세부과목 선택 (WrongSubjectSelector.jsx 패턴 재사용)
STEP 3  WrongReviewTypeSelector.jsx — 유형 선택 + 개수 표시
STEP 4  WrongReviewCountSelector.jsx — 정확한 틀린횟수 선택 + 개수 표시
STEP 5  ChallengeMode.jsx — sourceFilter/exactCount 필터 분기 추가 (기존 동작 회귀 테스트 포함)
STEP 6  Home.jsx — L2-D 버튼 라우팅 변경
STEP 7  빌드 검증 + 로컬 미리보기(모바일 375px)
STEP 8  결과보고서 작성(GEPv30-139 예정) → 노팀장/조대표 로그인 검증 요청
```

이번에도 GEPv30-136과 동일하게 **브랜치 격리** 후 로그인 검증 통과 시 main 병합하는 방식을 유지한다.

---

## 8. 리스크

| 리스크 | 대응 |
|---|---|
| ChallengeMode.jsx 확장이 기존 L2-F 흐름(subjectFilter만 사용)을 깨뜨릴 위험 | `sourceFilter`/`exactCount`가 `null`일 때 기존 필터 체인과 100% 동일하게 동작하도록 조건부 추가만 수행 — STEP 5 완료 후 기존 L2-F 시나리오(자동차보험 복습) 재확인 필수 |
| 특정 (세부과목+유형) 조합에 오답이 아예 없을 때 빈 화면 | WrongReviewCountSelector에서 총 개수 0이면 "해당 조합에 오답 없음" 안내 후 뒤로가기 버튼 제공(ChallengeMode.jsx의 기존 빈 데이터 패턴과 동일) |

---

## 9. 승인 요청

다음 사항에 대한 조대표 확인을 요청한다.

1. §4 화면 흐름(세부과목→유형→정확한 틀린횟수→출제)이 요구사항과 일치하는지
2. §6-1 레거시 `/wrong-review` 처리 — A안(라우트 유지, 링크만 제거) 진행 여부
3. §6-2 "6회+" 단일 버킷 유지 여부
4. 승인 시 STEP 1부터 즉시 착수, 완료 후 GEPv30-139로 결과 보고

---

*본 문서는 조대표의 홈 진입점(L2-D) 재설계 요청을 코드 구조와 대조하여 검토한 계획서이며, 승인 전까지 코드는 수정하지 않는다.*

# GEPv30-139 틀린문제 기능개선 3차 — 홈 진입점(L2-D) 재설계 구현 결과보고서

**문서 번호:** GEPv30-139 | **작성일:** 2026-08-20 | **작성자:** 고팀장 (Claude Code) | **상태:** STEP 1~7 완료 — 로그인 실기기 검증 대기
**지시 근거:** [GEPv30-138](GEPv30-138-DEV-PLAN-틀린문제개선3차_홈진입점_재설계_검토계획.md) 확정 계획 + 조대표 승인 3건(화면흐름/레거시라우트유지/6회+단일버킷)
**작업 브랜치:** `gepv30-138-home-entry-redesign` (base: `gepv30-136-unified-wrong`, main 미병합)

---

## 1. 작업 요약

GEPv30-138 계획의 STEP 1~7을 실행했다. 조대표 승인 3건을 그대로 반영했다 — 화면흐름 확정, 레거시 `/wrong-review` 라우트 유지(§6-1 A안), "6회 이상" 단일 버킷(10회 이상도 포함).

| STEP | 내용 | 결과 |
|---|---|---|
| 1 | 브랜치 격리 | ✅ `gepv30-138-home-entry-redesign` (base: gepv30-136-unified-wrong) |
| 2 | `WrongReviewSubjects.jsx` 신설 (세부과목 선택) | ✅ |
| 3 | `WrongReviewTypeSelector.jsx` 신설 (진위형/선택형 선택) | ✅ |
| 4 | `WrongReviewCountSelector.jsx` 신설 (정확한 틀린횟수 선택) | ✅ |
| 5 | `ChallengeMode.jsx` — sourceFilter/exactCount 필터 확장 | ✅ 기존 L2-F 필터 체인 무변경 확인 |
| 6 | `Home.jsx` — L2-D 버튼 라우팅 변경 | ✅ `/wrong-review` → `/wrong-review/subjects` |
| 7 | 빌드 검증 | ✅ `npm run build` 성공 |
| 8 | 로그인 실기기 검증 | ⏸ 고팀장은 로그인 자격증명을 다룰 수 없어 미수행 |

---

## 2. 화면 흐름 (조대표 승인안 그대로 구현)

```
Home(L2-D "틀린 문제 풀기")
  └─▶ /wrong-review/subjects            세부과목 선택 (12개, 오답 0개는 비활성화)
        └─▶ /wrong-review/type/:subject       유형 선택 — 진위형(OX) / 선택형(MCQ), 각 개수 표시
              └─▶ /wrong-review/count/:subject/:type   정확한 틀린횟수 선택
                    버튼: 1회 / 2회 / 3회 / 4회 / 5회 / 6회 이상 (각 실제 개수 표시, 0개는 비활성화)
                    "6회 이상"은 단일 버킷 — 10회, 15회 틀린 문제도 모두 이 버킷에 포함(조대표 확정)
                    └─▶ /unified-wrong/challenge/:exactCount
                          (state: { subject, source, exactCount })
                          → ChallengeMode.jsx가 정확히 그 횟수만큼 틀린 문제만 순차 출제
                          → 출제 중 오답 시 다음 조회부터 틀린횟수 +1 자동 반영(기존 RPC 로직 재사용)
```

`/unified-wrong`(L2-F)과 `/unified-wrong/subjects`는 **한 줄도 수정하지 않았다** — 기존 통합 오답 복습(세부과목만 선택, MCQ+OX 혼합 출제) 흐름은 그대로 유지된다.

---

## 3. ChallengeMode.jsx 필터 확장 — 회귀 안전성

기존 필터 체인(`subjectFilter`만 사용하는 L2-F 흐름)에 영향을 주지 않도록, 신규 필터는 값이 없으면(`null`) 조건 자체가 적용되지 않는 방식으로 추가했다.

```js
let filtered = byCount
if (subjectFilter) filtered = filtered.filter(q => q.sub_subject === subjectFilter)
if (sourceFilter)  filtered = filtered.filter(q => q.source === sourceFilter)
if (exactCount)    filtered = filtered.filter(q =>
  exactCount >= 6 ? (q.wrong_count ?? 1) >= 6 : (q.wrong_count ?? 1) === exactCount
)
```

- L2-F 경로(`/unified-wrong/subjects` → 세부과목만 선택)는 `sourceFilter`/`exactCount`가 항상 `null`이므로 기존 로직과 100% 동일하게 동작한다.
- 신규 경로(L2-D)는 세 필터가 모두 채워져 (세부과목 + 유형 + 정확한 횟수) 조합으로 출제된다.
- `exactCount >= 6`을 "6회 이상"으로 처리 — WrongReviewCountSelector.jsx의 버킷 집계 로직(`c >= 6`이면 6번 버킷에 합산)과 동일한 기준을 사용해 선택 화면 숫자와 실제 출제 문제 수가 항상 일치한다.

---

## 4. 데이터 정합성 검증 (SQL 실측)

코딩 전 실제 프로덕션 데이터로 계획의 전제(카운터 로직 재사용 가능)를 검증했다.

- 테스터3 계정(`dc4e0564-...`)으로 RPC 임퍼소네이션 조회 → "자동차보험" 세부과목의 OX 오답 실측: 1회 틀림 5문제, 2회 틀림 1문제(그 외 0)
- 이 값은 신규 `WrongReviewCountSelector.jsx`가 계산하는 버킷 로직과 정확히 일치하는 것을 수동 대조로 확인 — RPC/캐시 재사용에 문제 없음을 코딩 전 확인 완료

---

## 5. 검증 — 실행한 것과 실행하지 못한 것

### 5-1. 실행 완료

| 항목 | 방법 | 결과 |
|---|---|---|
| 빌드 | `npm run build` | ✅ 성공 (기존 청크 크기 경고만, 신규 아님) |
| 신규 라우트 3개 리다이렉트 동작 | 비로그인 상태로 `/wrong-review/subjects`, `/wrong-review/type/상법`, `/wrong-review/count/상법/OX` 직접 접속 | ✅ 셋 다 정상적으로 "등록이 필요합니다"(로그인 게이트) 화면으로 처리됨 — 404/크래시 없음 |
| 콘솔 에러 | 위 3개 라우트 접속 후 콘솔 확인 | ✅ 신규 컴포넌트발 에러 없음(Supabase 멀티탭 lock 타임아웃 경고만 있으며 이는 기존에도 발생하던 것과 동일 — 본 작업과 무관) |
| 데이터 로직 사전 검증 | 실사용자 SQL 임퍼소네이션으로 버킷 집계 수동 대조 | ✅ 일치 확인(§4) |

### 5-2. 미실행 — 로그인 필요

전체 흐름(홈 → 세부과목 → 유형 → 정확한 틀린횟수 → 실제 출제 → 오답 시 카운터 반영)을 실제 로그인 상태에서 클릭해보는 것은 Claude Code(고팀장)가 로그인 자격증명을 다룰 수 없어 이번 세션에서 실행하지 않았다.

> **요청 사항:** 실계정으로 로그인해 홈 → "틀린 문제 풀기" → 세부과목(예: 자동차보험) → 진위형 → "1회" 선택 → 5문제가 정확히 출제되는지, 그중 하나를 일부러 틀렸을 때 다음 조회에서 "2회" 버킷으로 이동하는지 확인해 주시면 병합 조건이 충족된다.

---

## 6. 병합 대기 — 브랜치 상태

`gepv30-138-home-entry-redesign` 브랜치(base: `gepv30-136-unified-wrong`)에 커밋 예정이며 **main에는 병합하지 않는다**. main 병합은 두 브랜치(136, 138) 모두의 로그인 검증 통과 후 순서대로 진행한다.

---

## 7. 수정 파일 최종 목록

| 파일 | 변경 |
|---|---|
| `src/pages/WrongReviewSubjects.jsx` (신규) | 세부과목 선택 (1단계) |
| `src/pages/WrongReviewTypeSelector.jsx` (신규) | 유형(진위형/선택형) 선택 (2단계) |
| `src/pages/WrongReviewCountSelector.jsx` (신규) | 정확한 틀린횟수 선택 (3단계) |
| `src/pages/ChallengeMode.jsx` | sourceFilter/exactCount 필터 분기 추가 (비침습적 확장) |
| `src/App.jsx` | 신규 라우트 3개 추가 |
| `src/pages/Home.jsx` | L2-D 버튼 라우팅 변경 + 부제 텍스트 갱신 |

**변경하지 않은 파일:** `WrongSubjectSelector.jsx`, `UnifiedWrongReview.jsx`, `unifiedWrongService.js`, RPC, `WrongReview.jsx`(레거시, 라우트 유지 — 조대표 승인 §6-1 A안).

---

## 8. 다음 단계

| 액션 | 담당 |
|---|---|
| 실계정 로그인 → 전체 흐름(세부과목→유형→정확한 틀린횟수→출제→재카운팅) 클릭 검증 | 노팀장/조대표 |
| 검증 통과 시 `gepv30-138-home-entry-redesign` → `main` 병합 승인 (136 병합 후 순서로) | 조대표 |
| 병합 후 Vercel 자동 배포 확인 | 고팀장 |

---

*본 문서는 GEPv30-138 확정 계획 및 조대표 승인 3건에 따라 고팀장이 STEP 1~7을 실행한 결과이며, STEP 8(로그인 검증)은 자격증명이 필요해 고팀장 권한 밖임을 명시한다.*

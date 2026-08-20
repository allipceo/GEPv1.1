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

---

## 9. 추가 수정 — 조대표 로컬 테스트 중 발견된 버그 (2026-08-20)

조대표가 로컬 서버에서 실제 로그인 후 "상법 · 진위형 · 2회" 세션을 완주(2/2 정답)한 뒤 "틀린문제 다시 풀기"를 시도했을 때 문제가 뜨지 않는 현상을 보고했다.

**원인:** `ChallengeResult.jsx`(결과 화면)는 GEPv30-138 이전에 만들어진 화면으로, "다음 학습 제안" 버튼이 항상 구 L2-F 방식("5회+ 남은 문제 풀기" → `/unified-wrong/challenge/5`, state 없음)으로만 이동하도록 하드코딩되어 있었다. L2-D(세부과목→유형→정확한횟수) 세션을 마친 뒤 이 버튼을 누르면 방금 풀던 세부과목·유형과 무관한 전역 "5회+" 필터로 이동하는데, 해당 계정에 5회 이상 오답이 없어 빈 화면("5회 이상 오답이 없습니다!")이 뜬 것 — 이를 "문제가 안 뜬다"로 인지한 것이다.

**조치:**
- `ChallengeMode.jsx`가 도전 완료 시 localStorage에 저장하는 결과 객체에 `l2dContext: { subject, source }`를 추가(L2-D 세션일 때만 채워짐, L2-F는 `null`로 무영향)
- `ChallengeResult.jsx`가 `l2dContext` 존재 여부로 분기 — L2-D 세션이면 "🎯 {세부과목} · {유형} 계속 복습" 버튼을 표시해 `/wrong-review/count/:subject/:type`(정확한 틀린횟수 재선택 화면)로 되돌아가게 함. L2-F 세션(l2dContext 없음)은 기존 "6회+ 긴급 재도전"/"5회+ 남은 문제 풀기" 버튼 그대로 유지 — **무변경**.
- 상단 모드 라벨도 L2-D 세션이면 "{세부과목} · {유형} · 정확히 N회"로 표시하도록 수정

**검증:** `npm run build` 재확인 성공. 로그인 실기기 재검증은 조대표 담당(§8과 동일).

---

## 10. 추가 수정 2 — 더 근본적인 원인 발견: OX 재도전 기록의 subject 누락 (2026-08-20)

§9 수정 이후에도 조대표가 "여전히 문제가 안 뜬다"고 재보고했고, 별도로 OX 홈 화면(`/ox`)에서 "누적 문제가 여러 개 있는데 개별 과목에는 반영되지 않는다"는 문제도 제기했다. 두 증상 모두 **같은 근본 원인 하나**에서 비롯된 것으로 확인했다.

### 10-1. 근본 원인

`ChallengeMode.jsx`의 `handleAnswer()`가 OX 재도전 결과를 기록할 때 `oxService.recordAttempt()`에 `answer`만 넘기고 **`subject`/`subSubject`/`round`를 넘기지 않았다**(GEPv30-137 STEP 5에서 도입된 결함). `oxService.recordAttempt()`는 누락된 값을 빈 문자열(`''`)로 기록하므로, ChallengeMode를 통해 OX 문제를 한 번이라도 재도전하면 그 문제의 **가장 최근 attempts 행의 subject/sub_subject가 빈 문자열로 덮어써졌다**.

`get_unified_wrong_questions` RPC는 문제별로 **가장 최근 시도의 subject/sub_subject**를 반환하므로(`ARRAY_AGG(... ORDER BY attempted_at DESC)[1]`), 재도전 이력이 있는 문제는 이후 모든 세부과목 화면(`WrongReviewCountSelector`, `WrongSubjectSelector`, OX 홈 대시보드)에서 **그 어떤 세부과목에도 매칭되지 않고 사라졌다** — "상법·진위형" 조합에서 재도전 직후 문제가 안 뜬 것은 이 때문이다.

실측: 테스터3 계정에서 `subject=''`인 attempts 9건 발견 — 전부 오늘(2026-08-20) ChallengeMode 재도전 세션에서 생성됨. OX 홈 대시보드 상단 "총 87문항"과 과목별 합계(법령 33+손보1부 45=78)가 9건 차이 났던 것도 바로 이 9건이 어느 과목에도 집계되지 않았기 때문.

### 10-2. 별개로 발견된 2차 결함 — OX 홈 화면 표시 버그

원인 조사 중 `OXHome.jsx`의 과목별 카드("Round N · 누적 N문항")가 Supabase 실측치가 아니라 **세션 메모리(oxStore, 새로고침 시 초기화)** 값을 쓰고 있어, 현재 화면에서 로드하지 않은 과목은 항상 "누적 0문항"으로 표시되던 것도 확인했다 — subject 누락 버그와는 무관한 별개의 표시 로직 결함이다.

### 10-3. 조치

| 파일 | 조치 |
|---|---|
| `src/pages/ChallengeMode.jsx` | `handleAnswer()`의 OX 분기에 `round`(question_id에서 파싱)·`subject`(`current.ox_subject_key`)·`subSubject`(`current.subSubject`)를 추가로 전달 |
| Supabase 마이그레이션 `backfill_ox_challenge_mode_empty_subject` | `subject=''`(또는 NULL)인 기존 OX attempts 9건을 question_id 패턴에서 역산해 복구(`법령→law`, `손보1→p1`, `손보2→p2`, sub_subject는 ID 마지막 토큰) |
| `src/pages/OXHome.jsx` | 과목별 "누적 N문항"을 세션 스토어 대신 이미 조회해둔 Supabase 실측치(`oxDash.bySubj[key].solved`)로 표시하도록 변경(현재 로드된 과목은 세션값과 실측치 중 큰 값을 사용해 최신성 유지) |

### 10-4. 검증

- 백필 후 테스터3 계정 SQL 재조회: `law 37건 + p1 50건 = 87건` (기존 총합과 정확히 일치, 빈 subject 0건)
- RPC 재조회: "상법" 세부과목 OX 오답 10건이 모두 정상적으로 `subject='law', sub_subject='상법'`로 반환됨을 확인(이전엔 재도전한 문제가 빠져 있었음)
- `npm run build` 재확인 성공

이 결함은 GEPv30-138 범위 밖(OX 전체 재도전 경로에 영향)이지만, 같은 브랜치에서 발견·수정했으며 별도 회귀 없이 기존 로직을 보강하는 수정이라 동일 브랜치에 포함했다.

### 10-5. 추가 확인 — `OXSubject.jsx`(세부과목 선택 화면)도 동일 결함

조대표가 `/ox/law`(OX → 법령 → 세부과목 선택 화면)에서도 "누적 숫자가 안 맞는다"고 재보고했다. 확인 결과 `OXSubject.jsx`도 `OXHome.jsx`와 **동일한 근본 원인**을 갖고 있었다 — 카드 5개(전체+세부과목4개) 전부가 세션 스토어(`oxStore`, 카드 클릭마다 `resetStore()`로 0 초기화)의 단일 값을 그대로 복제해 표시하고 있어, 세부과목이 달라도 항상 같은 숫자(대부분 0)만 보였다.

**조치:** `OXSubject.jsx`에 Supabase 실측 조회(`attempts` 테이블을 `subject=:subjectKey`로 필터링 후 `sub_subject`별 집계)를 추가해, "전체" 카드와 세부과목 4개 카드 각각 실제 누적 풀이수를 표시하도록 수정. 세션 스토어 값은 더 이상 "누적" 표시에 사용하지 않는다(어차피 카드 클릭 시 리셋되어 신뢰할 수 없는 값이었음).

**검증(실측):** 테스터3 계정 `subject='law'` 기준 SQL 재조회 결과 세부과목 분포는 상법 38건, 나머지(보험업법/위험관리/세제재무) 0건 — `/ox/law` 접속 시 "전체" 카드 38문항, "상법" 카드 38문항, 나머지 3개 카드 0문항으로 표시되는 것이 정상이다.

---

## 11. 추가 수정 3 — OX 문제 본문이 아예 표시되지 않던 문제 (2026-08-20)

§10 수정 이후 조대표가 "상법·진위형" 흐름을 처음부터 다시 테스트해 세부과목→유형→틀린횟수→시작하기까지 전부 정상 진입했으나, 실제 문제풀이 화면에서 "문제가 안 뜬다"고 재보고했다.

### 11-1. 원인

`ChallengeMode.jsx`의 `enrichQuestion()`은 OX 문제에 대해 `questionRaw: null`을 항상 고정값으로 반환하고 있었다. 화면은 `questionRaw`가 없으면 "OX 문제 원문은 OX 풀기 화면에서 확인 가능합니다"라는 플레이스홀더와 문제 ID만 보여주고 O/X 버튼만 뜨는 구조였다 — **즉 OX 재도전 화면에서는 애초에 문제 본문(진술문)을 한 번도 읽을 수 없었다.** "문제가 안 뜬다"는 이 플레이스홀더 화면을 가리킨 것이었다.

기존에 있던 `loadOxResultMap()`은 채점용 정답(`ox_result`)만 조회하고 있었는데, 같은 JSON 파일(`ox_law.json` 등)에 원문 필드 `statement_display`도 이미 존재하고 있었다 — 정답과 함께 원문도 조회하지 않은 것이 누락이었다.

### 11-2. 조치

`loadOxResultMap()`이 `ox_id → { result, text }`(정답+원문)를 함께 반환하도록 확장하고, 문제 로드 시 `questionRaw`에 원문(`statement_display`)을 채우도록 수정. 실측: 조대표가 테스트한 정확한 문제 ID(`OX-23-법령-12-D-상법`)로 JSON을 직접 조회해 원문("보험증권을 멸실 또는 현저하게 훼손한 때에는...")이 정상 존재함을 확인.

### 11-3. 검증

`npm run build` 재확인 성공. 이제 OX 재도전 화면에 실제 진술문이 표시되어야 한다.

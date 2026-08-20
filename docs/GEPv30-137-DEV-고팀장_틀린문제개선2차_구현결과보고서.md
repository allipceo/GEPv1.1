# GEPv30-137 틀린문제 기능개선 2차 — 구현 결과보고서

**문서 번호:** GEPv30-137 | **작성일:** 2026-08-20 | **작성자:** 고팀장 (Claude Code) | **상태:** STEP 2~8 완료 — STEP 9(로그인 실기기 검증)는 노팀장/조대표 확인 대기
**지시 근거:** GEPv30-136 확정 개발계획
**작업 브랜치:** `gepv30-136-unified-wrong` (main 미병합 — 병합 조건: 로그인 후 V-1~V-5 전항 통과)

---

## 1. 작업 요약

GEPv30-136 계획의 STEP 2~8을 순서대로 실행했다. 계획서에 없던 **기존 버그 2건**을 구현 중 발견해 함께 수정했으며, 상세는 §4에 기록했다.

| STEP | 내용 | 결과 |
|---|---|---|
| 1 | 브랜치 격리 | ✅ `gepv30-136-unified-wrong` 생성 |
| 2 | RPC `subject`/`sub_subject` 반환 컬럼 추가 | ✅ Supabase 적용 + 실측 검증 완료 |
| 3 | `unifiedWrongService.js` — RPC 값 수신 | ✅ |
| 4 | `UnifiedWrongReview.jsx` — 세부과목 카드/CTA 추가 | ✅ |
| 5 | `ChallengeMode.jsx` — OX 정답 로딩·subject 정규화 | ✅ (계획에 없던 버그 수정 포함) |
| 6 | `WrongSubjectSelector.jsx` 신설 | ✅ |
| 7 | `App.jsx` 라우트 + `/wrong-review` 유도 배너 | ✅ |
| 8 | 빌드 검증 | ✅ `npm run build` 성공 |
| 9 | V-1~V-5 로그인 실기기 검증 | ⏸ 고팀장은 로그인 자격증명을 다룰 수 없어 미수행 — 노팀장/조대표 확인 필요 (§6) |

---

## 2. STEP 2 — RPC 확장 (Supabase 적용 + 실측 검증)

`supabase/migrations/016_get_unified_wrong_questions_subject.sql` 작성 및 프로젝트(`xnmjprtodyonqzsqxxja`)에 직접 적용했다.

- `RETURNS TABLE`에 `subject`, `sub_subject` 컬럼 추가 (반환 타입 변경이라 `DROP` 후 재생성 필요 — `CREATE OR REPLACE`는 거부됨을 확인)
- 스키마·RLS·기존 4개 필드는 변경 없음, `GRANT`/`REVOKE` 재설정
- 적용 후 `get_advisors(security)`에서 `function_search_path_mutable` WARN 발견 → `SET search_path = public` 추가로 해소 (기존 다른 함수 3개에도 동일 이슈가 있으나 이번 범위 밖이라 미수정)

**실측 검증 (실제 프로덕션 데이터, 서비스 롤로 `auth.uid()`를 대상 사용자로 임퍼소네이션):**

```sql
-- 대상: 실사용자 0513e0e1-7554-4dd1-83b9-04ed3bd0e6cc (OX·MCQ 반복오답 보유 계정)
SELECT * FROM get_unified_wrong_questions(ARRAY['ox']) ORDER BY wrong_count DESC LIMIT 5;
```

| question_id | wrong_count | subject | sub_subject |
|---|---|---|---|
| OX-23-손보1-26-A-보증보험 | 5 | p1 | 보증보험 |
| OX-23-법령-1-D-보험업법 | 4 | law | 보험업법 |

MCQ 계열(`service_a_sequence` 등)도 동일하게 확인 — `subject`는 `법령`/`손보1부`/`손보2부` 한글 라벨로 정상 반환됨(§4-1 참고).

---

## 3. 세부과목 taxonomy — GEPv30-136 §3 재확인

WrongSubjectSelector.jsx의 12개 세부과목·회차당 문항수는 GEPv30-136 §3에서 이미 실측 확정한 값을 그대로 사용했다(재검증 불필요, 소스 동일).

---

## 4. 계획에 없던 발견 — 구현 중 확인된 기존 버그 2건

STEP 5(`ChallengeMode.jsx`) 작업 중 코드를 직접 추적하다가 GEPv30-136 계획서에는 없던 **기존 결함 2건**을 발견했다. 둘 다 "OX 오답을 1급 기능으로 포함한다"는 조대표 확정 범위에 직접 영향을 주므로 계획 범위 내로 판단해 함께 수정했다.

### 4-1. OX 재도전 채점이 사실상 항상 'O'로 고정되어 있었음

`ChallengeMode.jsx`의 `enrichQuestion()`이 OX 항목에 대해 `subject: null, subSubject: null`을 하드코딩하고 있었고, `ox_result`(정답)는 애초에 어디서도 채워지지 않았다. 그 결과 `handleAnswer()`의 `answerValue === (current.ox_result ?? 'O')` 비교가 **항상 'O' 기준으로 채점**되고 있었다 — 정답이 X인 문제를 O로 찍어도 "정답"으로 처리될 수 있는 상태였다.

- **원인:** attempts 원장에는 선택값·정오답만 기록되고 정답 원본은 없음 → 재도전 채점에 필요한 `ox_result`를 애초에 조회하지 않았음
- **조치:** `ChallengeMode.jsx`에 `loadOxResultMap()` 추가 — RPC가 반환하는 `subject`(짧은 키 `law`/`p1`/`p2`)로 해당 OX json(`ox_law.json` 등)을 1회 fetch해 `ox_id → ox_result` 맵을 만들고, 문제 로드 시 비동기로 채운다
- **검증:** 실측 데이터의 실제 오답 4건(`OX-23-손보1-26-A~D-보증보험`)에 대해 Node로 `ox_p1.json` 조회 → O/X/O/O 정상 매칭 확인(§5)

### 4-2. OX의 `attempts.subject`가 한글 라벨이 아니라 짧은 키로 저장되고 있었음

`oxStore.js`가 `attempts.subject`에 `'법령'`이 아니라 `subjectKey`(`'law'`/`'p1'`/`'p2'`)를 저장하는 것을 실측으로 확인했다(§2 검증 결과). MCQ는 한글 라벨로 저장되므로, 같은 화면에서 두 소스가 섞이면 OX 항목만 `law`처럼 깨져 보일 상황이었다.

- **조치:** `ChallengeMode.jsx`에 `OX_SUBJECT_LABEL`(짧은 키→한글 라벨) 매핑을 추가해 표시용 `subject`는 정규화하고, 파일 조회용 원본 키는 `ox_subject_key`로 별도 보관
- **영향 범위:** `ChallengeMode.jsx`의 과목별 분포 배지, 문제 화면 상단 과목 태그, 복습 결과 화면의 과목별 통계가 모두 정상적으로 한글 라벨을 표시하게 됨

이 2건은 GEPv30-136 계획서에는 없던 내용이므로, SSOT 갱신 시 함께 반영이 필요하다.

---

## 5. 검증 — 실행한 것과 실행하지 못한 것

### 5-1. 실행 완료 (코드·DB 레벨, 자격증명 불필요)

| 항목 | 방법 | 결과 |
|---|---|---|
| RPC 반환값 정확성 | 실사용자로 `auth.uid()` 임퍼소네이션 후 직접 SQL 호출 | ✅ subject/sub_subject 정상 반환 |
| OX 정답 조회 로직 | Node로 실제 오답 4건의 `ox_id`를 `ox_p1.json`에서 직접 조회 | ✅ 4건 모두 매칭 |
| 빌드 | `npm run build` | ✅ 성공 (기존에도 있던 청크 크기 경고만, 신규 아님) |
| 정적 렌더링/콘솔 에러 | `/`, `/unified-wrong/subjects`, `/wrong-review` 접속 후 콘솔·네트워크 확인 | ✅ 에러 없음, 신규 파일 200 OK, vite 컴파일 에러 없음 |
| Security advisor | `get_advisors(security)` STEP 2 전후 비교 | ✅ 새로 만든 함수의 WARN 해소, 신규 CRITICAL 없음 |

### 5-2. 미실행 — 로그인 필요 (고팀장 권한 밖)

V-1~V-5(오답 발생 → 대시보드 표시 → 세부과목 복습 → 반복오답 복습 → 재조회)는 실제 사용자 로그인 상태에서 화면을 눌러보는 시나리오다. Claude Code(고팀장)는 비밀번호·로그인 자격증명을 입력하거나 로그인을 대행할 수 없으므로 — 이번 세션에서 이 부분은 실행하지 않았다. 대신 위 §5-1로 각 시나리오가 의존하는 **데이터·로직 경로**를 자격증명 없이 검증 가능한 최대치까지 확인했다.

> **요청 사항:** V-1~V-5는 원래 계획(GEPv30-136 STEP 9)에서도 노팀장 담당으로 배정되어 있었다. 실계정으로 로그인해 `/unified-wrong`(대시보드 카드 확인) → `/unified-wrong/subjects`(세부과목 선택) → 세부과목 복습 진입 → OX 문제가 정상 채점되는지를 확인해 주시면 병합 조건이 충족된다.

---

## 6. 병합 대기 — 브랜치 상태

`gepv30-136-unified-wrong` 브랜치에 커밋했으며 **main에는 병합하지 않았다**(GEPv30-136 §8 롤백 전략 그대로 준수). main 병합은 §5-2 로그인 검증 통과 후 진행한다.

---

## 7. 수정 파일 최종 목록

| 파일 | 변경 |
|---|---|
| `supabase/migrations/016_get_unified_wrong_questions_subject.sql` (신규) | RPC 확장 + search_path 고정 |
| `src/services/unifiedWrongService.js` | subject/sub_subject 수신 |
| `src/pages/UnifiedWrongReview.jsx` | 세부과목별 CTA·진입 버튼 추가 |
| `src/pages/ChallengeMode.jsx` | OX 정답 로딩, subject 정규화, 세부과목 필터(state) 지원, 모드별 타이틀 |
| `src/pages/WrongSubjectSelector.jsx` (신규) | 세부과목 12개 선택 화면 |
| `src/App.jsx` | `/unified-wrong/subjects` 라우트 |
| `src/pages/WrongReview.jsx` | 통합 오답 복습 유도 배너 |

---

## 8. 다음 단계

| 액션 | 담당 |
|---|---|
| 실계정 로그인 → V-1~V-5 클릭 검증 | 노팀장 |
| 검증 통과 시 `gepv30-136-unified-wrong` → `main` 병합 승인 | 조대표 |
| 병합 후 Vercel 자동 배포 확인 | 고팀장 |
| §4의 기존 버그 2건 SSOT 문서 반영 | 노팀장 |

---

*본 문서는 GEPv30-136 확정 개발계획에 따라 고팀장이 STEP 2~8을 실행한 결과이며, STEP 9(로그인 검증)는 자격증명이 필요해 고팀장 권한 밖임을 명시한다.*

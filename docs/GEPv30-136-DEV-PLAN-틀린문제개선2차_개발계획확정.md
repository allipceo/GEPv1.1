# GEPv30-136 틀린문제 기능개선 2차 — 개발계획 확정

**문서 번호:** GEPv30-136 | **작성일:** 2026-08-20 | **작성자:** 고팀장 (Claude Code) | **상태:** 확정 — 개발 착수 가능
**대상 노션 허브:** [GEP 틀린문제풀기 기능개선 허브](https://app.notion.com/p/c04d1fc0159c4b9eb334b907f62b3c9a)
**선행 문서:** GEPv30-135 (고팀장 코드 검토), 노션 허브 내 선과장 계획안·노팀장 검토의견·조대표 결정사항 일체

> 노션 허브에는 "GEPv30-136 개발계획 초안"이 이미 텍스트로 기록되어 있었으나, 로컬 `DOCS/` 폴더에는 해당 파일이 존재하지 않았다(확인 완료: `git log`, `ls DOCS/` 모두 GEPv30-135가 최신). 본 문서가 **GEPv30-136의 최초 로컬 확정본**이며, 노션의 논의 내용을 코드 사실과 대조하여 확정한 것이다.

---

## 1. 배경

노션 허브에서 다음 순서로 논의가 진행되었다.

1. 조대표 문제 제기 → 노션 허브 §1~§13 초안 작성
2. 선과장 "백엔드 무수정" 계획안 (08201340)
3. 노팀장 1차 검토 — §12 결정 미정, 데이터 검증 선행 필요, Phase 1 범위 과다 지적
4. 고팀장 코드 검토(GEPv30-135) — RPC가 병목이라는 사실 확인, RPC 컬럼 확장(안 B) 제안
5. 선과장 종합 검토 — 고팀장 제안 조건부 수용
6. 조대표 결정 — RPC 컬럼 확장 승인
7. **조대표 최종 범위 확정 (2026-08-20 14:50 KST) — 본 계획의 근거**

본 문서는 7번 결정을 기준선으로, 고팀장이 실제 코드와 대조 검증하여 확정한 개발계획이다.

---

## 2. 조대표 확정 범위 (최종 기준)

| 항목 | 확정 내용 |
|---|---|
| 개선 대상 | **선택형(MCQ) + 진위형(OX) 만** |
| 모의고사 틀린문제 | 기출·간이·맞춤형 **전부 제외** (Phase 2 이후 별도 검토) |
| 핵심 복습 모드 | ① 세부과목 기준 다시 풀기 ② 틀린횟수 기준 다시 풀기 |
| 데이터 소스 | `attempts` 테이블 단일 소스 (`study_mode` ∈ 선택형 계열, `'ox'`) |
| RPC 변경 | `get_unified_wrong_questions`에 `subject`, `sub_subject` 반환 컬럼 추가 — **승인됨** |

이 범위 확정으로 아래 항목이 자동 해소되었다 (mock/custom 제외로 인한 것):

- mock_exam_attempts / custom_mock_attempts 관련 작업 전체 제거
- `exams.json` 역매핑 로직 불필요
- examStore 확장 불필요
- 검증 시나리오에서 모의고사 관련 케이스 제거

---

## 3. 세부과목 taxonomy — 노션 §4.2 표 정정

노션 허브 §4.2의 세부과목 표(보험계약법, 손해사정이론, 배상책임보험, 근재보험 등)는 **실제 데이터와 일치하지 않는다.** `src/config/oxSubjects.js`와 `public/data/exams.json`을 직접 확인한 결과, MCQ와 OX가 공유하는 실제 12개 세부과목은 다음과 같다.

| 상위 과목 | 세부과목 | 회차당 문항수 |
|---|---|---|
| 법령 | 상법 | 20문항 |
| 법령 | 보험업법 | 10문항 |
| 법령 | 위험관리 | 5문항 |
| 법령 | 세제재무 | 5문항 |
| 손보1부 | 자동차보험 | 15문항 |
| 손보1부 | 특종보험 | 10문항 |
| 손보1부 | 연금저축 | 10문항 |
| 손보1부 | 보증보험 | 5문항 |
| 손보2부 | 해상보험 | 15문항 |
| 손보2부 | 화재보험 | 10문항 |
| 손보2부 | 재보험 | 10문항 |
| 손보2부 | 항공우주 | 5문항 |

**과목별 합계:** 법령 40문항 / 손보1부 40문항 / 손보2부 40문항 / **전체 120문항(회차당)**

조대표가 제공한 문항수는 `exams.json`의 `questions` 배열(1,080문제, `round`/`subSubject` 필드)로 실측 검증 완료 — 23회차 기준 세부과목별 문항수가 위 표와 정확히 일치하며, 9개 회차 전체 합계도 위 값 × 9와 일치한다(예: 상법 20×9=180, 전체 120×9=1,080). 개발·UI 문구·목업은 이 표를 기준으로 한다. (노션 허브 §4.2는 본 문서 배포 후 수정 예정)

---

## 4. §12 결정 사항 — 최종 확정표

노팀장이 노션에서 제안한 값을 채택하고, 결정 4번은 범위 축소로 대체한다.

| 번호 | 안건 | 확정 | 근거 |
|---|---|---|---|
| 1 | 해결오답 표시 여부 | 통계만 표시 | Phase 1 화면 복잡도 제한 |
| 2 | 반복오답 기준 | 2회 이상 | 사용자가 즉시 체감 가능 (기존 `filterByWrongCount` 기본값과 일치) |
| 3 | OX 오답 우선순위 | 선택형과 동일 | Phase 1에서는 가중치 복잡도 배제 |
| 4 | 모의고사 오답 처리 | **해당 없음 — 범위 제외로 대체** | 조대표 확정 (§2) |
| 5 | 기존 `/wrong-review` 유지 여부 | 유지, `/unified-wrong`으로 진입 유도 | 기존 사용자 흐름 파괴 방지 |
| 6 | 캐시 TTL | 1시간 유지 + 풀이 후 invalidate | 기존 `invalidateCache()` 이미 구현됨 |

---

## 5. 핵심 복습 모드 2종 — 현재 코드 대비 실제 구현 범위

| 모드 | 현재 상태 | 이번 작업 |
|---|---|---|
| ② 틀린횟수 기준 | **이미 구현됨.** `/unified-wrong/challenge/:minCount` + `filterByWrongCount()` — MCQ만 동작 | OX 포함시키기만 하면 됨 (RPC + enrich 수정) |
| ① 세부과목 기준 | **부분 구현.** `UnifiedWrongReview.jsx`의 `selectedSub` 필터는 존재하나 MCQ 전용(`enrichWithExamQuestions`가 OX를 건너뜀), 전용 진입 화면 없음 | OX 포함 확장 + `WrongSubjectSelector.jsx` 신설 |

즉 이번 작업은 "0에서 만드는 신규 기능"이 아니라 **이미 있는 MCQ 전용 경로를 OX까지 넓히는 작업**이 핵심이다.

---

## 6. 수정 대상 파일 (확정)

| 파일 | 변경 내용 | 위험도 | 비고 |
|---|---|---|---|
| `supabase/migrations/016_get_unified_wrong_questions_subject.sql` (신규) | `get_unified_wrong_questions` `RETURNS TABLE`에 `subject text, sub_subject text` 추가 + `GROUP BY`에 반영 | 낮음 | 스키마·RLS 변경 없음, 하위 호환 |
| `src/services/unifiedWrongService.js` | `mcqItems`/`oxItems` 매핑에 `subject`, `sub_subject` 추가 수신 | 낮음 | RPC 응답 필드만 추가 소비 |
| `src/pages/UnifiedWrongReview.jsx` | 세부과목별 CTA·진입 버튼 추가 | 중간 | 대시보드 UI에 세부과목 카드·CTA 추가 |
| `src/pages/ChallengeMode.jsx` | `enrichQuestion`가 OX의 subject/sub_subject를 사용하도록 수정 | 중간 | 정답/오답 판정 로직은 변경 없음 |
| `src/pages/WrongSubjectSelector.jsx` (신규) | 세부과목 12개 선택 → 복습 시작 | 낮음 | §3의 실제 taxonomy 사용 |
| `src/App.jsx` | `/unified-wrong/subjects` 라우트 추가, `/wrong-review`는 유지 + 상단 배너로 `/unified-wrong` 유도(§4 결정 5) | 낮음 | 게이트 로직 변경 없음 |
| `src/services/statsService.js` | **수정 금지** (기존 원칙 유지) | — | — |

---

## 7. 개발 순서 (확정)

```
STEP 1  ✅ 완료 — RPC 확장 승인, 세부과목 taxonomy 정정 (본 문서)
STEP 2  [고팀장] 016_get_unified_wrong_questions_subject.sql 작성 + Supabase 적용
STEP 3  [고팀장] unifiedWrongService.js — subject/sub_subject 수신 반영
STEP 4  [고팀장] UnifiedWrongReview.jsx — 세부과목 카드/CTA 추가
STEP 5  [고팀장] ChallengeMode.jsx — OX 세부과목/정답 반영
STEP 6  [고팀장] WrongSubjectSelector.jsx 신설 + 라우트 연결
STEP 7  [고팀장] App.jsx — /wrong-review 유도 배너, /unified-wrong/subjects 라우트
STEP 8  [고팀장] 모바일 375px 빌드·검증
STEP 9  [노팀장] V-1~V-5 로그인 검증 + main 병합 승인
```

**착수 조건:** 없음 — 조대표 승인 완료 상태이므로 STEP 2부터 즉시 착수 가능.

---

## 8. 브랜치 격리 (롤백 전략)

`UnifiedWrongReview.jsx`는 현재 실사용자의 실제 진입점이므로 다음 방식으로 격리한다 (노팀장 권고 방안 1 채택).

- 브랜치명: `gepv30-136-unified-wrong`
- main 병합 조건: STEP 9의 V-1~V-5 전항 통과 후에만 병합
- 병합 전까지 main/배포본 영향 없음

---

## 9. 검증 시나리오 (V-1~V-5, 모의고사 제외)

| 번호 | 시나리오 | 기대 결과 |
|---|---|---|
| V-1 | 선택형 오답 발생 → 통합오답 홈 접속 | 세부과목 카드에 오답 수 표시 |
| V-2 | OX 오답 발생 → 통합오답 홈 접속 | OX 오답이 동일한 세부과목 카드에 통합 표시 |
| V-3 | 세부과목 선택 → 복습 시작 | 해당 세부과목의 현재오답만 출제 (MCQ+OX 혼합) |
| V-4 | 동일 문제 2회 이상 오답 → 반복오답 복습 | wrong_count 내림차순 출제 |
| V-5 | 복습 완료 후 재조회 | 맞힌 문제는 해결오답으로 전환되어 다음 조회에서 제외 |

---

## 10. Phase 2 이연 항목 (이번 범위 제외)

- 기출모의고사 / 간이모의고사 / 맞춤형 모의고사 오답 통합
- 해설 존재 여부, 북마크, "다시 보지 않기"
- 관리자용 전체 사용자 취약도 분석
- 오답 상태 영구 저장 테이블
- 우선순위 점수(priority_score) 정교화·시각화

---

*본 문서는 고팀장이 노션 허브의 전체 논의(선과장 계획안, 노팀장 검토의견, 조대표 결정사항)를 코드 사실과 대조하여 확정한 개발계획이며, §3에서 세부과목 taxonomy 오류를 정정했다.*

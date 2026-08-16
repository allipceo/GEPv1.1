# GEPv30-115 L2-F 통합오답복습 attempts 기반 재작성

**작성일:** 2026.08.16
**작성자:** 고팀장 (Claude Code)
**지시자:** 조대표 — GEPv30-113 회귀 검증 중 발견, 범위 파악 후 승인

## 1. 작업 목적

통합오답복습(L2-F)이 `wrong_questions`/`ox_wrong_questions` 테이블을 조회하는데
현재 DB에 이 두 테이블이 존재하지 않아 항상 "총 0문제"로 표시되던 버그를 수정.
`attempts` 원장 테이블 기반으로 재작성하고, 설계는 조대표 승인안(하이브리드)을 따른다:

- **`wrong_count`(누적)**: 문제별 전체 오답 시도 횟수 — 나중에 맞혀도 줄어들지 않음. 난이도 분류(N회+ 필터)에 사용.
- **활성 목록 포함 여부**: 최신 시도(`last_correct`)가 오답인 것만 — 최근에 맞히면 목록에서 제외.

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/015_get_unified_wrong_questions.sql` | 신규 RPC `get_unified_wrong_questions(p_study_modes text[])` — `attempts`를 `question_id`별로 집계해 `wrong_count`/`last_correct`/`last_wrong_at` 반환. `auth.uid()` 기반, SECURITY DEFINER 아님(RLS `attempts_self`로 충분). |
| `src/pages/ChallengeMode.jsx` | 재도전(다시풀기) 결과를 `attempts`에 기록하도록 추가. MCQ는 `recordAttempt`(studyMode=`unified_wrong_challenge`), OX는 `oxService.recordAttempt`(study_mode 고정 `'ox'`) 재사용. 기존 화면 전환/결과 표시 로직은 변경 없음. |
| `src/services/unifiedWrongService.js` | `fetchAllWrongQuestions`의 MCQ/OX 조회를 새 RPC 호출로 교체(`last_correct=false`만 필터). `reclassifyResults`는 더 이상 존재하지 않는 테이블/RPC를 호출하지 않고 캐시 무효화만 수행(재계산은 attempts 기록 기반 자동). |
| `src/pages/UnifiedWrongReview.jsx` | 목록 카드에 `sub_subject`/`questionRaw`가 애초에 채워진 적이 없던 기존 미완성분 보완 — `ChallengeMode.jsx`의 `enrichQuestion`과 동일 패턴으로 `examStore.questions` 조인 추가(MCQ만; OX는 기존 설계대로 원문 미표시). |

## 3. 설계 메모

- MCQ 재도전 attempts의 `study_mode`는 신규 값 `'unified_wrong_challenge'` 사용 — 기존 회차순/과목별/틀린문제복습/간이모의고사와 구분되지만, RPC 조회 시 MCQ 소스 목록(`MCQ_STUDY_MODES`)에 포함되어 오답 집계에는 함께 반영된다.
- OX 재도전은 `oxService.recordAttempt`가 `study_mode`를 `'ox'`로 고정하므로 일반 OX 풀이와 동일 스트림에 합류 — RPC의 OX 소스 목록(`OX_STUDY_MODES = ['ox']`)과 자연스럽게 일치.
- MOCK/CUSTOM 소스는 이번 변경 대상 아님 — 기존처럼 `mock_exam_attempts`/`custom_mock_attempts`에서 단순 오답 시도 누적 집계(해결/미해결 개념 없음).

## 4. 테스트 결과

- 빌드: ✅ `npm run build` 성공 (오류 0)
- RPC 직접 호출 검증: 테스터3 계정 액세스 토큰으로 REST 직접 호출 → `wrong_count`/`last_correct`/`last_wrong_at` 정상 반환 확인(200 OK, 45건).
- 프로덕션 배포 후 실제 화면 확인 예정(아래 5번 참고).

## 5. 배포 결과

- Commit: (커밋 후 기입)
- URL: https://gepv11.vercel.app

## 6. 다음 작업

없음 — GEPv30-113 회귀 검증 + 발견된 버그 2건(멀티탭 비밀번호 변경, L2-F) 모두 처리 완료.

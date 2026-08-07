# GEPv30-012 Phase2 데이터카운팅계약 정의서

## 1. 문서 목적

이 문서는 GEP V3.0 1단계 서비스의 Phase 2 산출물이다.

목적은 답안 제출 1건이 어떻게 저장되고, 그 기록에서 오늘 통계, 누적 통계, 과목별 통계, 반복 오답 통계가 어떻게 계산되는지 확정하는 것이다.

이 문서가 승인되기 전에는 가입 승인, 서비스 A, 서비스 B, 통계 화면 구현을 진행하지 않는다.

## 2. Phase 2 핵심 원칙

Phase 2의 핵심 원칙은 다음과 같다.

1. 카운팅의 최종 원장은 답안 제출 이벤트이다.
2. 기존 `attempts` 테이블을 V3.0 1단계의 핵심 풀이 이벤트 원장으로 재사용한다.
3. 승인된 사용자만 기록되는 문제풀이를 할 수 있다.
4. 서비스 A와 서비스 B는 같은 답안 제출 로직을 사용한다.
5. 화면 통계는 이벤트 원장에서 재계산 가능해야 한다.
6. 카운팅 초기화는 과거 기록 삭제가 아니라 기준 시점 변경으로 처리한다.
7. 반복 오답 이력은 사용자가 나중에 정답을 맞혀도 사라지지 않는다.

## 3. 사용자 승인 데이터 계약

### 3.1 사용자 상태값

V3.0 1단계 사용자 상태값은 다음으로 확정한다.

1. `guest`: 미로그인 또는 미등록 사용자
2. `pending`: 가입 승인 요청 후 승인 대기
3. `approved`: 운영자 승인 완료
4. `rejected`: 승인 거절
5. `paused`: 운영자에 의한 일시 중지

문제풀이와 카운팅은 `approved` 사용자에게만 허용한다.

### 3.2 `users` 테이블 보강 계약

기존 `users` 테이블에는 `user_id`, `status`, `service_level`, `created_at` 등이 있다.

V3.0 1단계에서는 다음 필드 보강이 필요하다.

1. `real_name`: 실명
2. `phone_number`: 전화번호
3. `approval_status`: 승인 상태
4. `approval_requested_at`: 승인 요청 시각
5. `approved_at`: 승인 시각
6. `approved_by`: 승인 처리자
7. `approval_memo`: 승인 또는 거절 메모
8. `reset_baseline_at`: 통계 초기화 기준 시점

권장 기본값은 다음과 같다.

1. 신규 요청 사용자: `approval_status = 'pending'`
2. 승인 사용자: `approval_status = 'approved'`
3. 초기화 전 사용자: `reset_baseline_at = null`

### 3.3 승인 조건

사용자가 문제풀이에 진입하려면 다음 조건을 모두 만족해야 한다.

1. 로그인 상태이다.
2. `users` 테이블에 사용자 레코드가 있다.
3. `approval_status = 'approved'`이다.
4. `status = 'active'`이다.
5. `is_paused`가 존재하는 경우 `false`이다.

## 4. 답안 제출 이벤트 원장 계약

### 4.1 원장 테이블

V3.0 1단계의 답안 제출 원장은 기존 `attempts` 테이블로 한다.

기존 필드는 다음과 같다.

1. `attempt_id`
2. `user_id`
3. `question_id`
4. `question_round`
5. `subject`
6. `sub_subject`
7. `study_mode`
8. `selected_answer`
9. `is_correct`
10. `exam_version`
11. `service_level`
12. `device_id`
13. `attempted_at`

### 4.2 추가 권장 필드

현재 `attempts`에는 V3.0 계약상 있으면 좋은 필드가 일부 빠져 있다.

보강 권장 필드는 다음과 같다.

1. `correct_answer`: 제출 시점의 정답
2. `session_id`: 문제풀이 세션 식별자
3. `reset_baseline_at`: 제출 시점에 적용된 초기화 기준 시점
4. `attempt_source`: `service_a`, `service_b`, `wrong_review` 등 상위 서비스 구분

다만 1단계 구현 속도를 고려하면 `study_mode`를 세분화하여 `attempt_source` 역할을 하게 할 수 있다.

권장 `study_mode` 값은 다음과 같다.

1. `service_a_sequence`: 서비스 A 실제 기출 순차 풀이
2. `service_b_subject_random`: 서비스 B 과목별 랜덤 풀이
3. `wrong_review`: 일반 오답 복습
4. `wrong_nplus_review`: N회 이상 반복 오답 복습

### 4.3 답안 제출 1건의 의미

답안 제출 1건은 사용자가 특정 세션에서 특정 문제에 대해 한 번의 판단을 내린 기록이다.

저장 조건은 다음과 같다.

1. 사용자가 `approved` 상태이다.
2. 문제 ID가 존재한다.
3. 선택 답안이 1부터 4 사이이다.
4. 정답과 비교하여 `is_correct`가 계산된다.
5. 같은 화면에서 중복 클릭된 답안은 중복 저장하지 않는다.
6. 별도 복습 세션에서 다시 푼 경우는 새로운 이벤트로 저장한다.

## 5. 서비스 A 데이터 계약

서비스 A는 실제 기출문제를 회차와 문제 순서대로 제공한다.

### 5.1 문제 공급 기준

1. 데이터 원천: `public/data/exams.json`
2. 회차: 23회부터 31회
3. 정렬 기준: 실제 기출 순서
4. 기본 필터: 선택 회차

### 5.2 저장 계약

서비스 A의 답안 제출 이벤트는 다음 값을 가진다.

1. `study_mode = 'service_a_sequence'`
2. `question_round = 선택 회차`
3. `subject = 문제의 대과목`
4. `sub_subject = 문제의 세부 과목`
5. `selected_answer = 사용자 선택`
6. `is_correct = selected_answer === question.answer`

## 6. 서비스 B 데이터 계약

서비스 B는 10년치 기출문제를 과목별 또는 세부 과목별로 랜덤 제공한다.

### 6.1 문제 공급 기준

1. 데이터 원천: `public/data/exams.json`
2. 회차 범위: 23회부터 31회
3. 필터 기준: 과목 또는 세부 과목
4. 정렬 기준: 랜덤

### 6.2 저장 계약

서비스 B의 답안 제출 이벤트는 다음 값을 가진다.

1. `study_mode = 'service_b_subject_random'`
2. `question_round = 원문 문제의 회차`
3. `subject = 선택 또는 문제의 대과목`
4. `sub_subject = 선택 또는 문제의 세부 과목`
5. `selected_answer = 사용자 선택`
6. `is_correct = selected_answer === question.answer`

서비스 B는 랜덤 제공 방식이지만 통계에서는 원래 회차, 과목, 세부 과목을 그대로 보존한다.

## 7. 통계 계산 계약

모든 통계는 다음 기본 조건을 적용한다.

1. `user_id = 현재 사용자`
2. `attempted_at >= reset_baseline_at`
3. `reset_baseline_at`이 null이면 전체 기간
4. 승인 사용자 기록만 포함

### 7.1 오늘 전체 통계

오늘 전체 풀이 수는 다음으로 계산한다.

```text
today_total_solved =
  count(attempts)
  where user_id = current_user
    and attempted_at >= reset_baseline_at
    and attempted_at is today
```

오늘 정답 수는 다음으로 계산한다.

```text
today_total_correct =
  count(attempts)
  where user_id = current_user
    and attempted_at >= reset_baseline_at
    and attempted_at is today
    and is_correct = true
```

오늘 정답률은 다음으로 계산한다.

```text
today_accuracy =
  today_total_correct / today_total_solved * 100
```

풀이 수가 0이면 정답률은 표시하지 않거나 `-`로 표시한다.

### 7.2 오늘 과목별 통계

오늘 과목별 통계는 오늘 답안 제출 이벤트를 `sub_subject` 또는 `subject` 기준으로 그룹화하여 계산한다.

권장 표시 기준은 세부 과목이다.

```text
today_subject_solved[sub_subject] =
  count(attempts)
  where user_id = current_user
    and attempted_at >= reset_baseline_at
    and attempted_at is today
  group by sub_subject
```

```text
today_subject_correct[sub_subject] =
  count(attempts)
  where user_id = current_user
    and attempted_at >= reset_baseline_at
    and attempted_at is today
    and is_correct = true
  group by sub_subject
```

### 7.3 누적 전체 통계

누적 전체 풀이 수는 초기화 기준 시점 이후 전체 답안 제출 이벤트 수이다.

```text
cumulative_total_solved =
  count(attempts)
  where user_id = current_user
    and attempted_at >= reset_baseline_at
```

누적 전체 정답률은 다음으로 계산한다.

```text
cumulative_accuracy =
  cumulative_total_correct / cumulative_total_solved * 100
```

### 7.4 누적 과목별 통계

누적 과목별 통계는 초기화 기준 시점 이후 답안 제출 이벤트를 과목 또는 세부 과목으로 그룹화하여 계산한다.

```text
cumulative_subject_accuracy[sub_subject] =
  correct_count(sub_subject) / solved_count(sub_subject) * 100
```

### 7.5 반복 오답 통계

문제별 오답 횟수는 다음으로 계산한다.

```text
wrong_count[question_id] =
  count(attempts)
  where user_id = current_user
    and attempted_at >= reset_baseline_at
    and question_id = target_question
    and is_correct = false
```

N회 이상 반복 오답은 다음으로 계산한다.

```text
nplus_wrong_questions =
  questions
  where wrong_count[question_id] >= N
```

과목별 N회 이상 반복 오답 비율은 다음으로 계산한다.

```text
subject_nplus_wrong_ratio =
  subject_nplus_wrong_question_count / subject_attempted_question_count * 100
```

여기서 `subject_attempted_question_count`는 해당 과목에서 사용자가 한 번 이상 푼 고유 문제 수를 기준으로 한다.

## 8. 오답 이력 보존 계약

V3.0에서는 반복 오답 이력을 삭제하지 않는다.

사용자가 과거에 4번 틀린 문제를 나중에 맞혔더라도 다음은 유지한다.

1. 과거 오답 횟수
2. 과거 오답 발생 시각
3. 과거 오답이 발생한 서비스 모드

다만 화면에서는 두 가지 표시 방식을 구분할 수 있다.

1. 반복 오답 이력: 지금까지 몇 번 틀렸는가
2. 현재 미해결 오답: 마지막 풀이가 아직 오답인가

1단계에서는 반복 오답 이력을 우선한다. “많이 틀린 문제순 학습”은 과거 오답 횟수 기준으로 제공한다.

## 9. 초기화 데이터 계약

### 9.1 초기화 원칙

카운팅 초기화는 과거 답안 이벤트를 삭제하지 않는다.

초기화는 사용자의 현재 통계 기준선을 새로 잡는 행위이다.

### 9.2 `reset_events` 테이블 신설 권장

초기화 기록을 위해 다음 테이블을 신설한다.

```sql
CREATE TABLE reset_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  actor_user_id UUID REFERENCES users(user_id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('self', 'operator')),
  reset_scope TEXT NOT NULL DEFAULT 'all',
  previous_baseline_at TIMESTAMPTZ,
  new_baseline_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.3 초기화 처리 순서

초기화는 다음 순서로 처리한다.

1. 현재 `users.reset_baseline_at`을 읽는다.
2. `reset_events`에 초기화 이벤트를 저장한다.
3. `users.reset_baseline_at`을 현재 시각으로 갱신한다.
4. 화면 통계는 새 기준 시점 이후 이벤트만 기준으로 계산한다.

## 10. 집계 캐시 계약

집계 캐시는 화면 속도를 위한 보조 수단이다.

사용 가능한 집계 캐시는 다음과 같다.

1. `question_stats`
2. `wrong_questions`
3. `ox_wrong_questions`
4. 로컬 `statsStore`

단, 집계 캐시와 원장이 불일치하면 원장인 `attempts`를 우선한다.

V3.0 1단계의 레드팀 테스트에서는 화면 통계와 `attempts` 기준 재계산 결과가 일치하는지를 반드시 확인한다.

## 11. DB 보강 필요 여부

Phase 2 판단상 DB 보강은 필요하다.

필수 보강은 다음과 같다.

1. `users.real_name`
2. `users.phone_number`
3. `users.approval_status`
4. `users.approval_requested_at`
5. `users.approved_at`
6. `users.approved_by`
7. `users.approval_memo`
8. `users.reset_baseline_at`
9. `reset_events` 테이블

선택 보강은 다음과 같다.

1. `attempts.correct_answer`
2. `attempts.session_id`
3. `attempts.reset_baseline_at`

채팀장 권고는 필수 보강은 Phase 3 이전에 적용하고, 선택 보강 중 `correct_answer`와 `session_id`는 가능하면 함께 적용하는 것이다.

## 12. Phase 2 레드팀 테스트 케이스

Phase 2 이후 구현 검증 시 사용할 테스트 케이스는 다음과 같다.

1. 미로그인 사용자가 `/question`에 직접 접근하면 팝업이 뜨는가?
2. 로그인했지만 `pending` 사용자는 문제풀이에 진입하지 못하는가?
3. `approved` 사용자만 답안 제출 이벤트를 만들 수 있는가?
4. 같은 문제에서 답안 버튼을 두 번 눌러도 같은 화면에서는 1회만 카운팅되는가?
5. 서비스 A 풀이와 서비스 B 풀이가 같은 `attempts` 원장에 저장되는가?
6. 오늘 전체 풀이 수가 실제 오늘 이벤트 수와 일치하는가?
7. 오늘 과목별 정답률이 실제 이벤트 계산과 일치하는가?
8. 누적 전체 정답률이 초기화 기준 시점 이후 이벤트와 일치하는가?
9. 2회 이상 오답 목록이 실제 오답 횟수와 일치하는가?
10. 4회 이상 오답 문제를 다시 맞혀도 과거 오답 횟수가 보존되는가?
11. 사용자가 초기화하면 과거 이벤트는 남고 화면 통계만 초기화되는가?
12. 운영자가 초기화하면 실행자와 사유가 기록되는가?

## 13. Phase 2 게이트웨이 판단

Phase 2의 게이트웨이 판단은 **승인 대기**이다.

대표님이 승인해야 할 핵심 결정은 다음과 같다.

1. `approved` 사용자만 문제풀이와 카운팅 허용
2. `attempts`를 답안 제출 이벤트 원장으로 사용
3. `users`에 실명, 전화번호, 승인 상태, 초기화 기준 시점 필드 추가
4. `reset_events` 테이블 신설
5. 통계는 `reset_baseline_at` 이후의 `attempts`를 기준으로 계산
6. 반복 오답 이력은 정답 처리 후에도 보존
7. 서비스 A와 B는 같은 답안 제출 로직 사용

## 14. 다음 Phase 권고

Phase 2 승인 후 Phase 3에서는 가입 승인 블록을 구현한다.

Phase 3의 우선 구현 순서는 다음과 같다.

1. DB 마이그레이션 SQL 작성
2. 사용자 승인 상태 조회 로직 구현
3. 승인 요청 화면 구현
4. 승인 대기 화면 구현
5. 운영자 승인 최소 화면 구현
6. `approved` 상태 기반 라우트 보호로 확장
7. 빌드 및 레드팀 테스트

## 15. 결론

GEP V3.0 1단계의 카운팅 구조는 다음 문장으로 확정한다.

**승인된 사용자의 모든 답안 제출은 `attempts` 원장에 기록하고, 모든 통계와 반복 오답은 초기화 기준 시점 이후의 원장 기록에서 재계산 가능해야 한다.**

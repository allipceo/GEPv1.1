# GEPv30-017 Phase4 카운팅 계약 및 초기화 구현보고서

- 작성일: 2026-08-05
- 대상: GEP V3.0 Phase4 카운팅 안전계약
- 브랜치: gepv30-phase1-pilot
- 테스트 URL: http://127.0.0.1:5173/

## 1. 구현 목적

Phase4의 목적은 단순 통계 표시가 아니라, 파일럿 승인 사용자별로 모든 풀이 기록이 정확히 분리되고 누적되도록 카운팅 계약을 강화하는 것이다.

대표님 요구사항 중 이번 단계에 반영한 핵심은 다음과 같다.

1. 로그인하지 않은 사용자는 카운팅되지 않는다.
2. 승인되지 않은 사용자는 카운팅되지 않는다.
3. 승인된 사용자라도 정지 상태이면 카운팅되지 않는다.
4. 사용자별 오답 조회는 반드시 본인 기록만 사용한다.
5. 사용자 또는 운영자가 카운팅 기준선을 초기화할 수 있다.
6. 초기화는 원장 삭제가 아니라 `reset_baseline_at` 기준선 방식으로 처리한다.

## 2. 주요 변경사항

### 2.1 카운팅 자격 계약 분리

- 추가 파일: `src/services/countingEligibility.js`
- 기능:
  - `canCountAttempts(authState)`
  - `getCountingBlockReason(authState)`

카운팅 가능 조건은 다음과 같다.

1. `authStatus === 'authenticated'`
2. `userId` 존재
3. `status === 'active'`
4. `isPaused !== true`
5. `approvalStatus === 'approved'` 또는 운영자 계정

기존 `service_level >= 2` 중심 조건은 파일럿 1단계 기준과 맞지 않아, 카운팅 자격에서는 승인 상태를 우선 기준으로 분리했다.

### 2.2 MCQ 기록 원장 보호

- 변경 파일: `src/services/statsService.js`

변경 전에는 `recordAttempt`가 먼저 로컬 통계를 증가시키고, 이후 조건에 따라 Supabase 저장을 시도했다. 변경 후에는 다음 순서로 바뀌었다.

1. 승인 사용자 여부 확인
2. 회차 정보 유효성 확인
3. Supabase `attempts` 원장 INSERT
4. INSERT 성공 후 로컬 통계 증가
5. `question_stats` RPC 갱신

따라서 DB 원장 저장이 실패했는데 로컬 숫자만 올라가는 불일치 위험을 줄였다.

### 2.3 OX 기록 보호

- 변경 파일:
  - `src/services/oxService.js`
  - `src/stores/oxStore.js`

OX 기록과 진행도 저장도 `userId` 단독 기준이 아니라 전체 인증 상태와 승인 상태를 확인하도록 변경했다.

### 2.4 사용자별 로컬 통계 분리

- 변경 파일:
  - `src/utils/statsStorage.js`
  - `src/stores/statsStore.js`
  - `src/App.jsx`

로컬 통계 저장 키를 사용자별로 분리했다.

- 기존: `gep_stats_v1`
- 변경: `gep_stats_v1:{userId}`

로그인 사용자가 바뀌면 `App.jsx`에서 `statsStore.bindUser(userId)`를 호출해 해당 사용자의 로컬 통계만 표시한다.

### 2.5 오답복습 사용자 격리

- 변경 파일: `src/pages/WrongReview.jsx`

오답 조회 시 `attempts` 테이블에서 반드시 현재 사용자 조건을 적용한다.

- 추가 조건: `.eq('user_id', userId)`
- 초기화 기준선이 있으면 `.gte('attempted_at', resetBaselineAt)` 적용

이 변경으로 다른 사용자의 오답 기록이 섞일 수 있는 위험을 제거했다.

### 2.6 카운팅 초기화 구현

- 추가 파일: `src/services/countingResetService.js`
- 변경 파일:
  - `src/components/Settings.jsx`
  - `src/pages/Home.jsx`
  - `src/pages/AdminUsers.jsx`

초기화 방식은 삭제가 아니라 기준선 방식이다.

1. `users.reset_baseline_at`을 현재 시각으로 갱신
2. `reset_events`에 누가, 누구를, 언제 초기화했는지 기록
3. 사용자 본인 초기화 시 로컬 통계도 즉시 초기화
4. 운영자는 승인관리 화면에서 특정 사용자 기준선 초기화 가능

## 3. 웹 검증 결과

### 3.1 빌드 검증

- 명령: `npm run build`
- 결과: 통과
- 변환 모듈: 145 modules
- 산출물: `dist/index.html`, CSS, JS 생성

참고: Vite의 500 kB 이상 번들 경고는 계속 존재한다. 기능 실패는 아니며 향후 성능 최적화 단계에서 다룬다.

### 3.2 브라우저 검증

- URL: `/`
- 결과: 통과
- 확인 내용:
  - 홈 화면 정상 렌더링
  - `GEP 보험중개사`, `Google로 시작하기`, 학습 카드 표시
  - 콘솔 오류 없음

- URL: `/question`
- 결과: 통과
- 확인 내용:
  - 비로그인 상태에서 `등록이 필요합니다` 화면 표시
  - 문제풀이 화면 미노출

- URL: `/admin/users`
- 결과: 통과
- 확인 내용:
  - 비로그인 상태에서 `등록이 필요합니다` 화면 표시
  - 운영자 화면 미노출

## 4. 레드팀 점검

### 해결된 위험

1. 승인되지 않은 사용자의 카운팅 가능성 차단
2. `service_level` 조건 때문에 파일럿 승인 사용자가 카운팅되지 않을 가능성 제거
3. DB 원장 실패 후 로컬 통계만 증가하는 불일치 완화
4. 오답복습에서 다른 사용자 기록이 섞일 수 있는 위험 제거
5. 같은 브라우저에서 사용자별 로컬 통계가 섞이는 위험 완화
6. 초기화 기능을 원장 삭제가 아닌 기준선 방식으로 구현

### 아직 실제 운영 DB에서 검증해야 할 항목

현재 로컬 환경에는 `.env.local`이 없으므로 다음 항목은 실제 Supabase 연결 후 검증해야 한다.

1. 승인 사용자 MCQ 풀이 시 `attempts` INSERT
2. 승인 사용자 OX 풀이 시 `attempts` INSERT
3. `question_stats` RPC 갱신
4. 본인 카운팅 초기화 시 `users.reset_baseline_at` 갱신
5. `reset_events` 기록 생성
6. 운영자 카운팅 초기화
7. 초기화 이후 오답복습이 기준선 이후 기록만 조회하는지 확인

## 5. 게이트웨이 판정

### Phase4 로컬 코드/웹 게이트

- 판정: 조건부 통과
- 근거:
  - 빌드 성공
  - 홈 화면 정상 렌더링
  - 비로그인 문제풀이 차단 유지
  - 비로그인 운영자 화면 차단 유지
  - 콘솔 오류 없음

### Phase4 운영 DB 게이트

- 판정: 보류
- 이유:
  - Supabase 환경값과 실제 DB 마이그레이션 적용 여부가 아직 확인되지 않았다.
  - 카운팅 원장 INSERT와 초기화 이벤트 기록은 실제 DB에서 최종 확인해야 한다.

## 6. 다음 건의

다음 단계는 Supabase 환경 연결 후 실제 계정으로 운영 DB 게이트를 검증하는 것이다.

권장 순서는 다음과 같다.

1. `.env.local` 설정
2. `007_v3_pilot_approval.sql` 실제 DB 적용 확인
3. 운영자 `choeunsang@gmail.com` 로그인
4. 테스트 사용자 승인
5. 승인 사용자로 MCQ 2문제 풀이
6. 오답복습 사용자별 조회 확인
7. 본인 초기화 및 운영자 초기화 확인
8. 기준선 이후 통계만 표시되는지 확인

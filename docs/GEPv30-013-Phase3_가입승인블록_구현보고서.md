# GEPv30-013 Phase3 가입승인블록 구현보고서

## 1. 문서 목적

이 문서는 GEP V3.0 1단계 서비스의 Phase 3 가입 승인 블록 구현 결과를 기록한다.

Phase 3의 목표는 로그인만으로 문제풀이를 허용하지 않고, 실명과 전화번호를 제출한 뒤 운영자 승인을 받은 사용자만 문제풀이와 카운팅에 진입할 수 있도록 하는 것이다.

## 2. 대표님 승인 사항

대표님은 Phase 2 데이터와 카운팅 계약을 승인하고 다음 Phase 진행을 지시했다.

Phase 3 적용 정책은 다음과 같다.

1. 미로그인 사용자는 문제풀이 불가
2. 로그인했지만 승인되지 않은 사용자는 문제풀이 불가
3. 승인 요청에는 실명과 전화번호가 필요
4. 운영자가 승인한 사용자만 문제풀이 가능
5. 승인 상태는 카운팅의 전제 조건

## 3. 구현 요약

이번 Phase 3에서 구현한 항목은 다음과 같다.

1. 승인 상태 기반 인증 스토어 확장
2. 실명과 전화번호 승인 요청 UI
3. 승인 대기, 거절, 일시 중지 상태별 접근 차단
4. 문제풀이 라우트의 `approved` 상태 보호
5. 운영자 승인 관리 최소 화면
6. 운영자 홈 진입 버튼
7. Supabase 승인/초기화 보강 SQL 마이그레이션 파일

## 4. 변경 파일

변경 또는 추가한 파일은 다음과 같다.

1. `GEPv1.1-source/src/stores/authStore.js`
2. `GEPv1.1-source/src/components/RequireLogin.jsx`
3. `GEPv1.1-source/src/pages/AdminUsers.jsx`
4. `GEPv1.1-source/src/App.jsx`
5. `GEPv1.1-source/src/pages/Home.jsx`
6. `GEPv1.1-source/src/components/LoginButton.jsx`
7. `GEPv1.1-source/supabase/migrations/007_v3_pilot_approval.sql`

## 5. DB 마이그레이션

신규 SQL 파일은 다음이다.

`GEPv1.1-source/supabase/migrations/007_v3_pilot_approval.sql`

이 SQL은 다음을 수행한다.

1. `users` 테이블에 실명, 전화번호, 승인 상태, 승인 처리 정보, 초기화 기준 시점 추가
2. `reset_events` 테이블 생성
3. `gep_admin_emails` 테이블 생성
4. `gep_is_admin()` 함수 생성
5. 운영자용 RLS 정책 추가
6. 승인 상태와 초기화 기록 조회를 위한 인덱스 추가

운영 DB에 이 SQL을 적용해야 승인 요청과 운영자 승인이 정상 작동한다.

운영자 이메일은 SQL 적용 후 다음 방식으로 등록해야 한다.

```sql
INSERT INTO gep_admin_emails (email)
VALUES ('운영자이메일@example.com')
ON CONFLICT (email) DO NOTHING;
```

프론트엔드에서도 같은 이메일을 환경변수에 넣어야 관리자 버튼이 표시된다.

```text
VITE_GEP_ADMIN_EMAILS=운영자이메일@example.com
```

여러 명이면 쉼표로 구분한다.

## 6. 승인 상태 흐름

### 6.1 미로그인 사용자

미로그인 사용자가 문제풀이 라우트에 접근하면 로그인/등록 요구 팝업을 표시한다.

### 6.2 로그인했지만 승인 요청 정보가 없는 사용자

실명과 전화번호 입력 화면을 표시한다.

사용자가 입력 후 승인 요청을 누르면 `users` 테이블에 다음 값을 저장한다.

1. `real_name`
2. `phone_number`
3. `approval_status = 'pending'`
4. `approval_requested_at`
5. `approval_memo`

### 6.3 승인 대기 사용자

승인 대기 안내를 표시하고 문제풀이 화면에 진입하지 못하게 한다.

### 6.4 승인 완료 사용자

다음 조건을 만족하면 문제풀이 화면에 진입한다.

1. `authStatus = 'authenticated'`
2. `approvalStatus = 'approved'`
3. `status = 'active'`
4. `isPaused = false`

### 6.5 거절 또는 일시 중지 사용자

문제풀이 화면에 진입하지 못하게 하고 상태 안내를 표시한다.

## 7. 운영자 승인 화면

신규 라우트는 다음이다.

`/admin/users`

운영자 화면 기능은 다음과 같다.

1. 사용자 목록 조회
2. 실명 확인
3. 전화번호 확인
4. 승인 상태 확인
5. 승인 메모 입력
6. 승인 처리
7. 거절 처리
8. 일시 중지 처리

관리자 화면은 로그인은 필요하지만, 운영자 본인의 승인 상태는 요구하지 않는다. 이는 운영자가 최초 운영 세팅을 할 수 있게 하기 위한 파일럿 운영상 예외이다.

## 8. 라우트 보호 범위

다음 라우트는 승인 완료 사용자만 접근 가능하다.

1. `/question`
2. `/result`
3. `/wrong-review`
4. `/ox`
5. `/ox/:subjectKey`
6. `/ox/:subjectKey/:subSubject`
7. `/ox/:subjectKey/:subSubject/review`
8. `/mock`
9. `/mock/:round/:part`
10. `/mock/:round/:part/result`
11. `/mock/:round/result`
12. `/mock/:round/break`
13. `/mock/stats`
14. `/custom-mock`
15. `/custom-mock/:sessionId/part1`
16. `/custom-mock/:sessionId/part2`
17. `/custom-mock/:sessionId/result`
18. `/custom-mock/stats`
19. `/unified-wrong`
20. `/unified-wrong/challenge/:minCount`
21. `/unified-wrong/result`
22. `/unified-wrong/progress`

## 9. 검증 결과

다음 명령으로 빌드를 검증했다.

```powershell
npm run build
```

결과는 성공이다.

확인 내용은 다음과 같다.

1. Vite 빌드 성공
2. 변환 모듈 수: 143개
3. 생성 파일: `dist/index.html`, CSS, JS 번들
4. 기존과 동일하게 JS 번들 500kB 초과 경고 존재

## 10. 레드팀 점검

### 10.1 미로그인 우회

직접 URL 접근도 `RequireLogin`에서 차단한다.

판단: 통과

### 10.2 로그인 후 미승인 우회

로그인 사용자의 `approvalStatus`가 `approved`가 아니면 문제풀이 화면을 렌더링하지 않는다.

판단: 통과

### 10.3 승인 요청 필수값

실명과 전화번호가 없으면 승인 요청을 제출할 수 없다.

판단: 통과

### 10.4 운영자 승인

운영자 승인 화면을 구현했다.

단, 운영 DB에 `007_v3_pilot_approval.sql` 적용과 운영자 이메일 등록이 선행되어야 실제 승인 처리가 가능하다.

판단: 조건부 통과

### 10.5 카운팅 오염 방지

미승인 사용자는 실제 문제풀이 화면에 진입하지 못하므로 답안 제출 이벤트를 만들 수 없다.

판단: 통과

## 11. 남은 전제와 위험

### 11.1 운영 DB 적용 필요

이번 작업은 코드와 SQL 파일을 작성했지만, 실제 Supabase 운영 DB에 SQL을 직접 실행하지는 않았다.

운영 반영 전에는 다음을 수행해야 한다.

1. Supabase SQL Editor에서 `007_v3_pilot_approval.sql` 실행
2. `gep_admin_emails`에 운영자 이메일 등록
3. Vercel 또는 로컬 환경변수 `VITE_GEP_ADMIN_EMAILS` 설정

### 11.2 기존 사용자 상태

기존 사용자는 SQL 적용 후 기본값에 따라 `approval_status = 'pending'`이 된다.

따라서 운영자는 파일럿 대상자를 승인해야 한다.

### 11.3 보안 정책 확인

운영자 승인은 RLS 정책과 `gep_is_admin()` 함수에 의존한다.

실제 Supabase에서 관리자 조회와 업데이트가 정상 동작하는지 운영 DB에서 1회 확인해야 한다.

## 12. Phase 3 게이트웨이 판단

Phase 3의 현재 판단은 **조건부 통과**이다.

통과 근거는 다음과 같다.

1. 코드 구현 완료
2. 승인 상태 기반 라우트 보호 구현
3. 승인 요청 UI 구현
4. 운영자 승인 화면 구현
5. DB 마이그레이션 SQL 작성
6. 빌드 성공

조건부 사유는 다음과 같다.

1. Supabase 운영 DB에 SQL을 아직 적용하지 않았다.
2. 운영자 이메일을 아직 실제 DB와 환경변수에 등록하지 않았다.
3. 실제 운영 DB RLS 동작 확인이 남아 있다.

## 13. 다음 Phase 권고

Phase 3 조건부 통과 후 다음 작업은 다음 순서가 적절하다.

1. 대표님 운영자 이메일 확정
2. Supabase 운영 DB에 SQL 적용
3. 운영자 이메일 DB 등록
4. 환경변수 설정
5. 실제 로그인 후 승인 요청 테스트
6. 운영자 승인 테스트
7. 승인 사용자 문제풀이 진입 테스트

이 확인이 끝나면 Phase 4 서비스 A 구현으로 넘어갈 수 있다.

## 14. 결론

GEP V3.0 1단계의 가입 승인 블록은 코드 기준으로 구현되었다.

현재 구조에서는 로그인하지 않은 사용자와 승인되지 않은 사용자가 문제풀이 화면에 진입할 수 없다.

운영 DB에 SQL과 관리자 이메일을 적용하면 파일럿 대상자를 운영자가 승인하고, 승인된 사용자만 문제풀이와 카운팅을 시작하는 구조가 완성된다.

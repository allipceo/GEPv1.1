# GEPv30-015 Phase3 1단계운영자고정정보 반영보고서

## 1. 문서 목적

이 문서는 GEP V3.0 1단계 파일럿 서비스의 운영자 고정 정보를 코드와 DB 마이그레이션에 반영한 내용을 기록한다.

## 2. 대표님 지시 사항

1단계 파일럿 운영자는 다음 고정 정보로 한다.

1. 운영자 성명: 조은상
2. 운영자 이메일: `choeunsang@gmail.com`
3. 운영자 전화번호: `010-2067-6442`

이 정보는 1단계 파일럿에서만 고정값으로 사용한다. 향후 유료서비스로 전환할 때는 변경 가능한 운영자 관리 구조로 전환한다.

## 3. 반영 방식

### 3.1 코드 반영

`src/stores/authStore.js`에 1단계 파일럿 기본 관리자 이메일을 반영했다.

```js
const PILOT_ADMIN_EMAILS = ['choeunsang@gmail.com']
```

이 값은 `VITE_GEP_ADMIN_EMAILS` 환경변수와 함께 병합된다.

따라서 로컬 또는 배포 환경에서 별도 환경변수가 없어도 `choeunsang@gmail.com`으로 로그인한 사용자는 프론트엔드에서 관리자 버튼을 볼 수 있다.

### 3.2 DB 마이그레이션 반영

`supabase/migrations/007_v3_pilot_approval.sql`에 운영자 이메일 seed를 추가했다.

```sql
INSERT INTO gep_admin_emails (email)
VALUES ('choeunsang@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

이 SQL을 Supabase 운영 DB에 실행하면 `gep_is_admin()` 함수가 `choeunsang@gmail.com`을 운영자로 인식한다.

## 4. 권한 판정 기준

1단계의 관리자 권한 판정은 이메일 기준으로 한다.

전화번호와 성명은 운영자 식별 문서 정보로 남기되, 실제 인증 권한 판정은 Google OAuth 이메일과 Supabase `gep_admin_emails` 테이블 기준으로 처리한다.

이 방식이 안전한 이유는 다음과 같다.

1. Google OAuth 로그인 이메일을 기준으로 실제 사용자를 식별할 수 있다.
2. 전화번호는 현재 OAuth 인증 값이 아니므로 권한 판정에 직접 사용하지 않는다.
3. 유료서비스 전환 시 운영자 관리 테이블을 확장하기 쉽다.

## 5. 변경 파일

변경 파일은 다음과 같다.

1. `GEPv1.1-source/src/stores/authStore.js`
2. `GEPv1.1-source/supabase/migrations/007_v3_pilot_approval.sql`

## 6. 운영 전제

실제 운영 DB에서는 아직 다음 작업이 필요하다.

1. Supabase SQL Editor에서 `007_v3_pilot_approval.sql` 실행
2. `choeunsang@gmail.com`으로 Google 로그인
3. 홈 화면에서 `사용자 승인 관리` 버튼 표시 확인
4. `/admin/users` 접근 확인

## 7. 결론

GEP V3.0 1단계 파일럿 운영자는 조은상 대표님으로 고정 반영했다.

코드와 SQL 양쪽에 `choeunsang@gmail.com`을 기본 운영자 이메일로 반영했으며, 유료서비스 전환 시에는 별도 운영자 관리 구조로 대체한다.

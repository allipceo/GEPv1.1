# GEPv30-162 관리자 신규회원 등록 — 복구 + 업그레이드 기획

**작성일**: 2026-09-09
**작성자**: 고팀장 (Claude Code) — 코드 조사 + 기획 초안
**지시**: 조대표 — "관리자 화면에서 직접 신규회원을 등록하고 싶다. 앱 초기엔 작동했으나 지금은 안 된다. 원인 확인 후 기획 작성 → 노션 반영"
**대상 화면**: 관리자 → 사용자관리(`/admin/users`) → "신규 직원 계정 생성" 카드

---

## 1. 결론 요약

| 항목 | 내용 |
|------|------|
| **고장 원인** | 엣지 함수 `admin-create-user` / `admin-reset-password` 가 **삭제된 테이블 `gep_admin_emails` 를 조회**해 관리자 인증에 실패 → 모든 호출이 **403 "Forbidden: not admin"** 반환 |
| **언제부터** | 2026-08-15 마이그레이션 `drop_unused_tables` 로 `gep_admin_emails` 삭제 + 같은 날 관리자 판정을 `users.is_admin` 로 이전. 엣지 함수는 **미갱신** |
| **1차 조치(복구)** | 엣지 함수 2개의 관리자 판정을 `users.is_admin = true` 기준으로 교체 후 재배포 |
| **2차 조치(업그레이드)** | 등록 폼을 `사번 / 성명 / 비밀번호` 3필드로 정리, 모든 값 **문자(string) 처리** — 숫자 변환 금지 |

---

## 2. 현재 코드 구조

### 2-1. 호출 흐름

```
[관리자 화면] AdminUsers.jsx > handleCreateUser()
   │  supabase.auth.getSession() → access_token
   │  fetch  POST  {VITE_SUPABASE_URL}/functions/v1/admin-create-user
   │        headers: Authorization: Bearer <access_token>
   │        body: { employeeId, realName, phone }
   ▼
[엣지 함수] supabase/functions/admin-create-user/index.ts  (배포 v2, ACTIVE, verify_jwt=true)
   1) Authorization 헤더 확인
   2) supabaseAdmin.auth.getUser(token) → 호출자 확인
   3) ❌ supabaseAdmin.from('gep_admin_emails').select('email').eq('email', 호출자이메일).single()
        → 테이블 없음 → adminRow = undefined → return 403 "Forbidden: not admin"
   4) (도달 못 함) auth.admin.createUser({ email, password, email_confirm:true })
   5) (도달 못 함) users 테이블 프로필 insert
```

### 2-2. 근거 (조사 결과)

| 확인 항목 | 결과 |
|-----------|------|
| `to_regclass('public.gep_admin_emails')` | **null** (테이블 없음) |
| 관련 마이그레이션 | `20260815163617 add_is_admin_to_users` → `20260815163635 redefine_gep_is_admin_to_use_users_table` → `20260815164115 drop_unused_tables` |
| 현재 `gep_is_admin()` 정의 | `SELECT COALESCE((SELECT is_admin FROM public.users WHERE user_id = auth.uid()), false)` |
| 현재 관리자 | `조대표` (`202504012@gep.local`, `users.is_admin = true`) 1명 |
| 엣지 함수 배포 상태 | `admin-create-user` v2 ACTIVE / `admin-reset-password` v1 ACTIVE — **둘 다 `gep_admin_emails` 참조** |
| 쿼리 재현 | `SELECT email FROM public.gep_admin_emails ...` → `ERROR 42P01 relation does not exist` |

> `admin-reset-password`(비밀번호 초기화)도 **같은 코드로 같은 이유로 고장** 상태. 이번에 함께 고친다.

### 2-3. 현재 등록 폼 (AdminUsers.jsx 235~283행)

| 필드 | state | 검증 | 비고 |
|------|-------|------|------|
| 사번 | `newEmployeeId` | `/^\d{6,}$/` (숫자 6자리+) | `inputMode="numeric"`, placeholder `202504012` |
| 실명 | `newRealName` | 공백 아님 | |
| 휴대폰 | `newPhone` | 숫자 8자리 (`replace(/[^0-9]/g,'').slice(0,8)`) | `"010 -"` 접두 표시. 안내문구 "초기 비밀번호: 입력한 8자리 숫자" |
| 비밀번호 | (필드 없음) | — | 서버가 `phone.slice(-8)` 로 생성 |

---

## 3. 업그레이드 기획

### 3-1. 정책 (조대표 확정)

1. **아이디(사번)**: 회사 개인정보 수집 방침상 실제 사번 미사용 → 조대표가 **`20260Bxxx` 형태로 임의 부여** (현재 `20260901`~`20260915` 순차 사용 중, 다음은 `20260916`…)
2. **비밀번호**: 해당 인원 **휴대폰 번호 뒤 8자리**
3. **모든 값을 문자(string)로 처리** — 숫자 타입 변환(`Number`/`parseInt`) 금지
   - 앞자리 `0` 보존, 정밀도/형변환 이슈 제거
   - 입력창은 `type="text"` + `inputMode="numeric"` (❌ `type="number"` 사용 금지)
   - DB: `users.phone_number` 는 이미 `text`, 사번은 `email = "{사번}@gep.local"` 문자열로만 사용 (별도 숫자 컬럼 없음)

### 3-2. 폼 재구성 (사번 / 성명 / 비밀번호)

| 필드 | 입력 | 검증 (문자열 기준) | 저장/사용 |
|------|------|--------------------|-----------|
| 사번 | text, `inputMode=numeric` | `/^\d{6,}$/` | `email = 사번 + '@gep.local'` |
| 성명 | text | `trim().length >= 1` | `users.real_name` |
| 비밀번호 | text, `inputMode=numeric` | `/^\d{8}$/` (앞자리 0 허용) | Auth 비밀번호 + `users.phone_number` 에 동일 값 저장 |

> **`phone_number` 에도 같은 8자리를 저장**하는 이유: 기존 "비밀번호 초기화" 기능이 `phone_number` 뒤 8자리로 리셋하도록 되어 있어, 이 값을 채워두면 초기화 기능이 그대로 동작한다. (별도 휴대폰 전체번호가 필요하면 후속 논의)

### 3-3. 클라이언트 ↔ 엣지 함수 계약 변경

**변경 전**: `body: { employeeId, realName, phone }` → 서버가 `password = phone.slice(-8)`
**변경 후**: `body: { employeeId, realName, password }` → 서버가 `password` 를 그대로 사용, `phone_number = password`

### 3-4. 엣지 함수 수정 (admin-create-user / admin-reset-password 공통)

```
- const { data: adminRow } = await supabaseAdmin
-   .from('gep_admin_emails').select('email').eq('email', (user.email ?? '').toLowerCase()).single()
- if (!adminRow) return jsonResponse({ error: 'Forbidden: not admin' }, 403)
+ const { data: profile } = await supabaseAdmin
+   .from('users').select('is_admin').eq('user_id', user.id).single()
+ if (!profile?.is_admin) return jsonResponse({ error: 'Forbidden: not admin' }, 403)
```

`admin-create-user` 추가 변경:
- 입력 파싱: `const { employeeId, realName, password } = await req.json()`
- 검증: `String(employeeId).trim()` → `/^\d{6,}$/`, `String(password)` → `/^\d{8}$/`
- `const email = `${String(employeeId).trim()}@gep.local``
- `auth.admin.createUser({ email, password: String(password), email_confirm: true })`
- 프로필 insert: `phone_number: String(password)` (정책상 동일 값), 나머지 기존과 동일 (`status:'active'`, `approval_status:'approved'`, `approved_at`, `approved_by: user.id`, `is_paused:false`)
- 사번 중복(이메일 UNIQUE) 시 → `409` + "이미 존재하는 사번입니다."

### 3-5. 클라이언트(AdminUsers.jsx) 수정

- `newPhone` state → `newPassword` 로 의미 변경, 라벨 "휴대폰" → **"비밀번호 (휴대폰 뒤 8자리)"**
- `"010 -"` 접두 표시 제거
- 안내문구: "비밀번호: 휴대폰 번호 뒤 8자리 숫자 8자리"
- 전송 body `{ employeeId, realName, password: newPassword }`
- 성공 alert: `사번 / 이메일 / 비밀번호` 표기 후 3필드 초기화 + 목록 새로고침

### 3-6. 영향 범위 / 변경 파일

| 파일 | 변경 |
|------|------|
| `supabase/functions/admin-create-user/index.ts` | 관리자 판정 교체 + password 필드 계약 + 문자 처리 |
| `supabase/functions/admin-reset-password/index.ts` | 관리자 판정 교체 (그 외 로직 유지) |
| `src/pages/AdminUsers.jsx` | 폼 3필드 재구성, 전송 계약, 안내문구 |
| (배포) | 엣지 함수 2개 재배포 + 프론트 커밋·push |

RLS / 테이블 스키마 변경 **없음**. 게이트·라우트 변경 **없음**.

---

## 4. 검증 계획

| # | 항목 | 기대 결과 |
|---|------|-----------|
| 1 | 조대표 계정으로 사번 `20260916` / 성명 / 비번 8자리 등록 | 성공, 목록에 즉시 표시 (승인완료·활성) |
| 2 | 신규 계정으로 `gepv30.vercel.app` 로그인 (사번 / 비번) | 로그인 성공, 홈 진입 |
| 3 | 같은 사번 재등록 | 409 "이미 존재하는 사번입니다." |
| 4 | 비번 7자리 / 9자리 / 문자 포함 | 프론트 검증 차단 |
| 5 | 앞자리 0 비번(`01234567`) | 문자로 보존되어 등록·로그인 정상 |
| 6 | 비관리자 계정이 엣지 함수 직접 호출 | 403 "Forbidden: not admin" |
| 7 | 기존 사용자 "비밀번호 초기화" 버튼 | 정상 동작 (admin-reset-password 복구 확인) |

---

## 5. 미결/결정 필요

| 번호 | 사항 | 고팀장 의견 |
|------|------|-------------|
| D-1 | `phone_number` 컬럼에 "비번 8자리" 를 넣을지, 실제 휴대폰 전체번호를 별도 받을지 | 파일럿 규모에선 **8자리 동일값 저장**으로 충분(초기화 기능 유지). 실번호 필요 시 필드 1개 추가 |
| D-2 | 엣지 함수 관리자 판정을 `users.is_admin` 직접 조회 vs `gep_is_admin()` RPC 호출 | **직접 조회** 권장(SECURITY DEFINER RPC를 service_role로 호출할 필요 없음, 더 단순) |
| D-3 | 이 기획을 GEPv30-163 개발지시서로 확정할지 | 조대표 승인 시 착수 |

---

*GEPv30-162 | 담당: 고팀장(조사·기획초안) | 상태: 기획 — 조대표 검토 대기*

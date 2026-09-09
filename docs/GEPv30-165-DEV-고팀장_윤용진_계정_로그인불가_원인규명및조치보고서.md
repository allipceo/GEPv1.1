# GEPv30-165 윤용진 계정 로그인 불가 — 원인 규명 및 조치 보고서

**작성일**: 2026-09-09
**작성자**: 고팀장 (Claude Code)
**지시자**: 조대표
**대상 계정**: `20260909@gep.local` (윤용진, 파일럿 명단 9번, 휴대폰 010-9025-1585)
**상태**: ✅ 조치 완료 · DB 검증 완료

---

## 1. 지시

> "윤용진 id 260909 비밀번호 90251585가 작동이 안됩니다 왜 그런가요 확인하고 작동하도록 조치한 후 원인을 보고하세요"

---

## 2. 결론 요약

| 항목 | 내용 |
|------|------|
| **주 원인** | `public.users.approval_status = 'pending'` — 파일럿 16개 계정 중 **유일하게 미승인 상태**. 로그인 자체는 성공하나, 앱의 **승인 게이트가 "승인 대기 중입니다" 로 전 기능 차단**. |
| 비밀번호 | `90251585` 정상 (bcrypt 검증 통과). 애초에 틀린 적 없음. 실제로 2026-09-08 22:33 로그인 이력 존재. |
| 부수 결함 2건 | ① `auth.identities` 이메일 행 누락 ② `phone_number` 가 11자리(`01090251585`)로 저장 (정책상 8자리여야 함) |
| 조치 | 위 3건 모두 DB 수정 (`apply_migration`) 후 재검증 통과 |
| 로그인 ID 주의 | 올바른 사번은 **8자리 `20260909`** (조대표가 적은 `260909` 는 6자리 축약). `260909@gep.local` 계정은 존재하지 않으므로 그대로 입력 시 "사번 또는 비밀번호가 올바르지 않습니다" 발생. |

---

## 3. 진단 과정

### 3-1. 로그인 경로 확인 (`src/components/LoginButton.jsx`)

```js
const normalizedId = employeeId.trim()          // 그대로 사용, 0 패딩 없음
if (!/^\d{6,}$/.test(normalizedId)) { ... }      // 6자리 이상이면 통과
supabase.auth.signInWithPassword({
  email: `${normalizedId}@gep.local`,            // 입력값 + @gep.local
  password,
})
```

- 입력 `260909` → `260909@gep.local` 조회 → **해당 계정 없음** → 로그인 실패
- 입력 `20260909` → `20260909@gep.local` → 계정 존재 → **인증은 성공**하나 이후 승인 게이트에서 차단

### 3-2. DB 상태 조회 (조치 전)

| 확인 항목 | 값 | 판정 |
|-----------|-----|------|
| `encrypted_password` vs `90251585` (bcrypt) | 일치 | ✅ 비번 정상 |
| `email_confirmed_at` | 설정됨 | ✅ |
| `last_sign_in_at` | 2026-09-08 22:33 | ✅ 로그인 실제 발생 이력 |
| `auth.identities` (provider=email) | **0건** | ❌ 누락 |
| `public.users.approval_status` | **`pending`** | ❌ ★ 실제 차단 원인 |
| `public.users.status` | `active` | ✅ |
| `public.users.is_paused` | `false` | ✅ |
| `public.users.approved_at` | 설정됨 | ⚠️ pending 인데 승인시각이 있음 — 상태 불일치 |
| `public.users.phone_number` | `01090251585` (11자리) | ❌ 정책상 8자리(`90251585`) |

> 파일럿 16개 계정 전수 조회 결과 `approval_status='pending'` 은 **윤용진 1건뿐**. 나머지는 모두 `approved`.

### 3-3. 앱 차단 지점

회원 페이지 진입 시 `RequireLogin` 계열 승인 게이트가 `approval_status !== 'approved'` 이면
"승인 대기 중입니다" 안내로 전 기능을 막음. → 로그인은 되지만 아무것도 못 하는 상태로 관측됨.

---

## 4. 조치 내용

`apply_migration` (이름: `fix_pilot_user_20260909_yun_yongjin`), 원격 DB에만 적용 — **회사 개인정보 방침에 따라 레포에 파일 미보관**.

```sql
-- 1) 승인 상태 정상화
UPDATE public.users
SET approval_status = 'approved',
    status          = 'active',
    is_paused       = false,
    approved_at     = COALESCE(approved_at, now()),
    phone_number    = '90251585'            -- 11자리 → 8자리 정규화 (GEPv30-163 정책)
WHERE user_id = (SELECT id FROM auth.users WHERE email = '20260909@gep.local');

-- 2) 누락된 auth.identities 이메일 행 삽입 (없을 때만)
INSERT INTO auth.identities (provider, provider_id, user_id, identity_data, created_at, updated_at)
SELECT 'email', au.email, au.id,
       jsonb_build_object('sub', au.id::text, 'email', au.email),
       now(), now()
FROM auth.users au
WHERE au.email = '20260909@gep.local'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = au.id AND i.provider = 'email'
  );
```

---

## 5. 조치 후 검증

| 항목 | 결과 |
|------|------|
| bcrypt 비밀번호 `90251585` | ✅ `pw_ok = true` |
| `email_confirmed` | ✅ true |
| `auth.identities` (email) | ✅ 1건 (provider_id, identity_data 정상) |
| `real_name` | ✅ 윤용진 |
| `phone_number` | ✅ `90251585` (8자리) |
| `status` / `approval_status` / `is_paused` | ✅ `active` / `approved` / `false` |

→ 이제 **`20260909` / `90251585`** 로 로그인 시 정상 이용 가능.

---

## 6. 원인 분석 (왜 pending 이었나)

- 이 계정은 파일럿 1차 배치( `20260901`~`20260910` )에서 DB 직접 생성됨.
- 다른 계정은 생성 시 `approval_status='approved'` 로 넣었으나, 909만 `pending` 으로 남음 (생성 스크립트 누락 또는 수동 편집 미완).
- `approved_at` 은 채워졌는데 `approval_status` 만 pending 인 점으로 보아 **부분 업데이트 후 상태 컬럼 갱신 누락**으로 추정.

---

## 7. 부수 발견 (조치 불요, 참고)

- 파일럿 **1차 배치 `20260901`~`20260910` 전원**이 `auth.identities` 이메일 행이 **없는 상태**로 생성돼 있음(909는 이번에 보정).
- 현재 로그인에는 영향 없음 — GoTrue 비밀번호 grant 는 `auth.users.encrypted_password` 로 동작하므로 identities 행이 없어도 로그인됨.
- 다만 향후 **비밀번호 재설정 메일 / 계정 연결(OAuth linking) / GoTrue 정책 강화** 시 문제가 될 수 있는 잠재 리스크.
- 필요 시 1차 배치 9개 계정에 대한 `auth.identities` 일괄 백필 마이그레이션을 별도 작업으로 제안 가능.

---

## 8. 조대표 조치 안내

- 윤용진에게 로그인 정보 재안내: **아이디 `20260909` (8자리), 비밀번호 `90251585`**
- 6자리 `260909` 로는 로그인 불가 — 반드시 `2026` 으로 시작하는 8자리.

---

*GEPv30-165 | 담당: 고팀장(개발) | 단일 계정 데이터 보정 — 코드/스키마 변경 없음*

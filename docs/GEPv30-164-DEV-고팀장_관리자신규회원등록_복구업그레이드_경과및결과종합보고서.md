# GEPv30-164 관리자 신규회원 등록 복구·업그레이드 — 작업경과 및 결과 종합보고서

**작성일**: 2026-09-09
**작성자**: 고팀장 (Claude Code)
**포함 작업**: GEPv30-162(조사·기획) · GEPv30-163(구현·배포)
**상태**: ✅ 구현·배포·**조대표 라이브 검증 완료** (실계정 등록 + 로그인 정상)

---

## 1. 배경 / 지시

- 파일럿 진행 중, 조대표가 참여자를 추가할 때마다 이 대화창에서 DB에 직접 계정을 생성해 왔음.
- 앞으로는 **조대표가 관리자 화면에서 직접 등록**하고자 함.
- 관리자 화면의 "신규 직원 계정 생성"이 **앱 초기엔 작동했으나 현재는 실패**. 원인 규명 후 복구 + 폼 업그레이드 지시.

---

## 2. 작업 경과 (시간순)

| 단계 | 문서 | 내용 | 산출 |
|------|------|------|------|
| ① 조사·기획 | GEPv30-162 (PLAN) | 코드 전수 조사 → 고장 원인 규명, 복구+업그레이드 기획 초안 | 커밋 `5866848` (문서) |
| ② 조대표 확정 | (지시) | 폼을 **성명 + 휴대폰8자리 2필드**로 축소, 사번은 **서버 자동생성**으로 결정 | GEPv30-163 지시서 |
| ③ 구현 | GEPv30-163 (DEV) | 엣지 함수 2개 수정 + 재배포, `AdminUsers.jsx` 폼 재구성 | 커밋 `3349051` + 엣지 배포 |
| ④ 검증 | 본 문서 | 조대표 실계정으로 `20260916`(테스터4) 등록·로그인 성공 확인 | — |

---

## 3. 고장 원인 (확정)

### 3-1. 증상
관리자 화면 → 사용자관리 → "신규 직원 계정 생성" → 모든 시도가 실패.

### 3-2. 원인
엣지 함수 `admin-create-user` / `admin-reset-password` 가 관리자 인증을 위해
**이미 삭제된 테이블 `public.gep_admin_emails` 를 조회** → 쿼리 에러 → `adminRow` undefined →
`return 403 "Forbidden: not admin"` (조대표 계정도 포함).

### 3-3. 근거

| 확인 | 결과 |
|------|------|
| `to_regclass('public.gep_admin_emails')` | `null` (테이블 없음) |
| 삭제 시점 | 마이그레이션 `20260815164115 drop_unused_tables` (2026-08-15) |
| 같은 날 관리자 모델 이전 | `add_is_admin_to_users` → `redefine_gep_is_admin_to_use_users_table` |
| 현재 `gep_is_admin()` | `SELECT is_admin FROM public.users WHERE user_id = auth.uid()` |
| 엣지 함수 갱신 여부 | ❌ 미갱신 — 여전히 `gep_admin_emails` 참조 |
| 쿼리 재현 | `SELECT email FROM public.gep_admin_emails ...` → `ERROR 42P01 relation does not exist` |

> `admin-reset-password`(비밀번호 초기화)도 같은 코드·같은 이유로 고장 상태였고, 이번에 함께 복구.

---

## 4. 조치 내용

### 4-1. 복구 — 관리자 판정 교체 (두 함수 공통)

```ts
// 변경 전
const { data: adminRow } = await supabaseAdmin
  .from('gep_admin_emails').select('email').eq('email', (user.email ?? '').toLowerCase()).single()
if (!adminRow) return jsonResponse({ error: 'Forbidden: not admin' }, 403)

// 변경 후 — 현행 관리자 모델
const { data: callerProfile } = await supabaseAdmin
  .from('users').select('is_admin').eq('user_id', user.id).single()
if (!callerProfile?.is_admin) return jsonResponse({ error: 'Forbidden: not admin' }, 403)
```

### 4-2. 업그레이드 — 사번 자동생성 + 폼 2필드

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 폼 입력 | 사번 + 실명 + 휴대폰(8자리) | **성명 + 휴대폰 뒤 8자리** (2개) |
| 사번 | 관리자가 직접 입력 | **서버 자동생성** `2026NNNN` 순번 (읽기전용 미리보기) |
| 미리보기 | 없음 | `POST { dryRun: true }` → 다음 사번 반환 |
| 클라 계약 | `{ employeeId, realName, phone }` | `{ realName, phone8 }` |
| 비밀번호 | 서버가 `phone.slice(-8)` | `phone8` 그대로 |
| `phone_number` 저장 | 입력값 | `phone8` (비번과 동일 8자리 — 초기화 기능 유지) |
| 타입 처리 | `inputMode=numeric` | **전 구간 문자열** — `type="text"`+`inputMode="numeric"`, `Number`/`parseInt` 미사용, 앞자리 0 보존, 검증 `/^\d{8}$/` |
| 중복 | 일반 에러 | 이메일 UNIQUE 충돌 시 409 |

**사번 자동생성 로직** (`admin-create-user`):
```ts
listUsers → 이메일에서 /^(2026\d{4})@gep\.local$/ 매칭분만 → 최댓값 + 1 → String()
// 비대상: 12345678@gep.local(테스터3), 202504012@gep.local(조대표) 는 정규식으로 제외
```

### 4-3. 변경 파일

| 파일 | 변경 |
|------|------|
| `supabase/functions/admin-create-user/index.ts` | 관리자 판정 · `nextEmployeeId()` · `dryRun` · 계약 · 문자열 처리 · 409 |
| `supabase/functions/admin-reset-password/index.ts` | 관리자 판정만 교체 |
| `src/pages/AdminUsers.jsx` | 폼 2필드 + 아이디 미리보기(`previewId`/`loadPreviewId`) + 전송 계약 + 문자열 검증 |

RLS · 테이블 스키마 · 라우트 · featureFlags 변경 **없음**.

---

## 5. 배포

| 대상 | 방법 | 결과 |
|------|------|------|
| 엣지 함수 `admin-create-user` | Supabase 배포 | **v3** ACTIVE (`verify_jwt=true` 유지) |
| 엣지 함수 `admin-reset-password` | Supabase 배포 | **v2** ACTIVE |
| 프론트 `AdminUsers.jsx` | 커밋 `3349051` → `git push origin main` → Vercel 자동배포 | 반영 완료 |

관련 커밋: `5866848`(GEPv30-162 기획) → `3349051`(GEPv30-163 구현)

---

## 6. 검증 결과

| # | 항목 | 결과 |
|---|------|------|
| 1 | `npm run build` | ✅ 성공 (166 modules, 에러 0) |
| 2 | 엣지 배포본 소스 대조 | ✅ `get_edge_function` — 로컬 파일과 일치 |
| 3 | 자동사번 로직 (정적) | ✅ DB상 `20260915` 다음 = `20260916` 산출, 비대상 이메일 제외 |
| 4 | **조대표 라이브 — 신규 등록** | ✅ 성명 `테스터4` + 휴대폰8자리 `12345679` 입력 → **사번 `20260916@gep.local` 자동 부여**, 승인완료·활성 (2026-09-09 02:38) |
| 5 | **비밀번호 정합** | ✅ `encrypted_password` bcrypt 검증이 `phone_number` 8자리와 일치 (`pw_matches_phone8 = true`) |
| 6 | **신규 계정 로그인** | ✅ 조대표 확인 — 정상 로그인 |
| 7 | 비밀번호 초기화 버튼 | ✅ 조대표 확인 — 정상 동작 (admin-reset-password 복구됨) |

---

## 7. 운영 안내 (조대표용)

- 관리자 화면 → **사용자관리** → "신규 직원 계정 생성"
  - **성명** + **휴대폰 뒤 8자리** 두 칸만 입력 → "계정 생성"
  - 아이디는 `20260NNN` 순번으로 자동 부여됨 (칸에 미리 표시)
  - 초기 비밀번호 = 입력한 휴대폰 뒤 8자리
- 잘못 만든 계정 정리·비번 재발급은 목록의 각 버튼(비밀번호 초기화 등)으로 처리

---

## 8. 롤백

- 프론트: `git revert 3349051` → push
- 엣지 함수: 관리자 판정 로직만 되돌려 재배포 (구 v1/v2 는 `gep_admin_emails` 참조로 고장 상태이므로 되돌리지 말 것)

---

*GEPv30-164 | 담당: 고팀장(개발) | 선행: GEPv30-162 · GEPv30-163*

# GEPv30-163 관리자 신규회원 등록 — 복구 및 업그레이드 지시서

**작성일**: 2026-09-09
**지시자**: 조대표
**수행**: 고팀장 (Claude Code)
**선행**: [GEPv30-162](GEPv30-162-PLAN-관리자_신규회원등록_복구및업그레이드_기획.md) (원인 조사 + 기획)

---

## 배경

GEPv30-162 조사 결과: 엣지 함수 `admin-create-user` / `admin-reset-password` 가
2026-08-15 삭제된 테이블 `gep_admin_emails` 를 조회 → 모든 호출이 403.
조대표가 GEPv30-162 기획을 검토하고, 폼을 더 단순화하는 방향으로 확정하여 착수 지시.

## 조대표 확정 사항 (GEPv30-162 대비 변경점)

- 등록 폼 입력은 **성명 + 휴대폰 뒤 8자리, 2개만**.
- **아이디(사번)는 서버가 자동 생성** (`2026NNNN` 순번). 폼에는 **읽기전용 미리보기**로만 노출.
- 비밀번호 = 휴대폰 뒤 8자리 (그대로).
- 모든 값 **문자열 처리** (숫자 변환 금지, 앞자리 0 보존).

---

## 작업 순서

### 【1단계】 엣지 함수 2개 수정

**`supabase/functions/admin-create-user/index.ts`**
- 관리자 판정: `gep_admin_emails` 조회 → `SELECT is_admin FROM public.users WHERE user_id = <호출자>` 로 교체
- 사번 자동 생성 함수 `nextEmployeeId()` 추가 — `auth.admin.listUsers` 에서 `^2026\d{4}@gep\.local$` 최댓값 + 1 (문자열 반환)
- `{ dryRun: true }` 요청 시 다음 사번만 반환 (생성 안 함) — 폼 미리보기용
- 실제 등록: body `{ realName, phone8 }` → `email = 사번+'@gep.local'`, `password = phone8`, `phone_number = phone8`
- 사번 중복(이메일 UNIQUE 충돌) 시 409

**`supabase/functions/admin-reset-password/index.ts`**
- 관리자 판정만 위와 동일하게 교체. 나머지 로직 유지.

### 【2단계】 `src/pages/AdminUsers.jsx` 폼 단순화

- 입력 필드: **성명** + **휴대폰 뒤 8자리** (2개)
- **아이디**: 읽기전용 미리보기 (`dryRun` 호출로 채움, 등록 성공 후 갱신)
- `newEmployeeId` state 제거, `previewId` state 추가
- 전송 body: `{ realName, phone8: newPhone }`
- 검증: `/^\d{8}$/` (문자열), `Number`/`parseInt` 미사용

### 【3단계】 배포

```
supabase functions deploy admin-create-user
supabase functions deploy admin-reset-password
git add supabase/functions/... src/pages/AdminUsers.jsx docs/GEPv30-163*.md
git commit -m "fix: GEPv30-163 관리자 신규회원 등록 복구 및 폼 업그레이드"
git push origin main
```

---

*GEPv30-163 지시서 | 담당: 고팀장 | 선행: GEPv30-162*

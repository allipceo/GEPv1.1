# GEPv30-163 관리자 신규회원 등록 — 복구 및 업그레이드 구현 결과보고서

**작성일**: 2026-09-09
**작성자**: 고팀장 (Claude Code)
**지시서**: [GEPv30-163 지시서](GEPv30-163-DEV-고팀장_관리자신규회원등록_복구및업그레이드_지시서.md)
**선행**: GEPv30-162 (원인 조사)

---

## 1. 결과 요약

| 항목 | 결과 |
|------|------|
| 고장 복구 | ✅ 엣지 함수 2개 관리자 판정을 `users.is_admin` 기준으로 교체 → 재배포 |
| 폼 업그레이드 | ✅ 입력 2개(성명 + 휴대폰 뒤 8자리) + 아이디 자동생성 읽기전용 미리보기 |
| 문자열 처리 | ✅ 사번·비번 전 구간 문자열, `type="text"`+`inputMode="numeric"`, 숫자 변환 없음 |
| 빌드 | ✅ `npm run build` 성공 (166 modules, 에러 0) |
| 엣지 배포 | ✅ admin-create-user v3 / admin-reset-password v2 (ACTIVE) |

---

## 2. 수정 파일

| 파일 | 변경 |
|------|------|
| `supabase/functions/admin-create-user/index.ts` | 관리자 판정 교체 · `nextEmployeeId()` 자동 사번(`2026NNNN`) · `dryRun` 미리보기 모드 · body `{realName, phone8}` 계약 · 중복 시 409 |
| `supabase/functions/admin-reset-password/index.ts` | 관리자 판정만 교체 (나머지 유지) |
| `src/pages/AdminUsers.jsx` | 폼 2필드화 + 아이디 미리보기(`previewId`, `loadPreviewId()`) + 전송 계약 + 문자열 검증 |

RLS·테이블 스키마·라우트 변경 **없음**.

---

## 3. 핵심 변경

### 3-1. 관리자 판정 (두 함수 공통)

```ts
// 변경 전 — 삭제된 테이블
const { data: adminRow } = await supabaseAdmin
  .from('gep_admin_emails').select('email').eq('email', (user.email ?? '').toLowerCase()).single()
if (!adminRow) return jsonResponse({ error: 'Forbidden: not admin' }, 403)

// 변경 후 — 현행 관리자 모델
const { data: callerProfile } = await supabaseAdmin
  .from('users').select('is_admin').eq('user_id', user.id).single()
if (!callerProfile?.is_admin) return jsonResponse({ error: 'Forbidden: not admin' }, 403)
```

### 3-2. 사번 자동 생성 (admin-create-user)

```ts
async function nextEmployeeId(supabaseAdmin): Promise<string> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let maxSeq = 20260900
  for (const u of data.users) {
    const m = String(u.email ?? '').match(/^(2026\d{4})@gep\.local$/)
    if (m) { const n = parseInt(m[1], 10); if (n > maxSeq) maxSeq = n }
  }
  return String(maxSeq + 1)   // 문자열
}
```

- 현재 파일럿 이메일 `20260901`~`20260915` → 다음 = **`20260916`** (검증 완료)
- 비대상 이메일(`12345678@gep.local` 테스터3, `202504012@gep.local` 조대표)은 정규식으로 제외됨

### 3-3. dryRun 미리보기

`POST { dryRun: true }` → 관리자 확인 후 `{ employeeId: "20260916" }` 반환, 생성 안 함.
`AdminUsers.jsx` 가 마운트 시 + 등록 성공 후 호출해 읽기전용 필드에 표시.

### 3-4. 등록 계약

| | 변경 전 | 변경 후 |
|--|--------|--------|
| body | `{ employeeId, realName, phone }` | `{ realName, phone8 }` |
| 사번 | 관리자 입력 | 서버 자동 (`nextEmployeeId`) |
| 비밀번호 | 서버가 `phone.slice(-8)` | `phone8` 그대로 (문자열) |
| `phone_number` 저장 | 입력 휴대폰 | `phone8` (비번과 동일 8자리) |

---

## 4. 검증

| # | 항목 | 결과 |
|---|------|------|
| 1 | `npm run build` | ✅ 성공, 166 modules, 에러 0 |
| 2 | 엣지 함수 배포 | ✅ admin-create-user v3, admin-reset-password v2, 둘 다 ACTIVE, `verify_jwt=true` 유지 |
| 3 | 배포본 소스 대조 | ✅ `get_edge_function` 로 확인, 로컬 파일과 일치 |
| 4 | 자동 사번 로직 | ✅ DB 조회로 다음 값 `20260916` 확인, 비대상 이메일 제외 확인 |
| 5 | 실계정 등록 (조대표) | ⏳ 배포 후 — 관리자 화면에서 성명+휴대폰8자리 입력 → 계정 생성 → 신규 계정 로그인 |
| 6 | 비밀번호 초기화 버튼 | ⏳ 배포 후 — 기존 사용자 대상 정상 동작 확인 |

> 5·6은 관리자 로그인 세션이 필요해 고팀장이 직접 수행 불가. 조대표 라이브 확인 요청.

---

## 5. 배포

| 대상 | 방법 | 상태 |
|------|------|------|
| 엣지 함수 2개 | Supabase 배포 (MCP `deploy_edge_function`) | ✅ 완료 (즉시 반영) |
| 프론트(`AdminUsers.jsx`) | `git push origin main` → Vercel 자동배포 | 커밋 `fix: GEPv30-163 …` |

## 6. 롤백

- 엣지 함수: 직전 버전(admin-create-user v2 / admin-reset-password v1) 재배포 — 단, v2/v1은 `gep_admin_emails` 참조로 고장 상태이므로 사실상 이번 버전이 정상. 문제 시 관리자 판정 로직만 수정 재배포 권장.
- 프론트: 커밋 `git revert` → push.

---

*GEPv30-163 | 담당: 고팀장(개발) | 선행: GEPv30-162*

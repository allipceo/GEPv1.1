# GEPv30-105_비밀번호초기화_및_Settings_성명수정제거

**작성일:** 2026.08.14
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6
**지시자:** 노팀장

## 1. 작업 목적

- (GEPv30-104 추가 수정) `Settings.jsx`에서 회원 본인이 성명을 직접 수정할 수 있던 기능을 제거. 성명 변경은 관리자 화면(`AdminUsers.jsx`)의 "정보 수정"으로만 가능하도록 창구를 일원화.
- (GEPv30-105 신규) 관리자가 특정 회원의 비밀번호를 휴대폰 뒷 8자리로 강제 초기화할 수 있는 기능 추가. 사용자가 비밀번호를 분실했을 때 관리자가 대신 초기화해줄 수단이 없던 문제 해결.

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Settings.jsx` | 성명 수정 관련 state 3개(`editName`/`newName`/`nameMsg`), `handleNameSave()`, 성명 JSX 행, 더 이상 쓰이지 않는 `realName`/`userId` 셀렉터 전부 삭제. 내 계정 섹션에는 사번(read-only)·서비스 레벨(read-only) 두 항목만 남음 |
| `supabase/functions/admin-reset-password/index.ts` | 신규 Edge Function. `admin-create-user`와 동일한 `gep_admin_emails` 기반 관리자 인증 패턴 사용. `targetUserId`로 `users.phone_number`를 조회해 뒷 8자리를 새 비밀번호로 `auth.admin.updateUserById()` 호출 |
| `src/pages/AdminUsers.jsx` | `resettingPwUserId` state 추가. `resetUserPassword()` 함수 추가(confirm → Edge Function 호출 → 결과 alert). 사용자 카드 버튼 영역: 기존 4버튼 행의 "초기화" 라벨을 "통계초기화"로 변경(비밀번호 초기화와 구분), 그 아래 전체 폭 "비밀번호 초기화 (휴대폰 뒷8자리)" 버튼 신규 행 추가 |

## 3. 변경 전/후

### Settings.jsx — 내 계정 섹션
변경 전: 사번(read-only) / 성명(수정 가능, 인라인 편집) / 서비스 레벨(read-only)
변경 후: 사번(read-only) / 서비스 레벨(read-only) — 2항목만

### AdminUsers.jsx — 사용자 카드 버튼
```jsx
// 1행 (기존 4버튼 유지, 라벨만 변경)
<div className="mt-3 grid grid-cols-4 gap-2">
  <button onClick={() => updateApproval(user.user_id, 'approved')}>승인</button>
  <button onClick={() => updateApproval(user.user_id, 'rejected')}>거절</button>
  <button onClick={() => updateApproval(user.user_id, 'paused')}>중지</button>
  <button onClick={() => resetUserCounting(user)}>통계초기화</button>
</div>

// 2행 (신규)
<div className="mt-2">
  <button onClick={() => resetUserPassword(user)} disabled={resettingPwUserId === user.user_id}>
    비밀번호 초기화 (휴대폰 뒷8자리)
  </button>
</div>
```

## 4. Edge Function 배포

로컬 Supabase CLI(`npx supabase`)가 이번 세션에 로그인되어 있지 않아(`SUPABASE_ACCESS_TOKEN` 없음), Supabase MCP(`deploy_edge_function`)를 통해 프로젝트 `xnmjprtodyonqzsqxxja`(GEPv3.0)에 직접 배포했다.

- 함수명: `admin-reset-password`
- 배포 결과: `status: ACTIVE`, `version: 1`
- 의존 테이블(`gep_admin_emails` 2건, `users`) 존재 확인 완료

## 5. 테스트 결과

- 빌드: ✅ 성공 (`npm run build`, 150 modules, 에러 없음)
- Edge Function 배포: ✅ 성공 (MCP `deploy_edge_function` 응답 `status: ACTIVE`)
- diff 범위 확인: 지시된 2개 파일 + 신규 함수 파일만 변경
- 로컬 브라우저 검증: ⚠️ 미완료 — 전 라우트가 `RequireLogin`/관리자 게이트 뒤에 있어 이번 세션도 실제 클릭·비밀번호 재로그인 검증(V2~V5)은 하지 못했다.

## 6. 배포 결과

- Commit: (커밋 후 기입)
- URL: https://gepv11.vercel.app
- Edge Function: `admin-reset-password` (project `xnmjprtodyonqzsqxxja`) — ACTIVE
- 비고: GitHub push 후 Vercel 자동 배포. Edge Function은 Vercel 배포와 별도로 Supabase에 즉시 반영됨

## 7. 다음 작업

- 로그인 계정으로 V2(Settings 성명 수정 UI 미표시), V3(관리자 화면 버튼 노출), V4(confirm→alert 흐름), V5(초기화 후 실제 재로그인) 검증 요청
- 테스트 계정으로 먼저 비밀번호 초기화를 시도해 실제 로그인 성공 여부 확인 권장(실사용자 계정 선제 테스트는 지양)

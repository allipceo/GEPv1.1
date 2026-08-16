# GEPv30-114-fix 멀티탭 비밀번호 변경 에러 안내

**작성일:** 2026.08.16
**작성자:** 고팀장 (Claude Code)
**지시자:** 조대표 — GEPv30-113 회귀 검증 중 발견, 즉시 수정 승인

## 1. 작업 목적

회귀 검증(PHASE 5) 중 발견: 동일 브라우저에 gepv11.vercel.app 탭이 2개 이상 열려 있으면
`supabase.auth.updateUser({password})` 호출이 Navigator LockManager 락 타임아웃(10초)으로
예외를 던지는데, `handlePwSave`에 try/catch가 없어 `setPwSaving(false)`가 실행되지 않고
버튼이 "변경 중…" 상태로 영구 고착됨. 사용자에게는 아무 에러 메시지도 표시되지 않음.

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Settings.jsx` | `handlePwSave`에 try/catch/finally 추가. 락 타임아웃 예외 시 "다른 탭에서 GEP가 열려 있으면 비밀번호를 변경할 수 없습니다. 다른 탭을 닫고 다시 시도해 주세요." 안내, 그 외 예외는 일반 오류 메시지. `finally`로 `setPwSaving(false)` 항상 실행 보장. |

## 3. 주요 변경사항

### 변경 전
```js
setPwSaving(true)
const { error } = await supabase.auth.updateUser({ password: pw })
setPwSaving(false)
if (error) { setPwMsg('변경 실패: ' + error.message); return }
setPw(''); setPwConfirm('')
setPwMsg('비밀번호가 변경되었습니다.')
```

### 변경 후
```js
setPwSaving(true)
try {
  const { error } = await supabase.auth.updateUser({ password: pw })
  if (error) { setPwMsg('변경 실패: ' + error.message); return }
  setPw(''); setPwConfirm('')
  setPwMsg('비밀번호가 변경되었습니다.')
} catch (e) {
  if (e?.message?.toLowerCase().includes('lock')) {
    setPwMsg('다른 탭에서 GEP가 열려 있으면 비밀번호를 변경할 수 없습니다. 다른 탭을 닫고 다시 시도해 주세요.')
  } else {
    setPwMsg('변경 중 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.')
  }
} finally {
  setPwSaving(false)
}
```

## 4. 테스트 결과

- 빌드: ✅ `npm run build` 성공 (오류 0)
- 로컬 프리뷰: ✅ 콘솔 에러 없음
- 원인 재현: 테스터3 계정으로 탭 2개(관리자 세션 탭 + 테스터3 세션 탭) 동시 접속 상태에서
  비밀번호 변경 시도 → "변경 중…" 고착 + 콘솔에 `Acquiring an exclusive Navigator
  LockManager lock ... timed out waiting 10000ms` 확인. 탭 1개로 정리 후 재시도하면
  정상 성공 — 락 경합이 근본 원인임을 검증.

## 5. 배포 결과

- Commit: (커밋 후 기입)
- URL: https://gepv11.vercel.app

## 6. 다음 작업

L2-F(통합오답복습) `unifiedWrongService.js`의 `wrong_questions`/`ox_wrong_questions`
누락 테이블 참조 건은 범위 파악 보고 후 별도 승인 대기 중 — 이 커밋에 포함하지 않음.

# GEPv30-099_AppHeader_이전버튼_레이어경로고정

**작성일:** 2026.08.14
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6 (UI 일관성 보강)
**지시자:** 노팀장

## 1. 작업 목적

GEPv30-098에서 `AppHeader`의 "← 이전" 버튼이 브라우저 히스토리(`navigate(-1)`) 기반으로 동작했다. 이 경우 사용자가 페이지 내부에서 여러 번 상태를 이동한 뒤(예: 하단 "이전 문제" 버튼 반복 클릭) 상단 "← 이전"을 누르면 레이어 상위 페이지가 아니라 직전 상태로 돌아가는 문제가 있었다. "이전"의 정의를 "레이어 계층 상위 이동(고정 경로)"으로 확정하고, 브라우저 히스토리 의존을 제거했다.

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/AppHeader.jsx` | `onBack`(히스토리 back 기본값) 방식 제거 → `backTo` prop(기본값 `'/'`)으로 교체. 홈 버튼은 항상 `navigate('/')`로 고정(오버라이드 불필요 판단, `onHome` prop 제거) |
| `src/pages/OXSubject.jsx` | `<AppHeader title="과목 선택" backTo="/ox" />` |
| `src/pages/OXStats.jsx` | `<AppHeader title="OX 학습 통계" backTo="/ox" />` |

나머지 8개 페이지(ServiceAHome / ServiceBHome / MockExamHome / CustomMockHome / OXHome / StatsDashboard / WrongReview / Settings)는 `backTo` 기본값 `'/'`가 지시서의 목표값과 동일해 `<AppHeader title="..." />` 형태를 그대로 유지했다(파일 수정 없음).

## 3. 변경 전/후

### AppHeader.jsx — 변경 전
```jsx
export default function AppHeader({ title, onBack, onHome }) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  })
  ...
}
```

### AppHeader.jsx — 변경 후
```jsx
export default function AppHeader({ title, backTo = '/' }) {
  const navigate = useNavigate()
  return (
    ...
      <button onClick={() => navigate(backTo)}>← 이전</button>
      ...
      <button onClick={() => navigate('/')}>홈</button>
    ...
  )
}
```

## 4. 확인 사항

- GEPv30-098 당시 어떤 페이지도 `onBack`/`onHome` prop을 명시적으로 전달하지 않았음을 확인 — 컴포넌트 시그니처 변경이 다른 페이지에 영향 없음.
- `navigate(-1)` / `window.history` 사용처가 대상 10개 페이지 안에 남아있는지 grep 확인 — 없음. (ChallengeMode.jsx / UnifiedWrongReview.jsx에 남아있는 `navigate(-1)`은 이번 지시 범위 밖의 퀴즈 화면이라 미변경)

## 5. 테스트 결과

- 빌드: ✅ 성공 (`npm run build`, 에러 없음)
- V1(수동 검증 필요): `/ox` → 과목 선택 진입 → `← 이전` → `/ox` 복귀는 코드상 `backTo="/ox"`로 고정되어 있어 동작할 것으로 예상되나, 로그인 게이트로 인해 이번 세션에서 직접 클릭 검증은 하지 못했다.

## 6. 배포 결과

- Commit: f9f8e30
- URL: https://gepv11.vercel.app (READY 확인)
- 비고: GitHub push 후 Vercel 자동 배포 완료

## 7. 다음 작업

- 노팀장/조대표님 로그인 계정으로 V1 항목 실제 클릭 검증 요청

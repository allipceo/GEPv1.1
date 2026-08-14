# GEPv30-098_AppHeader_공용컴포넌트_1단계적용

**작성일:** 2026.08.14
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6 (UI 일관성 보강)
**지시자:** 노팀장

## 1. 작업 목적

모든 페이지에서 "홈" / "← 이전" 두 개의 내비게이션 버튼을 항상 동일한 위치·스타일로 제공하기 위해 공용 `AppHeader` 컴포넌트를 신규 생성하고, 1단계 대상 페이지 10개에 적용했다. 퀴즈 진행 화면(Question.jsx / OXQuiz.jsx / MockExamQuiz.jsx / CustomMockQuiz.jsx / ChallengeMode.jsx)은 지시에 따라 이번 작업에서 제외했다.

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/AppHeader.jsx` | 신규 생성 — title/onBack/onHome props, 기본값은 브라우저 히스토리 back / `/` 이동 |
| `src/pages/ServiceAHome.jsx` | 기존 커스텀 헤더 → `<AppHeader title="기출 회차 순서풀이" />` |
| `src/pages/ServiceBHome.jsx` | 기존 커스텀 헤더 → `<AppHeader title="과목별 랜덤풀이" />` |
| `src/pages/MockExamHome.jsx` | 레벨게이트 화면 + 정상 화면 헤더 모두 교체. 정상 화면의 "통계 ›" 버튼은 헤더 바로 아래 별도 행으로 이동(기능 보존) |
| `src/pages/CustomMockHome.jsx` | LockScreen + 정상 화면 헤더 교체. "통계 ›" 버튼 별도 행으로 이동. 더 이상 쓰이지 않는 `BackIcon` 내부 컴포넌트 제거 |
| `src/pages/OXHome.jsx` | 레벨게이트 화면 + 정상 화면 헤더 교체. "📊 통계" 버튼 별도 행으로 이동 |
| `src/pages/OXSubject.jsx` | 헤더 교체(title="과목 선택"). 기존엔 뒤로가기가 `/ox`로 고정 이동이었으나 공통 규칙에 따라 브라우저 히스토리 back으로 통일 |
| `src/pages/OXStats.jsx` | 헤더 교체(title="OX 학습 통계") |
| `src/pages/StatsDashboard.jsx` | 헤더 교체(title="내 학습 분석"). D-Day 배지는 헤더 바로 아래 별도 행으로 이동(기능 보존) |
| `src/pages/WrongReview.jsx` | 과목 선택 화면의 헤더만 교체(title="오답 복습"). 퀴즈 진행 중 상단바("← 과목" · 틀린횟수 표시)는 페이지 내 모드 전환 컨트롤이라 판단해 그대로 유지 |
| `src/pages/Settings.jsx` | 기존 빈 스텁(`return null`)에 `<AppHeader title="설정" />`만 추가. 본문 컨텐츠는 아직 없음(기존 상태 유지) |

## 3. 주요 변경사항 (대표 예시)

### 변경 전 (ServiceAHome.jsx)
```jsx
<div className="flex items-center justify-between">
  <button onClick={() => navigate('/')} ...>홈</button>
  <h1 ...>기출 회차 순서풀이</h1>
  <span className="w-10" />
</div>
```

### 변경 후
```jsx
<AppHeader title="기출 회차 순서풀이" />
```

## 4. 판단 사항 (지시서에 명시되지 않아 재량 처리)

- **통계 버튼 보존 (MockExamHome / CustomMockHome / OXHome):** 기존 헤더 행에 "통계" 링크가 포함되어 있었는데, `AppHeader`는 title 외 슬롯이 없어 그대로 넣을 수 없었다. 기능 삭제 대신 헤더 바로 아래 우측 정렬 행으로 이동시켜 접근성을 유지했다.
- **D-Day 배지 보존 (StatsDashboard):** 동일한 이유로 헤더 아래 별도 행으로 이동.
- **OXSubject 뒤로가기 동작 변경:** 기존엔 `navigate('/ox')` 고정 이동이었으나, "이전 버튼은 항상 한 단계 위로"라는 이번 지시의 대원칙에 맞춰 브라우저 히스토리 back(기본 동작)으로 통일했다. 동작 차이가 있으니 검증 시 확인 요망.
- **WrongReview 퀴즈 진행 중 상단바는 미변경:** 이 상단바는 페이지 이동이 아니라 "과목 선택 화면으로 되돌아가기 + 틀린 횟수 표시"라는 퀴즈 내부 상태 전환 컨트롤이라 판단해 지시서의 "퀴즈 화면 레이아웃 회귀 없음" 원칙에 따라 손대지 않았다.

## 5. 테스트 결과

- 빌드: ✅ 성공 (`npm run build`, 149 modules, 에러 없음)
- 로컬 브라우저 검증: ⚠️ 미완료 — 이 앱의 모든 대상 라우트가 `RequireLogin` 가드 뒤에 있고, 이번 세션에는 로그인 가능한 테스트 계정이 없어 화면 렌더링을 직접 확인하지 못했다. 코드 레벨 리뷰와 빌드 통과로 갈음했다. 노팀장/조대표님 쪽에서 실제 로그인 계정으로 10개 페이지 진입 후 ← 이전 / 홈 버튼 동작을 확인해 주시기 바란다.

## 6. 배포 결과

- Commit: 7817a4e
- URL: https://gepv11.vercel.app (READY 확인)
- 비고: GitHub push 후 Vercel 자동 배포 완료

## 7. 다음 작업

- 노팀장/조대표님 검증 후 문제 없으면 2~3단계(Question.jsx / OXQuiz.jsx / MockExamQuiz.jsx / CustomMockQuiz.jsx / ChallengeMode.jsx) 진행 지시 대기

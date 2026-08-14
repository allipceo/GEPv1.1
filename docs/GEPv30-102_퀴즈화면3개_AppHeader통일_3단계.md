# GEPv30-102_퀴즈화면3개_AppHeader통일_3단계

**작성일:** 2026.08.14
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6 (UI 일관성 보강, 3단계 완료)
**지시자:** 노팀장

## 1. 작업 목적

GEPv30-098~101에 이어 시험 진행 중 화면(퀴즈) 3개의 상단 헤더를 "← 이전 | 홈" 패턴으로 통일했다. `MockExamQuiz.jsx` / `CustomMockQuiz.jsx`는 시험 중 실수 이탈 방지용 exit modal이 있어, "← 이전"과 "홈" 모두 기존 `setShowExitModal(true)`를 그대로 호출하도록 유지했다.

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/MockExamQuiz.jsx` | 좌측 `🏠 나가기` → `← 이전` (텍스트만 변경, `setShowExitModal(true)` 유지). 우측 저장/팔레트 버튼 그룹에 `홈` 버튼 추가(동일하게 `setShowExitModal(true)`) |
| `src/pages/CustomMockQuiz.jsx` | MockExamQuiz와 동일 패턴 적용 (exit modal 상태명도 `showExitModal`/`setShowExitModal`로 동일해 그대로 적용) |
| `src/pages/ChallengeMode.jsx` | 퀴즈 진행 화면의 X 아이콘 버튼(`navigate(-1)`) → `← 이전` 텍스트 버튼(`navigate('/')`), 우측에 `홈` 버튼 신규 추가(`navigate('/')`). 중앙 타이틀은 `text-center`로 정렬 조정 |

## 3. 변경 전/후 (MockExamQuiz.jsx 예시)

### 변경 전
```jsx
<button onClick={() => setShowExitModal(true)} className="text-white/80 hover:text-white text-sm flex items-center gap-1">
  🏠
  <span className="text-xs">나가기</span>
</button>
```

### 변경 후
```jsx
<button onClick={() => setShowExitModal(true)} className="text-white/80 hover:text-white text-base min-w-[56px] text-left">
  ← 이전
</button>
...
<button onClick={() => setShowExitModal(true)} className="text-white/80 hover:text-white text-base min-w-[56px] text-right">
  홈
</button>
```

## 4. 손대지 않은 부분

- `ExitModal` 컴포넌트, `showExitModal`/`setShowExitModal` 상태, `handleSaveExit` 로직 — 전부 미변경
- 타이머, 진행바, 답안 팔레트, 저장 버튼, 문제 본문 — 미변경
- `ChallengeMode.jsx`의 다른 두 화면(빈 데이터 안내, 시작 전 문제 수 카드 화면)에 있는 `navigate(-1)` 버튼 — 지시 범위(퀴즈 진행 화면의 X 아이콘)에 해당하지 않아 미변경

## 5. 테스트 결과

- 빌드: ✅ 성공 (`npm run build`, 에러 없음)
- diff 범위 확인: 3개 파일 모두 헤더 버튼 블록만 변경, exit modal 로직·본문 미변경 확인
- 로컬 브라우저 검증: ⚠️ 미완료 — 전 라우트가 `RequireLogin` 가드 뒤에 있어 이번 세션도 로그인 계정으로 직접 클릭 검증(V2, V3)은 하지 못했다.

## 6. 배포 결과

- Commit: (커밋 후 기입)
- URL: https://gepv11.vercel.app
- 비고: GitHub push 후 Vercel 자동 배포

## 7. 다음 작업

- 로그인 계정으로 V2(MockExamQuiz "← 이전"/"홈" → exit modal 표시), V3(ChallengeMode "← 이전"/"홈" → `/` 이동) 실제 클릭 검증 요청
- GEPv30-098~102로 Question.jsx를 제외한 전체 페이지 AppHeader 통일 3단계 완료 (Question.jsx는 별도 처리 대기)

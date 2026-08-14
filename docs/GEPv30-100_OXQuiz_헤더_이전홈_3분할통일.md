# GEPv30-100_OXQuiz_헤더_이전홈_3분할통일

**작성일:** 2026.08.14
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6 (UI 일관성 보강, 2단계)
**지시자:** 노팀장

## 1. 작업 목적

GEPv30-098에서 제외했던 퀴즈 화면 5개 중 `OXQuiz.jsx`의 상단 헤더를 다른 페이지와 동일한 "← 이전 | 정보 | 홈" 3분할 레이아웃으로 통일했다.

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/OXQuiz.jsx` | 헤더 행 1곳만 수정 — "← 과목선택" 버튼을 "← 이전"으로 라벨 변경, 우측에 "홈" 버튼 신규 추가(`navigate('/')`). 뒤로가기 대상(`/ox/${subjectKey}`)은 그대로 유지 |

진도바, O/X 답변 버튼, 하단 이전/다음 버튼은 변경하지 않았다.

## 3. 변경 전/후

### 변경 전
```jsx
<div className="flex items-center justify-between mb-2">
  <button onClick={() => navigate(`/ox/${subjectKey}`)} className="text-white/80 hover:text-white text-base">
    ← 과목선택
  </button>
  <span className="text-sm text-white/90 font-medium">...</span>
</div>
```

### 변경 후
```jsx
<div className="flex items-center justify-between mb-2">
  <button onClick={() => navigate(`/ox/${subjectKey}`)} className="text-white/80 hover:text-white text-base min-w-[56px] text-left">
    ← 이전
  </button>
  <span className="text-sm text-white/90 font-medium">...</span>
  <button onClick={() => navigate('/')} className="text-white/80 hover:text-white text-base min-w-[56px] text-right">
    홈
  </button>
</div>
```

## 4. 테스트 결과

- 빌드: ✅ 성공 (`npm run build`, 에러 없음)
- diff 범위 확인: 헤더 3줄 블록만 변경, 진도바·O/X 버튼·하단 이전/다음 네비게이션 미변경 확인

## 5. 배포 결과

- Commit: 9cc0c22
- URL: https://gepv11.vercel.app (READY 확인)
- 비고: GitHub push 후 Vercel 자동 배포 완료

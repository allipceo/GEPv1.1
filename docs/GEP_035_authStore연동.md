# GEP_035_authStore연동

**작업일시:** 2026.02.22
**작업자:** 고팀장 (Claude Code)

## 작업 내용

GEP_032_STEP4 — authStore 생성 + Question.jsx statsService 연동.
handleAnswer를 async로 전환하고 updateStats 직접 호출을 recordAttempt 어댑터로 교체.
게스트 기본 동작 유지.

## 수정/생성 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/stores/authStore.js` | 인증 상태 스토어 신규 생성 |
| `src/pages/Question.jsx` | handleAnswer async 전환 + recordAttempt 연동 |
| `src/pages/Home.jsx` | 로그인 UI TODO 주석 추가 |

## 변경 전/후 — Question.jsx handleAnswer

```js
// 변경 전
const handleAnswer = (num) => {
  ...
  if (!recordedSet.has(question.id)) {
    const safeRound = Number.isInteger(question.round) ? question.round : null
    if (!safeRound) { ... } else {
      updateStats({ subject: question.subSubject, round: safeRound, solved: 1, correct: ... })
      setRecordedSet(...)
    }
  }
}

// 변경 후
const handleAnswer = async (num) => {
  ...
  if (!recordedSet.has(question.id)) {
    const safeRound = Number.isInteger(question.round) ? question.round : null
    if (!safeRound) { ... } else {
      const authState = useAuthStore.getState()
      await recordAttempt(useStatsStore.getState(), authState, {
        question,
        selectedAnswer: num,
        isCorrect:      num === question.answer,
        studyMode:      selectedRound === '전체' ? 'subject' : 'round',
      })
      setRecordedSet(...)
    }
  }
}
```

## authStore 상태 구조

```js
{
  authStatus:   'guest',           // 'guest' | 'authenticated'
  serviceLevel: 1,                 // 1~5
  userFeatures: {
    canStats:    false,
    canWrongNote: false,
    canMockExam: false,
  }
}
// localStorage: 'gep_auth_v1' (persist)
```

## 게스트 동작 검증

- authStatus='guest' → statsService.recordAttempt 내부에서 Supabase insert skip
- 로컬 statsStore.updateStats만 실행 → 기존과 동일

| 구분 | 로컬 statsStore | Supabase |
|------|----------------|----------|
| 게스트 | ✅ 정상 저장 | ❌ skip |
| 회원 Lv2+ | ✅ 정상 저장 | ✅ insert |

## 배포 결과

- 빌드: ✅ 성공 (103 modules, 427.83 kB — Supabase 클라이언트 포함)
- 배포: git push origin main 완료
- URL: https://gepv11.vercel.app
- 비고: statsStore.js 수정 없음. Phase 2 로그인 UI는 STEP5 이후 구현 예정.

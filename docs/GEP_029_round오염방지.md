# GEP_029_round오염방지

**작업일시:** 2026.02.22
**작업자:** 고팀장 (Claude Code)

## 작업 내용

GEP_032_STEP1 — statsStore.byRound['전체'] 문자열 키 생성 차단.
과목별 학습 모드(round='전체')로 풀 때 selectedRound 대신 question.round(정수) 사용.
Supabase 연동 전 원장 오염 영구 차단 목적.

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/Question.jsx` | handleAnswer: selectedRound → question.round + Number.isInteger 방어 |

## 변경 전/후

```js
// 변경 전
if (!recordedSet.has(question.id)) {
  updateStats({
    subject: question.subSubject,
    round:   selectedRound,          // '전체' 문자열 오염 가능
    solved:  1,
    correct: num === question.answer ? 1 : 0,
  })
  setRecordedSet(...)
}

// 변경 후
if (!recordedSet.has(question.id)) {
  const safeRound = Number.isInteger(question.round) ? question.round : null
  if (!safeRound) {
    console.warn('[GEP] question.round 비정상 — 통계 미기록:', question.id, question.round)
  } else {
    updateStats({
      subject: question.subSubject,
      round:   safeRound,            // 항상 정수 (23~31)
      solved:  1,
      correct: num === question.answer ? 1 : 0,
    })
    setRecordedSet(...)
  }
}
```

**핵심:** `question.round`는 exams.json에서 오는 실제 회차 정수값. 모드(selectedRound)와 무관하게 항상 23~31.

## 배포 결과

- 빌드: ✅ 성공 (60 modules, 253.21 kB)
- 배포: git push origin main (자동 배포)
- URL: https://gepv11.vercel.app
- 비고: statsStore.js 수정 없음. Question.jsx 단일 파일만 변경.

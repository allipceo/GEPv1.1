# GEP_024_StatsPanel연동

**작업일시:** 2026.02.21
**작업자:** 고팀장 (Claude Code)

## 작업 내용

Phase 2 통계 UI-2 단계 작업.
GEP_023에서 구축한 statsStore를 Question.jsx에 연동하고,
정답 확인 시 통계 수치를 즉시 표시하는 StatsPanel 컴포넌트를 신규 생성했다.

---

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/StatsPanel.jsx` | 신규 생성 — 누적현황/금일현황 통계 패널 |
| `src/pages/Question.jsx` | statsStore 연동 추가 (기존 로직 무수정) |

---

## StatsPanel.jsx 설계

### props 인터페이스
| prop | 타입 | 설명 |
|------|------|------|
| `subSubject` | string | 현재 과목명 (누적현황 레이블) |
| `isVisible` | boolean | true이면 패널 펼침 |
| `stats` | object | `{ cumulative, daily }` 각 `{ solved, correct }` |

### 표시 형식
```
[과목] 누적    정답수/풀이수 (정답률%)
금일현황       정답수/풀이수 (정답률%)
```
- 풀이 없을 때: `0/0 (-)`
- 정답률: `Math.round(correct / solved * 100)`

### 애니메이션
- Tailwind `transition-all duration-300` + `max-h-0 → max-h-16` (자동 펼침)

---

## Question.jsx 연동 내용

### 추가된 상태
```js
const updateStats = useStatsStore((s) => s.updateStats)
const stats       = useStatsStore((s) => s.stats)
const [recordedSet, setRecordedSet] = useState(new Set())
```

### 중복 기록 방지 로직
- `recordedSet`: 통계 기록이 완료된 문제 ID Set
- `localAnswered`와 별도로 관리 → 이전 버튼으로 돌아가도 recordedSet 유지
- `handleAnswer` 호출 시 `!recordedSet.has(question.id)` 일 때만 `updateStats` 실행

### statsStore.updateStats 호출 파라미터
```js
updateStats({
  subject: question.subSubject,   // 문제 자체의 과목
  round:   selectedRound,         // 현재 회차
  solved:  1,
  correct: num === question.answer ? 1 : 0,
})
```

### StatsPanel 표시 조건
- `isVisible={displayAnswer !== null}` — 정답확인 후에만 표시
- `currentSubject = selectedSubSubject ?? question.subSubject`
- `cumulative = stats.bySubject[currentSubject]`
- `daily = stats.daily[YYYY-MM-DD]`

---

## 변경 전/후

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 통계 UI | 없음 | 정답확인 후 자동 펼침 패널 |
| 통계 기록 시점 | 없음 | 답 선택 즉시 (중복 방지) |
| Question.jsx 신규 import | 없음 | useStatsStore, StatsPanel |
| 기존 로직 | — | 무수정 유지 |

---

## 테스트 시나리오

| 시나리오 | 기대 결과 |
|----------|----------|
| 문제풀기 → 답 선택 | StatsPanel 자동 펼침, 수치 즉시 반영 |
| 이전 버튼 클릭 | 이전 문제 답 초기화, StatsPanel 닫힘 |
| 이전 문제 다시 답 선택 | StatsPanel 표시되나 통계 중복 기록 없음 |
| 다른 문제 이동 반복 | 누적/금일 수치 정확히 누산 |

---

## 배포 결과

- 빌드: ✅ 성공 (56 modules, 245.89 kB)
- 배포: git push origin main (자동 배포)
- URL: https://gepv11.vercel.app
- 비고: GEP_023 statsStore 기반 첫 UI 연동 완료

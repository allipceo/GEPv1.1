# GEP_061_STEP6_통계화면

**작업일시:** 2026.03.01
**작업자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_061 지시서

## 작업 내용

Phase 5 모의고사 통계 화면(`/mock/stats`) 구현.
회원은 Supabase `getSessionHistory`에서, 게스트는 localStorage `loadResult`로 데이터를 조합하여 전체 요약 카드, SVG Line Chart, 회차별 이력 테이블을 제공한다.
외부 차트 라이브러리 없이 순수 SVG로 점수 추이를 시각화하고, 각 회차 행 탭 시 성적표(`/mock/:round/result`)로 이동한다.

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/MockExamStats.jsx` | 신규 생성 — 통계 화면 전체 |
| `src/App.jsx` | `/mock/stats` 라우트 + MockExamStats import 추가 |

## 변경 전/후

### App.jsx — 라우트 추가

**변경 전**
```jsx
import MockExamBreak from './pages/MockExamBreak'
...
<Route path="/mock/:round/break" element={<MockExamBreak />} />
```

**변경 후**
```jsx
import MockExamBreak from './pages/MockExamBreak'
import MockExamStats from './pages/MockExamStats'
...
<Route path="/mock/:round/break" element={<MockExamBreak />} />
<Route path="/mock/stats" element={<MockExamStats />} />
```

### MockExamStats.jsx — 핵심 구조

```jsx
// 게스트 통계 (localStorage)
function buildGuestStats() {
  for (const round of mockExamConfig.rounds) {
    const part1 = loadResult(round, 'part1')
    const part2 = loadResult(round, 'part2')
    if (!part1 || !part2) continue
    const allScores = { ...part1.scores, ...part2.scores }
    list.push({ round, totalAverage: calcAverage(allScores), isPass: checkPass(allScores), attemptNumber: 1 })
  }
}

// SVG Line Chart (320×140)
// Y축 눈금: 0/40/60/80/100 — 40점=amber 점선, 60점=indigo 점선
// 점: 합격=green(#22c55e), 불합격=red(#ef4444)
// 연결선: indigo(#6366f1) 실선

// 회원 데이터 로드
const history = await mockExamSupabase.getSessionHistory(userId)
const completed = Object.entries(history)
  .filter(([, s]) => s.isComplete)
  .map(([round, s]) => ({ round: parseInt(round), totalAverage: s.totalAverage, isPass: s.isPass, attemptNumber: s.attemptNumber ?? 1 }))
  .sort((a, b) => a.round - b.round)
```

## 배포 결과

- 빌드: ✅ 성공 (117 modules, 495.50 kB / gzip: 142.01 kB, 7.64s)
- 배포: git push origin main 완료 예정
- URL: https://gepv11.vercel.app/mock/stats
- 비고: `/mock/stats` 라우트는 `/mock/:round/:part` 보다 앞에 위치해야 충돌 없음 — App.jsx에서 `/mock/:round/break` 다음에 추가하여 정적 경로 우선 처리됨

## 다음 작업

STEP 7 — 통합 테스트 (MockExamHome → Quiz → Result → Break → Stats 전체 플로우)

# GEP_088_통계페이지통합_CustomMock_MockExam

**작성일:** 2026.03.03
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-2
**지시자:** 노팀장 (개발관리창006)

---

## 1. 작업 목적

GEP_087에서 구축한 6개 통계 UI 컴포넌트를 실제 통계 페이지에 통합.
- `CustomMockStats.jsx`: 6개 컴포넌트 전체 통합 + buildSyntheticAttempts 설계
- `MockExamStats.jsx`: PredictionCard + PassProbabilityCard 2개 추가

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/CustomMockStats.jsx` | 전면 개편 — 6개 컴포넌트 통합, buildSyntheticAttempts 추가 |
| `src/pages/MockExamStats.jsx` | PredictionCard + PassProbabilityCard 삽입 |
| `scripts/verify-gep088-step3.mjs` | 신규 — 검증 스크립트 (77 PASS) |

---

## 3. 주요 변경사항

### 3.1 CustomMockStats.jsx — buildSyntheticAttempts 설계

신규 Supabase 쿼리 없이 기존 `weaknessAnalysis.subjectStats` 집계 데이터를
WeaknessHeatmap/StudyRoadmap이 요구하는 `[{sub_subject, is_correct}]` 형태로 변환.

```js
// 변경 전: WeaknessHeatmap / StudyRoadmap 컴포넌트 없음
// 변경 후:
function buildSyntheticAttempts(weaknessAnalysis) {
  if (!weaknessAnalysis?.subjectStats) return []
  return Object.entries(weaknessAnalysis.subjectStats).flatMap(([sub, stat]) => [
    ...Array.from({ length: stat.correct }, () => ({ sub_subject: sub, is_correct: true })),
    ...Array.from({ length: stat.total - stat.correct }, () => ({ sub_subject: sub, is_correct: false })),
  ])
}
```

### 3.2 CustomMockStats.jsx — 레이아웃 순서 (변경 후)

```
1. PredictionCard + PassProbabilityCard  (grid-cols-2)
2. 전체 요약 카드 3개                    (grid-cols-3)
3. DualLineChart (점수 추이)
4. WeaknessHeatmap
5. DifficultyAnalysis
6. StudyRoadmap
7. 응시 이력 테이블
```

### 3.3 MockExamStats.jsx — 추가 위치

```jsx
// 변경 전: 전체요약 → LineChart → 응시이력
// 변경 후:
{/* 1. PredictionCard + PassProbabilityCard */}
<div className="grid grid-cols-2 gap-3">
  <PredictionCard      records={records} />
  <PassProbabilityCard records={records} />
</div>
{/* 2. 전체요약 → LineChart → 응시이력 (기존 유지) */}
```

### 3.4 제거된 코드 (CustomMockStats)

| 제거 항목 | 대체 |
|---------|------|
| `calcPassPrediction` 함수 | PredictionCard (advancedStatsService 사용) |
| `prediction` 변수 | PredictionCard 내부 처리 |
| `weaknessList` 변수 | WeaknessHeatmap 내부 처리 |

---

## 4. 설계 결정 사항

| 결정 | 이유 |
|------|------|
| buildSyntheticAttempts | 신규 Supabase 쿼리 없이 기존 집계 데이터 재활용 — 레고블럭 철학 |
| total_average(snake_case) 대응 | CustomMock Supabase 데이터는 snake_case → advancedStatsService 양방향 처리 |
| MockExamStats에 4개 중 2개만 추가 | MockExamStats는 records 구조만 있음 (questionAttempts 없음) |

---

## 5. 테스트 결과

- 빌드: ✅ 성공 (131 modules)
- 검증: ✅ **77 PASS / 0 FAIL** (`node scripts/verify-gep088-step3.mjs`)

---

## 6. 배포 결과

- Commit: `15649f0`
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app

---

## 7. 다음 작업

GEP_095 STEP 1 — Phase 6-3 unifiedWrongService.js 통합 오답 관리 서비스 구축

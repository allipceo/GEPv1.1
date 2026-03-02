# GEP_087_통계UI컴포넌트6개_구축

**작성일:** 2026.03.03
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-2
**지시자:** 노팀장 (개발관리창006)

---

## 1. 작업 목적

GEP_085에서 구축한 advancedStatsService를 소비하는 순수 UI 컴포넌트 6개 구축.
레고블럭 철학에 따라 props만 받는 독립 모듈로 설계,
CustomMockStats / MockExamStats 양쪽에서 재사용 가능.

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/stats/CircularGauge.jsx` | 신규 — SVG 원형 게이지 |
| `src/components/stats/PredictionCard.jsx` | 신규 — 점수 예측 카드 |
| `src/components/stats/PassProbabilityCard.jsx` | 신규 — 합격 확률 카드 |
| `src/components/stats/WeaknessHeatmap.jsx` | 신규 — 취약 세부과목 히트맵 |
| `src/components/stats/DifficultyAnalysis.jsx` | 신규 — 난이도 분석 (stub) |
| `src/components/stats/StudyRoadmap.jsx` | 신규 — ROI 기반 학습 로드맵 |
| `scripts/verify-gep087-step2.mjs` | 신규 — 검증 스크립트 (137 PASS) |

---

## 3. 컴포넌트별 상세

### CircularGauge
```jsx
// Props: value(0-100), size(default 80), label, bgColor
// SVG arc, strokeDashoffset = circ/4 (12시 방향 시작)
// 색상: pct>=80 → '#22c55e', pct>=60 → '#f59e0b', else → '#ef4444'
```

### PredictionCard
```jsx
// Props: records
// State: recentN(useState 5), canUse10 = records.length >= 10 시 토글 활성
// calculatePredictedScore 동기 호출
// 트렌드 아이콘: up→🔼, down→🔽, stable→→
// 60점 합격선 마커 표시
```

### PassProbabilityCard
```jsx
// Props: records
// RISK_THRESHOLD = 72 (이하 → ⚠️ 경고 표시)
// full 모드: 과목별 확률 바 표시
// estimated 모드: 안내 메시지
// <CircularGauge value={result.overall} size={100} />
```

### WeaknessHeatmap
```jsx
// Props: questionAttempts [{sub_subject, is_correct}]
// PARENT_SECTIONS: 법령(blue)/손보1부(green)/손보2부(purple) 3개 그룹
// LEVEL_BADGE: good(초록)/fair(노랑)/weak(빨강)/nodata(회색)
// analyzeWeaknessBySubject 동기 호출
```

### DifficultyAnalysis
```jsx
// Props: 없음 (standalone stub)
// analyzeWeaknessByDifficulty() 호출 → NO_DIFFICULTY_DATA
// "준비 중" UI 표시
```

### StudyRoadmap
```jsx
// Props: questionAttempts
// analyzeWeaknessBySubject + generateStudyRoadmap 내부 호출
// assignWeeks(): 순차 주차 할당 (days/7 기반)
// Timeline: 4열 그리드, TOTAL_WEEKS=4
// 우선순위 1→빨강, 2→주황, 3→파랑
```

---

## 4. 설계 결정 사항

| 결정 | 이유 |
|------|------|
| props only (no store, no async) | SSOT 원칙, 페이지에서 데이터 관리 |
| CircularGauge SVG 직접 구현 | 외부 라이브러리 없이 경량화 |
| DifficultyAnalysis stub 유지 | exams.json difficulty 필드 없음, 향후 확장 대비 |
| WeaknessHeatmap — 과목 그룹 헤더 색상 | 기존 과목 컬러 코드 준수 (법령=blue, 1부=green, 2부=purple) |

---

## 5. 테스트 결과

- 빌드: ✅ 성공 (131 modules)
- 검증: ✅ **137 PASS / 0 FAIL** (`node scripts/verify-gep087-step2.mjs`)

---

## 6. 배포 결과

- Commit: `d01547d`
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app

---

## 7. 다음 작업

GEP_088 STEP 3 — CustomMockStats + MockExamStats 페이지에 6개 컴포넌트 통합

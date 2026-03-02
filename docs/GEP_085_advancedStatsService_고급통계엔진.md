# GEP_085_advancedStatsService_고급통계엔진

**작성일:** 2026.03.03
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-2
**지시자:** 노팀장 (개발관리창006)

---

## 1. 작업 목적

Phase 6-2 통계 고도화를 위한 순수 계산 엔진 구축.
브라우저/Supabase 의존 없이 5개 통계 함수를 단일 서비스 파일로 제공하여
CustomMockStats, MockExamStats 등 모든 통계 페이지에서 재사용 가능하도록 설계.

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/services/advancedStatsService.js` | 신규 생성 — 고급 통계 엔진 5개 함수 |
| `scripts/verify-gep085-step1.mjs` | 신규 생성 — 검증 스크립트 (89 PASS) |

---

## 3. 주요 구현 내용

### 3.1 상수
```js
const MIN_DATA_REQUIRED = 5  // 예측 기능 최소 데이터 수
```

### 3.2 내부 수학 유틸리티 (비공개)
| 함수 | 역할 |
|------|------|
| `_mean(arr)` | 산술 평균 |
| `_median(arr)` | 중앙값 (정렬 후 중위 선택) |
| `_stdDev(arr)` | 표준편차 |
| `_linearSlope(arr)` | 선형 회귀 기울기 |
| `_randomNormal()` | Box-Muller 정규분포 난수 |

### 3.3 공개 함수 5개

**`calculatePredictedScore(records, recentN=5)`**
- camelCase/snake_case 양방향 처리 (`totalAverage` / `total_average`)
- 중앙값, 선형 트렌드(up/down/stable), 95% 신뢰구간 반환
- 데이터 부족 시 `{ error: 'INSUFFICIENT_DATA', dataCount }` 반환

**`calculatePassProbability(records, simulationCount=1000)`**
- Box-Muller Monte Carlo 1,000회 시뮬레이션
- full 모드: records[0]에 과목별 점수 키 존재 시 → 과목별 확률 산출
- estimated 모드: 전체 평균만 있을 때 → 단순 추정
- RISK_THRESHOLD = 72 (컴포넌트에서 경고 표시 기준)

**`analyzeWeaknessBySubject(questionAttempts)`**
- S1~S12 세부과목별 정답률, level(good/fair/weak/nodata), color 반환
- questionAttempts: `[{ sub_subject: string, is_correct: boolean|number }]`

**`analyzeWeaknessByDifficulty()`**
- exams.json에 difficulty 필드 없음 확인 후 stub 구현
- 반환: `{ error: 'NO_DIFFICULTY_DATA', hard: null, medium: null, easy: null }`

**`generateStudyRoadmap(weaknessData)`**
- ROI = gap / baseDays 계산, 상위 3개 과목 우선순위 선정
- TARGET_RATE = 70, BASE_STUDY_DAYS (과목별 기본 학습일)
- 반환: `[{ priority, subjectKey, name, accuracy, gap, roi, targetRate, days, method }]`

---

## 4. 설계 결정 사항

| 결정 | 이유 |
|------|------|
| 순수 함수 (no async, no Supabase) | 컴포넌트에서 동기 호출, 테스트 용이 |
| difficulty stub | exams.json에 difficulty 필드 없음 — 향후 확장 여지 |
| camelCase/snake_case 양방향 | CustomMock(snake_case) + MockExam(camelCase) 통합 지원 |
| MIN_DATA_REQUIRED=5 | 3개 이하 데이터로 예측 시 신뢰도 저하 방지 |

---

## 5. 테스트 결과

- 빌드: ✅ 성공 (131 modules)
- 검증: ✅ **89 PASS / 0 FAIL** (`node scripts/verify-gep085-step1.mjs`)

---

## 6. 배포 결과

- Commit: `b2a5e36`
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app

---

## 7. 다음 작업

GEP_087 STEP 2 — 6개 통계 UI 컴포넌트 구축 (advancedStatsService 소비자)

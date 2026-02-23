# GEP_042_Phase3STEP4_통계UI완성

**작업일시:** 2026.02.23
**작업자:** 고팀장 (Claude Code)

## 작업 내용

Phase 3 STEP4 — 게스트/레벨2 통계 UI 완성 및 통합 테스트 전수 실행

### ① 레벨1 게스트 통계 UI (StatsPanel.jsx)
- `isGuest=true` 시 "무료체험 현황" 뷰 분기 추가
- 전체 진행: 12 세부과목 × min(solved, 30) 합산 / 360
- 3과목별: X/120 · 정답률% 표시
- 기존 회원 뷰(학습 현황)와 완전 분리

### ② 레벨2 통계 UI (StatsPanel.jsx + Home.jsx)
- `wrongCount` 프롭 추가: `stats.total.solved - stats.total.correct`
- 오답 누적 > 0 시 StatsPanel에 "오답 누적 X회" 행 추가 (빨강 배경)
- "틀린문제 풀기" 버튼에 wrongCount 뱃지 (`X개`) 추가
- wrongCount는 레벨2+ 인증 회원에게만 표시 (게스트 null)

### ③ 통합 테스트 — 27개 시나리오 전수 통과
| 시나리오 | 테스트 수 | 결과 |
|---------|---------|------|
| A. 게스트 30문제 소진 → 팝업 → 과목이동 | 6 | ✅ |
| B. 신규 회원 로그인 → 레벨1 확인 | 5 | ✅ |
| C. 레벨2 문제풀기 → 서버저장 → 틀린문제 | 5 | ✅ |
| D. 오프라인 → 로컬저장 → 복귀 싱크 | 5 | ✅ |
| E. 기존 기능 회귀 테스트 | 6 | ✅ |
| **합계** | **27** | **✅ 전수 통과** |

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/components/StatsPanel.jsx` | isGuest 게스트뷰 분기 + wrongCount 오답행 추가 |
| `src/pages/Home.jsx` | wrongCount 계산 + StatsPanel/버튼 prop 전달 |
| `verify-step4.js` | 통합 테스트 27개 검증 스크립트 |

## 변경 전/후

### StatsPanel homeMode props
**Before:** `homeMode, allStats`
**After:** `homeMode, allStats, isGuest=false, wrongCount=null`

### 게스트 뷰 (isGuest=true)
**Before:** 회원과 동일한 "학습 현황" 패널
**After:** "무료체험 현황 · 과목당 30문제 무료" + 전체진행 X/360 + 3과목 X/120

### 레벨2 틀린문제 버튼
**Before:** `틀린문제 풀기 ›`
**After:** `틀린문제 풀기 [7개] ›` (오답 시 뱃지 표시)

## 배포 결과
- 빌드: ✅ 성공 (5.37s, 437kB)
- URL: https://gepv11.vercel.app
- 비고: 테스트 27/27 전수 통과 후 배포

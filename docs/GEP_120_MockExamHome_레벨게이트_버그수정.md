# GEP_120_MockExamHome_레벨게이트_버그수정

**작성일:** 2026.03.07
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6 버그수정
**지시자:** 노팀장 (개발관리창007)

---

## 1. 작업 목적

GEP_119에서 featureFlags.MOCKEXAM_MIN_LEVEL을 4→1로 변경했음에도
모의고사 페이지에서 레벨 게이트가 해제되지 않는 버그 수정.

---

## 2. 원인 분석

### 패턴 비교

| 파일 | 게이트 계산 방식 | featureFlags 변경 반영 |
|------|----------------|----------------------|
| `CustomMockHome.jsx` | `serviceLevel >= FEATURE_FLAGS.CUSTOMMOCK_MIN_LEVEL` | ✅ 즉시 반영 |
| `MockExamHome.jsx` (수정 전) | `useAuthStore(s => s.userFeatures.canMockExam)` | ❌ persist 캐시 사용 |

`userFeatures.canMockExam`은 Zustand `persist` 미들웨어가 localStorage(`gep_auth_v1`)에 저장한 값이다.
featureFlags.js를 변경해도 localStorage에 기존 `canMockExam: false`가 남아있으면,
INITIAL_SESSION 재계산 전까지 게이트가 열리지 않는다.

---

## 3. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/MockExamHome.jsx` | FEATURE_FLAGS import + canMockExam 직접 계산으로 변경 |

---

## 4. 주요 변경사항

### MockExamHome.jsx

```javascript
// 변경 전
import { useAuthStore } from '../stores/authStore'
// ...
const canMockExam = useAuthStore((s) => s.userFeatures.canMockExam)  // persist 캐시

// 변경 후
import { useAuthStore } from '../stores/authStore'
import { FEATURE_FLAGS } from '../config/featureFlags'
// ...
const serviceLevel = useAuthStore((s) => s.serviceLevel)
const canMockExam  = serviceLevel >= FEATURE_FLAGS.MOCKEXAM_MIN_LEVEL  // 직접 계산
```

CustomMockHome.jsx와 동일한 패턴으로 통일.

---

## 5. 테스트 결과

- 빌드: ✅ 성공 (141 modules, 5.29s)

---

## 6. 배포 결과

- Commit: (아래 참조)
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app/mock

---

## 7. 교훈

| 항목 | 내용 |
|------|------|
| 버그 패턴 | persist 캐시 값 vs 직접 계산 — 일관성 없으면 featureFlags 변경이 즉시 반영되지 않음 |
| 올바른 패턴 | 레벨 게이트는 `serviceLevel >= FEATURE_FLAGS.XXX_MIN_LEVEL` 직접 계산 |
| 향후 원칙 | 모든 페이지의 레벨 게이트는 직접 계산 방식 사용 (`userFeatures` 캐시 금지) |

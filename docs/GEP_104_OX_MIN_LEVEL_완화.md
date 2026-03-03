# GEP_104_OX_MIN_LEVEL_완화

**작성일:** 2026.03.03
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 6-3
**지시자:** 노팀장 (개발관리창007)

---

## 1. 작업 목적

OX 진위형 서비스 레벨 게이트를 3 → 1로 임시 완화.
현재 모든 로그인 사용자가 OX 학습 및 통합 틀린문제 서비스를 이용할 수 있도록 접근성 향상.

---

## 2. 수정/추가 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/config/featureFlags.js` | `OX_MIN_LEVEL: 1` 추가 (기존 하드코딩 3 대체) |
| `src/pages/OXHome.jsx` | `FEATURE_FLAGS.OX_MIN_LEVEL` 참조로 변경 |
| `docs/GEP_104_OX_MIN_LEVEL_완화.md` | 본 문서 |

---

## 3. 주요 변경사항

### featureFlags.js 변경 전/후

```javascript
// 변경 전 — OX_MIN_LEVEL 없음 (OXHome에 3 하드코딩)
export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,
  WRONGNOTE_MIN_LEVEL:      3,
  MOCKEXAM_MIN_LEVEL:       4,
  ...
}

// 변경 후
export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,
  WRONGNOTE_MIN_LEVEL:      3,
  OX_MIN_LEVEL:             1,  // TODO: Phase 7에서 재검토
  MOCKEXAM_MIN_LEVEL:       4,
  ...
}
```

### OXHome.jsx 변경 전/후

```jsx
// 변경 전
import { OX_SUBJECTS } from '../config/oxSubjects'
// ...
if (serviceLevel < 3) {   // 하드코딩

// 변경 후
import { FEATURE_FLAGS } from '../config/featureFlags'
// ...
if (serviceLevel < FEATURE_FLAGS.OX_MIN_LEVEL) {  // 플래그 참조
```

### 설계 결정

| 결정 | 이유 |
|------|------|
| featureFlags.js에 OX_MIN_LEVEL 추가 | SSOT 원칙 — 레벨 정책은 한 곳에서 관리 |
| OXHome.jsx 하드코딩 제거 | 향후 Phase 7 레벨 재조정 시 featureFlags.js 1곳만 수정 |
| TODO 주석 추가 | Phase 7 재검토 시 놓치지 않도록 |

---

## 4. 테스트 결과

- 빌드: ✅ 성공 (139 modules)
- 실서비스: ✅ `/ox` 정상 접근 (200)

---

## 5. 배포 결과

- Commit: (아래 참조)
- Push: ✅ origin/main
- Vercel: ✅ 자동 배포 완료
- URL: https://gepv11.vercel.app/ox

---

## 6. 다음 작업

- Phase 7에서 레벨 정책 재검토 (OX_MIN_LEVEL 최종 확정)

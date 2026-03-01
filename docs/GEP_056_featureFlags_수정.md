# GEP_056_featureFlags_수정

**작성일:** 2026.03.01
**작성자:** 고팀장 (Claude Code)
**Phase:** Phase 5
**지시자:** 노팀장 (개발관리창006) — GEP_056 지시서

## 1. 작업 목적

SSOT 정합성 수정.
GEP_038 기준 모의고사 = 레벨 4 서비스이므로 featureFlags 수정.

## 2. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/config/featureFlags.js` | MOCKEXAM_MIN_LEVEL 5 → 4 |

## 3. 변경 내용

### 변경 전
```javascript
MOCKEXAM_MIN_LEVEL: 5,
```

### 변경 후
```javascript
MOCKEXAM_MIN_LEVEL: 4,  // GEP_038 기준
```

## 4. 영향 범위

- `authStore.js`: `canMockExam: serviceLevel >= 4` (자동 반영)
- `MockExamHome.jsx`: 레벨 4 이상 접근 허용 (자동 반영)

## 5. 테스트 결과

- 빌드: ✅ 성공 (9.21s, 111 modules)

## 6. 배포 결과

- Commit: 미배포 (STEP 3 이후 통합 배포 예정)

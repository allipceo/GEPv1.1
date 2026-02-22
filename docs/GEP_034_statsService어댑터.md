# GEP_034_statsService어댑터

**작업일시:** 2026.02.22
**작업자:** 고팀장 (Claude Code)

## 작업 내용

GEP_032_STEP3 — statsService 어댑터 + featureFlags 생성.
기존 statsStore.js 수정 없이, 게스트/회원 분기 레이어를 신규 파일 2개로 구현.

## 생성 파일

| 파일 | 역할 |
|------|------|
| `src/config/featureFlags.js` | 서비스 레벨별 기능 개방 기준 상수 |
| `src/services/statsService.js` | 통계 기록 어댑터 (게스트/회원 분기) |

## featureFlags.js

```js
export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,  // Supabase 통계 저장
  WRONGNOTE_MIN_LEVEL:      3,  // 오답노트
  MOCKEXAM_MIN_LEVEL:       5,  // 모의고사
  ADVANCED_STATS_MIN_LEVEL: 3,  // 고급 통계
};

export const canUseFeature = (userLevel, featureMinLevel) => {
  return Number.isInteger(userLevel) && userLevel >= featureMinLevel;
};
```

## statsService.js 핵심 로직

```
recordAttempt(statsStore, authState, payload)
  ├─ [공통] safeRound 검증 후 statsStore.updateStats() → 로컬 저장
  └─ [회원 Lv2+만] supabase.from('attempts').insert() → Supabase 저장
       ├─ authStatus !== 'authenticated' → return (게스트 차단)
       ├─ serviceLevel < 2 → return (레벨 미달 차단)
       └─ try/catch로 네트워크 실패 시 앱 중단 방지
```

## 분기 기준

| 구분 | 로컬 statsStore | Supabase attempts |
|------|----------------|-------------------|
| 게스트 | ✅ 저장 | ❌ 미저장 |
| 회원 Lv1 | ✅ 저장 | ❌ 미저장 (레벨 미달) |
| 회원 Lv2+ | ✅ 저장 | ✅ 저장 |

## 변경 전/후

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| statsStore.js | 변경 없음 | 변경 없음 (수정 금지 준수) |
| Question.jsx | 변경 없음 | STEP4에서 처리 예정 |
| 신규 파일 | 없음 | 2개 생성 |

## 배포 결과

- 빌드: ✅ 성공 (60 modules, 253.21 kB)
- 배포: git push origin main 완료
- URL: https://gepv11.vercel.app
- 비고: STEP4(Question.jsx 연동) 전까지 statsService는 미사용 상태

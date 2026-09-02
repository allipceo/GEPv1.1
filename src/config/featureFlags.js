/**
 * src/config/featureFlags.js
 * 서비스 레벨별 기능 개방 기준
 */

// ============================================================
// 🚨 긴급 롤백 스위치 (GEPv30-120) — true로 바꾸면 SERVICE_FLAGS
//    전체를 무시하고 즉시 FULL SERVICE(전체 서비스 개방)로 복귀
// ============================================================
export const EMERGENCY_FULL_OPEN = false;

export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,
  WRONGNOTE_MIN_LEVEL:      3,
  OX_MIN_LEVEL:             1,  // GEP_104 임시 완화 (기존 3 → 1). TODO: Phase 7에서 레벨 정책 재검토 후 조정
  MOCKEXAM_MIN_LEVEL:       1,  // GEP_119 임시 해제 (Phase 6 테스트용). TODO: Phase 7에서 레벨 정책 재설계 후 일괄 재적용
  ADVANCED_STATS_MIN_LEVEL: 3,
  CUSTOMMOCK_MIN_LEVEL:     1,  // GEP_119 임시 해제 (Phase 6 테스트용). TODO: Phase 7에서 레벨 정책 재설계 후 일괄 재적용
  MINIMOCK_MIN_LEVEL:       1,  // GEPv30-109/110 간이 모의고사 — 승인 사용자 전체
};

export const canUseFeature = (userLevel, featureMinLevel) => {
  return Number.isInteger(userLevel) && userLevel >= featureMinLevel;
};

// ============================================================
// 서비스 순차 가동 스위치 (GEPv30-119 v1.1 / GEPv30-120)
// 조대표 지시 → 노팀장이 해당 값 false → true로 변경
// ============================================================
export const SERVICE_FLAGS = {
  // GEPv30-154 파일럿 1주차 — A(회차순)+B(과목별) 선택형만 개방, 나머지 전체 잠금
  SERVICE_A: true,        // 1주차 개방: 선택형 회차순
  SERVICE_B: true,        // 1주차 개방: 선택형 과목별
  UNIFIED_WRONG: false,   // 2주차 개방: 틀린문제·통합오답
  OX: false,              // 3주차 개방: 진위형
  STATS: false,           // 4주차 개방: 학습분석 (GEPv30-154 신규 키)
  MINI_MOCK: false,       // 5주차 개방: 간이모의고사
  MOCK_EXAM: false,       // 5주차 개방: 모의고사
  CUSTOM_MOCK: false,     // 5주차 개방: 맞춤형 모의고사
};

// 서비스 활성 여부 판단 함수 (매 호출마다 config 직접 계산 — persist 캐시 금지, 구 GEP_120 교훈)
export const isServiceEnabled = (serviceKey) => {
  if (EMERGENCY_FULL_OPEN) return true;
  return SERVICE_FLAGS[serviceKey] ?? true;
};

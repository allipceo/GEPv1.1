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
  SERVICE_B: true,        // 1단계: 파일럿 시작 즉시 활성
  UNIFIED_WRONG: true,    // 1단계: 파일럿 시작 즉시 활성
  OX: false,              // 2단계: 조대표 지시 시 true
  SERVICE_A: false,       // 3단계: 조대표 지시 시 true
  MINI_MOCK: false,       // 4단계: 조대표 지시 시 true
  MOCK_EXAM: false,       // 5단계: 조대표 지시 시 true
  CUSTOM_MOCK: false,     // 5단계: 조대표 지시 시 true
};

// 서비스 활성 여부 판단 함수 (매 호출마다 config 직접 계산 — persist 캐시 금지, 구 GEP_120 교훈)
export const isServiceEnabled = (serviceKey) => {
  if (EMERGENCY_FULL_OPEN) return true;
  return SERVICE_FLAGS[serviceKey] ?? true;
};

/**
 * src/config/featureFlags.js
 * 서비스 레벨별 기능 개방 기준
 */

export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,
  WRONGNOTE_MIN_LEVEL:      3,
  OX_MIN_LEVEL:             1,  // GEP_104 임시 완화 (기존 3 → 1). TODO: Phase 7에서 레벨 정책 재검토 후 조정
  MOCKEXAM_MIN_LEVEL:       4,  // GEP_038 기준
  ADVANCED_STATS_MIN_LEVEL: 3,
  CUSTOMMOCK_MIN_LEVEL:     5,  // GEP_074 Phase 6-1 맞춤 모의고사
};

export const canUseFeature = (userLevel, featureMinLevel) => {
  return Number.isInteger(userLevel) && userLevel >= featureMinLevel;
};

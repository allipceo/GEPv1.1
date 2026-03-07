/**
 * src/config/featureFlags.js
 * 서비스 레벨별 기능 개방 기준
 */

export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,
  WRONGNOTE_MIN_LEVEL:      3,
  OX_MIN_LEVEL:             1,  // GEP_104 임시 완화 (기존 3 → 1). TODO: Phase 7에서 레벨 정책 재검토 후 조정
  MOCKEXAM_MIN_LEVEL:       1,  // GEP_119 임시 해제 (Phase 6 테스트용). TODO: Phase 7에서 레벨 정책 재설계 후 일괄 재적용
  ADVANCED_STATS_MIN_LEVEL: 3,
  CUSTOMMOCK_MIN_LEVEL:     1,  // GEP_119 임시 해제 (Phase 6 테스트용). TODO: Phase 7에서 레벨 정책 재설계 후 일괄 재적용
};

export const canUseFeature = (userLevel, featureMinLevel) => {
  return Number.isInteger(userLevel) && userLevel >= featureMinLevel;
};

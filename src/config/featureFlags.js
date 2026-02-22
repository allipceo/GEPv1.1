/**
 * src/config/featureFlags.js
 * 서비스 레벨별 기능 개방 기준
 */

export const FEATURE_FLAGS = {
  STATS_MIN_LEVEL:          2,
  WRONGNOTE_MIN_LEVEL:      3,
  MOCKEXAM_MIN_LEVEL:       5,
  ADVANCED_STATS_MIN_LEVEL: 3,
};

export const canUseFeature = (userLevel, featureMinLevel) => {
  return Number.isInteger(userLevel) && userLevel >= featureMinLevel;
};

// src/config/customMockConfig.js
// GEP_070 Phase 6-1 맞춤 모의고사 설정
// SSOT: 모드·타이머·과목 배분·S1~S12 매핑 전부 여기서 관리

export const customMockConfig = {

  // ── 모드 ────────────────────────────────────────────────────────────────────
  MODES: {
    STANDARD: 'standard',   // 실전과 동일한 균등 분배
    WEAKNESS: 'weakness',   // 약점 세부과목 비중 2배
  },

  // ── 타이머 타입 ──────────────────────────────────────────────────────────────
  TIMER_TYPES: {
    FULL:  'full',   // 실제 시험 시간 (1교시 40분 + 2교시 80분)
    SHORT: 'short',  // 단축 모드 (80%, 1교시 32분 + 2교시 64분)
  },

  // ── 교시별 타이머 (초 단위) ───────────────────────────────────────────────────
  timers: {
    full:  { part1: 40 * 60, part2: 80 * 60 },   // 2400s / 4800s
    short: { part1: 32 * 60, part2: 64 * 60 },   // 1920s / 3840s (80%)
  },

  // ── 교시 구조 ────────────────────────────────────────────────────────────────
  structure: {
    part1: {
      name:          '1교시 법령',
      subject:       '법령',
      questionCount: 40,
      color:         'blue-600',
      emoji:         '📘',
    },
    part2: {
      name:          '2교시 손보',
      subjects:      ['손보1부', '손보2부'],
      questionCount: 80,  // 손보1부 40 + 손보2부 40
      colors:        ['green-600', 'purple-600'],
      emojis:        ['📗', '📕'],
    },
  },

  // ── 과목별 총 배분 및 세부과목 목록 ──────────────────────────────────────────
  // subSubject 키는 exams.json의 subSubject 필드 값과 정확히 일치해야 함
  distribution: {
    '법령': {
      count:       40,
      subSubjects: ['보험업법', '상법', '위험관리', '세제재무'],
    },
    '손보1부': {
      count:       40,
      subSubjects: ['자동차보험', '특종보험', '보증보험', '연금저축'],
    },
    '손보2부': {
      count:       40,
      subSubjects: ['화재보험', '해상보험', '항공우주', '재보험'],
    },
  },

  // ── S1~S12 세부과목 매핑 (GEP_070 지시서 기준) ────────────────────────────────
  subjectMap: {
    S1:  { key: '보험업법',   parent: '법령' },
    S2:  { key: '상법',       parent: '법령' },
    S3:  { key: '위험관리',   parent: '법령' },
    S4:  { key: '세제재무',   parent: '법령' },
    S5:  { key: '자동차보험', parent: '손보1부' },
    S6:  { key: '특종보험',   parent: '손보1부' },
    S7:  { key: '보증보험',   parent: '손보1부' },
    S8:  { key: '연금저축',   parent: '손보1부' },
    S9:  { key: '화재보험',   parent: '손보2부' },
    S10: { key: '해상보험',   parent: '손보2부' },
    S11: { key: '항공우주',   parent: '손보2부' },
    S12: { key: '재보험',     parent: '손보2부' },
  },

  // ── 약점 모드 설정 ────────────────────────────────────────────────────────────
  weakness: {
    minAttempts:          10,  // 약점 모드 활성화 최소 시도 횟수
    topWeakCount:          3,  // 정답률 하위 N개 세부과목 선택
    weakWeightMultiplier:  2,  // 약점 세부과목 비중 배율
  },

  // ── 합격 기준 (Phase 5 동일, 변경 금지) ──────────────────────────────────────
  passCriteria: {
    minSubjectScore: 40,
    minAverageScore: 60,
  },

  // ── 기타 설정 ─────────────────────────────────────────────────────────────────
  autoSaveInterval: 10,         // 10문제마다 자동 저장
  breakTime:        15 * 60,    // 교시 간 휴식 15분 (초)
  studyMode:        'custom_mock',
  minLevel:         5,          // featureFlags: CUSTOMMOCK_MIN_LEVEL
};

export default customMockConfig;

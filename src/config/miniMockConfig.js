// src/config/miniMockConfig.js
// GEPv30-109 STEP 3 — 간이 모의고사 설정 (SSOT)

const miniMockConfig = {
  studyMode:      'mini_mock',
  totalQuestions: 30,
  timeLimit:      2400,   // 40분 (초)
  setCount:       30,

  subjectQuota: {   // 3대 과목별 문제 수 (채점 기준)
    '법령':    10,
    '손보1부': 11,
    '손보2부':  9,
  },

  passCriteria: {
    minAverageScore: 60,   // 전체 평균 60점 이상
    minSubjectScore: 40,   // 과목당 40점 이상 (과락 방지)
  },
}

export default miniMockConfig

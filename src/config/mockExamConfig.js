// src/config/mockExamConfig.js

/**
 * 모의고사 설정
 * 실제 시험 구조: 1교시(법령 40분) + 2교시(손보1부+2부 80분)
 */

export const mockExamConfig = {
  // 회차 정보
  rounds: [23, 24, 25, 26, 27, 28, 29, 30, 31],

  // 시험 구조
  structure: {
    part1: {
      name: '1교시 법령',
      subject: '법령',
      questionCount: 40,
      timeLimit: 40 * 60, // 40분 (초 단위)
      color: 'blue-600',
      emoji: '📘'
    },
    part2: {
      name: '2교시 손보',
      subjects: ['손보1부', '손보2부'],
      questionCount: 80, // 1부 40 + 2부 40
      timeLimit: 80 * 60, // 80분 (초 단위)
      colors: ['green-600', 'purple-600'],
      emojis: ['📗', '📕']
    }
  },

  // 휴식 시간
  breakTime: 15 * 60, // 15분 (초 단위)

  // 합격 기준
  passCriteria: {
    minSubjectScore: 40, // 과목당 최소 40점
    minAverageScore: 60  // 전체 평균 최소 60점
  },

  // 자동 저장 간격
  autoSaveInterval: 10, // 10문제마다

  // study_mode 식별자
  studyMode: 'mock_exam'
};

export default mockExamConfig;

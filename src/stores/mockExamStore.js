// src/stores/mockExamStore.js
import { create } from 'zustand';
import mockExamConfig from '../config/mockExamConfig';

/**
 * 모의고사 전용 Zustand 스토어
 * 기존 questionStore, oxStore와 완전 독립
 */

export const useMockExamStore = create((set, get) => ({
  // ===== 세션 정보 =====
  currentRound: null,        // 현재 풀고 있는 회차 (23~31)
  currentPart: null,         // 'part1' | 'part2'
  attemptNumber: 1,          // 재응시 차수 (1차, 2차, 3차...)
  sessionId: null,           // Supabase session ID

  // ===== 문제 데이터 =====
  questions: [],             // 현재 파트 문제 배열
  currentIndex: 0,           // 현재 문제 인덱스 (0-based)

  // ===== 답안 데이터 =====
  answers: {},               // { questionNumber: selectedAnswer }
  // 예: { 1: 2, 2: 1, 3: null, ... }

  // ===== 타이머 =====
  startTime: null,           // 시작 절대 시간 (Date.now())
  timeLimit: null,           // 제한 시간 (초)
  isPaused: false,           // 중간 저장 시 일시정지 (사용 안함, 계속 흐름)

  // ===== 진행 상태 =====
  part1Completed: false,     // 1교시 완료 여부
  part1Score: null,          // 1교시 점수
  part2Completed: false,     // 2교시 완료 여부
  part2Scores: {             // 2교시 점수
    part1: null,             // 손보1부
    part2: null              // 손보2부
  },
  isComplete: false,         // 전체 완료 여부


  // ===== Actions =====

  /**
   * 새 모의고사 시작
   */
  startExam: (round, questions, part = 'part1') => {
    const config = part === 'part1'
      ? mockExamConfig.structure.part1
      : mockExamConfig.structure.part2;

    set({
      currentRound: round,
      currentPart: part,
      questions: questions,
      currentIndex: 0,
      answers: {},
      startTime: Date.now(),
      timeLimit: config.timeLimit,
      isPaused: false
    });
  },

  /**
   * 이어하기
   */
  resumeExam: (round, questions, part, savedAnswers, savedIndex, elapsedTime) => {
    const config = part === 'part1'
      ? mockExamConfig.structure.part1
      : mockExamConfig.structure.part2;

    // 절대 시간 재계산
    const startTime = Date.now() - (elapsedTime * 1000);

    set({
      currentRound: round,
      currentPart: part,
      questions: questions,
      currentIndex: savedIndex,
      answers: savedAnswers,
      startTime: startTime,
      timeLimit: config.timeLimit,
      isPaused: false
    });
  },

  /**
   * 답안 선택
   */
  selectAnswer: (questionNumber, answer) => {
    set(state => ({
      answers: {
        ...state.answers,
        [questionNumber]: answer
      }
    }));
  },

  /**
   * 다음 문제
   */
  nextQuestion: () => {
    set(state => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1)
    }));
  },

  /**
   * 이전 문제
   */
  prevQuestion: () => {
    set(state => ({
      currentIndex: Math.max(state.currentIndex - 1, 0)
    }));
  },

  /**
   * 특정 문제로 이동
   */
  goToQuestion: (index) => {
    set({ currentIndex: index });
  },

  /**
   * 경과 시간 계산 (초)
   */
  getElapsedTime: () => {
    const { startTime } = get();
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  },

  /**
   * 남은 시간 계산 (초)
   */
  getRemainingTime: () => {
    const { timeLimit } = get();
    const elapsed = get().getElapsedTime();
    return Math.max(0, timeLimit - elapsed);
  },

  /**
   * 타임아웃 여부
   */
  isTimeout: () => {
    return get().getRemainingTime() <= 0;
  },

  /**
   * 미응답 문제 목록
   */
  getUnansweredQuestions: () => {
    const { questions, answers } = get();
    return questions
      .map((q, idx) => idx + 1)
      .filter(num => answers[num] === undefined || answers[num] === null);
  },

  /**
   * 1교시 완료 처리
   */
  completePart1: (score) => {
    set({
      part1Completed: true,
      part1Score: score,
      currentPart: null,
      questions: [],
      answers: {},
      currentIndex: 0,
      startTime: null,
      timeLimit: null
    });
  },

  /**
   * 2교시 완료 처리
   */
  completePart2: (scores) => {
    set({
      part2Completed: true,
      part2Scores: scores,
      isComplete: true,
      currentPart: null,
      questions: [],
      answers: {},
      currentIndex: 0,
      startTime: null,
      timeLimit: null
    });
  },

  /**
   * 전체 초기화 (재응시 시)
   */
  resetExam: () => {
    set({
      currentRound: null,
      currentPart: null,
      attemptNumber: 1,
      sessionId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      startTime: null,
      timeLimit: null,
      isPaused: false,
      part1Completed: false,
      part1Score: null,
      part2Completed: false,
      part2Scores: { part1: null, part2: null },
      isComplete: false
    });
  }
}));

export default useMockExamStore;

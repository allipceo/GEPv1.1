// src/stores/customMockStore.js
// GEP_072 Phase 6-1 맞춤 모의고사 전용 Zustand 스토어
// mockExamStore.js 구조 100% 재활용 + 맞춤 모드 상태 추가
//
// 기존 questionStore / oxStore / mockExamStore와 완전 독립
// 레벨5 전용 (featureFlags.CUSTOMMOCK_MIN_LEVEL = 5)

import { create } from 'zustand'
import customMockConfig from '../config/customMockConfig'
import {
  generateQuestions,
  calculateScore,
  saveResult,
  loadResult,
  CUSTOM_PROGRESS_LS_KEY,
  CUSTOM_SESSION_LS_KEY,
  customMockSupabase,
} from '../services/customMockService'

// ─────────────────────────────────────────────────────────────────────────────
// localStorage 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function persistSession(state) {
  try {
    localStorage.setItem(CUSTOM_SESSION_LS_KEY, JSON.stringify({
      sessionLocalId:    state.sessionLocalId,
      supabaseSessionId: state.supabaseSessionId,
      mode:              state.mode,
      timerType:         state.timerType,
      weakSubjects:      state.weakSubjects,
      allQuestions:      state.allQuestions,
    }))
  } catch (_) {}
}

export function loadPersistedSession() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_SESSION_LS_KEY) || 'null')
  } catch {
    return null
  }
}

function saveProgress(sessionLocalId, part, store) {
  if (!store.startTime) return
  try {
    localStorage.setItem(CUSTOM_PROGRESS_LS_KEY(sessionLocalId, part), JSON.stringify({
      answers:      store.answers,
      currentIndex: store.currentIndex,
      elapsedTime:  store.getElapsedTime(),
    }))
  } catch (_) {}
}

export function loadProgress(sessionLocalId, part) {
  try {
    return JSON.parse(
      localStorage.getItem(CUSTOM_PROGRESS_LS_KEY(sessionLocalId, part)) || 'null'
    )
  } catch {
    return null
  }
}

function clearProgress(sessionLocalId, part) {
  try {
    localStorage.removeItem(CUSTOM_PROGRESS_LS_KEY(sessionLocalId, part))
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 초기 상태 (reset 시 재사용)
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL = {
  // 세션 식별
  sessionLocalId:    null,   // localStorage 키 식별자 (timestamp 기반)
  supabaseSessionId: null,   // Supabase session ID

  // 모드 설정
  mode:       null,          // 'standard' | 'weakness'
  timerType:  null,          // 'full' | 'short'
  weakSubjects: [],          // 약점 모드 시 정답률 하위 세부과목 목록

  // 문제 데이터
  allQuestions:  [],         // 120문제 전체 (세션 내내 보존)
  questions:     [],         // 현재 파트 문제 (part1: 40 / part2: 80)
  currentIndex:  0,          // 현재 문제 인덱스 (0-based)

  // 답안
  answers: {},               // { questionNumber(1-based): selectedAnswer(1~4) }

  // 타이머 (절대 시간 기반 — 탭 전환 무관)
  startTime: null,           // Date.now() 시작 시각
  timeLimit: null,           // 파트별 제한 시간 (초)

  // 진행 상태
  currentPart:    null,      // 'part1' | 'part2'
  part1Completed: false,
  part1Score:     null,      // calculateScore 결과 객체
  part2Completed: false,
  part2Scores:    null,      // calculateScore 결과 객체
  isComplete:     false,

  // 로딩 (generateQuestions 비동기)
  isLoading: false,
  loadError: null,           // 'LOGIN_REQUIRED' | 'INSUFFICIENT_DATA' | 'LOAD_ERROR'
}

// ─────────────────────────────────────────────────────────────────────────────
// 스토어
// ─────────────────────────────────────────────────────────────────────────────

export const useCustomMockStore = create((set, get) => ({
  ...INITIAL,

  // ── 세션 시작 (문제 생성 → 상태 초기화) ────────────────────────────────────

  /**
   * 새 맞춤 모의고사 세션 시작
   *
   * @param {string} mode      - 'standard' | 'weakness'
   * @param {string} timerType - 'full' | 'short'
   * @param {string} userId    - Supabase user UUID
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  startSession: async (mode, timerType, userId) => {
    set({ isLoading: true, loadError: null })

    // 1. 문제 생성
    const { success, questions: allQ, weakSubjects, error } =
      await generateQuestions(mode, userId)

    if (!success) {
      set({ isLoading: false, loadError: error })
      return { success: false, error }
    }

    // 2. 로컬 세션 ID (타임스탬프 기반)
    const sessionLocalId = `custom_${Date.now()}`

    // 3. 1교시 준비 (법령 = allQ[0~39])
    const part1Qs  = allQ.slice(0, 40)
    const timeLimit = customMockConfig.timers[timerType].part1

    // 4. 상태 갱신 (먼저 set — localStorage 직렬화 위해)
    const nextState = {
      ...INITIAL,
      sessionLocalId,
      supabaseSessionId: null,   // Supabase는 아래서 비동기 설정
      mode,
      timerType,
      weakSubjects,
      allQuestions:  allQ,
      questions:     part1Qs,
      currentIndex:  0,
      answers:       {},
      startTime:     Date.now(),
      timeLimit,
      currentPart:   'part1',
      isLoading:     false,
    }
    set(nextState)

    // 5. 세션 메타 localStorage 저장
    persistSession(nextState)

    // 6. Supabase 세션 생성 (fire-and-forget)
    if (userId) {
      customMockSupabase
        .createSession(userId, mode, timerType, {
          weakSubjects,
          questionIds: allQ.map(q => q.id),
        })
        .then(sid => {
          if (sid) set({ supabaseSessionId: sid })
        })
        .catch(() => {})
    }

    return { success: true }
  },

  // ── 이어하기 (localStorage에서 진행 상태 복원) ──────────────────────────────

  /**
   * 저장된 세션 + 진행 상태로 복원
   *
   * @param {Object} sessionMeta  - loadPersistedSession() 결과
   * @param {string} part         - 'part1' | 'part2'
   * @param {Object} savedAnswers - { questionNumber: answer }
   * @param {number} savedIndex   - 복원할 currentIndex
   * @param {number} elapsedTime  - 경과 초 (절대 시간 재계산에 사용)
   */
  resumeSession: (sessionMeta, part, savedAnswers, savedIndex, elapsedTime) => {
    const { sessionLocalId, supabaseSessionId, mode, timerType, weakSubjects, allQuestions } =
      sessionMeta

    const questions = part === 'part1'
      ? allQuestions.slice(0, 40)
      : allQuestions.slice(40)

    const timeLimit = customMockConfig.timers[timerType][part]

    // 절대 시간 재계산 (경과 시간만큼 과거로 되돌림)
    const startTime = Date.now() - elapsedTime * 1000

    set({
      sessionLocalId,
      supabaseSessionId: supabaseSessionId ?? null,
      mode,
      timerType,
      weakSubjects:  weakSubjects ?? [],
      allQuestions,
      questions,
      currentIndex:  savedIndex,
      answers:       savedAnswers,
      startTime,
      timeLimit,
      currentPart:   part,
      part1Completed: part === 'part2',
      isLoading:      false,
      loadError:      null,
    })
  },

  // ── 답안 선택 ─────────────────────────────────────────────────────────────

  /**
   * @param {number} questionNumber - 1-based
   * @param {number} answer         - 1~4
   */
  selectAnswer: (questionNumber, answer) => {
    set(state => ({
      answers: { ...state.answers, [questionNumber]: answer },
    }))
  },

  // ── 문제 이동 ─────────────────────────────────────────────────────────────

  nextQuestion: () => {
    set(state => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    }))
  },

  prevQuestion: () => {
    set(state => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    }))
  },

  goToQuestion: (index) => {
    set({ currentIndex: index })
  },

  // ── 자동 저장 ─────────────────────────────────────────────────────────────

  saveProgress: () => {
    const state = get()
    if (!state.sessionLocalId || !state.currentPart) return
    saveProgress(state.sessionLocalId, state.currentPart, state)
  },

  // ── 타이머 (절대 시간 기반) ───────────────────────────────────────────────

  /** 경과 시간 (초) */
  getElapsedTime: () => {
    const { startTime } = get()
    if (!startTime) return 0
    return Math.floor((Date.now() - startTime) / 1000)
  },

  /** 남은 시간 (초) */
  getRemainingTime: () => {
    const { timeLimit } = get()
    const elapsed = get().getElapsedTime()
    return Math.max(0, timeLimit - elapsed)
  },

  /** 타임아웃 여부 */
  isTimeout: () => get().getRemainingTime() <= 0,

  /** 미응답 문제 번호 목록 (1-based) */
  getUnansweredQuestions: () => {
    const { questions, answers } = get()
    return questions
      .map((_, idx) => idx + 1)
      .filter(num => answers[num] == null)
  },

  // ── 1교시 제출 ────────────────────────────────────────────────────────────

  /**
   * 1교시 채점 + 저장 → 2교시 전환
   *
   * @param {string|null} userId
   * @returns {{ scores: Object, elapsedTime: number }}
   */
  submitPart1: (userId) => {
    const state = get()
    const scores      = calculateScore(state.answers, state.questions)
    const elapsedTime = state.getElapsedTime()

    // 결과 localStorage 저장 (즉시)
    saveResult(state.sessionLocalId, 'part1', { scores, elapsedTime })

    // 진행 데이터 클리어
    clearProgress(state.sessionLocalId, 'part1')

    // Supabase fire-and-forget
    if (userId && state.supabaseSessionId) {
      const { supabaseSessionId, answers, questions } = state
      customMockSupabase
        .saveSession(userId, supabaseSessionId, 'part1', scores, elapsedTime)
        .then(() =>
          customMockSupabase.saveAttempts(userId, supabaseSessionId, answers, questions)
        )
        .catch(() => {})
    }

    // 2교시 전환 — 손보1부+손보2부 (allQuestions[40~119])
    const part2Qs  = state.allQuestions.slice(40)
    const timeLimit = customMockConfig.timers[state.timerType].part2

    set({
      part1Completed: true,
      part1Score:     scores,
      currentPart:    'part2',
      questions:      part2Qs,
      currentIndex:   0,
      answers:        {},
      startTime:      Date.now(),
      timeLimit,
    })

    return { scores, elapsedTime }
  },

  // ── 2교시 제출 (최종) ─────────────────────────────────────────────────────

  /**
   * 2교시 채점 + 저장 → 완료 상태
   *
   * @param {string|null} userId
   * @returns {{ scores: Object, elapsedTime: number }}
   */
  submitPart2: (userId) => {
    const state = get()
    const scores      = calculateScore(state.answers, state.questions)
    const elapsedTime = state.getElapsedTime()

    // 결과 localStorage 저장 (즉시)
    saveResult(state.sessionLocalId, 'part2', { scores, elapsedTime })

    // 진행 데이터 클리어
    clearProgress(state.sessionLocalId, 'part2')

    // Supabase fire-and-forget
    if (userId && state.supabaseSessionId) {
      const { supabaseSessionId, answers, questions } = state
      customMockSupabase
        .saveSession(userId, supabaseSessionId, 'part2', scores, elapsedTime)
        .then(() =>
          customMockSupabase.saveAttempts(userId, supabaseSessionId, answers, questions)
        )
        .catch(() => {})
    }

    set({
      part2Completed: true,
      part2Scores:    scores,
      isComplete:     true,
      currentPart:    null,
      questions:      [],
      answers:        {},
      currentIndex:   0,
      startTime:      null,
      timeLimit:      null,
    })

    return { scores, elapsedTime }
  },

  // ── 전체 초기화 ───────────────────────────────────────────────────────────

  reset: () => {
    // 활성 세션 메타 클리어
    try { localStorage.removeItem(CUSTOM_SESSION_LS_KEY) } catch (_) {}
    set({ ...INITIAL })
  },
}))

export default useCustomMockStore

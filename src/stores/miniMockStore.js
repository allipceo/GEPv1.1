// src/stores/miniMockStore.js
// GEPv30-109 STEP 4 — 간이 모의고사 전용 Zustand 스토어
// 기존 mockExamStore / customMockStore와 완전 독립. localStorage 전용 진행상황 저장.

import { create } from 'zustand'

const MINI_PROGRESS_KEY = (setId) => `gep_mini_progress_${setId}`
const MINI_RESULT_KEY   = (setId) => `gep_mini_result_${setId}`

const INITIAL = {
  setId:        null,   // 1~30
  questions:    [],     // 30문제 배열
  answers:      {},     // { questionIndex(0-based): selectedAnswer(1-4) | null }
  currentIndex: 0,
  startTime:    null,
  elapsedTime:  0,       // 나가기 시 저장된 경과 시간(초)
  isComplete:   false,
}

const useMiniMockStore = create((set, get) => ({
  ...INITIAL,

  // 세션 시작 (신규 또는 이어하기)
  startSet: (setId, questions, resumeData = null) => {
    if (resumeData) {
      set({
        setId, questions,
        answers:      resumeData.answers ?? {},
        currentIndex: resumeData.currentIndex ?? 0,
        elapsedTime:  resumeData.elapsedTime ?? 0,
        startTime:    Date.now(),
        isComplete:   false,
      })
    } else {
      set({ ...INITIAL, setId, questions, startTime: Date.now() })
    }
  },

  setAnswer: (index, answer) => set(s => ({
    answers: { ...s.answers, [index]: answer }
  })),

  setIndex: (index) => set({ currentIndex: index }),

  // 나가기 시 progress 저장
  saveProgress: () => {
    const s = get()
    if (!s.setId || !s.startTime) return
    const elapsed = s.elapsedTime + Math.floor((Date.now() - s.startTime) / 1000)
    try {
      localStorage.setItem(MINI_PROGRESS_KEY(s.setId), JSON.stringify({
        answers:      s.answers,
        currentIndex: s.currentIndex,
        elapsedTime:  elapsed,
      }))
    } catch (_) {}
  },

  loadProgress: (setId) => {
    try {
      return JSON.parse(localStorage.getItem(MINI_PROGRESS_KEY(setId)) || 'null')
    } catch {
      return null
    }
  },

  saveResult: (setId, result) => {
    try {
      localStorage.setItem(MINI_RESULT_KEY(setId), JSON.stringify(result))
    } catch (_) {}
  },

  loadResult: (setId) => {
    try {
      return JSON.parse(localStorage.getItem(MINI_RESULT_KEY(setId)) || 'null')
    } catch {
      return null
    }
  },

  clearProgress: (setId) => {
    try { localStorage.removeItem(MINI_PROGRESS_KEY(setId)) } catch (_) {}
  },

  reset: () => set(INITIAL),

  // 남은 시간 계산 (초, 절대 시간 기반)
  getRemainingTime: () => {
    const s = get()
    if (!s.startTime) return 2400
    const elapsed = s.elapsedTime + Math.floor((Date.now() - s.startTime) / 1000)
    return Math.max(0, 2400 - elapsed)
  },
}))

export { MINI_PROGRESS_KEY, MINI_RESULT_KEY }
export default useMiniMockStore

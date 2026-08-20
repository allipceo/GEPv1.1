// src/stores/miniMockStore.js
// GEPv30-109 STEP 4 — 간이 모의고사 전용 Zustand 스토어
// 기존 mockExamStore / customMockStore와 완전 독립.
//
// 2026-08-20: localStorage 전용이라 기기를 바꾸면 진행상황이 사라지던 문제를
// genericProgressService(progress.state_json)로 보완 — 로컬은 그대로 즉시
// 저장(빠름), 동시에 Supabase에도 fire-and-forget 저장해 기기 간에도 이어풀기가
// 가능하게 한다(GEPv30-141 §4-3, GEPv30-145).

import { create } from 'zustand'
import { useAuthStore } from './authStore'
import { genericProgressService } from '../services/genericProgressService'

const MINI_PROGRESS_KEY = (setId) => `gep_mini_progress_${setId}`
const MINI_RESULT_KEY   = (setId) => `gep_mini_result_${setId}`
const filterKey = (setId) => `mini:${setId}`

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

  // 나가기 시 progress 저장 — 로컬 즉시 저장 + Supabase fire-and-forget
  saveProgress: () => {
    const s = get()
    if (!s.setId || !s.startTime) return
    const elapsed = s.elapsedTime + Math.floor((Date.now() - s.startTime) / 1000)
    const payload = {
      answers:      s.answers,
      currentIndex: s.currentIndex,
      elapsedTime:  elapsed,
      savedAt:      Date.now(),
    }
    try {
      localStorage.setItem(MINI_PROGRESS_KEY(s.setId), JSON.stringify(payload))
    } catch (_) {}

    const authState = useAuthStore.getState()
    genericProgressService.saveState(authState, filterKey(s.setId), payload).catch(() => {})
  },

  /**
   * 로컬/DB 중 더 최신 저장분을 반환(savedAt 비교) — 기기를 바꿔도 DB에 저장된
   * 진행상황을 이어받을 수 있다.
   * @returns {Promise<{answers, currentIndex, elapsedTime}|null>}
   */
  loadProgress: async (setId) => {
    let local = null
    try {
      local = JSON.parse(localStorage.getItem(MINI_PROGRESS_KEY(setId)) || 'null')
    } catch { local = null }

    const authState = useAuthStore.getState()
    const remote = await genericProgressService.loadState(authState, filterKey(setId)).catch(() => null)

    if (!remote?.state) return local
    if (!local) return remote.state

    const localSavedAt  = local.savedAt ?? 0
    const remoteSavedAt = remote.state.savedAt ?? new Date(remote.updatedAt).getTime()
    return remoteSavedAt > localSavedAt ? remote.state : local
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
    const authState = useAuthStore.getState()
    genericProgressService.clearState(authState, filterKey(setId)).catch(() => {})
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

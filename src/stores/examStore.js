import { create } from 'zustand'
import { loadExams } from '../utils/loadExams'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { canCountAttempts } from '../services/countingEligibility'

const STORAGE_KEY = 'gep:v1:examStore'
const ALL_ROUNDS = '전체'

function makeProgressKey(round, subject, subSubject = null) {
  return subSubject ? `${round}_${subject}_${subSubject}` : `${round}_${subject}`
}

function makeServiceBKey(subject, subSubject = null) {
  return subSubject ? `service_b_${subject}_${subSubject}` : `service_b_${subject}_ALL`
}

function makeModeProgressKey(state) {
  if (state.studyMode === 'service_a_sequence') return `service_a_${state.selectedRound}`
  if (state.studyMode === 'service_b_subject_random') {
    return makeServiceBKey(state.selectedSubject, state.selectedSubSubject)
  }
  return makeProgressKey(state.selectedRound, state.selectedSubject, state.selectedSubSubject)
}

function shuffleIds(items) {
  const ids = items.map((item) => item.id)
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

export const selectFilteredQuestions = (state) => {
  const filtered = state.questions.filter((q) => {
    if (state.studyMode === 'service_a_sequence') return q.round === state.selectedRound
    if (q.subject !== state.selectedSubject) return false
    if (state.selectedRound !== ALL_ROUNDS && q.round !== state.selectedRound) return false
    if (state.selectedSubSubject && q.subSubject !== state.selectedSubSubject) return false
    return true
  })

  if (state.studyMode === 'service_a_sequence') {
    return filtered.sort((a, b) => {
      const partA = Number(a.partNumber ?? a.roundNumber ?? 0)
      const partB = Number(b.partNumber ?? b.roundNumber ?? 0)
      if (partA !== partB) return partA - partB
      return String(a.id).localeCompare(String(b.id))
    })
  }

  if (
    state.studyMode === 'service_b_subject_random' &&
    Array.isArray(state.questionOrder) &&
    state.questionOrder.length > 0
  ) {
    return filtered.sort((a, b) => {
      const indexA = state.questionOrder.indexOf(a.id)
      const indexB = state.questionOrder.indexOf(b.id)
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }

  return filtered
}

function saveToStorage(state) {
  try {
    const payload = {
      meta: {
        version: state._examsMeta?.version ?? null,
        totalCount: state._examsMeta?.totalCount ?? null,
      },
      answers: state.answers,
      currentIndex: state.currentIndex,
      selectedSubject: state.selectedSubject,
      selectedRound: state.selectedRound,
      selectedSubSubject: state.selectedSubSubject,
      studyMode: state.studyMode,
      questionOrder: state.questionOrder,
      progressMap: state.progressMap,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (_) {}
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (_) {}
}

const useExamStore = create((set, get) => ({
  questions: [],
  currentIndex: 0,
  selectedSubject: '법령',
  selectedRound: 23,
  selectedSubSubject: null,
  studyMode: 'service_b_subject_random',
  questionOrder: [],
  answers: {},
  progressMap: {},
  isLoading: false,
  isReady: false,
  error: null,
  _examsMeta: null,

  loadQuestions: async () => {
    set({ isLoading: true, error: null })
    try {
      const exams = await loadExams()
      const { version, totalCount, questions } = exams

      let restored = {
        answers: {},
        currentIndex: 0,
        selectedSubject: '법령',
        selectedRound: 23,
        selectedSubSubject: null,
        studyMode: 'service_b_subject_random',
        questionOrder: [],
        progressMap: {},
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const saved = JSON.parse(raw)
          if (saved.meta?.version === version && saved.meta?.totalCount === totalCount) {
            restored = {
              answers: saved.answers ?? {},
              currentIndex: saved.currentIndex ?? 0,
              selectedSubject: saved.selectedSubject ?? '법령',
              selectedRound: saved.selectedRound ?? 23,
              selectedSubSubject: saved.selectedSubSubject ?? null,
              studyMode: saved.studyMode ?? 'service_b_subject_random',
              questionOrder: saved.questionOrder ?? [],
              progressMap: saved.progressMap ?? {},
            }
          } else {
            clearStorage()
          }
        }
      } catch (_) {
        clearStorage()
      }

      const tempState = { questions, ...restored }
      const filtered = selectFilteredQuestions(tempState)
      const clampedIndex =
        filtered.length === 0 ? 0 : Math.min(restored.currentIndex, filtered.length - 1)

      set({
        questions,
        ...restored,
        currentIndex: clampedIndex,
        isLoading: false,
        isReady: true,
        _examsMeta: { version, totalCount },
      })
    } catch (err) {
      set({ isLoading: false, error: err.message })
    }
  },

  setStudyMode: (studyMode) => {
    set({ studyMode })
    saveToStorage(get())
  },

  startServiceA: (round) => {
    const state = get()
    const key = `service_a_${round}`
    const savedIndex = state.progressMap[key] ?? 0
    set({
      studyMode: 'service_a_sequence',
      selectedRound: round,
      selectedSubject: null,
      selectedSubSubject: null,
      currentIndex: savedIndex,
      questionOrder: [],
    })
    saveToStorage(get())
  },

  startServiceB: (subject, subSubject = null, options = {}) => {
    const state = get()
    const key = makeServiceBKey(subject, subSubject)
    const savedIndex = options.restart ? 0 : state.progressMap[key] ?? 0
    const pool = state.questions.filter((q) => {
      if (q.subject !== subject) return false
      if (subSubject && q.subSubject !== subSubject) return false
      return true
    })

    const existingOrder = Array.isArray(state.questionOrder) ? state.questionOrder : []
    const orderMatchesPool =
      !options.restart &&
      existingOrder.length === pool.length &&
      pool.every((q) => existingOrder.includes(q.id))

    set({
      studyMode: 'service_b_subject_random',
      selectedRound: ALL_ROUNDS,
      selectedSubject: subject,
      selectedSubSubject: subSubject,
      currentIndex: savedIndex,
      questionOrder: orderMatchesPool ? existingOrder : shuffleIds(pool),
      progressMap: options.restart ? { ...state.progressMap, [key]: 0 } : state.progressMap,
    })
    saveToStorage(get())
  },

  setSubject: (subject) => {
    const state = get()
    const key = makeProgressKey(state.selectedRound, subject)
    const savedIndex = state.progressMap[key] ?? 0
    set({
      studyMode: 'service_b_subject_random',
      selectedSubject: subject,
      currentIndex: savedIndex,
    })
    saveToStorage(get())
  },

  setRound: (round) => {
    const state = get()
    const key = makeProgressKey(round, state.selectedSubject)
    const savedIndex = state.progressMap[key] ?? 0
    set({ selectedRound: round, currentIndex: savedIndex })
    saveToStorage(get())
  },

  setSubSubject: (sub) => {
    const state = get()
    const key = makeProgressKey(state.selectedRound, state.selectedSubject, sub)
    const savedIndex = sub ? state.progressMap[key] ?? 0 : 0
    set({ selectedSubSubject: sub, currentIndex: savedIndex })
    saveToStorage(get())
  },

  setCurrentIndex: (n) => {
    const state = get()
    const filtered = selectFilteredQuestions(state)
    const clamped = Math.max(0, Math.min(n, filtered.length - 1))
    const key = makeModeProgressKey(state)
    const newProgressMap = { ...state.progressMap, [key]: clamped }
    set({ currentIndex: clamped, progressMap: newProgressMap })
    saveToStorage(get())

    const auth = useAuthStore.getState()
    if (canCountAttempts(auth)) {
      supabase
        .from('progress')
        .upsert(
          {
            user_id: auth.userId,
            filter_key: key,
            current_index: clamped,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'user_id,filter_key' }
        )
        .then(({ error }) => {
          if (error) console.warn('[GEP] progress sync failed:', error.message)
        })
        .catch(() => {})
    }
  },

  resumeProgress: () => {
    const state = get()
    const key = makeModeProgressKey(state)
    const savedIndex = state.progressMap[key] ?? state.currentIndex
    set({ currentIndex: savedIndex })
  },

  saveAnswer: (questionId, answer) => {
    if (answer < 1 || answer > 4) return
    const newAnswers = { ...get().answers, [questionId]: answer }
    set({ answers: newAnswers })
    saveToStorage(get())
  },
}))

export default useExamStore

/**
 * src/stores/statsStore.js
 * Zustand 통계 스토어
 *
 * statsStorage.js를 통해 localStorage 'gep_stats_v1'에 저장/복원.
 * examStore.js와 완전히 분리된 독립 스토어.
 *
 * 스키마 v1.0 (statsStorage.js 참조):
 * { version, total:{solved,correct}, daily:{}, bySubject:{}, byRound:{} }
 */

import { create } from 'zustand'
import { loadStats, saveStats, clearStats, todayKey } from '../utils/statsStorage.js'
import { supabase } from '../lib/supabase'

const useStatsStore = create((set, get) => ({
  // 상태: statsStorage 스키마와 동일 구조 (앱 시작 시 localStorage 복원)
  stats: loadStats(),
  statsUserId: null,

  bindUser: (userId = null) => {
    const nextUserId = userId ?? null
    if (get().statsUserId === nextUserId) return
    set({
      statsUserId: nextUserId,
      stats: loadStats(nextUserId),
    })
  },

  /**
   * 문제 풀이 결과 반영 — total / daily / bySubject / byRound 모두 누적
   * @param {{ subject: string, round: number, solved: number, correct: number }} param
   *   subject : 과목명 ('법령' | '손보1부' | '손보2부')
   *   round   : 회차 번호 (예: 23)
   *   solved  : 이번 세션 풀이 수
   *   correct : 이번 세션 정답 수
   */
  updateStats: ({ subject, round, solved, correct }) => {
    const state   = get()
    const prev    = state.stats
    const today   = todayKey()

    const prevDay   = prev.daily[today]        ?? { solved: 0, correct: 0 }
    const prevSubj  = prev.bySubject[subject]  ?? { solved: 0, correct: 0 }
    const prevRound = prev.byRound[round]      ?? { solved: 0, correct: 0 }

    const newStats = {
      ...prev,
      total: {
        solved:  prev.total.solved  + solved,
        correct: prev.total.correct + correct,
      },
      daily: {
        ...prev.daily,
        [today]: {
          solved:  prevDay.solved  + solved,
          correct: prevDay.correct + correct,
        },
      },
      bySubject: {
        ...prev.bySubject,
        [subject]: {
          solved:  prevSubj.solved  + solved,
          correct: prevSubj.correct + correct,
        },
      },
      byRound: {
        ...prev.byRound,
        [round]: {
          solved:  prevRound.solved  + solved,
          correct: prevRound.correct + correct,
        },
      },
    }

    set({ stats: newStats })
    saveStats(newStats, state.statsUserId)
  },

  /** 통계 초기화 — localStorage 삭제 후 기본값으로 복원 */
  resetStats: () => {
    const userId = get().statsUserId
    clearStats(userId)
    set({ stats: loadStats(userId) })
  },

  /** 오늘 날짜 통계 반환 (미존재 시 { solved: 0, correct: 0 }) */
  getTodayStats: () => {
    return get().stats.daily[todayKey()] ?? { solved: 0, correct: 0 }
  },

  /**
   * Supabase DB의 attempts 테이블에서 통계를 집계하여 localStorage와 병합.
   * 로그인 시 호출 → localStorage가 초기화되어도 DB 기록으로 복원 가능.
   * 병합 기준: 각 항목에서 DB값과 localStorage값 중 더 큰 값 사용.
   * daily 통계는 타임스탬프 없으므로 복원 제외 (오늘 이후 풀이만 기록).
   */
  syncFromDB: async (userId) => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('attempts')
        .select('sub_subject, is_correct, question_round')
        .eq('user_id', userId)
        .neq('study_mode', 'ox')  // OX 풀이는 별도 카운터(oxTotal) — 선택형 통계에서 제외

      if (error) {
        console.warn('[GEP] syncFromDB query failed:', error.message)
        return
      }
      if (!data || data.length === 0) return

      // DB 데이터 집계
      const dbBySubject = {}
      const dbByRound = {}
      let dbTotalSolved = 0
      let dbTotalCorrect = 0

      data.forEach(({ sub_subject, is_correct, question_round }) => {
        if (sub_subject) {
          dbBySubject[sub_subject] = dbBySubject[sub_subject] ?? { solved: 0, correct: 0 }
          dbBySubject[sub_subject].solved += 1
          if (is_correct) dbBySubject[sub_subject].correct += 1
        }
        if (question_round) {
          dbByRound[question_round] = dbByRound[question_round] ?? { solved: 0, correct: 0 }
          dbByRound[question_round].solved += 1
          if (is_correct) dbByRound[question_round].correct += 1
        }
        dbTotalSolved += 1
        if (is_correct) dbTotalCorrect += 1
      })

      // localStorage 현재값과 병합 (더 큰 값 우선 — DB가 항상 최신 원장)
      const prev = get().stats

      const mergedBySubject = { ...prev.bySubject }
      Object.entries(dbBySubject).forEach(([key, dbVal]) => {
        const prevVal = mergedBySubject[key] ?? { solved: 0, correct: 0 }
        mergedBySubject[key] = {
          solved:  Math.max(prevVal.solved,  dbVal.solved),
          correct: Math.max(prevVal.correct, dbVal.correct),
        }
      })

      const mergedByRound = { ...prev.byRound }
      Object.entries(dbByRound).forEach(([key, dbVal]) => {
        const prevVal = mergedByRound[key] ?? { solved: 0, correct: 0 }
        mergedByRound[key] = {
          solved:  Math.max(prevVal.solved,  dbVal.solved),
          correct: Math.max(prevVal.correct, dbVal.correct),
        }
      })

      const newStats = {
        ...prev,
        total: {
          solved:  Math.max(prev.total.solved,  dbTotalSolved),
          correct: Math.max(prev.total.correct, dbTotalCorrect),
        },
        bySubject: mergedBySubject,
        byRound:   mergedByRound,
      }

      set({ stats: newStats })
      saveStats(newStats, userId)
      console.log('[GEP] syncFromDB 완료 — DB 풀이수:', dbTotalSolved)
    } catch (err) {
      console.warn('[GEP] syncFromDB 예외:', err.message)
    }
  },
}))

export default useStatsStore

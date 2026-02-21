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

const useStatsStore = create((set, get) => ({
  // 상태: statsStorage 스키마와 동일 구조 (앱 시작 시 localStorage 복원)
  stats: loadStats(),

  /**
   * 문제 풀이 결과 반영 — total / daily / bySubject / byRound 모두 누적
   * @param {{ subject: string, round: number, solved: number, correct: number }} param
   *   subject : 과목명 ('법령' | '손보1부' | '손보2부')
   *   round   : 회차 번호 (예: 23)
   *   solved  : 이번 세션 풀이 수
   *   correct : 이번 세션 정답 수
   */
  updateStats: ({ subject, round, solved, correct }) => {
    const prev    = get().stats
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
    saveStats(newStats)
  },

  /** 통계 초기화 — localStorage 삭제 후 기본값으로 복원 */
  resetStats: () => {
    clearStats()
    set({ stats: loadStats() })
  },

  /** 오늘 날짜 통계 반환 (미존재 시 { solved: 0, correct: 0 }) */
  getTodayStats: () => {
    return get().stats.daily[todayKey()] ?? { solved: 0, correct: 0 }
  },
}))

export default useStatsStore

/**
 * src/services/genericProgressService.js
 * 범용 진행상태(state_json) Supabase 동기화 — progress 테이블 재사용
 *
 * examStore(MCQ)/oxStore(OX)는 current_index 하나로 충분하지만, 미니/맞춤
 * 모의고사는 answers(문항별 응답)·currentIndex·elapsedTime까지 함께 저장해야
 * 이어풀기가 가능하다. progress 테이블에 jsonb 컬럼(state_json)을 추가해
 * 임의의 상태 객체를 filter_key 기준으로 upsert/조회한다.
 *
 * 지금까지 미니/맞춤 모의고사는 localStorage 전용이라 기기를 바꾸거나
 * 브라우저 데이터를 지우면 진행 중이던 세션이 통째로 사라졌다
 * (GEPv30-141 통찰보고서 §4-3). saveState/loadState를 로컬 저장과 함께
 * 호출하면 이 위험을 없앨 수 있다.
 *
 * updatedAt(state에 포함된 클라이언트 타임스탬프)을 기준으로 로컬/DB 중
 * 더 최신 쪽을 신뢰하는 것은 호출부(각 store)의 책임 — 이 서비스는 단순
 * upsert/조회만 담당한다.
 */

import { supabase } from '../lib/supabase'
import { canCountAttempts } from './countingEligibility'

export const genericProgressService = {
  /**
   * @param {object} authState
   * @param {string} filterKey  - 예: 'mini:12', 'custom:{supabaseSessionId}:part1'
   * @param {object} state      - 임의의 JSON 직렬화 가능 상태 객체
   */
  saveState: async (authState, filterKey, state) => {
    if (!canCountAttempts(authState)) return
    const { error } = await supabase
      .from('progress')
      .upsert(
        {
          user_id:      authState.userId,
          filter_key:   filterKey,
          state_json:   state,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id,filter_key' }
      )

    if (error) {
      console.warn('[genericProgressService] saveState 실패:', error.message)
    }
  },

  /**
   * @param {object} authState
   * @param {string} filterKey
   * @returns {Promise<{ state: object, updatedAt: string }|null>}
   */
  loadState: async (authState, filterKey) => {
    if (!canCountAttempts(authState)) return null

    const { data, error } = await supabase
      .from('progress')
      .select('state_json, last_updated')
      .eq('user_id', authState.userId)
      .eq('filter_key', filterKey)
      .single()

    if (error || !data?.state_json) return null
    return { state: data.state_json, updatedAt: data.last_updated }
  },

  /**
   * @param {object} authState
   * @param {string} filterKey
   */
  clearState: async (authState, filterKey) => {
    if (!canCountAttempts(authState)) return
    const { error } = await supabase
      .from('progress')
      .delete()
      .eq('user_id', authState.userId)
      .eq('filter_key', filterKey)

    if (error) {
      console.warn('[genericProgressService] clearState 실패:', error.message)
    }
  },
}

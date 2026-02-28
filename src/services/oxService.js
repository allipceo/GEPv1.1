/**
 * src/services/oxService.js
 * OX 퀴즈 Supabase 연동 서비스
 *
 * recordAttempt: attempts INSERT + upsert_question_stat RPC
 *   - selected_answer: O→1, X→2 (INTEGER 1~4 제약 대응)
 *   - study_mode: 'ox' (일반 시험과 구분)
 *   - userId null(게스트)이면 스킵
 *
 * saveProgress: progress 테이블 upsert
 *   - filter_key: 'ox:{subject}:{subSubject}'
 *   - current_index: roundNo
 *
 * loadProgress: progress 테이블 조회
 *   - Returns { roundNo } or null
 */

import { supabase } from '../lib/supabase'

export const oxService = {
  /**
   * @param {string|null} userId    - auth.uid() / null(게스트)
   * @param {string}      oxId      - ox_id (문제 고유 ID)
   * @param {boolean}     isCorrect
   * @param {{ answer: 'O'|'X', round: number, subject: string, subSubject: string }} ctx
   */
  recordAttempt: async (userId, oxId, isCorrect, ctx = {}) => {
    if (!userId) return

    const { answer, round, subject, subSubject } = ctx
    const selectedAnswer = answer === 'O' ? 1 : 2

    const [attemptRes, rpcRes] = await Promise.all([
      supabase.from('attempts').insert({
        user_id:         userId,
        question_id:     oxId,
        question_round:  round   ?? 0,
        subject:         subject ?? '',
        sub_subject:     subSubject ?? '',
        study_mode:      'ox',
        selected_answer: selectedAnswer,
        is_correct:      isCorrect,
        exam_version:    '1.0',
        service_level:   3,
      }),
      supabase.rpc('upsert_question_stat', {
        p_question_id: oxId,
        p_is_correct:  isCorrect,
      }),
    ])

    if (attemptRes.error) {
      console.warn('[oxService] attempts INSERT 실패:', attemptRes.error.message)
    }
    if (rpcRes.error) {
      console.warn('[oxService] upsert_question_stat 실패:', rpcRes.error.message)
    }
  },

  /**
   * @param {string|null} userId
   * @param {string}      subject
   * @param {string}      subSubject
   * @param {{ roundNo: number, totalCumulative: number, wrongCount: number }} data
   */
  saveProgress: async (userId, subject, subSubject, data) => {
    if (!userId) return

    const { error } = await supabase
      .from('progress')
      .upsert(
        {
          user_id:       userId,
          filter_key:    `ox:${subject}:${subSubject}`,
          current_index: data.roundNo ?? 1,
          last_updated:  new Date().toISOString(),
        },
        { onConflict: 'user_id,filter_key' }
      )

    if (error) {
      console.warn('[oxService] saveProgress 실패:', error.message)
    }
  },

  /**
   * @param {string|null} userId
   * @param {string}      subject
   * @param {string}      subSubject
   * @returns {Promise<{ roundNo: number }|null>}
   */
  loadProgress: async (userId, subject, subSubject) => {
    if (!userId) return null

    const { data, error } = await supabase
      .from('progress')
      .select('current_index')
      .eq('user_id', userId)
      .eq('filter_key', `ox:${subject}:${subSubject}`)
      .single()

    if (error || !data) return null
    return { roundNo: data.current_index }
  },
}

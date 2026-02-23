/**
 * src/services/statsService.js
 * 통계 기록 어댑터 — 게스트/회원 분기
 *
 * 게스트:    로컬 statsStore만 업데이트
 * 회원(Lv2+): 로컬 statsStore + Supabase attempts 테이블 동시 저장
 *
 * 네트워크 실패 시 앱 중단 없음 (try/catch 보장)
 */

import { supabase } from '../lib/supabase'
import { FEATURE_FLAGS, canUseFeature } from '../config/featureFlags'

/**
 * 통계 기록 — 게스트/회원 분기
 * @param {object} statsStore - Zustand statsStore 인스턴스 (updateStats 포함)
 * @param {object} authState  - { authStatus, serviceLevel }
 * @param {object} payload    - { question, selectedAnswer, isCorrect, studyMode }
 */
export const recordAttempt = async (statsStore, authState, payload) => {
  const { question, selectedAnswer, isCorrect, studyMode = 'round' } = payload
  const { authStatus, serviceLevel = 1 } = authState

  // 1. 항상 로컬 statsStore 업데이트 (게스트/회원 공통)
  const safeRound = Number.isInteger(question.round) ? question.round : null
  if (safeRound) {
    statsStore.updateStats({
      subject: question.subSubject,
      round:   safeRound,
      solved:  1,
      correct: isCorrect ? 1 : 0,
    })
  }

  // 2. 회원 + 레벨 충족 시 Supabase 저장
  if (authStatus !== 'authenticated') return
  if (!canUseFeature(serviceLevel, FEATURE_FLAGS.STATS_MIN_LEVEL)) return
  if (!safeRound) return

  const { userId } = authState
  if (!userId) return

  try {
    // attempts 원장 INSERT
    const { error } = await supabase.from('attempts').insert({
      user_id:         userId,
      question_id:     question.id,
      question_round:  safeRound,
      subject:         question.subject,
      sub_subject:     question.subSubject,
      study_mode:      studyMode,
      selected_answer: selectedAnswer,
      is_correct:      isCorrect,
      exam_version:    '1.0',
      service_level:   serviceLevel,
    })

    if (error) {
      console.warn('[GEP] attempts insert 실패:', error.message)
      return
    }

    // question_stats 집계 캐시 UPSERT (RPC — 원자적 증가)
    const { error: statsErr } = await supabase.rpc('upsert_question_stat', {
      p_question_id: question.id,
      p_is_correct:  isCorrect,
    })
    if (statsErr) {
      console.warn('[GEP] question_stats upsert 실패:', statsErr.message)
    }
  } catch (err) {
    console.warn('[GEP] statsService 네트워크 오류:', err.message)
  }
}

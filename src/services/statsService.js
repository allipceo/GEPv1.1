import { supabase } from '../lib/supabase'
import { canCountAttempts, getCountingBlockReason } from './countingEligibility'

export const recordAttempt = async (statsStore, authState, payload) => {
  const { question, selectedAnswer, isCorrect, studyMode = 'round' } = payload
  const { serviceLevel = 1, userId } = authState
  const safeRound = Number.isInteger(question.round) ? question.round : null

  if (!canCountAttempts(authState)) {
    return { recorded: false, reason: getCountingBlockReason(authState) }
  }

  if (!safeRound) {
    return { recorded: false, reason: 'invalid_round' }
  }

  try {
    const { error } = await supabase.from('attempts').insert({
      user_id: userId,
      question_id: question.id,
      question_round: safeRound,
      subject: question.subject,
      sub_subject: question.subSubject,
      study_mode: studyMode,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      exam_version: '1.0',
      service_level: serviceLevel,
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
    })

    if (error) {
      console.warn('[GEP] attempts insert failed:', error.message)
      return { recorded: false, reason: 'attempt_insert_failed', error }
    }

    if (typeof statsStore.bindUser === 'function') {
      statsStore.bindUser(userId)
    }

    statsStore.updateStats({
      subject: question.subSubject,
      round: safeRound,
      solved: 1,
      correct: isCorrect ? 1 : 0,
    })

    const { error: statsErr } = await supabase.rpc('upsert_question_stat', {
      p_question_id: question.id,
      p_is_correct: isCorrect,
    })

    if (statsErr) {
      console.warn('[GEP] question_stats upsert failed:', statsErr.message)
    }

    return { recorded: true }
  } catch (err) {
    console.warn('[GEP] statsService network error:', err.message)
    return { recorded: false, reason: 'network_error', error: err }
  }
}

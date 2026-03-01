/**
 * src/services/mockExamService.js
 * 모의고사 채점 로직 + 결과 저장/로드 + Supabase 연동
 * GEP_058 Phase5 STEP4 | GEP_059 Phase5 STEP5
 *
 * 게스트: localStorage만 사용
 * 회원: localStorage(즉시) + Supabase(백그라운드)
 */

import { mockExamConfig } from '../config/mockExamConfig'
import { supabase } from '../lib/supabase'

// ── localStorage 키 ───────────────────────────────────────────────────────────
export const RESULT_LS_KEY  = (round, part) => `gep:mock:result:${round}:${part}`
export const PROGRESS_LS_KEY = (round, part) => `gep:mock:${round}:${part}`

// ── 채점 ─────────────────────────────────────────────────────────────────────

/**
 * 과목별 점수 계산
 *
 * @param {Object} answers   - { questionNumber(1-based): selectedAnswer(1~4) }
 * @param {Array}  questions - 문제 배열 (0-based index, subject 필드 포함)
 * @returns {Object} { '법령': { correct, total, score }, '손보1부': {...}, '손보2부': {...} }
 *
 * 계산 규칙:
 *   - score = (correct / total) × 100  (소수점 1자리)
 *   - 미응답(null/undefined) = 오답 처리
 */
export function calculateScore(answers, questions) {
  const bySubject = {}

  questions.forEach((q, idx) => {
    const questionNum = idx + 1
    const selected    = answers[questionNum]
    const isCorrect   = selected != null && Number(selected) === Number(q.answer)

    if (!bySubject[q.subject]) {
      bySubject[q.subject] = { correct: 0, total: 0 }
    }
    bySubject[q.subject].total++
    if (isCorrect) bySubject[q.subject].correct++
  })

  const scores = {}
  for (const [subject, data] of Object.entries(bySubject)) {
    scores[subject] = {
      correct: data.correct,
      total:   data.total,
      score:   data.total > 0
        ? Math.round((data.correct / data.total) * 1000) / 10  // 소수점 1자리
        : 0,
    }
  }

  return scores
}

// ── 합격 판정 ─────────────────────────────────────────────────────────────────

/**
 * 합격/불합격 판정
 * GEP_038 기준: 과목당 40점 이상 AND 전체 평균 60점 이상
 *
 * @param {Object} allScores - { '법령': { score }, '손보1부': { score }, '손보2부': { score } }
 * @returns {boolean}
 */
export function checkPass(allScores) {
  const { passCriteria } = mockExamConfig
  const law   = allScores['법령']?.score
  const part1 = allScores['손보1부']?.score
  const part2 = allScores['손보2부']?.score

  if (law == null || part1 == null || part2 == null) return false

  const average = (law + part1 + part2) / 3

  return (
    law   >= passCriteria.minSubjectScore &&
    part1 >= passCriteria.minSubjectScore &&
    part2 >= passCriteria.minSubjectScore &&
    average >= passCriteria.minAverageScore
  )
}

/**
 * 전체 평균 점수 계산
 * @param {Object} allScores
 * @returns {number} 소수점 1자리
 */
export function calcAverage(allScores) {
  const law   = allScores['법령']?.score   ?? 0
  const part1 = allScores['손보1부']?.score ?? 0
  const part2 = allScores['손보2부']?.score ?? 0
  return Math.round(((law + part1 + part2) / 3) * 10) / 10
}

// ── 결과 저장/로드 (localStorage) ────────────────────────────────────────────

/**
 * 교시별 결과 저장
 * @param {number} round
 * @param {string} part  - 'part1' | 'part2'
 * @param {Object} data  - { scores, elapsedTime }
 */
export function saveResult(round, part, data) {
  try {
    localStorage.setItem(RESULT_LS_KEY(round, part), JSON.stringify(data))
  } catch (_) {}
}

/**
 * 교시별 결과 로드
 * @returns {{ scores, elapsedTime } | null}
 */
export function loadResult(round, part) {
  try {
    return JSON.parse(localStorage.getItem(RESULT_LS_KEY(round, part)) || 'null')
  } catch {
    return null
  }
}

// ── Supabase 연동 ─────────────────────────────────────────────────────────────

export const mockExamSupabase = {

  /**
   * 재응시 차수 계산
   * @param {string} userId
   * @param {number} round
   * @returns {Promise<number>} 다음 차수 (1부터 시작)
   */
  getAttemptNumber: async (userId, round) => {
    if (!userId) return 1
    try {
      const { data } = await supabase
        .from('mock_exam_sessions')
        .select('attempt_number')
        .eq('user_id', userId)
        .eq('round', round)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .single()
      return (data?.attempt_number ?? 0) + 1
    } catch {
      return 1
    }
  },

  /**
   * 교시 결과 세션에 저장 (upsert)
   * - part1: 미완료 세션이 있으면 UPDATE, 없으면 INSERT
   * - part2: 미완료 세션 UPDATE + 최종 결과 기록
   *
   * @param {string} userId
   * @param {number} round
   * @param {string} part - 'part1' | 'part2'
   * @param {Object} scores - calculateScore 결과
   * @param {number} elapsedTime - 초
   * @returns {Promise<string|null>} sessionId
   */
  saveSession: async (userId, round, part, scores, elapsedTime) => {
    if (!userId) return null
    try {
      // 미완료 세션 조회 (가장 최근 것)
      const { data: existing } = await supabase
        .from('mock_exam_sessions')
        .select('id, attempt_number, part1_score')
        .eq('user_id', userId)
        .eq('round', round)
        .eq('is_complete', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (part === 'part1') {
        const lawScore = scores['법령']?.score ?? 0

        if (existing) {
          await supabase
            .from('mock_exam_sessions')
            .update({
              part1_score:     lawScore,
              part1_completed: true,
              part1_time_spent: elapsedTime,
            })
            .eq('id', existing.id)
          return existing.id
        } else {
          const attemptNum = await mockExamSupabase.getAttemptNumber(userId, round)
          const { data: inserted, error } = await supabase
            .from('mock_exam_sessions')
            .insert({
              user_id:         userId,
              round,
              attempt_number:  attemptNum,
              part1_score:     lawScore,
              part1_completed: true,
              part1_time_spent: elapsedTime,
            })
            .select('id')
            .single()
          if (error) {
            console.warn('[mockExamService] part1 INSERT 실패:', error.message)
            return null
          }
          return inserted?.id ?? null
        }

      } else {
        // part2: 손보1부 + 손보2부 평균 + 최종 집계
        const p1Score = scores['손보1부']?.score ?? 0
        const p2Score = scores['손보2부']?.score ?? 0

        // 1교시 점수: 기존 세션 or localStorage fallback
        const part1DbScore = existing?.part1_score
        const part1LsResult = loadResult(round, 'part1')
        const lawScore = part1DbScore ?? part1LsResult?.scores?.['법령']?.score ?? 0

        const allScores = {
          '법령':   { score: lawScore },
          '손보1부': { score: p1Score },
          '손보2부': { score: p2Score },
        }
        const avg    = calcAverage(allScores)
        const passed = checkPass(allScores)

        if (existing) {
          await supabase
            .from('mock_exam_sessions')
            .update({
              part2_score:      Math.round(((p1Score + p2Score) / 2) * 10) / 10,
              part2_completed:  true,
              part2_time_spent: elapsedTime,
              total_average:    avg,
              is_pass:          passed,
              is_complete:      true,
            })
            .eq('id', existing.id)
          return existing.id
        } else {
          // 엣지케이스: 다른 기기에서 1교시 완료 후 이 기기에서 2교시
          const attemptNum = await mockExamSupabase.getAttemptNumber(userId, round)
          const { data: inserted, error } = await supabase
            .from('mock_exam_sessions')
            .insert({
              user_id:          userId,
              round,
              attempt_number:   attemptNum,
              part2_score:      Math.round(((p1Score + p2Score) / 2) * 10) / 10,
              part2_completed:  true,
              part2_time_spent: elapsedTime,
              total_average:    avg,
              is_pass:          passed,
              is_complete:      true,
            })
            .select('id')
            .single()
          if (error) {
            console.warn('[mockExamService] part2 INSERT 실패:', error.message)
            return null
          }
          return inserted?.id ?? null
        }
      }
    } catch (err) {
      console.warn('[mockExamService] saveSession 오류:', err.message)
      return null
    }
  },

  /**
   * 문제별 응답 원장 저장 (bulk INSERT, fire-and-forget)
   * @param {string} userId
   * @param {string} sessionId
   * @param {Object} answers   - { questionNumber(1-based): answer(1~4) }
   * @param {Array}  questions - 문제 배열
   */
  saveAttempts: async (userId, sessionId, answers, questions) => {
    if (!userId || !sessionId) return
    try {
      const rows = questions.map((q, idx) => {
        const sel = answers[idx + 1] ?? null
        return {
          session_id:      sessionId,
          user_id:         userId,
          question_id:     q.id,
          selected_answer: sel != null ? Number(sel) : null,
          is_correct:      sel != null && Number(sel) === Number(q.answer),
        }
      })
      const { error } = await supabase.from('mock_exam_attempts').insert(rows)
      if (error) console.warn('[mockExamService] saveAttempts 실패:', error.message)
    } catch (err) {
      console.warn('[mockExamService] saveAttempts 오류:', err.message)
    }
  },

  /**
   * 회차별 응시 이력 조회
   * @param {string} userId
   * @returns {Promise<Object>} { round: { isComplete, totalAverage, isPass, part1Done, progressPercent } }
   */
  getSessionHistory: async (userId) => {
    if (!userId) return {}
    try {
      const { data, error } = await supabase
        .from('mock_exam_sessions')
        .select('round, is_complete, total_average, is_pass, part1_completed, attempt_number')
        .eq('user_id', userId)
        .order('attempt_number', { ascending: false })

      if (error || !data) return {}

      // 회차별 최신 세션만 (attempt_number DESC이므로 첫 번째가 최신)
      const history = {}
      data.forEach(session => {
        if (history[session.round]) return
        history[session.round] = {
          isComplete:      session.is_complete,
          totalAverage:    session.total_average ?? 0,
          isPass:          session.is_pass ?? false,
          part1Done:       session.part1_completed,
          attemptNumber:   session.attempt_number ?? 1,
          progressPercent: session.is_complete
            ? 100
            : session.part1_completed ? 50 : 20,
        }
      })
      return history
    } catch (err) {
      console.warn('[mockExamService] getSessionHistory 실패:', err.message)
      return {}
    }
  },
}

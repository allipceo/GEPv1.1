/**
 * src/services/customMockService.js
 * GEP_070 Phase 6-1 맞춤 모의고사 — 랜덤 생성 엔진 + 약점 분석 + Supabase 연동
 *
 * 게스트: 접근 불가 (레벨5 = 인증 필수)
 * 회원: localStorage(즉시) + Supabase(백그라운드)
 *
 * Phase 5 재활용:
 *   - calculateScore / checkPass / calcAverage → mockExamService에서 직접 재사용
 *   - Supabase 패턴 → mockExamService.mockExamSupabase 구조 동일
 */

import { customMockConfig } from '../config/customMockConfig'
import { calculateScore, checkPass, calcAverage } from './mockExamService'
import { supabase } from '../lib/supabase'

export { calculateScore, checkPass, calcAverage }

// ── localStorage 키 ────────────────────────────────────────────────────────────
export const CUSTOM_RESULT_LS_KEY   = (sid, part) => `gep:custom:result:${sid}:${part}`
export const CUSTOM_PROGRESS_LS_KEY = (sid, part) => `gep:custom:${sid}:${part}`
export const CUSTOM_SESSION_LS_KEY  = 'gep:custom:active'

// ── 유틸리티 ───────────────────────────────────────────────────────────────────

/** Fisher-Yates 셔플 (원본 배열 불변) */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * pool에서 count개 랜덤 추출 (pool < count이면 중복 허용)
 * @param {Array}  pool
 * @param {number} count
 * @returns {Array}
 */
function randomPick(pool, count) {
  if (pool.length === 0) return []
  if (pool.length >= count) return shuffle(pool).slice(0, count)

  // pool 부족: 중복 허용 채우기
  const result = []
  while (result.length < count) {
    const need = count - result.length
    result.push(...shuffle(pool).slice(0, Math.min(need, pool.length)))
  }
  return result
}

/**
 * 세부과목별 할당량 계산 (약점 가중치 반영)
 *
 * 정답률 하위 세부과목은 weakWeightMultiplier(=2)배 가중치.
 * 전체 합이 totalCount가 되도록 비례 배분 후 나머지를 소수점 큰 순으로 분배.
 *
 * @param {string[]} subSubjects  - 세부과목 목록
 * @param {string[]} weakSubjects - 약점 세부과목 목록
 * @param {number}   totalCount   - 해당 과목 총 문제 수 (예: 40)
 * @returns {Object} { subSubject: count }
 */
function calcAllocation(subSubjects, weakSubjects, totalCount) {
  const { weakWeightMultiplier } = customMockConfig.weakness
  const weights = subSubjects.map(s => weakSubjects.includes(s) ? weakWeightMultiplier : 1)
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  // 비례 할당 (floor)
  const allocs = weights.map(w => Math.floor((w / totalWeight) * totalCount))

  // 나머지를 소수점 큰 순으로 분배
  const remainder = totalCount - allocs.reduce((a, b) => a + b, 0)
  const fracs = weights
    .map((w, i) => ({ i, frac: (w / totalWeight) * totalCount - allocs[i] }))
    .sort((a, b) => b.frac - a.frac)
  for (let r = 0; r < remainder; r++) allocs[fracs[r].i]++

  const result = {}
  subSubjects.forEach((sub, i) => { result[sub] = allocs[i] })
  return result
}

// ── 약점 분석 ──────────────────────────────────────────────────────────────────

/**
 * attempts 테이블에서 세부과목별 정답률 계산
 *
 * @param {string} userId
 * @returns {Promise<{
 *   subjectStats: Object,    // { subSubject: { correct, total, accuracy } }
 *   weakSubjects: string[],  // 정답률 낮은 순 상위 topWeakCount개
 *   hasEnoughData: boolean,  // 전체 attempts >= minAttempts
 * }>}
 */
export async function analyzeWeakness(userId) {
  const empty = { subjectStats: {}, weakSubjects: [], hasEnoughData: false }
  if (!userId) return empty

  try {
    const { data, error } = await supabase
      .from('attempts')
      .select('sub_subject, is_correct')
      .eq('user_id', userId)

    if (error || !data) return empty

    // 세부과목별 집계
    const raw = {}
    data.forEach(row => {
      const sub = row.sub_subject
      if (!sub) return
      if (!raw[sub]) raw[sub] = { correct: 0, total: 0 }
      raw[sub].total++
      if (row.is_correct) raw[sub].correct++
    })

    // 정답률 계산
    const subjectStats = {}
    for (const [sub, d] of Object.entries(raw)) {
      subjectStats[sub] = {
        correct:  d.correct,
        total:    d.total,
        accuracy: d.total > 0
          ? Math.round((d.correct / d.total) * 100)
          : 0,
      }
    }

    const totalAttempts = data.length
    const hasEnoughData = totalAttempts >= customMockConfig.weakness.minAttempts

    // 정답률 낮은 순 → 하위 topWeakCount개 세부과목
    const weakSubjects = Object.entries(subjectStats)
      .sort((a, b) => a[1].accuracy - b[1].accuracy)
      .slice(0, customMockConfig.weakness.topWeakCount)
      .map(([sub]) => sub)

    return { subjectStats, weakSubjects, hasEnoughData }
  } catch (err) {
    console.warn('[customMockService] analyzeWeakness 오류:', err.message)
    return empty
  }
}

// ── 랜덤 문제 생성 ──────────────────────────────────────────────────────────────

/**
 * 맞춤 모의고사 문제 생성
 *
 * 표준 모드: 각 세부과목 균등 랜덤 추출 (세부과목당 ~10문제)
 * 약점 모드: 정답률 하위 3개 세부과목 2배 비중
 *
 * 반환 문제 순서: 법령(0~39) → 손보1부(40~79) → 손보2부(80~119)
 *
 * @param {string} mode   - 'standard' | 'weakness'
 * @param {string} userId
 * @returns {Promise<{
 *   success:      boolean,
 *   questions:    Array,    // 120문제
 *   weakSubjects: string[], // 약점 세부과목 (표준 모드 = [])
 *   error?:       string,   // 'LOGIN_REQUIRED' | 'INSUFFICIENT_DATA' | 'LOAD_ERROR'
 * }>}
 */
export async function generateQuestions(mode, userId) {
  if (!userId) {
    return { success: false, questions: [], weakSubjects: [], error: 'LOGIN_REQUIRED' }
  }

  try {
    // exams.json 로드
    const res = await fetch('/data/exams.json')
    if (!res.ok) throw new Error(`fetch 실패: ${res.status}`)
    const data = await res.json()
    const allQuestions = data.questions

    let weakSubjects = []

    // 약점 모드: 약점 분석 선행
    if (mode === customMockConfig.MODES.WEAKNESS) {
      const analysis = await analyzeWeakness(userId)
      if (!analysis.hasEnoughData) {
        return { success: false, questions: [], weakSubjects: [], error: 'INSUFFICIENT_DATA' }
      }
      weakSubjects = analysis.weakSubjects
    }

    // 과목별 문제 추출
    const part1 = []   // 법령
    const part2s1 = [] // 손보1부
    const part2s2 = [] // 손보2부

    const { distribution } = customMockConfig

    for (const [subject, { count, subSubjects }] of Object.entries(distribution)) {
      const allocation = calcAllocation(subSubjects, weakSubjects, count)

      for (const [sub, needed] of Object.entries(allocation)) {
        if (needed === 0) continue
        const pool = allQuestions.filter(q => q.subject === subject && q.subSubject === sub)
        const picks = randomPick(pool, needed)

        if (subject === '법령')   part1.push(...picks)
        if (subject === '손보1부') part2s1.push(...picks)
        if (subject === '손보2부') part2s2.push(...picks)
      }
    }

    // 순서: 법령(셔플) → 손보1부(셔플) → 손보2부(셔플)
    const questions = [
      ...shuffle(part1),
      ...shuffle(part2s1),
      ...shuffle(part2s2),
    ]

    return { success: true, questions, weakSubjects }
  } catch (err) {
    console.warn('[customMockService] generateQuestions 오류:', err.message)
    return { success: false, questions: [], weakSubjects: [], error: 'LOAD_ERROR' }
  }
}

// ── 결과 저장/로드 (localStorage) ─────────────────────────────────────────────

export function saveResult(sessionId, part, data) {
  try {
    localStorage.setItem(CUSTOM_RESULT_LS_KEY(sessionId, part), JSON.stringify(data))
  } catch (_) {}
}

export function loadResult(sessionId, part) {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_RESULT_LS_KEY(sessionId, part)) || 'null')
  } catch {
    return null
  }
}

// ── Supabase 연동 ──────────────────────────────────────────────────────────────

export const customMockSupabase = {

  /**
   * 새 세션 생성 (문제 생성 직후 호출)
   *
   * @param {string}   userId
   * @param {string}   mode       - 'standard' | 'weakness'
   * @param {string}   timerType  - 'full' | 'short'
   * @param {Object}   metadata   - { weakSubjects, questionIds }
   * @returns {Promise<string|null>} sessionId
   */
  createSession: async (userId, mode, timerType, metadata = {}) => {
    if (!userId) return null
    try {
      const { data, error } = await supabase
        .from('custom_mock_sessions')
        .insert({
          user_id:    userId,
          mode,
          timer_type: timerType,
          metadata,
        })
        .select('id')
        .single()

      if (error) {
        console.warn('[customMockService] createSession 실패:', error.message)
        return null
      }
      return data?.id ?? null
    } catch (err) {
      console.warn('[customMockService] createSession 오류:', err.message)
      return null
    }
  },

  /**
   * 교시별 결과 저장 (part1 완료 또는 part2 완료 시)
   *
   * @param {string} userId
   * @param {string} sessionId
   * @param {string} part       - 'part1' | 'part2'
   * @param {Object} scores     - calculateScore 결과
   * @param {number} elapsedTime - 초
   * @returns {Promise<boolean>}
   */
  saveSession: async (userId, sessionId, part, scores, elapsedTime) => {
    if (!userId || !sessionId) return false
    try {
      if (part === 'part1') {
        const lawScore = scores['법령']?.score ?? 0
        await supabase
          .from('custom_mock_sessions')
          .update({
            part1_score:      lawScore,
            part1_completed:  true,
            part1_time_spent: elapsedTime,
          })
          .eq('id', sessionId)

      } else {
        // part2: 손보1부 + 손보2부 + 최종 집계
        const p1Score = scores['손보1부']?.score ?? 0
        const p2Score = scores['손보2부']?.score ?? 0

        // 1교시 점수: DB 또는 localStorage fallback
        const { data: sessionData } = await supabase
          .from('custom_mock_sessions')
          .select('part1_score')
          .eq('id', sessionId)
          .single()

        const part1LsResult = loadResult(sessionId, 'part1')
        const lawScore = sessionData?.part1_score
          ?? part1LsResult?.scores?.['법령']?.score
          ?? 0

        const allScores = {
          '법령':   { score: lawScore },
          '손보1부': { score: p1Score },
          '손보2부': { score: p2Score },
        }
        const avg    = calcAverage(allScores)
        const passed = checkPass(allScores)

        await supabase
          .from('custom_mock_sessions')
          .update({
            part2_score:      Math.round(((p1Score + p2Score) / 2) * 10) / 10,
            part2_completed:  true,
            part2_time_spent: elapsedTime,
            total_average:    avg,
            is_pass:          passed,
            is_complete:      true,
          })
          .eq('id', sessionId)
      }
      return true
    } catch (err) {
      console.warn('[customMockService] saveSession 오류:', err.message)
      return false
    }
  },

  /**
   * 문제별 응답 원장 저장 (bulk INSERT, fire-and-forget)
   *
   * @param {string} userId
   * @param {string} sessionId
   * @param {Object} answers    - { questionNumber(1-based): answer(1~4) }
   * @param {Array}  questions  - 문제 배열
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
      const { error } = await supabase.from('custom_mock_attempts').insert(rows)
      if (error) console.warn('[customMockService] saveAttempts 실패:', error.message)
    } catch (err) {
      console.warn('[customMockService] saveAttempts 오류:', err.message)
    }
  },

  /**
   * 응시 이력 조회 (통계용)
   *
   * @param {string} userId
   * @returns {Promise<Array>} 완료된 세션 목록 (최신순)
   */
  getSessionHistory: async (userId) => {
    if (!userId) return []
    try {
      const { data, error } = await supabase
        .from('custom_mock_sessions')
        .select('id, mode, timer_type, total_average, is_pass, is_complete, created_at, metadata')
        .eq('user_id', userId)
        .eq('is_complete', true)
        .order('created_at', { ascending: false })

      if (error || !data) return []
      return data
    } catch (err) {
      console.warn('[customMockService] getSessionHistory 실패:', err.message)
      return []
    }
  },
}

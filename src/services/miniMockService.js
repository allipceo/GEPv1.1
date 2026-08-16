// src/services/miniMockService.js
// GEPv30-109 STEP 5 (+ GEPv30-110 정정 반영) — 간이 모의고사 세트 로드 · 채점 · 통계 저장

import miniMockConfig from '../config/miniMockConfig'
import { recordAttempt } from './statsService'
import useStatsStore from '../stores/statsStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

// ── 5-1. 세트 로드 ───────────────────────────────────────────────────────────

let _setsCache = null

export async function loadSets() {
  if (_setsCache) return _setsCache
  const res = await fetch('/data/mini_mock_sets.json')
  _setsCache = await res.json()
  return _setsCache
}

export async function loadSet(setId) {
  const sets = await loadSets()
  return sets.find(s => s.setId === Number(setId)) ?? null
}

// ── 5-2. 채점 ────────────────────────────────────────────────────────────────

/**
 * @param {Array} questions - 30문제 배열 (round·subject·subSubject·answer 포함)
 * @param {Object} answers  - { questionIndex(0-based): selectedAnswer(1-4) | null }
 * @returns {{
 *   subjectResults: Object,      // 3대 과목 (합격/과락 판정용)
 *   subSubjectResults: Array,    // 12개 세부과목 (취약도 UI용, 정답률 낮은 순 정렬)
 *   averageScore: number,
 *   totalCorrect: number,
 *   isPassed: boolean,
 * }}
 */
export function calculateMiniMockScore(questions, answers) {
  const { subjectQuota, passCriteria } = miniMockConfig

  // 대과목(3개) 집계
  const subjectMap = {}
  for (const subject of Object.keys(subjectQuota)) {
    subjectMap[subject] = { total: 0, correct: 0 }
  }

  // 세부과목(12개) 집계
  const subSubjectMap = {}

  questions.forEach((q, idx) => {
    const selected  = answers[idx] ?? null
    const isCorrect = selected !== null && Number(selected) === Number(q.answer)

    if (subjectMap[q.subject]) {
      subjectMap[q.subject].total   += 1
      subjectMap[q.subject].correct += isCorrect ? 1 : 0
    }

    if (!subSubjectMap[q.subSubject]) {
      subSubjectMap[q.subSubject] = { total: 0, correct: 0 }
    }
    subSubjectMap[q.subSubject].total   += 1
    subSubjectMap[q.subSubject].correct += isCorrect ? 1 : 0
  })

  // 대과목별 점수 (100점 환산)
  const subjectResults = {}
  for (const [subject, { total, correct }] of Object.entries(subjectMap)) {
    subjectResults[subject] = {
      total, correct,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    }
  }

  // 세부과목별 점수 (100점 환산, 정답률 낮은 순 정렬 — 취약과목 먼저)
  const subSubjectResults = Object.entries(subSubjectMap)
    .map(([subSubject, { total, correct }]) => ({
      subSubject,
      total,
      correct,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => a.score - b.score)

  const totalCorrect = Object.values(subjectMap).reduce((sum, v) => sum + v.correct, 0)
  const averageScore = Math.round((totalCorrect / questions.length) * 100)

  const subjectPass = Object.entries(subjectResults).every(
    ([, v]) => v.score >= passCriteria.minSubjectScore
  )
  const isPassed = averageScore >= passCriteria.minAverageScore && subjectPass

  return {
    subjectResults,
    subSubjectResults,
    averageScore,
    totalCorrect,
    isPassed,
  }
}

// ── 5-3. 통계 저장 (기존 attempts 테이블 재사용) ─────────────────────────────

/**
 * 제출 시 호출 — fire-and-forget (MockExamQuiz.jsx와 동일 패턴, await 불필요)
 * 미응답(null) 문제는 attempts.selected_answer NOT NULL 제약으로 skip한다.
 *
 * @param {Array} questions - round 필드 포함된 30문제 배열
 * @param {Object} answers  - { questionIndex(0-based): selectedAnswer(1-4) | null }
 */
export function submitMiniMockStats(questions, answers) {
  const authState = useAuthStore.getState()
  if (!authState.userId) return

  const statsStore = useStatsStore.getState()

  questions.forEach((q, idx) => {
    const selected = answers[idx] ?? null
    if (selected === null) return   // 미응답 skip (NOT NULL 제약)

    recordAttempt(statsStore, authState, {
      question:       q,
      selectedAnswer: selected,
      isCorrect:      Number(selected) === Number(q.answer),
      studyMode:      miniMockConfig.studyMode,
    })
    // fire-and-forget — await 없음
  })
}

// ── 5-4. 통계 조회 (GEPv30-128 STEP 3) ───────────────────────────────────────

/**
 * 간이모의고사 문항별 시도 기록 조회 (공용 attempts 테이블, study_mode 필터)
 *
 * @param {string} userId
 * @returns {Promise<Array<{question_id:string, sub_subject:string, is_correct:boolean}>>}
 */
export async function getMiniMockAttempts(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('attempts')
      .select('question_id, sub_subject, is_correct, attempted_at')
      .eq('user_id', userId)
      .eq('study_mode', miniMockConfig.studyMode)
      .order('attempted_at', { ascending: true })
    if (error) throw error
    return data ?? []
  } catch (err) {
    console.warn('[miniMockService] getMiniMockAttempts 오류:', err.message)
    return []
  }
}

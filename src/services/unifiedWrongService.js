/**
 * src/services/unifiedWrongService.js
 * 통합 오답 관리 서비스
 * GEP_095 Phase 6-3 STEP 1 (GEPv30-115에서 attempts 원장 기반으로 재작성)
 *
 * 4개 소스(MCQ / OX / MOCK / CUSTOM) 오답 데이터를 단일 API로 제공
 *
 * 주요 함수:
 *   fetchAllWrongQuestions(userId)       - 병렬 조회 + 클라이언트 병합 + 캐시
 *   getCachedWrongQuestions(userId)      - localStorage TTL 캐시 조회
 *   calculateWrongCountStats(questions)  - 오답 횟수 분포 (sessionStorage 캐시)
 *   reclassifyResults(userId, results)   - 캐시 무효화 (재계산은 attempts 기록 기반 자동)
 *   filterByWrongCount(questions, min)   - 클라이언트 사이드 N회 이상 필터
 *
 * MCQ/OX는 별도 상태 테이블(wrong_questions/ox_wrong_questions, DB에 존재하지 않음) 대신
 * 'get_unified_wrong_questions' RPC로 attempts 원장을 직접 집계한다. wrong_count는
 * 누적(계속 유지), 활성 목록 포함 여부는 최신 시도(last_correct)로 판단 — 재도전 결과는
 * ChallengeMode.jsx가 attempts에 기록해야 다음 조회에 반영된다.
 *
 * 게스트: userId 없음 → 빈 배열 early-return
 */

import { supabase } from '../lib/supabase'

// ── 상수 ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS    = 60 * 60 * 1000  // 1시간 (localStorage TTL)
const STATS_CACHE_KEY = 'gep:unified_wrong_stats'

/** 사용자별 localStorage 캐시 키 */
function cacheKey(userId) {
  return `gep:unified_wrong:${userId}`
}

// ── 캐시 헬퍼 ───────────────────────────────────────────────────────────────

/**
 * localStorage 캐시 무효화 (fetchAllWrongQuestions + calculateWrongCountStats)
 * @param {string} userId
 */
function invalidateCache(userId) {
  try { localStorage.removeItem(cacheKey(userId)) }  catch (_) {}
  try { sessionStorage.removeItem(STATS_CACHE_KEY) } catch (_) {}
}

// ── 공개 함수 ────────────────────────────────────────────────────────────────

/**
 * localStorage 캐시에서 오답 목록 조회
 * TTL(1시간) 초과 시 null 반환
 *
 * @param {string} userId
 * @returns {Array|null} 캐시 데이터 또는 null
 */
export function getCachedWrongQuestions(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const { timestamp, data } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

// attempts 원장에서 오답을 집계할 study_mode 목록 (GEPv30-115)
// wrong_questions/ox_wrong_questions 테이블이 DB에 존재하지 않아(GEPv30-113 이전부터
// 누락) 통합오답복습이 항상 0문제였던 문제를 attempts 기반 RPC로 대체.
const MCQ_STUDY_MODES = [
  'service_a_sequence', 'service_b_subject_random', 'wrong_review',
  'mini_mock', 'unified_wrong_challenge',
]
const OX_STUDY_MODES = ['ox']

/**
 * 4개 소스의 오답 목록을 병렬 조회하여 클라이언트 병합
 *
 * 소스별 조회:
 *   - MCQ/OX  : get_unified_wrong_questions RPC (attempts 원장 집계)
 *               wrong_count = 누적 오답 시도 수(항상 유지), last_correct = 최신 시도 결과
 *               → last_correct=false(아직 미해결)인 것만 활성 목록에 포함
 *   - MOCK/CUSTOM : mock_exam_attempts/custom_mock_attempts에서 is_correct=false 집계
 *               (해결/미해결 개념 없이 시도 자체를 누적 카운트 — 기존 방식 유지)
 *
 * 반환 형태:
 *   [{ id, source: 'MCQ'|'OX'|'MOCK'|'CUSTOM', wrong_count, last_wrong_at?, subject?, sub_subject? }]
 *   subject/sub_subject는 MCQ/OX만 제공(GEPv30-136, RPC 확장). MOCK/CUSTOM은 범위 제외(조대표 확정).
 *   정렬: wrong_count 내림차순
 *
 * @param {string} userId
 * @param {{ bypassCache?: boolean }} [options]
 *   bypassCache: true면 캐시가 살아있어도 무시하고 항상 attempts 원장을 새로 조회한다.
 *   ChallengeMode.jsx처럼 "지금 이 순간의 진짜 오답목록"이 필요한 화면에서 사용 —
 *   1시간 캐시가 살아있으면 세션 중 정답 처리한 문제가 재진입 시 그대로 다시 나타나는
 *   문제가 있었다(GEPv30-141 원칙 10, GEPv30-144에서 발견).
 * @returns {Promise<Array>}
 */
export async function fetchAllWrongQuestions(userId, options = {}) {
  if (!userId) return []
  const { bypassCache = false } = options

  // 캐시 히트 (bypassCache=true면 건너뛰고 항상 새로 조회)
  if (!bypassCache) {
    const cached = getCachedWrongQuestions(userId)
    if (cached) return cached
  }

  try {
    // ── 4개 소스 병렬 조회 ──────────────────────────────────────────────
    const [mcqRes, oxRes, mockRes, customRes] = await Promise.all([
      supabase.rpc('get_unified_wrong_questions', { p_study_modes: MCQ_STUDY_MODES }),
      supabase.rpc('get_unified_wrong_questions', { p_study_modes: OX_STUDY_MODES }),

      supabase
        .from('mock_exam_attempts')
        .select('question_id')
        .eq('user_id', userId)
        .eq('is_correct', false),

      supabase
        .from('custom_mock_attempts')
        .select('question_id')
        .eq('user_id', userId)
        .eq('is_correct', false),
    ])

    // ── 클라이언트 병합 ───────────────────────────────────────────────────

    // MCQ: RPC 결과 중 최신 시도가 오답인 것(last_correct=false)만 활성 목록에 포함
    // GEPv30-136: RPC가 subject/sub_subject를 반환하도록 확장(016 마이그레이션) — 그대로 전달
    const mcqItems = (mcqRes.data ?? [])
      .filter(q => q.last_correct === false)
      .map(q => ({
        id:            q.question_id,
        source:        'MCQ',
        wrong_count:   q.wrong_count,
        last_wrong_at: q.last_wrong_at,
        subject:       q.subject     ?? null,
        sub_subject:   q.sub_subject ?? null,
      }))

    // OX: 동일한 RPC, study_mode='ox'만
    const oxItems = (oxRes.data ?? [])
      .filter(q => q.last_correct === false)
      .map(q => ({
        id:            q.question_id,
        source:        'OX',
        wrong_count:   q.wrong_count,
        last_wrong_at: q.last_wrong_at,
        subject:       q.subject     ?? null,
        sub_subject:   q.sub_subject ?? null,
      }))

    // MOCK: mock_exam_attempts에서 is_correct=false 집계 (question_id별 카운트)
    const mockCounts = {}
    for (const row of (mockRes.data ?? [])) {
      mockCounts[row.question_id] = (mockCounts[row.question_id] ?? 0) + 1
    }
    const mockItems = Object.entries(mockCounts).map(([id, count]) => ({
      id,
      source:      'MOCK',
      wrong_count: count,
    }))

    // CUSTOM: custom_mock_attempts에서 is_correct=false 집계
    const customCounts = {}
    for (const row of (customRes.data ?? [])) {
      customCounts[row.question_id] = (customCounts[row.question_id] ?? 0) + 1
    }
    const customItems = Object.entries(customCounts).map(([id, count]) => ({
      id,
      source:      'CUSTOM',
      wrong_count: count,
    }))

    // 병합 + wrong_count 내림차순 정렬
    const all = [...mcqItems, ...oxItems, ...mockItems, ...customItems]
      .sort((a, b) => b.wrong_count - a.wrong_count)

    // localStorage 캐시 저장 (TTL 1시간)
    try {
      localStorage.setItem(cacheKey(userId), JSON.stringify({
        timestamp: Date.now(),
        data:      all,
      }))
    } catch (_) {}

    return all

  } catch (err) {
    console.warn('[unifiedWrongService] fetchAllWrongQuestions 오류:', err.message)
    return []
  }
}

/**
 * 오답 횟수 분포 통계 계산
 *
 * 반환: { '6+': number, '5': number, '4': number, '3': number, '2': number, '1': number }
 * sessionStorage 캐시 사용 (질문 개수 변경 시 자동 갱신)
 *
 * @param {Array} questions - fetchAllWrongQuestions 반환값
 * @returns {Object}
 */
export function calculateWrongCountStats(questions) {
  const list = questions ?? []

  // sessionStorage 캐시 확인 (동일 개수면 재사용)
  try {
    const raw = sessionStorage.getItem(STATS_CACHE_KEY)
    if (raw) {
      const { count, dist } = JSON.parse(raw)
      if (count === list.length) return dist
    }
  } catch (_) {}

  // 분포 계산
  const dist = { '6+': 0, '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  for (const q of list) {
    const c = q.wrong_count ?? 1
    if      (c >= 6) dist['6+']++
    else if (c === 5) dist['5']++
    else if (c === 4) dist['4']++
    else if (c === 3) dist['3']++
    else if (c === 2) dist['2']++
    else              dist['1']++
  }

  // sessionStorage 캐시 저장
  try {
    sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ count: list.length, dist }))
  } catch (_) {}

  return dist
}

/**
 * 오답 복습 결과 재분류
 *
 * GEPv30-115부터는 별도 상태 테이블을 직접 DELETE/UPDATE하지 않는다.
 * ChallengeMode.jsx가 재도전 결과를 attempts 원장에 기록하므로,
 * get_unified_wrong_questions RPC가 다음 조회 시 최신 시도(last_correct) 기준으로
 * 자동 재계산한다. 이 함수는 로컬 캐시만 무효화해 다음 fetchAllWrongQuestions 호출이
 * 캐시 대신 최신 데이터를 다시 읽도록 보장한다.
 *
 * @param {string} userId
 * @param {Array}  results - [{ id: string, source: 'MCQ'|'OX'|'MOCK'|'CUSTOM', isCorrect: boolean }]
 * @returns {Promise<{ success: boolean, deleted: number, updated: number }>}
 */
export async function reclassifyResults(userId, results) {
  if (!userId || !results?.length) return { success: false, deleted: 0, updated: 0 }
  invalidateCache(userId)
  return { success: true, deleted: 0, updated: 0 }
}

/**
 * 오답 횟수 기준 필터 (클라이언트 사이드)
 *
 * minCount=1 이하 → 전체 반환
 * minCount=3 → 3회 이상 틀린 문제만
 *
 * @param {Array}  questions - fetchAllWrongQuestions 반환값
 * @param {number} minCount  - 최소 오답 횟수 (이상)
 * @returns {Array}
 */
export function filterByWrongCount(questions, minCount) {
  if (!questions?.length) return []
  if (!minCount || minCount <= 1) return questions
  return questions.filter(q => (q.wrong_count ?? 1) >= minCount)
}

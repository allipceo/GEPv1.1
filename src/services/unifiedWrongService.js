/**
 * src/services/unifiedWrongService.js
 * 통합 오답 관리 서비스
 * GEP_095 Phase 6-3 STEP 1
 *
 * 4개 소스(MCQ / OX / MOCK / CUSTOM) 오답 데이터를 단일 API로 제공
 *
 * 주요 함수:
 *   fetchAllWrongQuestions(userId)       - 병렬 조회 + 클라이언트 병합 + 캐시
 *   getCachedWrongQuestions(userId)      - localStorage TTL 캐시 조회
 *   calculateWrongCountStats(questions)  - 오답 횟수 분포 (sessionStorage 캐시)
 *   reclassifyResults(userId, results)   - 복습 후 정답→삭제 / 오답→+1 (2-call 병렬)
 *   filterByWrongCount(questions, min)   - 클라이언트 사이드 N회 이상 필터
 *
 * ※ reclassifyResults의 wrong_count 증가는 DB RPC 'increment_wrong_count' 필요
 *    (Supabase PostgREST SDK는 SET col = col + 1 미지원)
 *    RPC DDL: supabase/migrations/ 에 별도 파일로 관리
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

/**
 * 4개 소스의 오답 목록을 병렬 조회하여 클라이언트 병합
 *
 * 테이블별 조회:
 *   - wrong_questions      (MCQ) : question_id, wrong_count
 *   - ox_wrong_questions   (OX)  : question_id, wrong_count
 *   - mock_exam_attempts   (MOCK): is_correct=false → question_id별 집계
 *   - custom_mock_attempts (CUSTOM): is_correct=false → question_id별 집계
 *
 * 반환 형태:
 *   [{ id, source: 'MCQ'|'OX'|'MOCK'|'CUSTOM', wrong_count }]
 *   정렬: wrong_count 내림차순
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchAllWrongQuestions(userId) {
  if (!userId) return []

  // 캐시 히트
  const cached = getCachedWrongQuestions(userId)
  if (cached) return cached

  try {
    // ── 4개 테이블 병렬 조회 ──────────────────────────────────────────────
    const [mcqRes, oxRes, mockRes, customRes] = await Promise.all([
      supabase
        .from('wrong_questions')
        .select('question_id, wrong_count')
        .eq('user_id', userId),

      supabase
        .from('ox_wrong_questions')
        .select('question_id, wrong_count')
        .eq('user_id', userId),

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

    // MCQ: wrong_questions 테이블 (wrong_count 컬럼 보유)
    const mcqItems = (mcqRes.data ?? []).map(q => ({
      id:          q.question_id,
      source:      'MCQ',
      wrong_count: q.wrong_count ?? 1,
    }))

    // OX: ox_wrong_questions 테이블 (wrong_count 컬럼 보유)
    const oxItems = (oxRes.data ?? []).map(q => ({
      id:          q.question_id,
      source:      'OX',
      wrong_count: q.wrong_count ?? 1,
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
 * - 정답 항목: wrong_questions / ox_wrong_questions 에서 DELETE
 * - 오답 항목: wrong_count + 1 (DB RPC 'increment_wrong_count' 사용)
 *
 * Promise.all 병렬 처리 (DELETE 1슬롯 + UPDATE 1슬롯)
 * MOCK / CUSTOM 소스는 전용 wrong 테이블 없음 → 집계용이므로 skip
 *
 * ※ 'increment_wrong_count' RPC 미생성 시 UPDATE 슬롯은 0 반환 (에러 무시)
 *    DDL 예시:
 *    CREATE OR REPLACE FUNCTION increment_wrong_count(
 *      p_user_id UUID, p_table TEXT, p_question_ids TEXT[]
 *    ) RETURNS void AS $$
 *      UPDATE wrong_questions
 *        SET wrong_count = wrong_count + 1
 *        WHERE user_id = p_user_id AND question_id = ANY(p_question_ids);
 *      -- p_table 파라미터로 분기하거나 함수를 테이블별로 분리
 *    $$ LANGUAGE sql SECURITY DEFINER;
 *
 * @param {string} userId
 * @param {Array}  results - [{ id: string, source: 'MCQ'|'OX'|'MOCK'|'CUSTOM', isCorrect: boolean }]
 * @returns {Promise<{ success: boolean, deleted: number, updated: number }>}
 */
export async function reclassifyResults(userId, results) {
  if (!userId || !results?.length) return { success: false, deleted: 0, updated: 0 }

  const mcqCorrect = results.filter(r => r.source === 'MCQ' && r.isCorrect).map(r => r.id)
  const mcqWrong   = results.filter(r => r.source === 'MCQ' && !r.isCorrect).map(r => r.id)
  const oxCorrect  = results.filter(r => r.source === 'OX'  && r.isCorrect).map(r => r.id)
  const oxWrong    = results.filter(r => r.source === 'OX'  && !r.isCorrect).map(r => r.id)

  try {
    // Promise.all 2-슬롯: DELETE + UPDATE 병렬 실행
    const [deleted, updated] = await Promise.all([

      // 슬롯 1 — DELETE: 정답 처리된 항목 오답 테이블에서 제거
      (async () => {
        let count = 0
        if (mcqCorrect.length > 0) {
          const { error } = await supabase
            .from('wrong_questions')
            .delete()
            .eq('user_id', userId)
            .in('question_id', mcqCorrect)
          if (!error) count += mcqCorrect.length
        }
        if (oxCorrect.length > 0) {
          const { error } = await supabase
            .from('ox_wrong_questions')
            .delete()
            .eq('user_id', userId)
            .in('question_id', oxCorrect)
          if (!error) count += oxCorrect.length
        }
        return count
      })(),

      // 슬롯 2 — UPDATE: 오답 항목 wrong_count + 1 (DB RPC 사용)
      (async () => {
        let count = 0
        if (mcqWrong.length > 0) {
          const { error } = await supabase.rpc('increment_wrong_count_mcq', {
            p_user_id:      userId,
            p_question_ids: mcqWrong,
          })
          if (!error) count += mcqWrong.length
        }
        if (oxWrong.length > 0) {
          const { error } = await supabase.rpc('increment_wrong_count_ox', {
            p_user_id:      userId,
            p_question_ids: oxWrong,
          })
          if (!error) count += oxWrong.length
        }
        return count
      })(),
    ])

    // 캐시 무효화 (다음 조회 시 최신 데이터 반영)
    invalidateCache(userId)

    return { success: true, deleted, updated }

  } catch (err) {
    console.warn('[unifiedWrongService] reclassifyResults 오류:', err.message)
    return { success: false, deleted: 0, updated: 0 }
  }
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

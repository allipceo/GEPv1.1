/**
 * src/services/ledgerStatsService.js
 * attempts 원장 기반 "누적" 카운트 공용 서비스 — 전역 통계의 기본 프로세스 (GEPv30-153).
 *
 * 배경(GEPv30-152):
 *   화면/스토어의 세션 로컬 카운터(예: oxStore.totalCumulative)는 재진입·리셋 시
 *   0으로 사라질 수 있어 "누적" 표시의 근거가 될 수 없다는 것이 OX 서비스에서
 *   확인됐다. attempts 테이블(모든 서비스가 공유하는 단일 원장)만이 유일한
 *   진실 소스(SSOT)다.
 *
 * 원칙:
 *   서비스 메뉴(OX·서비스A/B·모의고사·미니/맞춤모의고사 등)를 막론하고 화면에
 *   "누적 N문항" 류의 표시가 필요하면, 화면마다 attempts를 직접 쿼리하는 대신
 *   반드시 이 모듈을 통해 조회한다. attempts는 study_mode/subject/sub_subject
 *   컬럼을 모든 서비스가 공통으로 쓰므로(GEPv30-MASTER-SPEC §3.2) 이 모듈은
 *   study_mode만 바꾸면 어떤 서비스에도 그대로 재사용 가능하다.
 *   신규 화면에서 attempts를 직접 select/count 하는 새 쿼리를 작성하기 전에
 *   먼저 이 모듈에 필요한 기능이 있는지 확인할 것.
 *
 * 게스트(userId 없음)는 항상 빈 결과를 즉시 반환한다(카운팅 대상 아님).
 */

import { supabase } from '../lib/supabase'

const EMPTY_BREAKDOWN = { total: 0, correct: 0, bySubject: {}, bySubSubject: {} }

/**
 * 단일 누적 카운트 조회 — 화면 상단 "누적 N" 표시용.
 *
 * @param {{userId: string|null}} authState
 * @param {{studyMode: string, subject?: string, subSubject?: string}} filters
 *   subSubject가 없거나 'ALL'이면 subject 전체 합산.
 * @returns {Promise<number>}
 */
export async function getCumulativeCount(authState, filters) {
  const userId = authState?.userId
  if (!userId) return 0

  const { studyMode, subject, subSubject } = filters ?? {}

  let query = supabase
    .from('attempts')
    .select('attempt_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('study_mode', studyMode)

  if (subject) query = query.eq('subject', subject)
  if (subSubject && subSubject !== 'ALL') query = query.eq('sub_subject', subSubject)

  const { count, error } = await query
  if (error) {
    console.warn('[ledgerStatsService] getCumulativeCount 실패:', error.message)
    return 0
  }
  return count ?? 0
}

/**
 * 과목별·세부과목별 집계 브레이크다운 — 카드 목록 화면(대분류 3개 / 세부과목 4개 등)용.
 * 정답수도 함께 집계해 정답률 표시까지 지원한다.
 *
 * @param {{userId: string|null}} authState
 * @param {{studyMode: string, subject?: string}} filters
 *   subject를 주면 그 과목 내 세부과목별로만 좁혀 조회(행 수 절약).
 * @returns {Promise<{
 *   total: number, correct: number,
 *   bySubject: { [subject: string]: { solved: number, correct: number } },
 *   bySubSubject: { [subSubject: string]: { solved: number, correct: number } }
 * }>}
 */
export async function getCumulativeBreakdown(authState, filters) {
  const userId = authState?.userId
  if (!userId) return EMPTY_BREAKDOWN

  const { studyMode, subject } = filters ?? {}

  let query = supabase
    .from('attempts')
    .select('subject, sub_subject, is_correct')
    .eq('user_id', userId)
    .eq('study_mode', studyMode)

  if (subject) query = query.eq('subject', subject)

  const { data, error } = await query
  if (error) {
    console.warn('[ledgerStatsService] getCumulativeBreakdown 실패:', error.message)
    return EMPTY_BREAKDOWN
  }

  const bySubject = {}
  const bySubSubject = {}
  let total = 0
  let correct = 0

  for (const row of data ?? []) {
    total += 1
    if (row.is_correct) correct += 1

    if (row.subject) {
      const bucket = (bySubject[row.subject] ??= { solved: 0, correct: 0 })
      bucket.solved += 1
      if (row.is_correct) bucket.correct += 1
    }
    if (row.sub_subject) {
      const bucket = (bySubSubject[row.sub_subject] ??= { solved: 0, correct: 0 })
      bucket.solved += 1
      if (row.is_correct) bucket.correct += 1
    }
  }

  return { total, correct, bySubject, bySubSubject }
}

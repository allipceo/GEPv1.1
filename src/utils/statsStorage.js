/**
 * src/utils/statsStorage.js
 * localStorage 'gep_stats_v1' 읽기/쓰기 유틸리티
 *
 * examStore.js 와 완전히 분리된 독립 저장소.
 * statsStore.js 만 이 모듈을 사용한다.
 *
 * 스키마 v1.0
 * {
 *   version:   "1.0",
 *   total:     { solved: number, correct: number },
 *   daily:     { "YYYY-MM-DD": { solved, correct } },
 *   bySubject: { "법령": { solved, correct }, ... },
 *   byRound:   { 23: { solved, correct }, ... }
 * }
 */

export const STATS_KEY = 'gep_stats_v1'
const STATS_VERSION = '1.0'

const DEFAULT_STATS = {
  version:   STATS_VERSION,
  total:     { solved: 0, correct: 0 },
  daily:     {},
  bySubject: {},
  byRound:   {},
}

/** localStorage → 스키마 객체 반환. 없거나 버전 불일치 시 기본값 반환 */
export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return _clone(DEFAULT_STATS)
    const parsed = JSON.parse(raw)
    if (parsed.version !== STATS_VERSION) return _clone(DEFAULT_STATS)
    return parsed
  } catch {
    return _clone(DEFAULT_STATS)
  }
}

/** 스키마 객체 → localStorage 저장 */
export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {}
}

/** localStorage에서 통계 키 삭제 */
export function clearStats() {
  try {
    localStorage.removeItem(STATS_KEY)
  } catch {}
}

/** 오늘 날짜 키 반환 (YYYY-MM-DD) */
export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function _clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

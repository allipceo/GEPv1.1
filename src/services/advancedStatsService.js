/**
 * src/services/advancedStatsService.js
 * GEP_085 Phase 6-2 STEP 1 — 고급 통계 계산 엔진
 *
 * 5 functions:
 *   1. calculatePredictedScore(records, recentN)
 *   2. calculatePassProbability(records, simulationCount)
 *   3. analyzeWeaknessBySubject(questionAttempts)
 *   4. analyzeWeaknessByDifficulty()          ← stub (difficulty 필드 없음)
 *   5. generateStudyRoadmap(weaknessData)
 *
 * 데이터 소스: customMockConfig.subjectMap (SSOT)
 * difficulty 필드: exams.json에 존재하지 않음 → analyzeWeaknessByDifficulty는 stub
 */

import { customMockConfig } from '../config/customMockConfig'

// ── 공개 상수 ─────────────────────────────────────────────────────────────────
export const MIN_DATA_REQUIRED = 5

// 합격 기준 (SSOT → customMockConfig.passCriteria)
const { minSubjectScore, minAverageScore } = customMockConfig.passCriteria  // 40 / 60

// 과목 목록
const SUBJECTS = ['법령', '손보1부', '손보2부']

// ── 내부 수학 유틸 (export 안 함) ───────────────────────────────────────────────

function _mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function _median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid    = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function _stdDev(arr) {
  if (arr.length < 2) return 0
  const m       = _mean(arr)
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

/** 단순 선형회귀 기울기 (회당 점수 변화) */
function _linearSlope(arr) {
  const n = arr.length
  if (n < 2) return 0
  const xs    = Array.from({ length: n }, (_, i) => i)
  const xMean = _mean(xs)
  const yMean = _mean(arr)
  const num   = xs.reduce((s, x, i) => s + (x - xMean) * (arr[i] - yMean), 0)
  const den   = xs.reduce((s, x)    => s + (x - xMean) ** 2, 0)
  return den === 0 ? 0 : num / den
}

/** Box-Muller 변환 — 표준정규분포 난수 (μ=0, σ=1) */
function _randomNormal() {
  let u, v
  do { u = Math.random() } while (u === 0)
  do { v = Math.random() } while (v === 0)
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/** 레코드에서 totalAverage 추출 (camelCase / snake_case 모두 대응) */
function _avgOf(r) {
  return r.totalAverage ?? r.total_average ?? 0
}

// ── 세부과목 학습 메타 ─────────────────────────────────────────────────────────

/** 세부과목별 기준 학습일 (ROI 계산 기준) */
const BASE_STUDY_DAYS = {
  '보험업법': 14, '상법': 21, '위험관리':  7, '세제재무':  7,
  '자동차보험': 14, '특종보험': 10, '보증보험': 7, '연금저축': 10,
  '화재보험': 10, '해상보험': 14, '항공우주':  7, '재보험':   10,
}

/** 세부과목별 추천 학습법 */
const STUDY_METHOD = {
  '보험업법':   '법조문 정독 + 핵심 조항 암기',
  '상법':       '보험편 조문 정리 + OX 반복',
  '위험관리':   '개념 정리 + 계산문제 풀이',
  '세제재무':   '세금 구조도 + 수치 암기',
  '자동차보험': '보상 체계 도식화 + 기출 집중',
  '특종보험':   '종류별 분류표 작성 + 기출 반복',
  '보증보험':   '보증 유형 정리 + 기출 반복',
  '연금저축':   '계산식 이해 + 수치 암기',
  '화재보험':   '약관 조항 정리 + 기출 집중',
  '해상보험':   '영문약어·용어집 + 기출 반복',
  '항공우주':   '개념 정리 + 기출 전략 암기',
  '재보험':     '유형별 구조 도식화 + 기출 반복',
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. 예측 점수 계산
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 최근 N회 기록 기반 예측 점수 (중앙값 · 추세 · 신뢰구간)
 *
 * @param {Array<{totalAverage?:number, total_average?:number}>} records
 *   시간순 정렬 (오래된 순) 배열
 * @param {number} recentN  최근 N회 (기본 5)
 * @returns {{
 *   median: number,
 *   trend: 'up'|'down'|'stable',
 *   trendValue: number,         // 회당 점수 변화 (기울기, 소수점 1자리)
 *   confidenceMin: number,      // 95% CI 하한 (0~100 클리핑)
 *   confidenceMax: number,      // 95% CI 상한
 *   dataCount: number,
 * } | { error: string, dataCount: number }}
 */
export function calculatePredictedScore(records, recentN = 5) {
  if (!records || records.length < MIN_DATA_REQUIRED) {
    return { error: 'INSUFFICIENT_DATA', dataCount: records?.length ?? 0 }
  }

  const scores = records.map(_avgOf)
  const recent = scores.slice(-recentN)

  const med        = _median(recent)
  const slope      = _linearSlope(recent)
  const trend      = slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable'
  const trendValue = Math.round(slope * 10) / 10

  const m   = _mean(recent)
  const sd  = _stdDev(recent)
  const ciMin = Math.max(0,   Math.round((m - 1.96 * sd) * 10) / 10)
  const ciMax = Math.min(100, Math.round((m + 1.96 * sd) * 10) / 10)

  return {
    median:        Math.round(med * 10) / 10,
    trend,
    trendValue,
    confidenceMin: ciMin,
    confidenceMax: ciMax,
    dataCount:     records.length,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. 합격 확률 계산 (Monte Carlo)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Monte Carlo 시뮬레이션 기반 합격 확률 계산
 *
 * Full mode  : records = [{법령:number, 손보1부:number, 손보2부:number}, ...]
 *              → 과목별 독립 시뮬레이션 → 정확한 확률
 * Estimated  : records = [{totalAverage:number}, ...] or [{total_average:number}, ...]
 *              → 전체 평균 단일 시뮬레이션 → 추정 확률
 *
 * @param {Array} records
 * @param {number} simulationCount  시뮬레이션 횟수 (기본 1000)
 * @returns {{
 *   overall: number,              // 전체 합격 확률 (0~100 정수)
 *   subjectProbs: Object|null,    // Full mode: {법령:%, 손보1부:%, 손보2부:%}
 *   averageProb: number|null,     // Estimated mode: 평균 합격 확률
 *   simulationCount: number,
 *   mode: 'full'|'estimated',
 * } | { error: string, dataCount: number }}
 */
export function calculatePassProbability(records, simulationCount = 1000) {
  if (!records || records.length < MIN_DATA_REQUIRED) {
    return { error: 'INSUFFICIENT_DATA', dataCount: records?.length ?? 0 }
  }

  // Full mode 판별: 첫 레코드에 3과목 점수가 모두 있는지 확인
  const isFull = records[0] != null && SUBJECTS.every(s => s in records[0])

  if (isFull) {
    // ── Full mode: 과목별 독립 시뮬레이션 ──────────────────────────────────
    let overallPassCount = 0
    const subPassCounts  = Object.fromEntries(SUBJECTS.map(s => [s, 0]))

    for (let i = 0; i < simulationCount; i++) {
      const simScores = {}
      SUBJECTS.forEach(s => {
        const subArr = records.map(r => r[s] ?? 0)
        const m      = _mean(subArr)
        const sd     = Math.max(_stdDev(subArr), 1)  // 최소 편차 1 보장
        simScores[s] = Math.min(100, Math.max(0, m + sd * _randomNormal()))
      })

      const avg            = _mean(Object.values(simScores))
      const allSubjectPass = SUBJECTS.every(s => simScores[s] >= minSubjectScore)
      const avgPass        = avg >= minAverageScore

      if (allSubjectPass && avgPass) overallPassCount++
      SUBJECTS.forEach(s => {
        if (simScores[s] >= minSubjectScore) subPassCounts[s]++
      })
    }

    return {
      overall:      Math.round((overallPassCount / simulationCount) * 100),
      subjectProbs: Object.fromEntries(
        SUBJECTS.map(s => [s, Math.round((subPassCounts[s] / simulationCount) * 100)])
      ),
      averageProb:  null,
      simulationCount,
      mode: 'full',
    }
  }

  // ── Estimated mode: totalAverage 기반 단일 시뮬레이션 ────────────────────
  const avgScores = records.map(_avgOf)
  const m  = _mean(avgScores)
  const sd = Math.max(_stdDev(avgScores), 1)

  let passCount = 0
  for (let i = 0; i < simulationCount; i++) {
    const simScore = Math.min(100, Math.max(0, m + sd * _randomNormal()))
    if (simScore >= minAverageScore) passCount++
  }

  const prob = Math.round((passCount / simulationCount) * 100)
  return {
    overall:      prob,
    subjectProbs: null,
    averageProb:  prob,
    simulationCount,
    mode: 'estimated',
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. 세부과목별 약점 분석
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 세부과목별 정답률 분석 (S1~S12)
 *
 * @param {Array<{sub_subject:string, is_correct:boolean|number}>} questionAttempts
 *   MCQ attempts 테이블 레코드 (sub_subject + is_correct 필드 필수)
 * @returns {Array<{
 *   subjectKey: string,   // 'S1'~'S12'
 *   name: string,         // '보험업법' 등
 *   parent: string,       // '법령'|'손보1부'|'손보2부'
 *   accuracy: number|null, // 정답률 (0~100 정수), 데이터 없으면 null
 *   level: 'good'|'fair'|'weak'|'nodata',
 *   color: string,        // hex color
 *   correct: number,
 *   total: number,
 * }>}
 */
export function analyzeWeaknessBySubject(questionAttempts) {
  // 세부과목별 집계 맵 초기화 (customMockConfig.subjectMap 기준 12개)
  const stats = {}
  Object.values(customMockConfig.subjectMap).forEach(({ key, parent }) => {
    stats[key] = { correct: 0, total: 0, parent }
  })

  // 집계
  if (questionAttempts && questionAttempts.length > 0) {
    questionAttempts.forEach(({ sub_subject, is_correct }) => {
      if (sub_subject && stats[sub_subject]) {
        stats[sub_subject].total++
        if (is_correct) stats[sub_subject].correct++  // boolean true 또는 숫자 1 모두 처리
      }
    })
  }

  // S1~S12 순서로 배열 반환
  return Object.entries(customMockConfig.subjectMap).map(([subjectKey, { key, parent }]) => {
    const { correct, total } = stats[key]
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : null

    let level, color
    if      (accuracy === null) { level = 'nodata'; color = '#9ca3af' }  // gray-400
    else if (accuracy >= 80)    { level = 'good';   color = '#22c55e' }  // green-500
    else if (accuracy >= 60)    { level = 'fair';   color = '#f59e0b' }  // amber-500
    else                        { level = 'weak';   color = '#ef4444' }  // red-500

    return { subjectKey, name: key, parent, accuracy, level, color, correct, total }
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. 난이도별 약점 분석 — stub (difficulty 필드 없음)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 난이도별 약점 분석 (stub)
 *
 * exams.json에 difficulty 필드가 존재하지 않아 구현 불가
 * 추후 데이터 보강 시 이 함수를 교체할 것
 *
 * @returns {{ error: string, message: string, hard: null, medium: null, easy: null }}
 */
export function analyzeWeaknessByDifficulty() {
  return {
    error:   'NO_DIFFICULTY_DATA',
    message: 'exams.json에 difficulty 필드가 없어 난이도별 분석이 불가능합니다. 추후 데이터 보강 시 구현 예정입니다.',
    hard:    null,
    medium:  null,
    easy:    null,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. 학습 로드맵 생성 (ROI 기반 Top 3)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ROI 기반 우선 학습 로드맵 생성 (Top 3)
 *
 * ROI = (목표 정답률 - 현재 정답률) / 기준 학습일
 * → 투자 대비 효율이 높은 세부과목 우선 추천
 *
 * @param {ReturnType<typeof analyzeWeaknessBySubject>} weaknessData
 *   analyzeWeaknessBySubject() 반환값
 * @returns {Array<{
 *   priority: number,     // 1~3 우선순위
 *   subjectKey: string,
 *   name: string,
 *   parent: string,
 *   accuracy: number,
 *   gap: number,          // 목표 정답률 - 현재 정답률
 *   roi: number,          // gap / baseDays (소수점 2자리)
 *   targetRate: number,   // 목표 정답률 (70)
 *   days: number,         // 기준 학습일
 *   method: string,       // 추천 학습법
 * }>}
 */
export function generateStudyRoadmap(weaknessData) {
  if (!weaknessData || weaknessData.length === 0) return []

  const TARGET_RATE = 70  // 목표 정답률 70%

  return weaknessData
    .filter(d => d.accuracy !== null && d.accuracy < TARGET_RATE)
    .map(d => {
      const gap      = TARGET_RATE - d.accuracy
      const baseDays = BASE_STUDY_DAYS[d.name] ?? 10
      const roi      = Math.round((gap / baseDays) * 100) / 100
      return {
        ...d,
        gap,
        roi,
        targetRate: TARGET_RATE,
        days:   baseDays,
        method: STUDY_METHOD[d.name] ?? '기출문제 반복 풀이',
      }
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 3)
    .map((d, i) => ({ priority: i + 1, ...d }))
}

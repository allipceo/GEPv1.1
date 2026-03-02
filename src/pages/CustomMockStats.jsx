/**
 * src/pages/CustomMockStats.jsx — /custom-mock/stats
 * 맞춤 모의고사 통합 통계
 * GEP_078 Phase 6-1 STEP 5
 *
 * MockExamStats.jsx 80% 재활용
 * 확장:
 *   - 필터: 전체 / 원본만 / 맞춤만
 *   - DualLineChart: 원본(blue-500) + 맞춤(green-500 점선)
 *   - 합격 예측: 최근 5회 평균 기반
 *   - 약점 수렴 분석: 세부과목별 누적 정답률
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  mockExamSupabase,
  loadResult as mockLoadResult,
  calcAverage,
  checkPass,
} from '../services/mockExamService'
import {
  customMockSupabase,
  analyzeWeakness,
} from '../services/customMockService'
import { mockExamConfig } from '../config/mockExamConfig'

// ── 필터 상수 ─────────────────────────────────────────────────────────────────
const FILTERS = ['전체', '원본만', '맞춤만']

// ── 게스트 원본 통계 구성 (localStorage) ─────────────────────────────────────
function buildGuestOriginalStats() {
  const list = []
  for (const round of mockExamConfig.rounds) {
    const part1 = mockLoadResult(round, 'part1')
    const part2 = mockLoadResult(round, 'part2')
    if (!part1 || !part2) continue
    const allScores = { ...part1.scores, ...part2.scores }
    list.push({
      id:           `mock-${round}`,
      type:         'original',
      label:        `${round}회`,
      totalAverage: calcAverage(allScores),
      isPass:       checkPass(allScores),
    })
  }
  return list
}

// ── SVG 차트 상수 ─────────────────────────────────────────────────────────────
const CHART_W = 320
const CHART_H = 160
const PAD_L   = 32
const PAD_R   = 12
const PAD_T   = 20
const PAD_B   = 32
const PLOT_W  = CHART_W - PAD_L - PAD_R
const PLOT_H  = CHART_H - PAD_T - PAD_B

function scoreToY(score) {
  return PAD_T + PLOT_H - (score / 100) * PLOT_H
}

// ── 듀얼 라인 차트 ────────────────────────────────────────────────────────────
function DualLineChart({ originalRecords, customRecords }) {
  const yTicks = [0, 40, 60, 80, 100]

  // 각 시리즈별 점 좌표 계산 (X: 인덱스 비례)
  function calcPoints(records) {
    const total = Math.max(records.length - 1, 1)
    return records.map((r, idx) => ({
      x:      PAD_L + (idx / total) * PLOT_W,
      y:      scoreToY(r.totalAverage),
      record: r,
    }))
  }

  function makePath(points) {
    if (points.length < 2) return null
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')
  }

  const origPoints   = calcPoints(originalRecords)
  const customPoints = calcPoints(customRecords)
  const origPath     = makePath(origPoints)
  const customPath   = makePath(customPoints)
  const hasData      = originalRecords.length > 0 || customRecords.length > 0

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: 'auto', maxHeight: '200px' }}
      aria-label="원본·맞춤 점수 추이 차트"
    >
      {/* Y축 눈금선 + 레이블 */}
      {yTicks.map(tick => {
        const y        = scoreToY(tick)
        const isPass60 = tick === 60
        const isPass40 = tick === 40
        return (
          <g key={tick}>
            <line
              x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y}
              stroke={isPass60 ? '#6366f1' : isPass40 ? '#fb923c' : '#e5e7eb'}
              strokeWidth={isPass60 || isPass40 ? 1 : 0.7}
              strokeDasharray={isPass60 || isPass40 ? '3 3' : undefined}
            />
            <text
              x={PAD_L - 3} y={y + 3.5}
              textAnchor="end" fontSize="8"
              fill={isPass60 ? '#6366f1' : isPass40 ? '#fb923c' : '#9ca3af'}
            >
              {tick}
            </text>
          </g>
        )
      })}

      {/* 원본 라인 (blue-500, 실선) */}
      {origPath && (
        <path
          d={origPath} fill="none"
          stroke="#3b82f6" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
        />
      )}
      {origPoints.map((p, i) => (
        <circle
          key={`o${i}`}
          cx={p.x} cy={p.y} r="3.5"
          fill={p.record.isPass ? '#22c55e' : '#ef4444'}
          stroke="white" strokeWidth="1.5"
        />
      ))}

      {/* 맞춤 라인 (green-500, 점선 + 사각형 포인트) */}
      {customPath && (
        <path
          d={customPath} fill="none"
          stroke="#22c55e" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray="5 2"
        />
      )}
      {customPoints.map((p, i) => (
        <rect
          key={`c${i}`}
          x={p.x - 3} y={p.y - 3}
          width="6" height="6"
          fill={p.record.isPass ? '#22c55e' : '#ef4444'}
          stroke="white" strokeWidth="1.5"
        />
      ))}

      {/* 데이터 없음 */}
      {!hasData && (
        <text
          x={CHART_W / 2} y={CHART_H / 2}
          textAnchor="middle" fontSize="10" fill="#d1d5db"
        >
          응시 완료 데이터 없음
        </text>
      )}
    </svg>
  )
}

// ── 요약 카드 (MockExamStats 재활용) ──────────────────────────────────────────
function SummaryCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-4">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  )
}

// ── 응시 이력 행 ──────────────────────────────────────────────────────────────
function HistoryRow({ record }) {
  const avg = Number(record.totalAverage)
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          record.type === 'custom'
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100  text-blue-700'
        }`}>
          {record.type === 'custom' ? '맞춤' : '원본'}
        </span>
        <span className="text-sm font-semibold text-gray-700">{record.label}</span>
        {record.mode === 'weakness' && (
          <span className="text-xs text-orange-500 font-semibold">약점</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${avg >= 60 ? 'text-green-600' : avg >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
          {avg.toFixed(1)}점
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          record.isPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
        }`}>
          {record.isPass ? '합격' : '불합격'}
        </span>
      </div>
    </div>
  )
}

// ── 합격 예측 계산 ─────────────────────────────────────────────────────────────
function calcPassPrediction(records) {
  if (records.length === 0) return null
  const recent   = records.slice(-5)
  const avgScore = recent.reduce((sum, r) => sum + Number(r.totalAverage), 0) / recent.length

  // 평균 점수 → 합격 확률 (60점 기준)
  const diff = avgScore - 60
  let probability
  if      (diff >= 10) probability = 95
  else if (diff >= 5)  probability = 85
  else if (diff >= 0)  probability = 65
  else if (diff >= -5) probability = 40
  else if (diff >= -10) probability = 20
  else                  probability = 10

  return { avgScore: Math.round(avgScore * 10) / 10, probability, count: recent.length }
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function CustomMockStats() {
  const navigate   = useNavigate()
  const userId     = useAuthStore(s => s.userId)
  const authStatus = useAuthStore(s => s.authStatus)

  const [originalRecords,  setOriginalRecords]  = useState([])
  const [customRecords,    setCustomRecords]     = useState([])
  const [weaknessAnalysis, setWeaknessAnalysis]  = useState(null)
  const [filter,   setFilter]   = useState('전체')
  const [isLoading, setIsLoading] = useState(true)

  // ── 데이터 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // 1. 원본 모의고사 이력
        if (authStatus === 'authenticated' && userId) {
          const history   = await mockExamSupabase.getSessionHistory(userId)
          const completed = Object.entries(history)
            .filter(([, s]) => s.isComplete)
            .map(([round, s]) => ({
              id:           `mock-${round}`,
              type:         'original',
              label:        `${round}회`,
              totalAverage: Number(s.totalAverage),
              isPass:       s.isPass,
            }))
            .sort((a, b) => parseInt(a.label) - parseInt(b.label))
          setOriginalRecords(completed)
        } else {
          setOriginalRecords(buildGuestOriginalStats())
        }

        // 2. 맞춤 모의고사 이력 (레벨5 = 항상 인증 회원)
        if (userId) {
          const customHistory = await customMockSupabase.getSessionHistory(userId)
          const custom = [...customHistory].reverse().map((s, idx) => ({
            id:           s.id,
            type:         'custom',
            label:        `맞춤 ${idx + 1}회`,
            mode:         s.mode,
            totalAverage: Number(s.total_average),
            isPass:       s.is_pass,
            createdAt:    s.created_at,
          }))
          setCustomRecords(custom)
        }

        // 3. 약점 분석 (세부과목 정답률)
        if (userId) {
          const analysis = await analyzeWeakness(userId)
          setWeaknessAnalysis(analysis)
        }
      } catch (err) {
        console.warn('[CustomMockStats] 로드 실패:', err.message)
        setOriginalRecords(buildGuestOriginalStats())
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authStatus, userId])

  // ── 필터 적용 ─────────────────────────────────────────────────────────────────
  const filteredOriginal = filter === '맞춤만' ? [] : originalRecords
  const filteredCustom   = filter === '원본만' ? [] : customRecords
  const allFiltered      = [...filteredOriginal, ...filteredCustom]

  // ── 집계 ─────────────────────────────────────────────────────────────────────
  const totalAttempts = allFiltered.length
  const passCount     = allFiltered.filter(r => r.isPass).length
  const failCount     = totalAttempts - passCount
  const passRate      = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0
  const avgScore      = totalAttempts > 0
    ? Math.round((allFiltered.reduce((sum, r) => sum + Number(r.totalAverage), 0) / totalAttempts) * 10) / 10
    : 0

  const prediction = calcPassPrediction(allFiltered)

  // 약점 수렴 분석: 정답률 낮은 순 상위 6개 세부과목
  const weaknessList = weaknessAnalysis
    ? Object.entries(weaknessAnalysis.subjectStats)
        .sort((a, b) => a[1].accuracy - b[1].accuracy)
        .slice(0, 6)
    : []

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/custom-mock')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="맞춤 모의고사 홈으로"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">전체 모의고사 통계</h1>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-400 animate-pulse">통계를 불러오는 중···</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── 필터 탭 ─────────────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* 유형별 현황 (전체 필터 시) */}
          {filter === '전체' && (originalRecords.length > 0 || customRecords.length > 0) && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-500">유형별 현황</p>
              {originalRecords.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    <span className="text-gray-600">원본 모의고사</span>
                  </span>
                  <span className="text-gray-700 font-semibold">
                    {originalRecords.length}회 · 평균{' '}
                    {(originalRecords.reduce((s, r) => s + r.totalAverage, 0) / originalRecords.length).toFixed(1)}점
                  </span>
                </div>
              )}
              {customRecords.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                    <span className="text-gray-600">맞춤 모의고사</span>
                  </span>
                  <span className="text-gray-700 font-semibold">
                    {customRecords.length}회 · 평균{' '}
                    {(customRecords.reduce((s, r) => s + r.totalAverage, 0) / customRecords.length).toFixed(1)}점
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 데이터 없음 */}
          {totalAttempts === 0 && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="text-4xl">📊</span>
              <p className="text-base font-semibold text-gray-600">
                {filter === '원본만' ? '원본 모의고사 기록이 없습니다' :
                 filter === '맞춤만' ? '맞춤 모의고사 기록이 없습니다' :
                 '아직 완료한 모의고사가 없습니다'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/mock')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  원본 모의고사
                </button>
                <button
                  onClick={() => navigate('/custom-mock')}
                  className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                >
                  맞춤 모의고사
                </button>
              </div>
            </div>
          )}

          {totalAttempts > 0 && (
            <>
              {/* ── 전체 요약 ───────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-500 px-1">전체 요약</p>
                <div className="grid grid-cols-3 gap-2">
                  <SummaryCard label="총 응시" value={totalAttempts} sub="회" />
                  <SummaryCard
                    label="합격률"
                    value={`${passRate}%`}
                    sub={`${passCount}합 ${failCount}불`}
                    color={passRate >= 60 ? 'text-green-600' : passRate > 0 ? 'text-amber-500' : 'text-red-500'}
                  />
                  <SummaryCard
                    label="평균 점수"
                    value={avgScore.toFixed(1)}
                    sub="점"
                    color={avgScore >= 60 ? 'text-green-600' : avgScore >= 40 ? 'text-amber-500' : 'text-red-500'}
                  />
                </div>
              </div>

              {/* ── 점수 추이 차트 ──────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-500 px-1">📈 점수 추이</p>
                <div className="rounded-2xl bg-white border border-gray-200 px-3 py-4">
                  <DualLineChart
                    originalRecords={filteredOriginal}
                    customRecords={filteredCustom}
                  />
                  {/* 범례 */}
                  <div className="flex flex-wrap gap-3 justify-center mt-2 text-xs text-gray-400">
                    {filteredOriginal.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 border-t-2 border-blue-500 inline-block" />
                        원본 모의고사
                      </span>
                    )}
                    {filteredCustom.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 border-t-2 border-dashed border-green-500 inline-block" />
                        맞춤 모의고사
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="w-4 border-t border-dashed border-indigo-400 inline-block" /> 합격선(60점)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-4 border-t border-dashed border-amber-400 inline-block" /> 과목선(40점)
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 합격 예측 ───────────────────────────────────────────────── */}
              {prediction && (
                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-4 flex flex-col gap-3">
                  <p className="text-xs font-bold text-indigo-600">🔮 합격 예측</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500">최근 {prediction.count}회 평균</span>
                      <span className={`text-3xl font-bold ${prediction.avgScore >= 60 ? 'text-green-600' : prediction.avgScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {prediction.avgScore}점
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-gray-500">예상 합격 확률</span>
                      <span className={`text-3xl font-bold ${prediction.probability >= 65 ? 'text-green-600' : prediction.probability >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {prediction.probability}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${prediction.probability >= 65 ? 'bg-green-500' : prediction.probability >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${prediction.probability}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">* 과목별 최소 40점 유지 시 기준</p>
                </div>
              )}

              {/* ── 약점 수렴 분석 ──────────────────────────────────────────── */}
              {weaknessList.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-gray-500 px-1">🎯 약점 수렴 분석</p>
                  <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-2.5">
                    <p className="text-[11px] text-gray-400">전체 MCQ 풀이 기준 · 정답률 낮은 세부과목</p>
                    {weaknessList.map(([sub, stat]) => (
                      <div key={sub} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-600 w-20 shrink-0">{sub}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${stat.accuracy >= 60 ? 'bg-green-400' : stat.accuracy >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${stat.accuracy}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold tabular-nums w-9 text-right ${stat.accuracy >= 60 ? 'text-green-600' : stat.accuracy >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                          {stat.accuracy}%
                        </span>
                        <span className="text-xs text-gray-300 tabular-nums">({stat.total})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 응시 이력 ───────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-500 px-1">응시 이력</p>
                <div className="flex flex-col gap-2">
                  {filteredCustom.length > 0 && (
                    <>
                      {filter === '전체' && filteredOriginal.length > 0 && (
                        <p className="text-[11px] text-gray-400 px-1">맞춤 모의고사</p>
                      )}
                      {filteredCustom.map(record => (
                        <HistoryRow key={record.id} record={record} />
                      ))}
                    </>
                  )}
                  {filteredOriginal.length > 0 && (
                    <>
                      {filter === '전체' && filteredCustom.length > 0 && (
                        <p className="text-[11px] text-gray-400 px-1 mt-1">원본 모의고사</p>
                      )}
                      {filteredOriginal.map(record => (
                        <HistoryRow key={record.id} record={record} />
                      ))}
                    </>
                  )}
                </div>
              </div>

            </>
          )}
        </>
      )}

    </div>
  )
}

/**
 * src/components/stats/PredictionCard.jsx
 * 예측 점수 카드 (최근 N회 중앙값·추세·신뢰구간)
 * GEP_087 Phase 6-2 STEP 2
 *
 * Props:
 *   records : Array<{totalAverage?:number, total_average?:number}>
 *             시간순 정렬된 응시 기록 배열
 */

import { useState } from 'react'
import { calculatePredictedScore, MIN_DATA_REQUIRED } from '../../services/advancedStatsService'

const TREND_ICON  = { up: '🔼', down: '🔽', stable: '→' }
const TREND_LABEL = { up: '상승 추세', down: '하락 추세', stable: '유지 중' }
const TREND_COLOR = { up: 'text-green-600', down: 'text-red-500', stable: 'text-gray-500' }

function scoreColor(score) {
  if (score >= 60) return 'text-green-600'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-500'
}

function scoreBarColor(score) {
  if (score >= 60) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-red-400'
}

export default function PredictionCard({ records }) {
  const [recentN, setRecentN] = useState(5)

  const result   = calculatePredictedScore(records ?? [], recentN)
  const hasError = !!result.error
  const canUse10 = (records?.length ?? 0) >= 10

  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-3">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500">📈 예측 점수</p>
        <div className="flex gap-1">
          {[5, 10].map(n => (
            <button
              key={n}
              onClick={() => setRecentN(n)}
              disabled={n === 10 && !canUse10}
              className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors
                ${recentN === n
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
                ${n === 10 && !canUse10 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {n}회
            </button>
          ))}
        </div>
      </div>

      {/* 데이터 부족 */}
      {hasError && (
        <div className="py-4 text-center flex flex-col items-center gap-2">
          <span className="text-2xl">📊</span>
          <p className="text-xs text-gray-500">
            예측에 필요한 데이터가 부족합니다
          </p>
          <p className="text-[11px] text-gray-400">
            최소 {MIN_DATA_REQUIRED}회 이상 완료 후 확인 가능
            <span className="ml-1 text-gray-300">({result.dataCount}회 보유)</span>
          </p>
        </div>
      )}

      {/* 결과 */}
      {!hasError && (
        <>
          {/* 중앙값 + 추세 */}
          <div className="flex items-end gap-3">
            <div>
              <span className="text-[11px] text-gray-400 leading-none">예측 점수 (중앙값)</span>
              <div className="flex items-end gap-1.5 mt-0.5">
                <span className={`text-3xl font-bold tabular-nums ${scoreColor(result.median)}`}>
                  {result.median.toFixed(1)}
                </span>
                <span className="text-sm text-gray-400 mb-0.5">점</span>
              </div>
            </div>
            <div className="mb-1 flex flex-col items-end gap-0.5">
              <span className="text-xl leading-none">{TREND_ICON[result.trend]}</span>
              <span className={`text-[11px] font-semibold ${TREND_COLOR[result.trend]}`}>
                {TREND_LABEL[result.trend]}
              </span>
              {result.trend !== 'stable' && (
                <span className="text-[10px] text-gray-400">
                  회당 {result.trendValue > 0 ? '+' : ''}{result.trendValue}점
                </span>
              )}
            </div>
          </div>

          {/* 진행 바 + 합격선 */}
          <div className="flex flex-col gap-1.5">
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all ${scoreBarColor(result.median)}`}
                style={{ width: `${result.median}%` }}
              />
              {/* 합격선(60점) 마커 */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-indigo-400"
                style={{ left: '60%' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">0점</span>
              <span className="text-[10px] text-indigo-500 font-semibold">합격선 60점</span>
              <span className="text-[10px] text-gray-400">100점</span>
            </div>
          </div>

          {/* 95% 신뢰구간 */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">95% 신뢰구간</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">
              {result.confidenceMin} ~ {result.confidenceMax}점
            </span>
          </div>

          <p className="text-[10px] text-gray-400">
            * 최근 {recentN}회({result.dataCount}회 보유) 기준 · 실제 점수와 다를 수 있습니다
          </p>
        </>
      )}
    </div>
  )
}

/**
 * src/components/stats/PassProbabilityCard.jsx
 * 합격 확률 카드 (Monte Carlo 시뮬레이션 기반)
 * GEP_087 Phase 6-2 STEP 2
 *
 * Props:
 *   records : Array — 시간순 응시 기록
 *             Full mode:     [{법령:number, 손보1부:number, 손보2부:number}, ...]
 *             Estimated mode: [{totalAverage:number}, ...]
 */

import CircularGauge from './CircularGauge'
import { calculatePassProbability, MIN_DATA_REQUIRED } from '../../services/advancedStatsService'

const SUBJECTS = ['법령', '손보1부', '손보2부']
const RISK_THRESHOLD = 72   // 이하: 위험 과목 강조

function subjectColor(subject) {
  return { '법령': 'text-blue-600', '손보1부': 'text-green-600', '손보2부': 'text-purple-600' }[subject] ?? 'text-gray-600'
}

function riskStyle(prob) {
  if (prob >= 80)          return { bg: 'bg-green-50',  border: 'border-green-100', text: 'text-green-700' }
  if (prob >= RISK_THRESHOLD) return { bg: 'bg-amber-50',  border: 'border-amber-100', text: 'text-amber-700' }
  return                          { bg: 'bg-red-50',    border: 'border-red-100',   text: 'text-red-700'   }
}

export default function PassProbabilityCard({ records }) {
  const result   = calculatePassProbability(records ?? [])
  const hasError = !!result.error

  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-4">

      {/* 헤더 */}
      <p className="text-xs font-bold text-gray-500">🎯 합격 확률 예측</p>

      {/* 데이터 부족 */}
      {hasError && (
        <div className="py-4 text-center flex flex-col items-center gap-2">
          <span className="text-2xl">🎯</span>
          <p className="text-xs text-gray-500">합격 확률 계산에 필요한 데이터가 부족합니다</p>
          <p className="text-[11px] text-gray-400">
            최소 {MIN_DATA_REQUIRED}회 이상 완료 후 확인 가능
            <span className="ml-1 text-gray-300">({result.dataCount}회 보유)</span>
          </p>
        </div>
      )}

      {/* 결과 */}
      {!hasError && (
        <>
          {/* 종합 확률 — CircularGauge */}
          <div className="flex flex-col items-center gap-1">
            <CircularGauge
              value={result.overall}
              size={100}
              label="종합 합격 확률"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              {result.mode === 'full' ? '과목별 독립 시뮬레이션' : '전체 평균 기반 추정'}
              &nbsp;·&nbsp;{result.simulationCount.toLocaleString()}회
            </p>
          </div>

          {/* 과목별 확률 (full mode) */}
          {result.mode === 'full' && result.subjectProbs && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-gray-400 font-semibold">과목별 40점+ 확률</p>
              {SUBJECTS.map(s => {
                const prob = result.subjectProbs[s] ?? 0
                const st   = riskStyle(prob)
                const isRisk = prob <= RISK_THRESHOLD
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-3 rounded-xl border ${st.border} ${st.bg} px-3 py-2.5`}
                  >
                    <span className={`text-sm font-semibold ${subjectColor(s)} w-16`}>{s}</span>
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${prob >= 80 ? 'bg-green-400' : prob >= RISK_THRESHOLD ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${prob}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold tabular-nums w-10 text-right ${st.text}`}>
                      {prob}%
                    </span>
                    {isRisk && (
                      <span className="text-xs text-red-500 font-bold">⚠️</span>
                    )}
                  </div>
                )
              })}
              <p className="text-[10px] text-gray-400">* ⚠️ 표시: {RISK_THRESHOLD}% 이하 위험 과목</p>
            </div>
          )}

          {/* estimated mode 안내 */}
          {result.mode === 'estimated' && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
              <p className="text-xs text-blue-600">
                💡 과목별 점수 기록이 없어 전체 평균 기반으로 추정됩니다.
                원본·맞춤 모의고사를 완료하면 과목별 세부 분석이 가능합니다.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

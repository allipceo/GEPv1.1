/**
 * src/components/stats/DifficultyAnalysis.jsx
 * 난이도별 정답률 분석 카드
 * GEP_087 Phase 6-2 STEP 2
 *
 * exams.json에 difficulty 필드가 없어 현재는 안내 메시지만 표시
 * → analyzeWeaknessByDifficulty() 연동, NO_DIFFICULTY_DATA 처리
 *
 * Props: 없음 (데이터 없는 stub 전용)
 */

import { analyzeWeaknessByDifficulty } from '../../services/advancedStatsService'

const DIFFICULTY_META = [
  { key: 'hard',   label: '상', emoji: '🔴', desc: '고난도 문제' },
  { key: 'medium', label: '중', emoji: '🟡', desc: '중간 난도'   },
  { key: 'easy',   label: '하', emoji: '🟢', desc: '기초 문제'   },
]

export default function DifficultyAnalysis() {
  const result   = analyzeWeaknessByDifficulty()
  const hasError = result.error === 'NO_DIFFICULTY_DATA'
  const hasData  = !hasError && (result.hard || result.medium || result.easy)

  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-3">

      {/* 헤더 */}
      <p className="text-xs font-bold text-gray-500">📊 난이도별 정답률</p>

      {/* NO_DIFFICULTY_DATA 안내 */}
      {hasError && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-4 flex flex-col items-center gap-3 text-center">
          <span className="text-2xl">🔧</span>
          <p className="text-xs font-semibold text-gray-600">난이도 데이터 준비 중</p>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            현재 문제 데이터에 난이도 정보가 포함되어 있지 않습니다.
            <br />추후 업데이트를 통해 상·중·하 난이도별 분석을 제공할 예정입니다.
          </p>
          <div className="flex gap-3 mt-1">
            {DIFFICULTY_META.map(d => (
              <div
                key={d.key}
                className="flex flex-col items-center gap-1 opacity-30"
              >
                <span className="text-xl">{d.emoji}</span>
                <span className="text-[10px] font-bold text-gray-500">{d.label}</span>
                <span className="text-[10px] text-gray-400">--%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 데이터 있을 경우 (미래 구현용 렌더 구조) */}
      {hasData && (
        <div className="flex flex-col gap-2">
          {DIFFICULTY_META.map(({ key, label, emoji }) => {
            const stat = result[key]
            if (!stat) return null
            const { accuracy, correct, total } = stat
            const barColor = accuracy >= 80 ? 'bg-green-500' : accuracy >= 60 ? 'bg-amber-400' : 'bg-red-400'
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-lg w-5">{emoji}</span>
                <span className="text-xs font-semibold text-gray-700 w-4">{label}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${barColor}`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums text-gray-700 w-10 text-right">
                  {accuracy}%
                </span>
                <span className="text-[10px] text-gray-400 w-12 text-right">
                  {correct}/{total}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

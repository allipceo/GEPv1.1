/**
 * StatsPanel.jsx — 통계 표시 패널 (두 가지 모드)
 *
 * [Question.jsx 용 — 기본 모드]
 *   props: subSubject, isVisible, stats
 *   정답 확인 후 자동 펼침. 세부과목 누적현황 / 금일현황.
 *
 * [Home.jsx 용 — homeMode]
 *   props: homeMode=true, allStats
 *   레벨1 로컬 통계 요약: 누적/금일 풀이+정답, 3과목별 정답률.
 */

// 3과목 → 세부과목 매핑 (statsStore.bySubject 키와 일치)
const MAIN_SUBJECTS = [
  { label: '법령',   color: 'text-blue-600',   subs: ['보험업법', '상법', '세제재무', '위험관리'] },
  { label: '손보1부', color: 'text-green-600',  subs: ['보증보험', '연금저축', '자동차보험', '특종보험'] },
  { label: '손보2부', color: 'text-purple-600', subs: ['재보험', '항공우주', '해상보험', '화재보험'] },
]

export default function StatsPanel({
  // Question.jsx 용
  subSubject, isVisible, stats,
  // Home.jsx 용
  homeMode = false, allStats,
}) {

  // ── Home.jsx 용 — 통계 요약 패널 ──────────────────────────────
  if (homeMode && allStats) {
    const { total, daily, bySubject } = allStats
    const today     = new Date().toISOString().slice(0, 10)
    const todayData = daily[today] ?? { solved: 0, correct: 0 }

    return (
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500">학습 현황</p>

        {/* 누적 풀이수 / 정답수 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg py-3 text-center shadow-sm">
            <p className="text-xl font-bold text-gray-900">{total.solved.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">누적 풀이</p>
          </div>
          <div className="bg-white rounded-lg py-3 text-center shadow-sm">
            <p className="text-xl font-bold text-green-600">{total.correct.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">누적 정답</p>
          </div>
        </div>

        {/* 금일 풀이수 / 정답수 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg py-2 text-center shadow-sm">
            <p className="text-lg font-bold text-gray-900">{todayData.solved}</p>
            <p className="text-xs text-gray-500 mt-0.5">금일 풀이</p>
          </div>
          <div className="bg-white rounded-lg py-2 text-center shadow-sm">
            <p className="text-lg font-bold text-blue-600">{todayData.correct}</p>
            <p className="text-xs text-gray-500 mt-0.5">금일 정답</p>
          </div>
        </div>

        {/* 3과목별 정답률 */}
        <div className="flex flex-col gap-1.5">
          {MAIN_SUBJECTS.map(({ label, color, subs }) => {
            const agg = subs.reduce(
              (acc, sub) => {
                const d = bySubject[sub] ?? { solved: 0, correct: 0 }
                return { solved: acc.solved + d.solved, correct: acc.correct + d.correct }
              },
              { solved: 0, correct: 0 }
            )
            const pct = agg.solved > 0 ? Math.round((agg.correct / agg.solved) * 100) : null
            return (
              <div key={label} className="flex items-center justify-between px-1">
                <span className={`text-xs font-semibold ${color}`}>{label}</span>
                <span className="text-xs text-gray-500">
                  {pct !== null ? `${agg.correct}/${agg.solved} (${pct}%)` : '미학습'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Question.jsx 용 — 정답 후 소형 패널 ──────────────────────
  const { cumulative, daily } = stats

  const fmt = (s) => {
    if (s.solved === 0) return '0/0 (-)'
    const pct = Math.round((s.correct / s.solved) * 100)
    return `${s.correct}/${s.solved} (${pct}%)`
  }

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        isVisible ? 'max-h-16 mt-2' : 'max-h-0'
      }`}
    >
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-xs">
        <div className="flex justify-between text-gray-600">
          <span className="font-semibold">{subSubject} 누적</span>
          <span>{fmt(cumulative)}</span>
        </div>
        <div className="flex justify-between text-gray-600 mt-1">
          <span className="font-semibold">금일현황</span>
          <span>{fmt(daily)}</span>
        </div>
      </div>
    </div>
  )
}

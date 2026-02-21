/**
 * StatsPanel.jsx — 통계 표시 패널
 *
 * 정답 확인 후 자동 펼침 (isVisible=true). 누적현황 / 금일현황 표시.
 *
 * props:
 *   subSubject : string   — 현재 과목명 (누적현황 레이블)
 *   isVisible  : boolean  — 정답확인 시 true, 미확인 시 false
 *   stats      : { cumulative: {solved, correct}, daily: {solved, correct} }
 */
export default function StatsPanel({ subSubject, isVisible, stats }) {
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

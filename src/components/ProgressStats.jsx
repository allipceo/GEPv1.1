/**
 * ProgressStats.jsx — 누적 완료 / 진도율 / 정답률 3수치
 *
 * props:
 *   total : { solved: number, correct: number } — statsStore.stats.total
 */

const TOTAL_QUESTIONS = 1080

export default function ProgressStats({ total }) {
  const solved  = total.solved  ?? 0
  const correct = total.correct ?? 0

  const accPct  = solved > 0 ? Math.round((correct / solved) * 100) : 0
  const progPct = Math.min(100, Math.round((solved / TOTAL_QUESTIONS) * 100))

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">누적현황</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded-lg py-2 shadow-sm">
          <p className="text-xl font-bold text-gray-900">{solved.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">누적 완료</p>
        </div>
        <div className="bg-white rounded-lg py-2 shadow-sm">
          <p className="text-xl font-bold text-blue-600">{progPct}%</p>
          <p className="text-xs text-gray-500 mt-0.5">진도율</p>
        </div>
        <div className="bg-white rounded-lg py-2 shadow-sm">
          <p className="text-xl font-bold text-green-600">{accPct}%</p>
          <p className="text-xs text-gray-500 mt-0.5">정답률</p>
        </div>
      </div>
    </div>
  )
}

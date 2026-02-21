/**
 * TodayStats.jsx — 금일 문제 / 정답 / 정답률 3수치
 *
 * props:
 *   daily : { solved: number, correct: number } — 오늘 날짜 통계
 */
export default function TodayStats({ daily }) {
  const solved  = daily.solved  ?? 0
  const correct = daily.correct ?? 0
  const pct     = solved > 0 ? Math.round((correct / solved) * 100) : 0

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">금일현황</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded-lg py-2 shadow-sm">
          <p className="text-xl font-bold text-gray-900">{solved}</p>
          <p className="text-xs text-gray-500 mt-0.5">문제</p>
        </div>
        <div className="bg-white rounded-lg py-2 shadow-sm">
          <p className="text-xl font-bold text-gray-900">{correct}</p>
          <p className="text-xs text-gray-500 mt-0.5">정답</p>
        </div>
        <div className="bg-white rounded-lg py-2 shadow-sm">
          <p className="text-xl font-bold text-green-600">{pct}%</p>
          <p className="text-xs text-gray-500 mt-0.5">정답률</p>
        </div>
      </div>
    </div>
  )
}

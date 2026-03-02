/**
 * src/components/wrong/ReclassificationAnimation.jsx
 * 오답 복습 결과 Before/After 시각화
 * GEP_097 Phase 6-3 STEP 2
 *
 * Props:
 *   beforeCount   (number)  — 복습 전 총 오답 수
 *   afterCorrect  (number)  — 이번 복습에서 정답 처리된 수 (오답 목록에서 삭제)
 *   afterWrong    (number)  — 이번 복습에서 오답 처리된 수 (wrong_count +1)
 *   subjectSummary (array)  — [{ subject, correct, wrong }] 과목별 성과 (optional)
 *   isVisible      (boolean) — 애니메이션 표시 여부 (기본 true)
 */

// 성과 색상
function resultColor(value, total) {
  if (total === 0) return 'text-gray-300'
  const pct = (value / total) * 100
  if (pct >= 70) return 'text-green-600'
  if (pct >= 40) return 'text-amber-500'
  return 'text-red-500'
}

// 과목 색상
const SUBJECT_COLOR = {
  '법령':   'text-blue-600',
  '손보1부': 'text-green-600',
  '손보2부': 'text-purple-600',
}

export default function ReclassificationAnimation({
  beforeCount     = 0,
  afterCorrect    = 0,
  afterWrong      = 0,
  subjectSummary  = [],
  isVisible       = true,
}) {
  if (!isVisible) return null

  const afterCount  = beforeCount - afterCorrect  // 남은 오답 수
  const correctPct  = beforeCount > 0 ? Math.round((afterCorrect / beforeCount) * 100) : 0

  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-4">

      {/* 헤더 */}
      <p className="text-xs font-bold text-gray-500">🔄 복습 결과</p>

      {/* Before / After 비교 */}
      <div className="flex items-center gap-3">

        {/* Before */}
        <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 text-center">
          <p className="text-[10px] text-gray-400 mb-1">복습 전</p>
          <p className="text-2xl font-bold text-gray-700 tabular-nums">{beforeCount}</p>
          <p className="text-[10px] text-gray-400">문제</p>
        </div>

        {/* 화살표 */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-lg text-gray-300">→</span>
        </div>

        {/* After */}
        <div className="flex-1 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-3 text-center">
          <p className="text-[10px] text-indigo-400 mb-1">복습 후</p>
          <p className="text-2xl font-bold text-indigo-700 tabular-nums">{afterCount}</p>
          <p className="text-[10px] text-indigo-400">문제</p>
        </div>
      </div>

      {/* 삭제 + 누적 결과 */}
      <div className="grid grid-cols-2 gap-2">

        {/* 정답 처리 (삭제) */}
        <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2.5 flex flex-col gap-0.5">
          <p className="text-[10px] text-green-500 font-semibold">✅ 삭제</p>
          <p className={`text-lg font-bold tabular-nums ${resultColor(afterCorrect, beforeCount)}`}>
            {afterCorrect}개
          </p>
          <p className="text-[10px] text-gray-400">오답 목록에서 제거</p>
        </div>

        {/* 오답 누적 */}
        <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 flex flex-col gap-0.5">
          <p className="text-[10px] text-red-400 font-semibold">➡️ 누적</p>
          <p className="text-lg font-bold tabular-nums text-red-600">{afterWrong}개</p>
          <p className="text-[10px] text-gray-400">wrong_count +1 반영</p>
        </div>
      </div>

      {/* 정답률 바 */}
      {beforeCount > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">이번 복습 정답률</span>
            <span className={`text-sm font-bold tabular-nums ${resultColor(afterCorrect, beforeCount)}`}>
              {correctPct}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500
                ${correctPct >= 70 ? 'bg-green-400' : correctPct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${correctPct}%` }}
            />
          </div>
        </div>
      )}

      {/* 과목별 성과 (optional) */}
      {subjectSummary.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-gray-400 font-semibold">과목별 성과</p>
          {subjectSummary.map(({ subject, correct, wrong }) => {
            const total = correct + wrong
            const pct   = total > 0 ? Math.round((correct / total) * 100) : 0
            const col   = SUBJECT_COLOR[subject] ?? 'text-gray-600'
            return (
              <div key={subject} className="flex items-center gap-2">
                <span className={`text-xs font-semibold w-16 shrink-0 ${col}`}>{subject}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] tabular-nums text-gray-500 w-20 text-right shrink-0">
                  {correct}정 / {wrong}오
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * src/components/wrong/WrongCountDistribution.jsx
 * 오답 횟수별 분포 현황 + 풀기 버튼
 * GEP_097 Phase 6-3 STEP 2
 *
 * Props:
 *   stats    (object) — { '6+': number, '5': number, '4': number,
 *                         '3': number, '2': number, '1': number }
 *   onStudy  (function) — (minCount: number) => void  "풀기" 버튼 핸들러
 */

// 구간별 시각화 설정
const ROWS = [
  { key: '6+', label: '6회+', color: 'bg-gray-900',   textColor: 'text-gray-900',   studyMin: null },
  { key: '5',  label: '5회',  color: 'bg-red-500',    textColor: 'text-red-600',    studyMin: 5    },
  { key: '4',  label: '4회',  color: 'bg-orange-400', textColor: 'text-orange-500', studyMin: 4    },
  { key: '3',  label: '3회',  color: 'bg-amber-400',  textColor: 'text-amber-600',  studyMin: 3    },
  { key: '2',  label: '2회',  color: 'bg-yellow-300', textColor: 'text-yellow-600', studyMin: null },
  { key: '1',  label: '1회',  color: 'bg-gray-200',   textColor: 'text-gray-500',   studyMin: null },
]

export default function WrongCountDistribution({ stats = {}, onStudy }) {
  const total = Object.values(stats).reduce((sum, v) => sum + (v ?? 0), 0)

  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-3">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500">📊 오답 횟수 분포</p>
        <span className="text-xs text-gray-400">총 {total}문제</span>
      </div>

      {/* 분포 행 */}
      <div className="flex flex-col gap-2">
        {ROWS.map(({ key, label, color, textColor, studyMin }) => {
          const count = stats[key] ?? 0
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <div key={key} className="flex items-center gap-2">

              {/* 레이블 */}
              <span className={`text-xs font-bold w-8 shrink-0 ${textColor}`}>{label}</span>

              {/* 진행 바 */}
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* 개수 + 퍼센트 */}
              <span className="text-xs tabular-nums text-gray-500 w-16 text-right shrink-0">
                {count}개 {total > 0 && <span className="text-gray-300">({pct}%)</span>}
              </span>

              {/* 풀기 버튼 (5회+, 4회+, 3회+만) */}
              {studyMin !== null ? (
                <button
                  onClick={() => onStudy?.(studyMin)}
                  disabled={count === 0}
                  className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full
                    bg-indigo-50 text-indigo-600 border border-indigo-200
                    hover:bg-indigo-100 active:bg-indigo-200 transition-colors
                    disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {studyMin}회+ 풀기
                </button>
              ) : (
                <span className="w-[62px] shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* 합계 안내 */}
      {total === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">오답 데이터가 없습니다</p>
      )}
    </div>
  )
}

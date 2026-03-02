/**
 * src/components/stats/WeaknessHeatmap.jsx
 * 세부과목별 약점 히트맵 (S1~S12 정답률 + 색상 바)
 * GEP_087 Phase 6-2 STEP 2
 *
 * Props:
 *   questionAttempts : Array<{sub_subject:string, is_correct:boolean|number}>
 *                      MCQ attempts 레코드
 */

import { analyzeWeaknessBySubject } from '../../services/advancedStatsService'

const PARENT_SECTIONS = [
  { parent: '법령',    label: '법령',    headerColor: 'bg-blue-50 text-blue-700 border-blue-100' },
  { parent: '손보1부', label: '손보1부', headerColor: 'bg-green-50 text-green-700 border-green-100' },
  { parent: '손보2부', label: '손보2부', headerColor: 'bg-purple-50 text-purple-700 border-purple-100' },
]

const LEVEL_BADGE = {
  good:   { label: '우수',   className: 'bg-green-100 text-green-700' },
  fair:   { label: '보통',   className: 'bg-amber-100 text-amber-700' },
  weak:   { label: '약점',   className: 'bg-red-100   text-red-700'   },
  nodata: { label: '미응시', className: 'bg-gray-100  text-gray-500'  },
}

export default function WeaknessHeatmap({ questionAttempts }) {
  const data = analyzeWeaknessBySubject(questionAttempts ?? [])

  const hasAnyData = data.some(d => d.total > 0)
  const totalAttempts = (questionAttempts ?? []).length

  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-4">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500">🗺 세부과목 약점 분석</p>
        {totalAttempts > 0 && (
          <span className="text-[10px] text-gray-400">총 {totalAttempts.toLocaleString()}회 기준</span>
        )}
      </div>

      {/* 데이터 없음 */}
      {!hasAnyData && (
        <div className="py-6 text-center flex flex-col items-center gap-2">
          <span className="text-2xl">🗺</span>
          <p className="text-xs text-gray-500">아직 풀이 기록이 없습니다</p>
          <p className="text-[11px] text-gray-400">문제를 풀면 세부과목별 정답률이 표시됩니다</p>
        </div>
      )}

      {/* 과목 그룹 섹션 */}
      {hasAnyData && PARENT_SECTIONS.map(({ parent, label, headerColor }) => {
        const items = data.filter(d => d.parent === parent)

        return (
          <div key={parent} className="flex flex-col gap-2">

            {/* 과목 헤더 */}
            <div className={`inline-flex items-center self-start px-2.5 py-0.5 rounded-full border text-xs font-bold ${headerColor}`}>
              {label}
            </div>

            {/* 세부과목 목록 */}
            <div className="flex flex-col gap-1.5">
              {items.map(d => {
                const badge = LEVEL_BADGE[d.level]
                return (
                  <div key={d.subjectKey} className="flex items-center gap-2">

                    {/* 과목명 */}
                    <span className="text-xs text-gray-700 w-16 shrink-0 font-medium">
                      {d.name}
                    </span>

                    {/* 정답률 바 */}
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      {d.accuracy !== null ? (
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${d.accuracy}%`, backgroundColor: d.color }}
                        />
                      ) : (
                        <div className="h-2 rounded-full bg-gray-200 w-full" />
                      )}
                    </div>

                    {/* 퍼센트 */}
                    <span
                      className="text-xs tabular-nums font-semibold w-9 text-right"
                      style={{ color: d.accuracy !== null ? d.color : '#9ca3af' }}
                    >
                      {d.accuracy !== null ? `${d.accuracy}%` : '-'}
                    </span>

                    {/* 레벨 배지 */}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-10 text-center ${badge.className}`}>
                      {badge.label}
                    </span>

                    {/* 시도 횟수 */}
                    <span className="text-[10px] text-gray-300 w-10 text-right tabular-nums">
                      {d.total > 0 ? `${d.total}회` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 범례 */}
      {hasAnyData && (
        <div className="flex gap-3 flex-wrap pt-1 border-t border-gray-100">
          {Object.entries(LEVEL_BADGE).filter(([k]) => k !== 'nodata').map(([, v]) => (
            <span key={v.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${v.className}`}>
              {v.label}
            </span>
          ))}
          <span className="text-[10px] text-gray-400 ml-auto">우수≥80 · 보통≥60 · 약점&lt;60</span>
        </div>
      )}
    </div>
  )
}

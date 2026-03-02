/**
 * src/components/stats/StudyRoadmap.jsx
 * ROI 기반 학습 로드맵 카드 (우선순위 Top 3 + 4주 타임라인)
 * GEP_087 Phase 6-2 STEP 2
 *
 * Props:
 *   questionAttempts : Array<{sub_subject:string, is_correct:boolean|number}>
 *                      MCQ attempts 레코드
 */

import {
  analyzeWeaknessBySubject,
  generateStudyRoadmap,
} from '../../services/advancedStatsService'

const PRIORITY_COLOR = [
  { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-500',    text: 'text-red-700'   },
  { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-500',  text: 'text-amber-700' },
  { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-500',   text: 'text-blue-700'  },
]

/** 학습일 → 주차 라벨 */
function daysToWeekLabel(days) {
  const w = Math.max(1, Math.round(days / 7))
  return w === 1 ? '1주' : `${w}주`
}

/** 순차 주차 할당 (priority 1부터) */
function assignWeeks(roadmap) {
  let cursor = 1
  return roadmap.map(item => {
    const weeks     = Math.max(1, Math.round(item.days / 7))
    const endWeek   = cursor + weeks - 1
    const weekLabel = weeks === 1 ? `${cursor}주차` : `${cursor}~${endWeek}주차`
    const result    = { ...item, weeks, weekLabel, startWeek: cursor, endWeek }
    cursor = endWeek + 1
    return result
  })
}

/** 4열 타임라인 셀 렌더 */
function Timeline({ roadmapWithWeeks }) {
  const TOTAL_WEEKS = 4
  const cells = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const weekNum = i + 1
    const item    = roadmapWithWeeks.find(r => r.startWeek <= weekNum && weekNum <= r.endWeek)
    return { weekNum, item }
  })

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] text-gray-400 font-semibold">4주 학습 계획</p>
      <div className="grid grid-cols-4 gap-1.5">
        {cells.map(({ weekNum, item }) => {
          const color = item ? PRIORITY_COLOR[item.priority - 1] : null
          return (
            <div key={weekNum} className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400 text-center">{weekNum}주차</span>
              <div
                className={`rounded-lg border px-1 py-2 flex flex-col items-center gap-0.5 text-center
                  ${color ? `${color.bg} ${color.border}` : 'bg-gray-50 border-gray-100'}`}
              >
                {item ? (
                  <>
                    <span className={`text-[10px] font-bold ${color.text}`}>
                      {item.name}
                    </span>
                    <span className="text-[9px] text-gray-400">{item.accuracy}%→{item.targetRate}%</span>
                  </>
                ) : (
                  <span className="text-[10px] text-gray-300">복습</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StudyRoadmap({ questionAttempts }) {
  const weaknessData = analyzeWeaknessBySubject(questionAttempts ?? [])
  const roadmap      = generateStudyRoadmap(weaknessData)
  const roadmapWithWeeks = assignWeeks(roadmap)

  const hasAnyAttempts = (questionAttempts ?? []).length > 0
  const hasRoadmap     = roadmap.length > 0

  return (
    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex flex-col gap-4">

      {/* 헤더 */}
      <p className="text-xs font-bold text-gray-500">🗺 맞춤 학습 로드맵</p>

      {/* 데이터 없음 */}
      {!hasAnyAttempts && (
        <div className="py-6 text-center flex flex-col items-center gap-2">
          <span className="text-2xl">🗺</span>
          <p className="text-xs text-gray-500">아직 풀이 기록이 없습니다</p>
          <p className="text-[11px] text-gray-400">문제를 풀면 맞춤 학습 계획이 생성됩니다</p>
        </div>
      )}

      {/* 모두 70점 이상 — 로드맵 없음 */}
      {hasAnyAttempts && !hasRoadmap && (
        <div className="py-4 text-center flex flex-col items-center gap-2">
          <span className="text-3xl">🏆</span>
          <p className="text-sm font-semibold text-green-600">모든 세부과목 70점 이상!</p>
          <p className="text-xs text-gray-400">현재 집중 학습이 필요한 취약 과목이 없습니다</p>
        </div>
      )}

      {/* 로드맵 Top 3 */}
      {hasRoadmap && (
        <>
          {/* 우선순위 카드 */}
          <div className="flex flex-col gap-2">
            {roadmapWithWeeks.map(item => {
              const color = PRIORITY_COLOR[item.priority - 1]
              return (
                <div
                  key={item.subjectKey}
                  className={`rounded-xl border ${color.border} ${color.bg} px-3 py-3 flex flex-col gap-2`}
                >
                  {/* 타이틀 행 */}
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${color.badge}`}>
                      {item.priority}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{item.name}</span>
                    <span className="text-[10px] text-gray-400">{item.parent}</span>
                    <span className="ml-auto text-[11px] text-gray-500 font-medium">{item.weekLabel}</span>
                  </div>

                  {/* 정답률 현황 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-red-400"
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-gray-600">
                      현재 {item.accuracy}% → 목표 {item.targetRate}%
                    </span>
                  </div>

                  {/* ROI + 학습법 */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-500 flex-1 leading-relaxed">
                      💡 {item.method}
                    </span>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-gray-400">
                        ROI {item.roi} · {daysToWeekLabel(item.days)} 소요
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 4주 타임라인 */}
          <Timeline roadmapWithWeeks={roadmapWithWeeks} />

          <p className="text-[10px] text-gray-400">
            * ROI = (목표-현재 정답률) ÷ 예상 학습일 · 높을수록 투자 대비 효과 큼
          </p>
        </>
      )}
    </div>
  )
}

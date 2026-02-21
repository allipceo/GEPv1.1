/**
 * SubjectStats.jsx — 12과목 정답률 바차트 (접이식, 부별)
 *
 * props:
 *   bySubject : { [subjectName]: { solved, correct } } — statsStore.stats.bySubject
 *
 * 색상 규칙:
 *   60% 이상 → 초록 (bg-green-500)
 *   40~60%   → 노랑 (bg-yellow-400)
 *   40% 미만  → 빨강 (bg-red-500) + ⚠️
 *   데이터 없음 → 회색 "-"
 */

import { useState } from 'react'

const SECTIONS = [
  {
    label:       '법령',
    headerColor: 'text-blue-600',
    bgColor:     'bg-blue-50',
    subs: ['보험업법', '상법', '세제재무', '위험관리'],
  },
  {
    label:       '손보1부',
    headerColor: 'text-green-600',
    bgColor:     'bg-green-50',
    subs: ['보증보험', '연금저축', '자동차보험', '특종보험'],
  },
  {
    label:       '손보2부',
    headerColor: 'text-purple-600',
    bgColor:     'bg-purple-50',
    subs: ['재보험', '항공우주', '해상보험', '화재보험'],
  },
]

function getBarColor(pct) {
  if (pct >= 60) return 'bg-green-500'
  if (pct >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

export default function SubjectStats({ bySubject }) {
  const [open, setOpen] = useState({ '법령': false, '손보1부': false, '손보2부': false })

  const toggle = (label) =>
    setOpen((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">과목별 정답률</p>
      <div className="flex flex-col gap-2">
        {SECTIONS.map((section) => (
          <div key={section.label} className="rounded-lg border border-gray-200 overflow-hidden">

            {/* 섹션 헤더 — 탭하여 접기/펼치기 */}
            <button
              className={`w-full flex justify-between items-center px-3 py-2 ${section.bgColor}`}
              onClick={() => toggle(section.label)}
            >
              <span className={`text-sm font-semibold ${section.headerColor}`}>
                {section.label}
              </span>
              <span className="text-gray-400 text-xs">
                {open[section.label] ? '▲' : '▼'}
              </span>
            </button>

            {/* 접이식 내용 */}
            {open[section.label] && (
              <div className="px-3 py-2 bg-white flex flex-col gap-2">
                {section.subs.map((sub) => {
                  const s = bySubject[sub]
                  if (!s || s.solved === 0) {
                    return (
                      <div key={sub} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16 shrink-0">{sub}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100" />
                        <span className="text-xs text-gray-400 w-10 text-right">-</span>
                      </div>
                    )
                  }

                  const pct      = Math.round((s.correct / s.solved) * 100)
                  const barColor = getBarColor(pct)
                  const warn     = pct < 40 ? ' ⚠️' : ''

                  return (
                    <div key={sub} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-16 shrink-0">{sub}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-700 w-12 text-right">
                        {pct}%{warn}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  )
}

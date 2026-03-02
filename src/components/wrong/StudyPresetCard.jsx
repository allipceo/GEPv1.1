/**
 * src/components/wrong/StudyPresetCard.jsx
 * 시험 D-Day 기반 학습 프리셋 카드
 * GEP_097 Phase 6-3 STEP 2
 *
 * Props:
 *   preset (object) — {
 *     title:       string,   // 프리셋 이름
 *     description: string,   // 설명
 *     targetCount: number,   // 목표 문제 수 (minCount 이상 오답)
 *     minCount:    number,   // 최소 오답 횟수 기준
 *     days:        number,   // 시험까지 남은 일수
 *   }
 *   totalMatched (number) — 해당 기준에 맞는 문제 수 (실제 데이터)
 *   onSelect     (function) — (preset) => void  "선택하기" 핸들러
 *   isSelected   (boolean) — 현재 선택된 프리셋 여부
 *
 * 내장 프리셋 3개 (외부에서 preset prop으로 전달):
 *   4주 전 (days>=28): 3회+ 오답
 *   2주 전 (days>=14): 4회+ 오답
 *   1주 전 (days>=7):  5회+ 오답
 */

// D-Day 레이블 포맷
function ddayLabel(days) {
  if (days <= 0)  return 'D-Day'
  if (days === 1) return 'D-1'
  return `D-${days}`
}

// D-Day 색상
function ddayStyle(days) {
  if (days <= 7)  return { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    badge: 'bg-red-500'    }
  if (days <= 14) return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', badge: 'bg-orange-500' }
  return                  { bg: 'bg-blue-50',  border: 'border-blue-200',   text: 'text-blue-600',   badge: 'bg-blue-500'   }
}

export default function StudyPresetCard({
  preset      = {},
  totalMatched = 0,
  onSelect,
  isSelected  = false,
}) {
  const { title = '', description = '', minCount = 3, days = 0 } = preset
  const style = ddayStyle(days)

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-col gap-2 transition-all
        ${isSelected
          ? 'border-indigo-400 bg-indigo-50 shadow-sm'
          : `${style.border} ${style.bg}`
        }`}
    >
      {/* 상단: D-Day 배지 + 제목 */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${style.badge}`}>
          {ddayLabel(days)}
        </span>
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <span className={`ml-auto text-xs font-bold tabular-nums ${style.text}`}>
          {minCount}회+ 기준
        </span>
      </div>

      {/* 설명 */}
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>

      {/* 문제 수 현황 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">해당 오답</span>
        <span className={`text-sm font-bold tabular-nums ${totalMatched > 0 ? style.text : 'text-gray-300'}`}>
          {totalMatched}문제
        </span>
        {totalMatched === 0 && (
          <span className="text-[11px] text-gray-300">— 해당 조건의 오답 없음</span>
        )}
      </div>

      {/* 선택하기 버튼 */}
      <button
        onClick={() => onSelect?.(preset)}
        disabled={totalMatched === 0}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors
          ${isSelected
            ? 'bg-indigo-600 text-white'
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
          }
          disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {isSelected ? '✓ 선택됨' : '선택하기'}
      </button>
    </div>
  )
}

// ── 기본 프리셋 정의 (페이지에서 import하여 사용) ─────────────────────────────

/**
 * 시험까지 남은 일수를 받아 3개 프리셋 배열 반환
 * @param {number} daysLeft — 시험까지 남은 일수
 * @returns {Array}
 */
export function buildStudyPresets(daysLeft = 28) {
  return [
    {
      title:       '4주 집중 플랜',
      description: '3회 이상 틀린 문제를 모두 정복합니다. 충분한 시간으로 꼼꼼히 학습하세요.',
      minCount:    3,
      days:        daysLeft,
    },
    {
      title:       '2주 압축 플랜',
      description: '4회 이상 틀린 핵심 오답에 집중합니다. 반복 실수를 빠르게 제거하세요.',
      minCount:    4,
      days:        Math.min(daysLeft, 14),
    },
    {
      title:       '1주 최종 플랜',
      description: '5회 이상 틀린 최고 난도 문제만 풉니다. 시험 직전 약점을 확인하세요.',
      minCount:    5,
      days:        Math.min(daysLeft, 7),
    },
  ]
}

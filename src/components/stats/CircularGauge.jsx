/**
 * src/components/stats/CircularGauge.jsx
 * 재사용 가능 SVG 원형 게이지
 * GEP_087 Phase 6-2 STEP 2
 *
 * Props:
 *   value   : number (0~100)
 *   size    : number (기본 80, px 단위)
 *   label   : string (게이지 아래 레이블)
 *   bgColor : string (배경 원 색상, 기본 #e5e7eb)
 */
export default function CircularGauge({
  value   = 0,
  size    = 80,
  label   = '',
  bgColor = '#e5e7eb',
}) {
  const pct  = Math.min(100, Math.max(0, Math.round(value)))
  const r    = size * 0.35
  const cx   = size / 2
  const cy   = size / 2
  const sw   = size * 0.10   // stroke-width
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  const gap  = circ - fill

  // 12시 방향 시작: dashoffset = circumference/4 (시계방향)
  const offset = circ / 4

  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
  const fs    = size * 0.22   // font-size

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`${label} ${pct}%`}
      >
        {/* 배경 원 */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={bgColor}
          strokeWidth={sw}
        />
        {/* 게이지 호 */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${fill.toFixed(2)} ${gap.toFixed(2)}`}
          strokeDashoffset={offset.toFixed(2)}
          strokeLinecap="round"
        />
        {/* 중앙 퍼센트 */}
        <text
          x={cx} y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fs}
          fontWeight="700"
          fill={color}
        >
          {pct}%
        </text>
      </svg>
      {label && (
        <span className="text-xs text-gray-500 font-medium leading-tight text-center">
          {label}
        </span>
      )}
    </div>
  )
}

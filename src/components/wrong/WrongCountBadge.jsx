/**
 * src/components/wrong/WrongCountBadge.jsx
 * 오답 횟수 시각화 배지
 * GEP_097 Phase 6-3 STEP 2
 *
 * Props:
 *   wrongCount (number) — 오답 횟수
 *
 * 표시 규칙:
 *   6회+ : ⚫ × count  (black, 최대 6개 표시)
 *   5회  : 🔥 × 5     (red-600)
 *   4회  : ⚠️ × 4     (orange-500)
 *   1~3회: ● × count  (gray, 원형 개수만)
 */

// 횟수별 시각화 설정
const BADGE_CONFIG = {
  high:   { icon: '⚫', color: 'text-gray-900', label: '회' },   // 6+
  fire:   { icon: '🔥', color: 'text-red-600',  label: '회' },   // 5
  warn:   { icon: '⚠️', color: 'text-orange-500', label: '회' }, // 4
  normal: { icon: '●',  color: 'text-gray-400', label: '회' },   // 1~3
}

function getConfig(count) {
  if (count >= 6) return BADGE_CONFIG.high
  if (count === 5) return BADGE_CONFIG.fire
  if (count === 4) return BADGE_CONFIG.warn
  return BADGE_CONFIG.normal
}

export default function WrongCountBadge({ wrongCount = 1 }) {
  const count  = Math.max(1, Math.floor(wrongCount))
  const cfg    = getConfig(count)
  const dots   = Math.min(count, 6)  // 최대 6개 표시

  return (
    <span className={`inline-flex items-center gap-0.5 ${cfg.color}`}>
      {Array.from({ length: dots }, (_, i) => (
        <span key={i} className="text-[11px] leading-none">{cfg.icon}</span>
      ))}
      <span className="text-[10px] font-bold ml-0.5">{count}{cfg.label}</span>
    </span>
  )
}

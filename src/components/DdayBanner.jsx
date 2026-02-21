/**
 * DdayBanner.jsx — 사용자명 + D-day 표시
 *
 * props:
 *   name : string       — 사용자 이름 (없으면 기본 문구)
 *   dday : number|null  — 양수: 시험 전, 0: 당일, 음수: 지남, null: 미설정
 */
export default function DdayBanner({ name, dday }) {
  const ddayText =
    dday === null ? null
    : dday === 0  ? 'D-Day'
    : dday > 0    ? `D-${dday}`
    :               `D+${Math.abs(dday)}`

  const ddayColor =
    dday === null ? ''
    : dday === 0  ? 'text-red-600'
    : dday > 0    ? 'text-blue-600'
    :               'text-gray-500'

  return (
    <div className="flex justify-between items-center">
      <p className="text-sm font-semibold text-gray-700">
        {name ? `${name}님 안녕하세요!` : '오늘도 화이팅!'}
      </p>
      {ddayText && (
        <span className={`text-sm font-bold ${ddayColor}`}>{ddayText}</span>
      )}
    </div>
  )
}

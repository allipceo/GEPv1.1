/**
 * AnswerButton.jsx — 단일 답안 버튼
 * props만 보고 동작 (store 직접 참조 없음)
 */

const STATUS_STYLE = {
  default:  'bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer',
  correct:  'bg-green-500 text-white cursor-not-allowed',
  wrong:    'bg-red-500   text-white cursor-not-allowed',
  disabled: 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed',
}

export default function AnswerButton({ number, label, status = 'default', onClick }) {
  const isClickable = status === 'default'

  return (
    <button
      className={`flex-1 text-center px-2 py-2 rounded-lg text-lg font-medium transition-colors ${STATUS_STYLE[status]}`}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-label={`${number}번`}
    >
      {label}
    </button>
  )
}

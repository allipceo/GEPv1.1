/**
 * src/components/wrong/WrongQuestionCard.jsx
 * 오답 문제 카드 — 목록 아이템
 * GEP_097 Phase 6-3 STEP 2
 *
 * Props:
 *   question (object) — {
 *     id:            string,
 *     source:        'MCQ'|'OX'|'MOCK'|'CUSTOM',
 *     wrong_count:   number,
 *     sub_subject:   string,          // 세부과목명
 *     questionRaw:   string,          // 문제 원문 (첫 줄만 표시)
 *     last_wrong_at: string|null,     // ISO 날짜 문자열
 *   }
 *   onRetry (function) — (question) => void  "다시 풀기" 버튼 핸들러
 */

import WrongCountBadge from './WrongCountBadge'

// 소스 배지 설정
const SOURCE_BADGE = {
  MCQ:    { label: 'MCQ',    bg: 'bg-indigo-100', text: 'text-indigo-700' },
  OX:     { label: 'OX',     bg: 'bg-blue-100',   text: 'text-blue-700'   },
  MOCK:   { label: '모의',   bg: 'bg-green-100',  text: 'text-green-700'  },
  CUSTOM: { label: '맞춤',   bg: 'bg-purple-100', text: 'text-purple-700' },
}

/** 날짜 문자열 → "N일 전" 포맷 */
function relativeDate(isoStr) {
  if (!isoStr) return null
  try {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '오늘'
    if (diff === 1) return '어제'
    if (diff < 7)   return `${diff}일 전`
    if (diff < 30)  return `${Math.floor(diff / 7)}주 전`
    return `${Math.floor(diff / 30)}달 전`
  } catch {
    return null
  }
}

/** 문제 원문 첫 줄 추출 (최대 50자) */
function extractTitle(raw) {
  if (!raw) return '문제 내용 없음'
  const firstLine = raw.split('\n')[0].trim()
  return firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine
}

export default function WrongQuestionCard({ question = {}, onRetry }) {
  const {
    source      = 'MCQ',
    wrong_count = 1,
    sub_subject = '',
    questionRaw = '',
    last_wrong_at = null,
  } = question

  const src      = SOURCE_BADGE[source] ?? SOURCE_BADGE.MCQ
  const dateStr  = relativeDate(last_wrong_at)
  const title    = extractTitle(questionRaw)

  return (
    <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 flex flex-col gap-2">

      {/* 상단 행: 소스 배지 + 세부과목 + 날짜 */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${src.bg} ${src.text}`}>
          {src.label}
        </span>
        {sub_subject && (
          <span className="text-[11px] text-gray-500 font-medium">{sub_subject}</span>
        )}
        {dateStr && (
          <span className="text-[10px] text-gray-300 ml-auto">{dateStr}</span>
        )}
      </div>

      {/* 문제 제목 */}
      <p className="text-sm text-gray-800 leading-snug line-clamp-2">{title}</p>

      {/* 하단 행: 오답 배지 + 다시 풀기 */}
      <div className="flex items-center justify-between mt-0.5">
        <WrongCountBadge wrongCount={wrong_count} />
        <button
          onClick={() => onRetry?.(question)}
          className="text-xs font-semibold text-indigo-600 px-3 py-1 rounded-lg
            bg-indigo-50 border border-indigo-100
            hover:bg-indigo-100 active:bg-indigo-200 transition-colors"
        >
          다시 풀기
        </button>
      </div>
    </div>
  )
}

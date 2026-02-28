/**
 * src/pages/OXSubject.jsx — /ox/:subjectKey
 * OX 학습 세부과목 선택 화면
 * GEP_042 Phase4 STEP3
 *
 * 카드 5개: 전체(ALL) + 세부과목 4개 (oxSubjects.js subs 순서)
 * 카드 클릭: resetStore → loadQuestions → navigate /ox/:key/:subSubject
 */

import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useOxStore from '../stores/oxStore'
import { OX_SUBJECTS } from '../config/oxSubjects'

// 과목별 컬러 테마
const SUBJECT_THEME = {
  law: {
    border:      'border-blue-200',
    headerBg:    'bg-blue-50',
    headerText:  'text-blue-700',
    cardBorder:  'border-gray-100',
    accentText:  'text-blue-500',
    allBg:       'bg-blue-600',
  },
  p1: {
    border:      'border-green-200',
    headerBg:    'bg-green-50',
    headerText:  'text-green-700',
    cardBorder:  'border-gray-100',
    accentText:  'text-green-500',
    allBg:       'bg-green-600',
  },
  p2: {
    border:      'border-purple-200',
    headerBg:    'bg-purple-50',
    headerText:  'text-purple-700',
    cardBorder:  'border-gray-100',
    accentText:  'text-purple-500',
    allBg:       'bg-purple-600',
  },
}

export default function OXSubject() {
  const navigate     = useNavigate()
  const { subjectKey } = useParams()

  const isLoading        = useOxStore((s) => s.isLoading)
  const oxSubject        = useOxStore((s) => s.subject)
  const oxRoundNo        = useOxStore((s) => s.roundNo)
  const oxTotalCumulative = useOxStore((s) => s.totalCumulative)
  const resetStore       = useOxStore((s) => s.resetStore)
  const loadQuestions    = useOxStore((s) => s.loadQuestions)

  // subjectKey 유효성 검증 — config에 없으면 /ox 리다이렉트
  const subjectInfo = OX_SUBJECTS.find((s) => s.key === subjectKey)

  useEffect(() => {
    if (!subjectInfo) {
      navigate('/ox', { replace: true })
    }
  }, [subjectKey, subjectInfo, navigate])

  if (!subjectInfo) return null

  const theme = SUBJECT_THEME[subjectKey] ?? SUBJECT_THEME.law

  // 카드 클릭 핸들러
  const handleCardClick = async (subSubject) => {
    resetStore()
    await loadQuestions(subjectKey, subSubject)
    navigate(`/ox/${subjectKey}/${subSubject}`)
  }

  // 현재 로드된 과목이 이 화면 과목이면 실제값, 아니면 기본값
  const roundNo         = oxSubject === subjectKey ? oxRoundNo         : 1
  const totalCumulative = oxSubject === subjectKey ? oxTotalCumulative : 0

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단: ← 뒤로 + 타이틀 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/ox')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="뒤로"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {subjectInfo.label} · OX 학습
        </h1>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-400 animate-pulse">문제를 불러오는 중입니다 ···</p>
        </div>
      )}

      {/* 세부과목 카드 목록 */}
      {!isLoading && (
        <div className={`rounded-xl overflow-hidden border ${theme.border}`}>

          {/* 카드 1 — 전체(ALL) */}
          <button
            onClick={() => handleCardClick('ALL')}
            className={`w-full flex items-center justify-between px-4 py-4 ${theme.headerBg} hover:brightness-95 active:brightness-90 transition-all text-left`}
          >
            <div className="flex flex-col gap-0.5">
              <span className={`text-sm font-bold ${theme.headerText}`}>
                전체 ({subjectInfo.subs.length}과목 통합)
              </span>
              <span className={`text-xs ${theme.accentText}`}>
                Round {roundNo} · 누적 {totalCumulative}문항
              </span>
            </div>
            <span className="text-gray-400 text-lg">›</span>
          </button>

          {/* 카드 2~5 — 세부과목 4개 (subs 순서 그대로) */}
          {subjectInfo.subs.map((sub, idx) => (
            <button
              key={sub}
              onClick={() => handleCardClick(sub)}
              className={`w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 active:bg-gray-50 transition-colors text-left border-t ${theme.cardBorder}`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-800">{sub}</span>
                <span className="text-xs text-gray-400">
                  Round {roundNo} · 누적 {totalCumulative}문항
                </span>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          ))}

        </div>
      )}

    </div>
  )
}

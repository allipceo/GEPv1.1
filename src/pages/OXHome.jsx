/**
 * src/pages/OXHome.jsx — /ox
 * OX 학습 대분류 선택 화면
 * GEP_042 Phase4 STEP3
 *
 * 레벨 3 게이트: service_level < 3 이면 차단 화면 표시
 * 과목 카드 3개: oxSubjects.js config 기준 (하드코딩 금지)
 */

import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import useOxStore from '../stores/oxStore'
import { OX_SUBJECTS } from '../config/oxSubjects'
import { FEATURE_FLAGS } from '../config/featureFlags'

// 과목별 컬러 테마
const SUBJECT_THEME = {
  law: {
    bg:     'bg-blue-50',
    border: 'border-blue-200',
    label:  'text-blue-700',
    meta:   'text-blue-500',
    icon:   '📘',
  },
  p1: {
    bg:     'bg-green-50',
    border: 'border-green-200',
    label:  'text-green-700',
    meta:   'text-green-500',
    icon:   '📗',
  },
  p2: {
    bg:     'bg-purple-50',
    border: 'border-purple-200',
    label:  'text-purple-700',
    meta:   'text-purple-500',
    icon:   '📙',
  },
}

export default function OXHome() {
  const navigate = useNavigate()

  const serviceLevel = useAuthStore((s) => s.serviceLevel)

  // oxStore — 현재 로드된 과목의 진행 정보
  const oxSubject        = useOxStore((s) => s.subject)
  const oxRoundNo        = useOxStore((s) => s.roundNo)
  const oxTotalCumulative = useOxStore((s) => s.totalCumulative)

  // ── 레벨 게이트 (featureFlags.OX_MIN_LEVEL 기준) ─────────────────────────────
  if (serviceLevel < FEATURE_FLAGS.OX_MIN_LEVEL) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
            aria-label="홈으로"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">OX 진위형 학습</h1>
        </div>

        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-base font-semibold text-gray-700">레벨 3 전용 서비스입니다</p>
          <p className="text-sm text-gray-400">OX 진위형 학습은 레벨 {FEATURE_FLAGS.OX_MIN_LEVEL} 이상 회원만 이용할 수 있습니다.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:bg-gray-200 transition-colors"
          >
            ← 홈으로
          </button>
        </div>
      </div>
    )
  }

  // ── 정상 화면 ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

      {/* 상단: ← 홈 버튼 + 타이틀 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="홈으로"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">OX 진위형 학습</h1>
      </div>

      {/* 과목 카드 3개 */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500 px-1">과목 선택</p>

        {OX_SUBJECTS.map((subj) => {
          const theme = SUBJECT_THEME[subj.key] ?? SUBJECT_THEME.law

          // 크래시 가드: 현재 로드된 과목이 이 카드면 실제값, 아니면 기본값
          const roundNo        = oxSubject === subj.key ? oxRoundNo        : 1
          const totalCumulative = oxSubject === subj.key ? oxTotalCumulative : 0

          return (
            <button
              key={subj.key}
              onClick={() => navigate(`/ox/${subj.key}`)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border ${theme.bg} ${theme.border} hover:brightness-95 active:brightness-90 transition-all text-left`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{theme.icon}</span>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-base font-bold ${theme.label}`}>{subj.label}</span>
                  <span className={`text-xs ${theme.meta}`}>
                    Round {roundNo} · 누적 {totalCumulative}문항
                  </span>
                </div>
              </div>
              <span className="text-gray-400 text-lg">›</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}

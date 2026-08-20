/**
 * src/pages/WrongReviewTypeSelector.jsx — /wrong-review/type/:subject
 * 홈 L2-D 신규 진입점 — STEP 2: 유형(진위형/선택형) 선택 (GEPv30-138)
 *
 * 세부과목 선택 다음 단계. 해당 세부과목의 MCQ/OX 오답 개수를 보여주고 하나를 고르게 한다.
 * 다음 화면: 정확한 틀린횟수 선택(WrongReviewCountSelector)
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { fetchAllWrongQuestions } from '../services/unifiedWrongService'

export default function WrongReviewTypeSelector() {
  const navigate   = useNavigate()
  const { subject } = useParams()
  const userId     = useAuthStore(s => s.userId)
  const authStatus = useAuthStore(s => s.authStatus)

  const [counts,    setCounts]    = useState({ MCQ: 0, OX: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (authStatus === 'loading') return
      if (authStatus !== 'authenticated' || !userId) {
        setIsLoading(false)
        return
      }
      try {
        const data = await fetchAllWrongQuestions(userId)
        const scoped = data.filter(q => q.sub_subject === subject)
        setCounts({
          MCQ: scoped.filter(q => q.source === 'MCQ').length,
          OX:  scoped.filter(q => q.source === 'OX').length,
        })
      } catch (err) {
        console.warn('[WrongReviewTypeSelector] 로드 실패:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authStatus, userId, subject])

  function handleSelect(type) {
    navigate(`/wrong-review/count/${encodeURIComponent(subject)}/${type}`)
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/wrong-review/subjects')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">{subject}</h1>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        2단계 · 진위형(OX)과 선택형(MCQ) 중 복습할 유형을 선택하세요.
      </p>

      {isLoading && (
        <div className="flex justify-center py-16">
          <p className="text-sm text-gray-400 animate-pulse">오답 현황을 불러오는 중···</p>
        </div>
      )}

      {!isLoading && authStatus !== 'authenticated' && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-base font-semibold text-gray-600">로그인 후 이용 가능합니다</p>
        </div>
      )}

      {!isLoading && authStatus === 'authenticated' && (
        <div className="flex flex-col gap-3">

          <button
            onClick={() => handleSelect('OX')}
            disabled={counts.OX === 0}
            className={`flex items-center justify-between rounded-2xl border px-5 py-5 text-left
              transition-colors
              ${counts.OX === 0
                ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                : 'bg-white border-gray-200 hover:border-orange-300 active:bg-orange-50'}`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold text-gray-800">진위형 (OX)</span>
              <span className="text-xs text-gray-400">O/X로 답하는 문제</span>
            </div>
            <span className="text-2xl font-bold text-orange-600 tabular-nums">{counts.OX}</span>
          </button>

          <button
            onClick={() => handleSelect('MCQ')}
            disabled={counts.MCQ === 0}
            className={`flex items-center justify-between rounded-2xl border px-5 py-5 text-left
              transition-colors
              ${counts.MCQ === 0
                ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                : 'bg-white border-gray-200 hover:border-orange-300 active:bg-orange-50'}`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-bold text-gray-800">선택형 (MCQ)</span>
              <span className="text-xs text-gray-400">4지선다 문제</span>
            </div>
            <span className="text-2xl font-bold text-orange-600 tabular-nums">{counts.MCQ}</span>
          </button>

        </div>
      )}
    </div>
  )
}

/**
 * src/pages/WrongReviewCountSelector.jsx — /wrong-review/count/:subject/:type
 * 홈 L2-D 신규 진입점 — STEP 3: 정확한 틀린횟수 선택 (GEPv30-138)
 *
 * (세부과목 + 유형) 스코프에서 실제 존재하는 정확한 틀린횟수(1~5회, 6회+)만 버튼으로 노출한다.
 * "6회+"는 단일 버킷(10회 이상도 포함) — 조대표 확정(GEPv30-138 §6-2/6-3).
 * 선택 시 ChallengeMode.jsx로 이동, exactCount 필터를 state로 전달.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { fetchAllWrongQuestions } from '../services/unifiedWrongService'

const TYPE_LABEL = { OX: '진위형 (OX)', MCQ: '선택형 (MCQ)' }
const BUCKETS    = [1, 2, 3, 4, 5, 6]   // 6 = "6회 이상" 단일 버킷

export default function WrongReviewCountSelector() {
  const navigate     = useNavigate()
  const { subject, type } = useParams()
  const userId        = useAuthStore(s => s.userId)
  const authStatus    = useAuthStore(s => s.authStatus)

  const [dist,      setDist]      = useState({})   // { 1: n, 2: n, ..., 6: n(6+) }
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (authStatus === 'loading') return
      if (authStatus !== 'authenticated' || !userId) {
        setIsLoading(false)
        return
      }
      try {
        const data   = await fetchAllWrongQuestions(userId)
        const scoped = data.filter(q => q.sub_subject === subject && q.source === type)

        const next = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        for (const q of scoped) {
          const c = q.wrong_count ?? 1
          if (c >= 6) next[6] += 1
          else        next[c] = (next[c] ?? 0) + 1
        }
        setDist(next)
      } catch (err) {
        console.warn('[WrongReviewCountSelector] 로드 실패:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authStatus, userId, subject, type])

  function handleSelect(exactCount) {
    navigate(`/unified-wrong/challenge/${exactCount}`, {
      state: { subject, source: type, exactCount },
    })
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/wrong-review/type/${encodeURIComponent(subject)}`)}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {subject} · {TYPE_LABEL[type] ?? type}
        </h1>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        3단계 · 정확히 몇 회 틀린 문제를 풀지 선택하세요. 풀다가 또 틀리면 횟수가 +1 올라갑니다.
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
        <div className="flex flex-col gap-2">
          {BUCKETS.map(n => {
            const count = dist[n] ?? 0
            const empty = count === 0
            const label = n === 6 ? '6회 이상' : `${n}회`
            return (
              <button
                key={n}
                onClick={() => handleSelect(n)}
                disabled={empty}
                className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left
                  transition-colors
                  ${empty
                    ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                    : n >= 5
                      ? 'bg-red-50 border-red-200 hover:border-red-400 active:bg-red-100'
                      : 'bg-white border-gray-200 hover:border-orange-300 active:bg-orange-50'}`}
              >
                <span className={`text-sm font-bold ${n >= 5 && !empty ? 'text-red-700' : 'text-gray-800'}`}>
                  정확히 {label} 틀린 문제
                </span>
                <span className={`text-lg font-bold tabular-nums ${n >= 5 && !empty ? 'text-red-600' : 'text-gray-500'}`}>
                  {count}개
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

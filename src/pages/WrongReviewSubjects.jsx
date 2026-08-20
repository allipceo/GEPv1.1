/**
 * src/pages/WrongReviewSubjects.jsx — /wrong-review/subjects
 * 홈 L2-D "틀린 문제 풀기" 신규 진입점 — STEP 1: 세부과목 선택 (GEPv30-138)
 *
 * 흐름: 세부과목 선택 → 유형(진위형/선택형) 선택 → 정확한 틀린횟수 선택 → 출제
 * WrongSubjectSelector.jsx(L2-F 전용)와 동일한 taxonomy·카운팅 로직을 쓰되,
 * 다음 화면이 유형 선택(WrongReviewTypeSelector)이라는 점만 다르다 — L2-F 흐름은 무변경.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { fetchAllWrongQuestions } from '../services/unifiedWrongService'

// GEPv30-136 §3 확정 taxonomy — 실측(exams.json/oxSubjects.js) 기준, 회차당 문항수 포함
const SUBJECT_GROUPS = [
  {
    label: '법령',
    color: 'text-blue-600',
    subs: [
      { name: '상법',     perRound: 20 },
      { name: '보험업법', perRound: 10 },
      { name: '위험관리', perRound: 5  },
      { name: '세제재무', perRound: 5  },
    ],
  },
  {
    label: '손보1부',
    color: 'text-green-600',
    subs: [
      { name: '자동차보험', perRound: 15 },
      { name: '특종보험',   perRound: 10 },
      { name: '연금저축',   perRound: 10 },
      { name: '보증보험',   perRound: 5  },
    ],
  },
  {
    label: '손보2부',
    color: 'text-purple-600',
    subs: [
      { name: '해상보험', perRound: 15 },
      { name: '화재보험', perRound: 10 },
      { name: '재보험',   perRound: 10 },
      { name: '항공우주', perRound: 5  },
    ],
  },
]

export default function WrongReviewSubjects() {
  const navigate   = useNavigate()
  const userId     = useAuthStore(s => s.userId)
  const authStatus = useAuthStore(s => s.authStatus)

  const [counts,   setCounts]   = useState({})   // { [sub_subject]: { total, repeat } }
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
        const next = {}
        for (const q of data) {
          if (!q.sub_subject) continue   // MOCK/CUSTOM 등 세부과목 없는 항목 제외(이번 범위 제외)
          if (!next[q.sub_subject]) next[q.sub_subject] = { total: 0, repeat: 0 }
          next[q.sub_subject].total += 1
          if ((q.wrong_count ?? 1) >= 2) next[q.sub_subject].repeat += 1
        }
        setCounts(next)
      } catch (err) {
        console.warn('[WrongReviewSubjects] 로드 실패:', err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authStatus, userId])

  function handleSelect(subName) {
    navigate(`/wrong-review/type/${encodeURIComponent(subName)}`)
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-700 p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">틀린 문제 풀기</h1>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        1단계 · 세부과목을 선택하세요. 다음 단계에서 진위형/선택형과 틀린 횟수를 고를 수 있습니다.
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
        <div className="flex flex-col gap-5">
          {SUBJECT_GROUPS.map(group => (
            <div key={group.label} className="flex flex-col gap-2">
              <p className={`text-xs font-bold px-1 ${group.color}`}>{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.subs.map(sub => {
                  const stat  = counts[sub.name] ?? { total: 0, repeat: 0 }
                  const empty = stat.total === 0
                  return (
                    <button
                      key={sub.name}
                      onClick={() => handleSelect(sub.name)}
                      disabled={empty}
                      className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left
                        transition-colors
                        ${empty
                          ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:border-orange-300 active:bg-orange-50'}`}
                    >
                      <span className="text-sm font-semibold text-gray-800">{sub.name}</span>
                      <span className="text-xs text-gray-400">
                        오답 {stat.total}개
                        {stat.repeat > 0 && (
                          <span className="ml-1 text-red-500 font-semibold">
                            (반복 {stat.repeat})
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

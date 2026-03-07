/**
 * Home.jsx — 홈 화면
 * GEP_041: 3과목 아코디언 재설계 (기본 접힘, 대과목 정답률 표시)
 */

import { useMemo, useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useExamStore from '../stores/examStore'
import useStatsStore from '../stores/statsStore'
import Settings, { loadSettings } from '../components/Settings'
import StatsPanel from '../components/StatsPanel'
import LoginButton from '../components/LoginButton'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

// 3과목 → 세부과목 구성
const STUDY_SECTIONS = [
  {
    label: '법령', mainSubject: '법령', textColor: 'text-blue-600',
    subs: ['보험업법', '상법', '세제재무', '위험관리'],
  },
  {
    label: '손보1부', mainSubject: '손보1부', textColor: 'text-green-600',
    subs: ['보증보험', '연금저축', '자동차보험', '특종보험'],
  },
  {
    label: '손보2부', mainSubject: '손보2부', textColor: 'text-purple-600',
    subs: ['재보험', '항공우주', '해상보험', '화재보험'],
  },
]

// 정답률 색상
function getAccuracyColor(pct) {
  if (pct === null) return 'text-gray-400'
  if (pct >= 60)   return 'text-green-600'
  if (pct >= 40)   return 'text-yellow-600'
  return 'text-red-600'
}

// D-day 계산
function calcDday(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
}

export default function Home() {
  const navigate = useNavigate()

  const setSubject    = useExamStore((s) => s.setSubject)
  const setRound      = useExamStore((s) => s.setRound)
  const setSubSubject = useExamStore((s) => s.setSubSubject)
  const questions     = useExamStore((s) => s.questions)

  const [settings, setSettings]         = useState({ name: '', examDate: '' })
  const [showSettings, setShowSettings] = useState(false)
  const [openSections, setOpenSections] = useState({})   // 기본 모두 접힘

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const dday = calcDday(settings.examDate)

  const stats        = useStatsStore((s) => s.stats)
  const authStatus   = useAuthStore((s) => s.authStatus)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)
  const email        = useAuthStore((s) => s.email)
  const isGuest      = authStatus === 'guest' && serviceLevel < 2

  // 레벨2+ 오답 횟수 (로컬 statsStore 기준)
  const wrongCount = (authStatus === 'authenticated' && serviceLevel >= 2)
    ? Math.max(0, stats.total.solved - stats.total.correct)
    : null

  // 세부과목별 문제 수
  const subjectQCounts = useMemo(() => {
    const counts = {}
    questions.forEach((q) => {
      const key = `${q.subject}__${q.subSubject}`
      counts[key] = (counts[key] ?? 0) + 1
    })
    return counts
  }, [questions])

  // 대과목별 전체 정답률
  const mainSubjectStats = useMemo(() => {
    const result = {}
    STUDY_SECTIONS.forEach(({ label, subs }) => {
      const agg = subs.reduce(
        (acc, sub) => {
          const d = stats.bySubject[sub] ?? { solved: 0, correct: 0 }
          return { solved: acc.solved + d.solved, correct: acc.correct + d.correct }
        },
        { solved: 0, correct: 0 }
      )
      result[label] = agg.solved > 0 ? Math.round((agg.correct / agg.solved) * 100) : null
    })
    return result
  }, [stats])

  const toggleSection = (label) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))

  const handleSubjectStudy = (mainSubject, sub) => {
    setSubject(mainSubject)
    setRound('전체')
    setSubSubject(sub)
    navigate('/question')
  }

  return (
    <>
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

        {/* 상단: 타이틀 + D-day + 설정 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">GEP 보험중개사</h1>
            {dday !== null ? (
              <p className="text-sm font-semibold text-blue-600 mt-0.5">
                {dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}일` : '시험 종료'}
              </p>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-gray-400 underline mt-0.5"
              >
                시험일 설정
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {authStatus === 'guest' ? (
              <LoginButton />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  {email?.slice(0, 2) ?? '?'}
                </span>
                <button
                  onClick={async () => {
                    const { error } = await supabase.auth.signOut()
                    if (error) console.warn('[GEP] 로그아웃 실패:', error.message)
                    useAuthStore.getState().clearAuth()
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2"
                  style={{ minHeight: '44px' }}
                >
                  로그아웃
                </button>
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-400 hover:text-gray-700 p-1"
              aria-label="설정"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 학습 현황 대시보드 */}
        <StatsPanel homeMode allStats={stats} isGuest={isGuest} wrongCount={wrongCount} />

        {/* 레벨2 전용 — 틀린문제 풀기 버튼 */}
        {authStatus === 'authenticated' && serviceLevel >= 2 && (
          <button
            onClick={() => navigate('/wrong-review')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 active:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📝</span>
              <span className="text-sm font-semibold text-red-700">틀린문제 풀기</span>
            </div>
            <div className="flex items-center gap-2">
              {wrongCount > 0 && (
                <span className="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                  {wrongCount}개
                </span>
              )}
              <span className="text-red-400 text-sm">›</span>
            </div>
          </button>
        )}

        {/* OX 진위형 버튼 */}
        <button
          onClick={() => navigate('/ox')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 active:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <span className="text-sm font-semibold text-blue-700">OX 진위형 문제 풀기</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-400 font-normal">3,824문제</span>
            <span className="text-blue-400 text-sm">›</span>
          </div>
        </button>

        {/* 통합 틀린문제 복습 버튼 */}
        <button
          onClick={() => navigate('/unified-wrong')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 active:bg-indigo-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📚</span>
            <span className="text-sm font-semibold text-indigo-700">통합 틀린문제 복습</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-400 font-normal">MCQ+OX+모의고사</span>
            <span className="text-indigo-400 text-sm">›</span>
          </div>
        </button>

        {/* 모의고사 버튼 */}
        <Link
          to="/mock"
          className="block p-4 bg-white rounded-lg border-2 border-indigo-200 hover:border-indigo-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <div className="font-semibold text-gray-900">모의고사</div>
                <div className="text-sm text-gray-500">실전 9회 모의고사</div>
              </div>
            </div>
            <span className="text-indigo-600">→</span>
          </div>
        </Link>

        {/* 맞춤 모의고사 버튼 */}
        <Link
          to="/custom-mock"
          className="block p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-semibold text-gray-900">맞춤 모의고사</div>
                <div className="text-sm text-gray-500">무한 랜덤 조합</div>
              </div>
            </div>
            <span className="text-purple-600">→</span>
          </div>
        </Link>

        {/* 과목 선택 — 3개 아코디언 (기본 모두 접힘) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 px-1">과목 선택</p>
          {STUDY_SECTIONS.map((section) => {
            const isOpen = !!openSections[section.label]
            const pct    = mainSubjectStats[section.label]
            return (
              <div key={section.label} className="rounded-xl overflow-hidden border border-gray-200">

                {/* 아코디언 헤더 */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => toggleSection(section.label)}
                >
                  <span className={`text-sm font-semibold ${section.textColor}`}>
                    {section.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getAccuracyColor(pct)}`}>
                      {pct !== null ? `${pct}%` : '-'}
                    </span>
                    <span
                      className="text-gray-400 text-sm transition-transform duration-200"
                      style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}
                    >
                      ›
                    </span>
                  </div>
                </button>

                {/* 아코디언 바디 — 세부과목 */}
                {isOpen && (
                  <div className="border-t border-gray-100 flex flex-col">
                    {section.subs.map((sub, idx) => {
                      const qCount = subjectQCounts[`${section.mainSubject}__${sub}`] ?? 0
                      const s      = stats.bySubject[sub]
                      const subPct = s && s.solved > 0
                        ? Math.round((s.correct / s.solved) * 100)
                        : null
                      const solved = s?.solved ?? 0
                      return (
                        <button
                          key={sub}
                          className={`flex items-center gap-3 w-full text-left px-4 py-3 bg-white hover:bg-gray-50 active:bg-gray-50 transition-colors ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                          onClick={() => handleSubjectStudy(section.mainSubject, sub)}
                        >
                          <span className="flex-1 text-sm text-gray-700">{sub}</span>
                          {isGuest ? (
                            <span className="text-xs text-gray-400">
                              {Math.min(solved, 30)}/30
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{qCount}문제</span>
                          )}
                          <span className={`text-sm font-semibold w-14 text-right shrink-0 ${getAccuracyColor(subPct)}`}>
                            {subPct !== null ? `${subPct}%${subPct < 40 ? ' ⚠️' : ''}` : '-'}
                          </span>
                          <span className="text-gray-300 text-sm">›</span>
                        </button>
                      )
                    })}
                  </div>
                )}

              </div>
            )
          })}
        </div>

      </div>

      {/* 설정 팝업 */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(s) => setSettings(s)}
      />
    </>
  )
}

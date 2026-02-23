/**
 * Home.jsx — 홈 화면
 * 회차/과목/세부과목 선택 + 이어풀기 + 처음부터 + 설정
 * GEP_026: 탭 추가 — 과목별 학습 (기본/좌측) | 회차별 풀기 (우측/기존)
 */

import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useExamStore from '../stores/examStore'
import useStatsStore from '../stores/statsStore'
import Settings, { loadSettings } from '../components/Settings'
import StatsPanel from '../components/StatsPanel'
import LoginButton from '../components/LoginButton'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

// 과목별 학습 탭 — 12과목 구성
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

// D-day 계산 (양수: 시험 전, 0: 당일, 음수: 지남)
function calcDday(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
}

export default function Home() {
  const navigate = useNavigate()

  const selectedSubject    = useExamStore((s) => s.selectedSubject)
  const setSubject         = useExamStore((s) => s.setSubject)
  const setRound           = useExamStore((s) => s.setRound)
  const setSubSubject      = useExamStore((s) => s.setSubSubject)
  const questions          = useExamStore((s) => s.questions)

  // 설정 상태 (localStorage)
  const [settings, setSettings]         = useState({ name: '', examDate: '' })
  const [showSettings, setShowSettings] = useState(false)

  // 앱 시작 시 설정 자동 로드
  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const dday = calcDday(settings.examDate)

  // statsStore 연동
  const stats = useStatsStore((s) => s.stats)

  // authStore — 로그인 상태 + 게스트 제한 판별
  const authStatus   = useAuthStore((s) => s.authStatus)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)
  const email        = useAuthStore((s) => s.email)
  const isGuest      = authStatus === 'guest' && serviceLevel < 2

  // 세부과목별 문제 수
  const subjectQCounts = useMemo(() => {
    const counts = {}
    questions.forEach((q) => {
      const key = `${q.subject}__${q.subSubject}`
      counts[key] = (counts[key] ?? 0) + 1
    })
    return counts
  }, [questions])

  // 과목별 학습 시작 — round='전체', 선택 subSubject로 이동
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
          {/* 우상단: 로그인 상태 + 설정 */}
          <div className="flex items-center gap-2">

            {/* 로그인 상태 표시 */}
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
                    // SIGNED_OUT 이벤트가 clearAuth() 호출 — 백업으로 직접 호출
                    useAuthStore.getState().clearAuth()
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2"
                  style={{ minHeight: '44px' }}
                >
                  로그아웃
                </button>
              </div>
            )}

            {/* 설정 아이콘 버튼 */}
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

        {/* 학습 현황 대시보드 — 메인 노출 */}
        <StatsPanel homeMode allStats={stats} />

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
            <span className="text-red-400 text-sm">›</span>
          </button>
        )}

        {/* 과목별 학습 목록 */}
        {STUDY_SECTIONS.map((section) => (
          <section key={section.label}>
            <p className={`text-xs font-semibold mb-2 ${section.textColor}`}>
              {section.label}
            </p>
            <div className="flex flex-col gap-1.5">
              {section.subs.map((sub) => {
                const qCount  = subjectQCounts[`${section.mainSubject}__${sub}`] ?? 0
                const s       = stats.bySubject[sub]
                const pct     = s && s.solved > 0
                  ? Math.round((s.correct / s.solved) * 100)
                  : null
                const solved  = s?.solved ?? 0
                return (
                  <button
                    key={sub}
                    className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg bg-white border border-gray-200 hover:border-gray-300 active:bg-gray-50 transition-colors"
                    onClick={() => handleSubjectStudy(section.mainSubject, sub)}
                  >
                    <span className="flex-1 text-sm text-gray-800">{sub}</span>
                    {isGuest ? (
                      <span className="text-xs text-gray-400">
                        {Math.min(solved, 30)}/30
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{qCount}문제</span>
                    )}
                    <span className={`text-sm font-semibold w-16 text-right shrink-0 ${getAccuracyColor(pct)}`}>
                      {pct !== null ? `${pct}%${pct < 40 ? ' ⚠️' : ''}` : '-'}
                    </span>
                    <span className="text-gray-300 text-sm">›</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

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

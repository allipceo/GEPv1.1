/**
 * Home.jsx — 홈 화면
 * 회차/과목/세부과목 선택 + 이어풀기 + 처음부터 + 설정
 */

import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useExamStore from '../stores/examStore'
import useStatsStore from '../stores/statsStore'
import Settings, { loadSettings } from '../components/Settings'
import DdayBanner from '../components/DdayBanner'
import ProgressStats from '../components/ProgressStats'
import TodayStats from '../components/TodayStats'
import SubjectStats from '../components/SubjectStats'

const ROUNDS   = [23, 24, 25, 26, 27, 28, 29, 30, 31]
const SUBJECTS = ['법령', '손보1부', '손보2부']

// 과목별 컬러
const SUBJECT_ACTIVE = {
  '법령':   'bg-blue-600 text-white border-blue-600',
  '손보1부': 'bg-green-600 text-white border-green-600',
  '손보2부': 'bg-purple-600 text-white border-purple-600',
}
const SUBJECT_INACTIVE = {
  '법령':   'hover:border-blue-400',
  '손보1부': 'hover:border-green-400',
  '손보2부': 'hover:border-purple-400',
}
const SUBJECT_START_BTN = {
  '법령':   'bg-blue-600 hover:bg-blue-700',
  '손보1부': 'bg-green-600 hover:bg-green-700',
  '손보2부': 'bg-purple-600 hover:bg-purple-700',
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

  const selectedRound      = useExamStore((s) => s.selectedRound)
  const selectedSubject    = useExamStore((s) => s.selectedSubject)
  const selectedSubSubject = useExamStore((s) => s.selectedSubSubject)
  const setRound           = useExamStore((s) => s.setRound)
  const setSubject         = useExamStore((s) => s.setSubject)
  const setSubSubject      = useExamStore((s) => s.setSubSubject)
  const setCurrentIndex    = useExamStore((s) => s.setCurrentIndex)
  const resumeProgress     = useExamStore((s) => s.resumeProgress)
  const currentIndex       = useExamStore((s) => s.currentIndex)
  const answers            = useExamStore((s) => s.answers)
  const progressMap        = useExamStore((s) => s.progressMap)
  const isReady            = useExamStore((s) => s.isReady)
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
  const today = new Date().toISOString().slice(0, 10)
  const todayStats = stats.daily[today] ?? { solved: 0, correct: 0 }

  // filteredQuestions
  const filteredQuestions = useMemo(
    () =>
      questions.filter((q) => {
        if (q.subject !== selectedSubject) return false
        if (q.round !== selectedRound) return false
        if (selectedSubSubject && q.subSubject !== selectedSubSubject) return false
        return true
      }),
    [questions, selectedSubject, selectedRound, selectedSubSubject]
  )

  // 세부과목 목록
  const LAW_SUBSUB = ['보험업법', '상법', '세제재무', '위험관리']
  const subSubjectOptions = useMemo(() => {
    if (selectedSubject === '법령') return ['전체', ...LAW_SUBSUB]
    const source = questions.filter((q) => q.subject === selectedSubject)
    const set = new Set(source.map((q) => q.subSubject).filter(Boolean))
    return ['전체', ...[...set].sort((a, b) => a.localeCompare(b, 'ko'))]
  }, [questions, selectedSubject])

  // 현재 과목/회차의 progressMap 저장 인덱스
  const progressKey  = `${selectedRound}_${selectedSubject}`
  const resumeIndex  = progressMap[progressKey] ?? 0

  // 이어풀기 표시 조건: progressMap에 진도가 있거나 answers가 있을 때
  const showResume =
    isReady &&
    filteredQuestions.length > 0 &&
    (resumeIndex > 0 || Object.keys(answers).length > 0)

  return (
    <>
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">

        {/* 상단: 타이틀 + D-day + 설정 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">GEP 보험중개사</h1>
            {dday !== null ? (
              <p className="text-sm font-semibold text-blue-600 mt-0.5">
                {dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}일` : `D+${Math.abs(dday)}일`}
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

        {/* 통계 대시보드 */}
        <section className="bg-gray-50 rounded-xl p-4 flex flex-col gap-4 border border-gray-100">
          <DdayBanner name={settings.name} dday={dday} />
          <div className="border-t border-gray-200" />
          <ProgressStats total={stats.total} />
          <TodayStats daily={todayStats} />
          <SubjectStats bySubject={stats.bySubject} />
        </section>

        {/* 회차 선택 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-2">회차 선택</p>
          <div className="flex flex-wrap gap-2">
            {ROUNDS.map((r) => (
              <button
                key={r}
                onClick={() => setRound(r)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedRound === r
                    ? 'bg-blue-600 text-white border-blue-600'
                    : `bg-white text-gray-700 border-gray-300 ${SUBJECT_INACTIVE[selectedSubject]}`
                }`}
              >
                {r}회
              </button>
            ))}
          </div>
        </section>

        {/* 과목 선택 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-2">과목 선택</p>
          <div className="flex gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => { setSubject(s); setSubSubject(null) }}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  selectedSubject === s
                    ? SUBJECT_ACTIVE[s]
                    : `bg-white text-gray-700 border-gray-300 ${SUBJECT_INACTIVE[s]}`
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* 세부과목 드롭다운 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-2">세부과목</p>
          <select
            value={selectedSubSubject ?? '전체'}
            onChange={(e) => {
              const val = e.target.value
              setSubSubject(val === '전체' ? null : val)
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            {subSubjectOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </section>

        {/* 하단 버튼: 이어풀기(2/3) + 처음부터(1/3) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { resumeProgress(); navigate('/question') }}
            className={`col-span-2 py-3 rounded-xl text-white font-semibold text-base transition-colors ${SUBJECT_START_BTN[selectedSubject]}`}
          >
            {resumeIndex > 0
              ? `이어풀기 (${resumeIndex + 1}/${filteredQuestions.length})`
              : '이어풀기'}
          </button>
          <button
            onClick={() => { setCurrentIndex(0); navigate('/question') }}
            className="col-span-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-base"
          >
            처음부터
          </button>
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

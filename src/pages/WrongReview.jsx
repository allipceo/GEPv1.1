/**
 * WrongReview.jsx — 틀린문제 모아풀기 페이지 (레벨2 전용)
 *
 * GEP_041:
 *   - 진입 시 과목 선택 화면 (과목별 + 세부과목별 틀린 수 표시)
 *   - 틀린 횟수 많은 순 정렬
 *   - 헤더에 "N회 틀림" 표시
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useExamStore from '../stores/examStore'
import useStatsStore from '../stores/statsStore'
import { useAuthStore } from '../stores/authStore'
import { recordAttempt } from '../services/statsService'
import QuestionView from '../components/QuestionView'
import AnswerButtons from '../components/AnswerButtons'

const SUBJECT_HEADER_BG = {
  '법령':   'bg-blue-600',
  '손보1부': 'bg-green-600',
  '손보2부': 'bg-purple-600',
}

// 과목 선택 화면용 구성
const SUBJECT_SECTIONS = [
  {
    label: '법령',
    textColor: 'text-blue-600',
    borderClass: 'border-blue-200 bg-blue-50',
    subs: ['보험업법', '상법', '세제재무', '위험관리'],
  },
  {
    label: '손보1부',
    textColor: 'text-green-600',
    borderClass: 'border-green-200 bg-green-50',
    subs: ['보증보험', '연금저축', '자동차보험', '특종보험'],
  },
  {
    label: '손보2부',
    textColor: 'text-purple-600',
    borderClass: 'border-purple-200 bg-purple-50',
    subs: ['재보험', '항공우주', '해상보험', '화재보험'],
  },
]

export default function WrongReview() {
  const navigate = useNavigate()

  const questions    = useExamStore((s) => s.questions)
  const isReady      = useExamStore((s) => s.isReady)
  const authStatus   = useAuthStore((s) => s.authStatus)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)

  // 전체 틀린문제 (wrongCount 포함, 과목 필터 전)
  const [allWrongQuestions, setAllWrongQuestions] = useState([])
  const [isLoading, setIsLoading]                 = useState(true)
  const [error, setError]                         = useState(null)

  // 과목 선택 상태 (null = 선택 화면)
  const [selectedSubject, setSelectedSubject] = useState(null)

  // 문제 풀기 상태
  const [currentIndex, setCurrentIndex]   = useState(0)
  const [localAnswered, setLocalAnswered] = useState(new Set())
  const [answers, setAnswers]             = useState({})
  const [recordedSet, setRecordedSet]     = useState(new Set())

  // 권한 가드 — 레벨2 미만이면 홈으로
  useEffect(() => {
    if (authStatus !== 'authenticated' || serviceLevel < 2) navigate('/')
  }, [authStatus, serviceLevel, navigate])

  // 틀린문제 목록 로드 (틀린 횟수 카운트, 많은 순 정렬)
  useEffect(() => {
    if (!isReady || questions.length === 0) return
    if (authStatus !== 'authenticated') return

    const load = async () => {
      setIsLoading(true)
      try {
        const { data, error: err } = await supabase
          .from('attempts')
          .select('question_id')
          .eq('is_correct', false)

        if (err) {
          console.error('[WrongReview] attempts 조회 오류:', err.code, err.message, err.details)
          setError('틀린문제를 불러올 수 없습니다.')
          return
        }

        // 틀린 횟수 카운트
        const wrongCounts = {}
        for (const row of data) {
          wrongCounts[row.question_id] = (wrongCounts[row.question_id] ?? 0) + 1
        }

        // 틀린 횟수 많은 순 정렬
        const sortedIds = Object.keys(wrongCounts)
          .sort((a, b) => wrongCounts[b] - wrongCounts[a])

        // 로컬 questions 매핑 + wrongCount 추가
        const matched = sortedIds
          .map((id) => {
            const q = questions.find((q) => q.id === id)
            return q ? { ...q, wrongCount: wrongCounts[id] } : null
          })
          .filter(Boolean)

        setAllWrongQuestions(matched)
      } catch (e) {
        setError('네트워크 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [isReady, questions, authStatus])

  // 과목별 / 세부과목별 틀린문제 수
  const wrongBySubject    = {}
  const wrongBySubSubject = {}
  for (const q of allWrongQuestions) {
    wrongBySubject[q.subject]       = (wrongBySubject[q.subject] ?? 0) + 1
    wrongBySubSubject[q.subSubject] = (wrongBySubSubject[q.subSubject] ?? 0) + 1
  }

  // 선택 과목의 문제 (이미 틀린 횟수 많은 순으로 정렬됨)
  const wrongQuestions = selectedSubject
    ? allWrongQuestions.filter((q) => q.subject === selectedSubject)
    : []

  // 과목 선택 핸들러
  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject)
    setCurrentIndex(0)
    setLocalAnswered(new Set())
    setAnswers({})
    setRecordedSet(new Set())
  }

  // ── 로딩 / 에러 ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
        틀린문제 불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <p className="text-red-500 text-sm text-center">{error}</p>
        <button onClick={() => navigate('/')} className="text-blue-600 underline text-sm">
          홈으로
        </button>
      </div>
    )
  }

  // ── 과목 선택 화면 ────────────────────────────────────
  if (!selectedSubject) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <button
            className="text-sm text-gray-500 hover:text-gray-700"
            onClick={() => navigate('/')}
          >
            ← 홈
          </button>
          <h2 className="text-base font-bold text-gray-900">틀린문제 풀기</h2>
          <span className="w-10" />
        </div>

        {allWrongQuestions.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 px-6">
            <p className="text-2xl">🎉</p>
            <p className="text-gray-700 text-sm font-semibold text-center">
              틀린문제가 없습니다!
            </p>
            <p className="text-gray-400 text-xs text-center">
              계속 문제를 풀면 여기에 모아드릴게요.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-6 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
            >
              홈으로
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 -mt-1">
              과목을 선택하세요 · 틀린 횟수 많은 순 정렬
            </p>
            <div className="flex flex-col gap-3">
              {SUBJECT_SECTIONS.map((section) => {
                const count   = wrongBySubject[section.label] ?? 0
                const enabled = count > 0
                return (
                  <button
                    key={section.label}
                    onClick={() => enabled && handleSelectSubject(section.label)}
                    disabled={!enabled}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                      enabled
                        ? `${section.borderClass} hover:opacity-90 active:opacity-80`
                        : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {/* 과목 헤더 행 */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${enabled ? section.textColor : 'text-gray-400'}`}>
                        {section.label}
                      </span>
                      <span className={`text-sm font-bold ${enabled ? section.textColor : 'text-gray-400'}`}>
                        {count}개
                      </span>
                    </div>
                    {/* 세부과목별 틀린 수 */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {section.subs.map((sub) => {
                        const subCount = wrongBySubSubject[sub] ?? 0
                        return (
                          <span key={sub} className="text-xs text-gray-500">
                            {sub}{' '}
                            <span className={subCount > 0 ? 'font-semibold text-gray-700' : ''}>
                              {subCount}개
                            </span>
                          </span>
                        )
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 text-center -mt-1">
              전체 {allWrongQuestions.length}문제
            </p>
          </>
        )}
      </div>
    )
  }

  // ── 선택 후 해당 과목 문제 없는 경우 ────────────────
  if (wrongQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <p className="text-2xl">🎉</p>
        <p className="text-gray-700 text-sm font-semibold text-center">
          {selectedSubject} 틀린문제가 없습니다!
        </p>
        <button
          onClick={() => setSelectedSubject(null)}
          className="mt-2 px-6 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
        >
          과목 선택으로
        </button>
      </div>
    )
  }

  // ── 문제 풀기 UI ─────────────────────────────────────
  const question      = wrongQuestions[currentIndex]
  const displayAnswer = localAnswered.has(question.id) ? (answers[question.id] ?? null) : null
  const headerBg      = SUBJECT_HEADER_BG[question.subject] ?? 'bg-gray-600'

  const handleAnswer = async (num) => {
    if (localAnswered.has(question.id)) return

    setAnswers((prev) => ({ ...prev, [question.id]: num }))
    setLocalAnswered((prev) => new Set([...prev, question.id]))

    if (!recordedSet.has(question.id)) {
      const authState = useAuthStore.getState()
      await recordAttempt(useStatsStore.getState(), authState, {
        question,
        selectedAnswer: num,
        isCorrect:      num === question.answer,
        studyMode:      'wrong_review',
      })
      setRecordedSet((prev) => new Set([...prev, question.id]))
    }
  }

  const handlePrev = () => {
    if (currentIndex === 0) {
      setSelectedSubject(null)
      return
    }
    const prevId = wrongQuestions[currentIndex - 1]?.id
    if (prevId) {
      setLocalAnswered((prev) => {
        const next = new Set(prev)
        next.delete(prevId)
        return next
      })
    }
    setCurrentIndex(currentIndex - 1)
  }

  const handleNext = () => {
    if (currentIndex === wrongQuestions.length - 1) {
      navigate('/')
      return
    }
    setCurrentIndex(currentIndex + 1)
  }

  return (
    <div className="flex flex-col h-screen max-w-[640px] mx-auto bg-white">

      {/* 상단 헤더 */}
      <div className={`flex-shrink-0 flex justify-between items-center px-4 py-2 ${headerBg}`}>
        <button
          className="text-sm text-white/80 hover:text-white"
          onClick={() => setSelectedSubject(null)}
        >
          ← 과목
        </button>
        <span className="text-sm font-semibold text-white">
          {selectedSubject} {currentIndex + 1}/{wrongQuestions.length}
        </span>
        <span className="text-xs text-white/70">
          {question.wrongCount}회 틀림
        </span>
      </div>

      {/* 문제 본문 */}
      <div className="flex-1 overflow-y-auto">
        <QuestionView
          question={question}
          currentNum={currentIndex + 1}
          totalNum={wrongQuestions.length}
        />
      </div>

      {/* 하단 버튼 영역 */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-200 px-4 pt-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <AnswerButtons
          selectedAnswer={displayAnswer}
          correctAnswer={question.answer}
          onAnswer={handleAnswer}
        />

        <div className="flex gap-2 mt-1">
          <button
            className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm"
            onClick={handlePrev}
          >
            {currentIndex === 0 ? '과목 선택' : '이전'}
          </button>
          <button
            className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm"
            onClick={handleNext}
          >
            {currentIndex === wrongQuestions.length - 1 ? '완료' : '다음'}
          </button>
        </div>
      </div>

    </div>
  )
}

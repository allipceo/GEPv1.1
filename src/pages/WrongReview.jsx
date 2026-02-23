/**
 * WrongReview.jsx — 틀린문제 모아풀기 페이지 (레벨2 전용)
 *
 * - Supabase attempts에서 is_correct=false 문제 목록 조회
 * - 로컬 questions 배열과 매핑하여 표시
 * - study_mode='wrong_review' 로 기록
 * - Question.jsx 흐름과 동일한 UX
 *
 * GEP_039 STEP3
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

export default function WrongReview() {
  const navigate = useNavigate()

  const questions    = useExamStore((s) => s.questions)
  const isReady      = useExamStore((s) => s.isReady)
  const authStatus   = useAuthStore((s) => s.authStatus)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)

  const [wrongQuestions, setWrongQuestions] = useState([])
  const [currentIndex, setCurrentIndex]     = useState(0)
  const [localAnswered, setLocalAnswered]   = useState(new Set())
  const [answers, setAnswers]               = useState({})
  const [recordedSet, setRecordedSet]       = useState(new Set())
  const [isLoading, setIsLoading]           = useState(true)
  const [error, setError]                   = useState(null)

  // 권한 가드 — 레벨2 미만이면 홈으로
  useEffect(() => {
    if (authStatus !== 'authenticated' || serviceLevel < 2) {
      navigate('/')
    }
  }, [authStatus, serviceLevel, navigate])

  // 틀린문제 목록 로드
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
          .order('attempted_at', { ascending: false })

        if (err) {
          setError('틀린문제를 불러올 수 없습니다.')
          return
        }

        // 중복 제거 (question_id 기준, 순서 유지)
        const seen = new Set()
        const uniqueIds = []
        for (const row of data) {
          if (!seen.has(row.question_id)) {
            seen.add(row.question_id)
            uniqueIds.push(row.question_id)
          }
        }

        // 로컬 questions 배열에서 매핑 (없는 문제 제외)
        const matched = uniqueIds
          .map((id) => questions.find((q) => q.id === id))
          .filter(Boolean)

        setWrongQuestions(matched)
      } catch (e) {
        setError('네트워크 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [isReady, questions, authStatus])

  // ── 로딩/에러/빈 상태 ────────────────────────────────
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
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 underline text-sm"
        >
          홈으로
        </button>
      </div>
    )
  }

  if (wrongQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
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
    )
  }

  // ── 문제 풀기 UI ─────────────────────────────────────
  const question = wrongQuestions[currentIndex]
  const displayAnswer = localAnswered.has(question.id)
    ? (answers[question.id] ?? null)
    : null
  const headerBg = SUBJECT_HEADER_BG[question.subject] ?? 'bg-gray-600'

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
          onClick={() => navigate('/')}
        >
          ← 홈
        </button>
        <span className="text-sm font-semibold text-white">
          틀린문제 {currentIndex + 1}/{wrongQuestions.length}
        </span>
        <span className="text-xs text-white/70">
          {question.subSubject}
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
            className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm disabled:opacity-40"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            이전
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

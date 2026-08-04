import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useExamStore, { selectFilteredQuestions } from '../stores/examStore'
import useStatsStore from '../stores/statsStore'
import QuestionView from '../components/QuestionView'
import AnswerButtons from '../components/AnswerButtons'
import StatsPanel from '../components/StatsPanel'
import LimitPopup from '../components/LimitPopup'
import { recordAttempt } from '../services/statsService'
import { useAuthStore } from '../stores/authStore'

const GUEST_LIMIT = 30

const SUBJECT_HEADER_BG = {
  '법령': 'bg-blue-600',
  '손보1부': 'bg-green-600',
  '손보2부': 'bg-purple-600',
}

export default function Question() {
  const navigate = useNavigate()
  const questions = useExamStore((s) => s.questions)
  const selectedSubject = useExamStore((s) => s.selectedSubject)
  const selectedRound = useExamStore((s) => s.selectedRound)
  const selectedSubSubject = useExamStore((s) => s.selectedSubSubject)
  const studyMode = useExamStore((s) => s.studyMode)
  const currentIndex = useExamStore((s) => s.currentIndex)
  const answers = useExamStore((s) => s.answers)
  const isLoading = useExamStore((s) => s.isLoading)
  const isReady = useExamStore((s) => s.isReady)
  const saveAnswer = useExamStore((s) => s.saveAnswer)
  const setCurrentIndex = useExamStore((s) => s.setCurrentIndex)

  const stats = useStatsStore((s) => s.stats)
  const authStatus = useAuthStore((s) => s.authStatus)
  const serviceLevel = useAuthStore((s) => s.serviceLevel)

  const [localAnswered, setLocalAnswered] = useState(new Set())
  const [recordedSet, setRecordedSet] = useState(new Set())
  const [showLimitPopup, setShowLimitPopup] = useState(false)

  const filteredQuestions = useMemo(
    () => selectFilteredQuestions({
      questions,
      selectedSubject,
      selectedRound,
      selectedSubSubject,
      studyMode,
    }),
    [questions, selectedSubject, selectedRound, selectedSubSubject, studyMode]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
        로딩 중...
      </div>
    )
  }

  if (!isReady || filteredQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
        문제가 없습니다.
      </div>
    )
  }

  const question = filteredQuestions[currentIndex]
  if (!question) return null

  const headerSubject = selectedSubject ?? question.subject
  const headerBg = SUBJECT_HEADER_BG[headerSubject] ?? 'bg-blue-600'
  const currentSubject = selectedSubSubject ?? question.subSubject ?? headerSubject
  const headerLabel = studyMode === 'service_a_sequence'
    ? `${selectedRound}회 ${question.partNumber ?? currentIndex + 1}번`
    : selectedSubSubject
      ? `${selectedRound} ${selectedSubSubject}`
      : `${selectedRound} ${headerSubject}`

  const displayAnswer = localAnswered.has(question.id)
    ? (answers[question.id] ?? null)
    : null

  const today = new Date().toISOString().slice(0, 10)
  const statsData = {
    cumulative: stats.bySubject[currentSubject] ?? { solved: 0, correct: 0 },
    daily: stats.daily[today] ?? { solved: 0, correct: 0 },
  }

  const handleAnswer = async (num) => {
    saveAnswer(question.id, num)
    setLocalAnswered((prev) => new Set([...prev, question.id]))

    if (recordedSet.has(question.id)) return

    const safeRound = Number.isInteger(question.round) ? question.round : null
    if (!safeRound) {
      console.warn('[GEP] question.round is invalid:', question.id, question.round)
      return
    }

    const authState = useAuthStore.getState()
    await recordAttempt(useStatsStore.getState(), authState, {
      question,
      selectedAnswer: num,
      isCorrect: num === question.answer,
      studyMode: studyMode === 'service_a_sequence'
        ? 'service_a_sequence'
        : 'service_b_subject_random',
    })
    setRecordedSet((prev) => new Set([...prev, question.id]))
  }

  const handlePrev = () => {
    const prevId = filteredQuestions[currentIndex - 1]?.id
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
    if (currentIndex === filteredQuestions.length - 1) {
      navigate('/result')
      return
    }

    if (authStatus === 'guest' && serviceLevel < 2) {
      const subjectSolved = stats.bySubject[currentSubject]?.solved ?? 0
      if (subjectSolved >= GUEST_LIMIT) {
        setShowLimitPopup(true)
        return
      }
    }

    setCurrentIndex(currentIndex + 1)
  }

  return (
    <div className="flex flex-col h-screen max-w-[640px] mx-auto bg-white">
      {showLimitPopup && (
        <LimitPopup
          subSubject={currentSubject}
          onHome={() => navigate('/')}
          onDismiss={() => setShowLimitPopup(false)}
        />
      )}

      <div className={`flex-shrink-0 flex justify-between items-center px-4 py-2 ${headerBg}`}>
        <button
          className="text-sm text-white/80 hover:text-white"
          onClick={() => navigate(studyMode === 'service_a_sequence' ? '/service-a' : '/')}
        >
          이전
        </button>
        <span className="text-sm font-semibold text-white">
          {headerLabel} {currentIndex + 1}/{filteredQuestions.length}
        </span>
        <button
          className="text-sm text-white/80 hover:text-white"
          onClick={() => navigate('/')}
        >
          홈
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <QuestionView
          question={question}
          currentNum={currentIndex + 1}
          totalNum={filteredQuestions.length}
        />
      </div>

      <div
        className="flex-shrink-0 bg-white border-t border-gray-200 px-4 pt-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <AnswerButtons
          selectedAnswer={displayAnswer}
          correctAnswer={question.answer}
          onAnswer={handleAnswer}
        />

        <StatsPanel
          subSubject={currentSubject}
          isVisible={displayAnswer !== null}
          stats={statsData}
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
            {currentIndex === filteredQuestions.length - 1 ? '완료' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}

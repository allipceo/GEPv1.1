/**
 * Question.jsx — 문제 풀기 페이지
 * store 연결 담당. 컴포넌트에는 props만 전달.
 *
 * 레이아웃: flex flex-col h-screen
 *   - 헤더 (flex-shrink-0)
 *   - 문제 영역 (flex-1 overflow-y-auto)
 *   - 하단 버튼 영역 (flex-shrink-0): ①②③④ + 이전/다음
 *
 * localAnswered: 이번 세션 중 답을 선택한 문제 ID Set
 *   - 이전 버튼 클릭 시 이동할 문제 ID 제거 → 해당 문제 초기 상태로 표시
 *   - store.answers는 절대 수정하지 않음
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useExamStore from '../stores/examStore'
import useStatsStore from '../stores/statsStore'
import QuestionView from '../components/QuestionView'
import AnswerButtons from '../components/AnswerButtons'
import StatsPanel from '../components/StatsPanel'

// 과목별 헤더 배경색
const SUBJECT_HEADER_BG = {
  '법령':   'bg-blue-600',
  '손보1부': 'bg-green-600',
  '손보2부': 'bg-purple-600',
}

export default function Question() {
  const navigate           = useNavigate()
  const questions          = useExamStore((s) => s.questions)
  const selectedSubject    = useExamStore((s) => s.selectedSubject)
  const selectedRound      = useExamStore((s) => s.selectedRound)
  const selectedSubSubject = useExamStore((s) => s.selectedSubSubject)
  const currentIndex       = useExamStore((s) => s.currentIndex)
  const answers            = useExamStore((s) => s.answers)
  const isLoading          = useExamStore((s) => s.isLoading)
  const isReady            = useExamStore((s) => s.isReady)
  const saveAnswer         = useExamStore((s) => s.saveAnswer)
  const setCurrentIndex    = useExamStore((s) => s.setCurrentIndex)

  // statsStore 연동
  const updateStats = useStatsStore((s) => s.updateStats)
  const stats       = useStatsStore((s) => s.stats)

  // 로컬 UI 상태: 이번 세션에서 답을 선택한 문제 ID Set
  // store.answers와 무관하게 UI 표시 여부만 제어
  const [localAnswered, setLocalAnswered] = useState(new Set())

  // 통계 기록 완료된 문제 ID Set (중복 기록 방지용 — 이전 버튼으로 돌아가도 유지)
  const [recordedSet, setRecordedSet] = useState(new Set())

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

  // 가드: 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
        로딩 중...
      </div>
    )
  }

  // 가드: 미준비 또는 문제 없음
  if (!isReady || filteredQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
        문제가 없습니다.
      </div>
    )
  }

  const question = filteredQuestions[currentIndex]
  if (!question) return null

  const headerBg = SUBJECT_HEADER_BG[selectedSubject] ?? 'bg-blue-600'
  const headerLabel = selectedSubSubject
    ? `${selectedRound}회 ${selectedSubSubject}`
    : `${selectedRound}회 ${selectedSubject}`

  // 이 문제의 표시용 답안: localAnswered에 있을 때만 store 값 사용
  const displayAnswer = localAnswered.has(question.id)
    ? (answers[question.id] ?? null)
    : null

  // StatsPanel 표시용 데이터
  const currentSubject = selectedSubSubject ?? question?.subSubject ?? selectedSubject
  const today          = new Date().toISOString().slice(0, 10)
  const statsData = {
    cumulative: stats.bySubject[currentSubject] ?? { solved: 0, correct: 0 },
    daily:      stats.daily[today]              ?? { solved: 0, correct: 0 },
  }

  // 답 선택 → store 저장 + localAnswered 추가 + 통계 기록 (중복 방지)
  const handleAnswer = (num) => {
    saveAnswer(question.id, num)
    setLocalAnswered((prev) => new Set([...prev, question.id]))

    // 이미 기록된 문제는 skip
    if (!recordedSet.has(question.id)) {
      updateStats({
        subject: question.subSubject,
        round:   selectedRound,
        solved:  1,
        correct: num === question.answer ? 1 : 0,
      })
      setRecordedSet((prev) => new Set([...prev, question.id]))
    }
  }

  // 이전 버튼: 이동 대상 문제의 localAnswered 제거 → 초기 상태로 표시
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

  // 다음/완료 버튼
  const handleNext = () => {
    if (currentIndex === filteredQuestions.length - 1) {
      navigate('/result')
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-[640px] mx-auto bg-white">

      {/* 상단 헤더 — 과목 컬러 배경 */}
      <div className={`flex-shrink-0 flex justify-between items-center px-4 py-2 ${headerBg}`}>
        <button
          className="text-sm text-white/80 hover:text-white"
          onClick={() => navigate('/')}
        >
          ← 홈
        </button>
        <span className="text-sm font-semibold text-white">
          {headerLabel} {currentIndex + 1}/{filteredQuestions.length}
        </span>
        <button
          className="text-sm text-white/80 hover:text-white"
          onClick={() => navigate('/')}
        >
          과목변경
        </button>
      </div>

      {/* 문제 본문 — 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto">
        <QuestionView
          question={question}
          currentNum={currentIndex + 1}
          totalNum={filteredQuestions.length}
        />
      </div>

      {/* 하단 고정 버튼 영역: ①②③④ + 이전/다음 */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-200 px-4 pt-2"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {/* ①②③④ 선택 버튼 */}
        <AnswerButtons
          selectedAnswer={displayAnswer}
          correctAnswer={question.answer}
          onAnswer={handleAnswer}
        />

        {/* 통계 패널 — 정답 확인 후 자동 펼침 */}
        <StatsPanel
          subSubject={currentSubject}
          isVisible={displayAnswer !== null}
          stats={statsData}
        />

        {/* 이전 / 다음 버튼 */}
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

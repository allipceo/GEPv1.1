/**
 * Result.jsx — 과목 완료 화면
 * filteredQuestions를 모두 푼 뒤 navigate('/result')로 진입
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useExamStore from '../stores/examStore'

export default function Result() {
  const navigate           = useNavigate()
  const questions          = useExamStore((s) => s.questions)
  const selectedSubject    = useExamStore((s) => s.selectedSubject)
  const selectedRound      = useExamStore((s) => s.selectedRound)
  const selectedSubSubject = useExamStore((s) => s.selectedSubSubject)
  const answers            = useExamStore((s) => s.answers)
  const setCurrentIndex    = useExamStore((s) => s.setCurrentIndex)

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

  // 통계 계산
  const total   = filteredQuestions.length
  const correct = filteredQuestions.filter((q) => answers[q.id] === q.answer).length
  const wrong   = filteredQuestions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== q.answer).length
  const rate    = total > 0 ? Math.round((correct / total) * 100) : 0

  // 완료 메시지 라벨 (세부과목 선택 시 세부과목 표시)
  const label = selectedSubSubject
    ? `${selectedRound}회 ${selectedSubSubject}`
    : `${selectedRound}회 ${selectedSubject}`

  const handleRetry = () => {
    setCurrentIndex(0)
    navigate('/question')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      {/* 완료 메시지 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {label} 완료!
      </h1>

      {/* 결과 통계 */}
      <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-6 mb-8 space-y-4">
        <div className="flex justify-between text-gray-700">
          <span>전체 문제</span>
          <span className="font-semibold">{total}문제</span>
        </div>
        <div className="flex justify-between text-blue-600">
          <span>정답</span>
          <span className="font-semibold">{correct}문제</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>오답</span>
          <span className="font-semibold">{wrong}문제</span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex justify-between text-gray-900 text-lg font-bold">
          <span>정답률</span>
          <span>{rate}%</span>
        </div>
      </div>

      {/* 버튼 */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold text-base"
          onClick={handleRetry}
        >
          다시 풀기
        </button>
        <button
          className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-base"
          onClick={() => navigate('/')}
        >
          홈으로
        </button>
      </div>
    </div>
  )
}

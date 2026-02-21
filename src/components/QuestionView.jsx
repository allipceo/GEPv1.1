/**
 * QuestionView.jsx — 문제 표시 컴포넌트
 * props만 보고 동작 (store 직접 참조 없음)
 *
 * props:
 *   question:   { id, round, subject, subSubject, questionRaw, answer }
 *   currentNum: 현재 번호 (1부터)
 *   totalNum:   filteredQuestions.length (필터 기준)
 */

export default function QuestionView({ question, currentNum, totalNum }) {
  return (
    <div className="px-4 pt-2 bg-white">
      {/* 진도 표시 */}
      <p className="text-xs text-gray-500 mb-0.5">
        {currentNum} / {totalNum}
      </p>

      {/* 과목 태그 */}
      <p className="text-xs text-blue-600 font-medium mb-1">
        {question.round}회 · {question.subject} · {question.subSubject}
      </p>

      {/* 문제+보기 원문 — dangerouslySetInnerHTML 사용 금지, white-space: pre-wrap */}
      <p
        className="text-sm text-gray-900 leading-normal"
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {question.questionRaw}
      </p>
    </div>
  )
}

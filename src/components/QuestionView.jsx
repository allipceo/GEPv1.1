/**
 * QuestionView.jsx — 문제 표시 컴포넌트
 * props만 보고 동작 (store 직접 참조 없음)
 *
 * props:
 *   question:   { id, round, subject, subSubject, questionRaw, answer }
 *   currentNum: 현재 번호 (1부터)
 *   totalNum:   filteredQuestions.length (필터 기준)
 *
 * 렌더링 원칙:
 *   questionRaw의 \n을 기준으로 각 줄을 독립 블록으로 분리.
 *   각 블록(문제/지문/선택지)은 white-space: normal(기본값)으로 렌더링되어
 *   화면 너비에 따라 자연 줄바꿈됨. pre-wrap 사용 금지.
 */

export default function QuestionView({ question, currentNum, totalNum }) {
  const lines = question.questionRaw.split('\n')

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

      {/* 문제+보기 — \n 기준 분리, 각 줄 독립 블록, 화면폭 자연 줄바꿈 */}
      <div className="text-sm text-gray-900 leading-normal">
        {lines.map((line, i) =>
          line.trim() === '' ? (
            <div key={i} className="h-2" />
          ) : (
            <p key={i} className="mb-0.5">
              {line}
            </p>
          )
        )}
      </div>
    </div>
  )
}

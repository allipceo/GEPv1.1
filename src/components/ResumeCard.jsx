/**
 * ResumeCard.jsx — 이전 진도 표시 카드 (레고 컴포넌트)
 * props만 받아 표시. store 참조 금지.
 *
 * props:
 *   round:      선택된 회차
 *   subject:    선택된 과목
 *   currentNum: currentIndex + 1
 *   totalNum:   filteredQuestions.length
 *   onResume:   이어서 풀기 클릭 핸들러
 */

export default function ResumeCard({ round, subject, currentNum, totalNum, onResume }) {
  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <p className="text-sm text-blue-800">
        이어서 풀기: <span className="font-medium">{round}회 {subject}</span>{' '}
        <span className="text-blue-600">{currentNum}/{totalNum}</span>
      </p>
      <button
        onClick={onResume}
        className="text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        계속 →
      </button>
    </div>
  )
}
